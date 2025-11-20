/**
 * Product Catalog Management API Routes (ADM-001)
 *
 * Manages product master data including raw materials, semi-finished goods,
 * finished goods, packaging, and consumables.
 *
 * @see FEATURES.md Section 12.1 - Product Catalog Management (ADM-001)
 * @module routes/v1/products
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/config/database.js';
import { products, uoms } from '@/config/schema.js';
import {
  productCreateSchema,
  productUpdateSchema,
  productQuerySchema,
  productResponseSchema,
  productsResponseSchema,
  generateNextProductSKU,
  type ProductCreate,
  type ProductUpdate,
  type ProductQuery,
} from '@contracts';
import { getCurrentUser } from '@/shared/middleware/auth.js';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
} from '@/shared/utils/responses.js';

/**
 * Format money amount to 2 decimal places
 * Handles null values and numeric precision from database
 */
function formatMoney(value: string | null): string | null {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num.toFixed(2);
}

/**
 * Register product routes
 *
 * API Endpoints (from FEATURES.md ADM-001):
 * - POST /api/v1/products - Create product
 * - GET /api/v1/products - List products
 * - GET /api/v1/products/:id - Get product details
 * - PATCH /api/v1/products/:id - Update product
 * - DELETE /api/v1/products/:id - Deactivate product
 */
export function productRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CREATE PRODUCT
  // ============================================================================

  /**
   * POST /api/v1/products
   *
   * Create a new product
   *
   * Business Rules (from FEATURES.md ADM-001):
   * - SKU is unique per tenant
   * - Auto-generate SKU if not provided
   * - Base UOM required
   * - Shelf life required for perishable items
   * - Inactive products not available for transactions
   *
   * @see FEATURES.md ADM-001 - "Product creation with SKU, name, description"
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new product',
        tags: ['Products', 'Admin'],
        body: productCreateSchema,
        response: {
          201: productResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: ProductCreate }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const createData = request.body;

      // Generate SKU if not provided
      let productSku = createData.sku;
      if (!productSku) {
        // Get all products of this kind to find max numeric sequence
        const allProducts = await db
          .select({ sku: products.sku })
          .from(products)
          .where(
            and(
              eq(products.tenantId, currentUser.tenantId),
              eq(products.kind, createData.productKind)
            )
          );

        let lastSequence = 0;
        // Find the highest numeric sequence from all SKUs
        for (const product of allProducts) {
          const match = product.sku.match(/-(\d+)$/);
          if (match && match[1]) {
            const sequence = parseInt(match[1], 10);
            if (sequence > lastSequence) {
              lastSequence = sequence;
            }
          }
        }

        productSku = generateNextProductSKU(createData.productKind, lastSequence);
      }

      // Check if SKU already exists
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, currentUser.tenantId),
            eq(products.sku, productSku.toUpperCase())
          )
        )
        .limit(1);

      if (existingProduct.length > 0) {
        return createBadRequestError('Product SKU already exists', reply);
      }

      // Validate shelf life for perishable products
      if (createData.isPerishable && !createData.shelfLifeDays) {
        return createBadRequestError(
          'Shelf life days required for perishable products',
          reply
        );
      }

      // Verify base UOM exists
      const baseUom = await db
        .select()
        .from(uoms)
        .where(eq(uoms.id, createData.baseUomId))
        .limit(1);

      if (!baseUom.length) {
        return createBadRequestError('Base UOM not found', reply);
      }

      // Create product
      const newProducts = await db
        .insert(products)
        .values({
          tenantId: currentUser.tenantId,
          sku: productSku.toUpperCase(),
          name: createData.name,
          description: createData.description || null,
          kind: createData.productKind,
          baseUomId: createData.baseUomId,
          standardCost: createData.standardCost || null,
          defaultPrice: createData.defaultPrice || null,
          taxCategory: createData.taxCategoryId || null,
          isPerishable: createData.isPerishable ?? false,
          shelfLifeDays: createData.shelfLifeDays || null,
          barcode: createData.barcode || null,
          imageUrl: createData.imageUrl || null,
          isActive: createData.isActive ?? true,
          metadata: createData.metadata || null,
        })
        .returning();

      const product = newProducts[0];

      const responseData = {
        id: product.id,
        tenantId: product.tenantId,
        sku: product.sku,
        name: product.name,
        description: product.description,
        productKind: product.kind,
        baseUomId: product.baseUomId,
        standardCost: formatMoney(product.standardCost),
        defaultPrice: formatMoney(product.defaultPrice),
        taxCategoryId: null, // TODO: Implement tax categories table with UUID references
        isPerishable: product.isPerishable,
        shelfLifeDays: product.shelfLifeDays,
        barcode: product.barcode,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        notes: null,
        metadata: product.metadata,
        baseUom: {
          id: baseUom[0].id,
          code: baseUom[0].code,
          name: baseUom[0].name,
        },
        taxCategory: null,
        categories: [],
        variants: [],
        totalOnHand: '0',
        totalValue: '0.00',
        lastPurchaseDate: null,
        lastSaleDate: null,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };

      return reply.status(201).send(createSuccessResponse(responseData, 'Product created successfully'));
    }
  );

  // ============================================================================
  // GET PRODUCTS LIST
  // ============================================================================

  /**
   * GET /api/v1/products
   *
   * Get paginated list of products with filters
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50)
   * - name: Filter by name (partial match)
   * - sku: Filter by SKU (partial match)
   * - barcode: Filter by barcode
   * - productKind: Filter by product kind
   * - isPerishable: Filter by perishable status
   * - isActive: Filter by active status
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get paginated list of products',
        tags: ['Products', 'Admin'],
        querystring: productQuerySchema,
        response: {
          200: productsResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ProductQuery }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const query = request.query;

      const limit = query.limit || 50;
      const offset = query.offset || 0;

      // Build where conditions
      const conditions = [eq(products.tenantId, currentUser.tenantId)];

      if (query.name) {
        conditions.push(ilike(products.name, `%${query.name}%`));
      }

      if (query.sku) {
        conditions.push(ilike(products.sku, `%${query.sku}%`));
      }

      if (query.barcode) {
        conditions.push(eq(products.barcode, query.barcode));
      }

      if (query.productKind) {
        conditions.push(eq(products.kind, query.productKind));
      }

      if (query.isPerishable !== undefined) {
        conditions.push(eq(products.isPerishable, query.isPerishable));
      }

      if (query.isActive !== undefined) {
        conditions.push(eq(products.isActive, query.isActive));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(and(...conditions));
      const count = countResult[0]?.count || 0;

      // Get products with base UOM
      const productsList = await db
        .select({
          product: products,
          baseUom: {
            id: uoms.id,
            code: uoms.code,
            name: uoms.name,
          },
        })
        .from(products)
        .leftJoin(uoms, eq(products.baseUomId, uoms.id))
        .where(and(...conditions))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);

      const items = productsList.map((row) => ({
        id: row.product.id,
        tenantId: row.product.tenantId,
        sku: row.product.sku,
        name: row.product.name,
        description: row.product.description,
        productKind: row.product.kind,
        baseUomId: row.product.baseUomId,
        standardCost: formatMoney(row.product.standardCost),
        defaultPrice: formatMoney(row.product.defaultPrice),
        taxCategoryId: null, // TODO: Implement tax categories table with UUID references
        isPerishable: row.product.isPerishable,
        shelfLifeDays: row.product.shelfLifeDays,
        barcode: row.product.barcode,
        imageUrl: row.product.imageUrl,
        isActive: row.product.isActive,
        baseUom: {
          id: row.baseUom.id || '',
          code: row.baseUom.code || '',
          name: row.baseUom.name || '',
        },
        taxCategory: null,
        totalOnHand: '0',
        totalValue: '0.00',
        lastPurchaseDate: null,
        lastSaleDate: null,
        createdAt: row.product.createdAt,
        updatedAt: row.product.updatedAt,
      }));

      return reply.send(
        createSuccessResponse({
          items,
          pagination: {
            total: count,
            limit,
            offset,
            currentPage: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(count / limit),
            hasNext: offset + limit < count,
            hasPrev: offset > 0,
          },
        })
      );
    }
  );

  // ============================================================================
  // GET PRODUCT DETAILS
  // ============================================================================

  /**
   * GET /api/v1/products/:id
   *
   * Get detailed information about a specific product
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get product details',
        tags: ['Products', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: productResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params;

      const productResult = await db
        .select({
          product: products,
          baseUom: {
            id: uoms.id,
            code: uoms.code,
            name: uoms.name,
          },
        })
        .from(products)
        .leftJoin(uoms, eq(products.baseUomId, uoms.id))
        .where(
          and(
            eq(products.id, id),
            eq(products.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!productResult.length) {
        return createNotFoundError('Product not found', reply);
      }

      const row = productResult[0];

      const responseData = {
        id: row.product.id,
        tenantId: row.product.tenantId,
        sku: row.product.sku,
        name: row.product.name,
        description: row.product.description,
        productKind: row.product.kind,
        baseUomId: row.product.baseUomId,
        standardCost: formatMoney(row.product.standardCost),
        defaultPrice: formatMoney(row.product.defaultPrice),
        taxCategoryId: null, // TODO: Implement tax categories table with UUID references
        isPerishable: row.product.isPerishable,
        shelfLifeDays: row.product.shelfLifeDays,
        barcode: row.product.barcode,
        imageUrl: row.product.imageUrl,
        isActive: row.product.isActive,
        notes: null,
        metadata: row.product.metadata,
        baseUom: {
          id: row.baseUom.id || '',
          code: row.baseUom.code || '',
          name: row.baseUom.name || '',
        },
        taxCategory: null,
        categories: [],
        variants: [],
        totalOnHand: '0',
        totalValue: '0.00',
        lastPurchaseDate: null,
        lastSaleDate: null,
        createdAt: row.product.createdAt,
        updatedAt: row.product.updatedAt,
      };

      return reply.send(createSuccessResponse(responseData));
    }
  );

  // ============================================================================
  // UPDATE PRODUCT
  // ============================================================================

  /**
   * PATCH /api/v1/products/:id
   *
   * Update product information
   *
   * Business Rules:
   * - Cannot change SKU once created
   * - All fields are optional (partial update)
   * - Shelf life validation for perishable products
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update product',
        tags: ['Products', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: productUpdateSchema,
        response: {
          200: productResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: ProductUpdate;
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params;
      const updateData = request.body;

      // Check if product exists
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, id),
            eq(products.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!existingProduct.length) {
        return createNotFoundError('Product not found', reply);
      }

      const currentProduct = existingProduct[0];

      // Validate shelf life if updating perishability
      const isPerishable = updateData.isPerishable ?? currentProduct.isPerishable;
      const shelfLifeDays = updateData.shelfLifeDays ?? currentProduct.shelfLifeDays;

      if (isPerishable && !shelfLifeDays) {
        return createBadRequestError(
          'Shelf life days required for perishable products',
          reply
        );
      }

      // Verify base UOM exists if updating
      if (updateData.baseUomId) {
        const baseUom = await db
          .select()
          .from(uoms)
          .where(eq(uoms.id, updateData.baseUomId))
          .limit(1);

        if (!baseUom.length) {
          return createBadRequestError('Base UOM not found', reply);
        }
      }

      // Prepare update object
      const updates: any = {
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) updates.name = updateData.name;
      if (updateData.description !== undefined) updates.description = updateData.description;
      if (updateData.productKind !== undefined) updates.kind = updateData.productKind;
      if (updateData.baseUomId !== undefined) updates.baseUomId = updateData.baseUomId;
      if (updateData.standardCost !== undefined) updates.standardCost = updateData.standardCost;
      if (updateData.defaultPrice !== undefined) updates.defaultPrice = updateData.defaultPrice;
      if (updateData.taxCategoryId !== undefined) updates.taxCategory = updateData.taxCategoryId;
      if (updateData.isPerishable !== undefined) updates.isPerishable = updateData.isPerishable;
      if (updateData.shelfLifeDays !== undefined) updates.shelfLifeDays = updateData.shelfLifeDays;
      if (updateData.barcode !== undefined) updates.barcode = updateData.barcode;
      if (updateData.imageUrl !== undefined) updates.imageUrl = updateData.imageUrl;
      if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;
      if (updateData.metadata !== undefined) updates.metadata = updateData.metadata;

      // Update product
      const updatedProducts = await db
        .update(products)
        .set(updates)
        .where(eq(products.id, id))
        .returning();

      const updatedProduct = updatedProducts[0];

      // Get base UOM for response
      const baseUom = await db
        .select()
        .from(uoms)
        .where(eq(uoms.id, updatedProduct.baseUomId))
        .limit(1);

      const responseData = {
        id: updatedProduct.id,
        tenantId: updatedProduct.tenantId,
        sku: updatedProduct.sku,
        name: updatedProduct.name,
        description: updatedProduct.description,
        productKind: updatedProduct.kind,
        baseUomId: updatedProduct.baseUomId,
        standardCost: formatMoney(updatedProduct.standardCost),
        defaultPrice: formatMoney(updatedProduct.defaultPrice),
        taxCategoryId: null, // TODO: Implement tax categories table with UUID references
        isPerishable: updatedProduct.isPerishable,
        shelfLifeDays: updatedProduct.shelfLifeDays,
        barcode: updatedProduct.barcode,
        imageUrl: updatedProduct.imageUrl,
        isActive: updatedProduct.isActive,
        notes: null,
        metadata: updatedProduct.metadata,
        baseUom: {
          id: baseUom[0].id,
          code: baseUom[0].code,
          name: baseUom[0].name,
        },
        taxCategory: null,
        categories: [],
        variants: [],
        totalOnHand: '0',
        totalValue: '0.00',
        lastPurchaseDate: null,
        lastSaleDate: null,
        createdAt: updatedProduct.createdAt,
        updatedAt: updatedProduct.updatedAt,
      };

      return reply.send(createSuccessResponse(responseData, 'Product updated successfully'));
    }
  );

  // ============================================================================
  // DEACTIVATE PRODUCT
  // ============================================================================

  /**
   * DELETE /api/v1/products/:id
   *
   * Deactivate a product (soft delete)
   *
   * Business Rules (from FEATURES.md ADM-001):
   * - Inactive products not available for transactions
   * - Product is not physically deleted
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Deactivate product',
        tags: ['Products', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params;

      // Check if product exists
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, id),
            eq(products.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!existingProduct.length) {
        return createNotFoundError('Product not found', reply);
      }

      // Deactivate product
      await db
        .update(products)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id));

      return reply.send({
        success: true,
        message: 'Product deactivated successfully',
      });
    }
  );

  // ============================================================================
  // BULK OPERATIONS (ADM-001)
  // ============================================================================

  /**
   * GET /api/v1/products/bulk/export
   *
   * Export all products to CSV format
   *
   * Features:
   * - Exports all active products for the tenant
   * - CSV format with headers
   * - Includes all product fields
   * - Can be filtered by product kind
   *
   * @see FEATURES.md ADM-001 - Bulk operations
   */
  fastify.get(
    '/bulk/export',
    {
      schema: {
        description: 'Export products to CSV',
        tags: ['Products', 'Admin', 'Bulk'],
        querystring: z.object({
          kind: z.enum(['raw_material', 'semi_finished', 'finished_good', 'packaging', 'consumable']).optional(),
          includeInactive: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              csv: z.string(),
              count: z.number(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { kind?: string; includeInactive?: boolean } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { kind, includeInactive } = request.query;

      // Build query conditions
      const conditions = [eq(products.tenantId, currentUser.tenantId)];
      if (kind) {
        conditions.push(eq(products.kind, kind));
      }
      if (!includeInactive) {
        conditions.push(eq(products.isActive, true));
      }

      // Fetch products with UOM details
      const productList = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          description: products.description,
          kind: products.kind,
          baseUomId: products.baseUomId,
          baseUomCode: uoms.code,
          isPerishable: products.isPerishable,
          shelfLifeDays: products.shelfLifeDays,
          standardCost: products.standardCost,
          isActive: products.isActive,
        })
        .from(products)
        .leftJoin(uoms, eq(products.baseUomId, uoms.id))
        .where(and(...conditions))
        .orderBy(products.sku);

      // Generate CSV
      const headers = [
        'SKU',
        'Name',
        'Description',
        'Kind',
        'Base UOM',
        'Is Perishable',
        'Shelf Life (Days)',
        'Standard Cost',
        'Is Active',
      ];

      const rows = productList.map(p => [
        p.sku || '',
        p.name || '',
        p.description || '',
        p.kind || '',
        p.baseUomCode || '',
        p.isPerishable ? 'Yes' : 'No',
        p.shelfLifeDays?.toString() || '',
        p.standardCost || '',
        p.isActive ? 'Active' : 'Inactive',
      ]);

      // Build CSV string
      const csvLines = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ];
      const csv = csvLines.join('\n');

      return reply.send(
        createSuccessResponse(
          {
            csv,
            count: productList.length,
          },
          `Exported ${productList.length} product(s) successfully`
        )
      );
    }
  );

  /**
   * POST /api/v1/products/bulk/import
   *
   * Import products from CSV data
   *
   * Features:
   * - Creates new products from CSV
   * - Validates all required fields
   * - Skips invalid rows with error reporting
   * - Returns summary of imported/failed records
   *
   * CSV Format:
   * SKU,Name,Description,Kind,Base UOM,Is Perishable,Shelf Life (Days),Standard Cost
   *
   * @see FEATURES.md ADM-001 - Bulk operations
   */
  fastify.post(
    '/bulk/import',
    {
      schema: {
        description: 'Import products from CSV',
        tags: ['Products', 'Admin', 'Bulk'],
        body: z.object({
          csv: z.string().min(1),
          skipHeader: z.boolean().default(true),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              imported: z.number(),
              failed: z.number(),
              errors: z.array(z.object({
                row: z.number(),
                error: z.string(),
                data: z.string(),
              })),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { csv: string; skipHeader?: boolean } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { csv, skipHeader } = request.body;

      // Parse CSV
      const lines = csv.split('\n').filter(line => line.trim());
      const startRow = skipHeader ? 1 : 0;

      let imported = 0;
      let failed = 0;
      const errors: Array<{ row: number; error: string; data: string }> = [];

      // Get all UOMs for lookup
      const uomList = await db
        .select({ id: uoms.id, code: uoms.code })
        .from(uoms)
        .where(eq(uoms.tenantId, currentUser.tenantId));
      const uomMap = new Map(uomList.map(u => [u.code.toUpperCase(), u.id]));

      // Process each row
      for (let i = startRow; i < lines.length; i++) {
        const line = lines[i]!.trim();
        if (!line) continue;

        try {
          // Parse CSV row (simple parsing - handles quoted fields)
          const fields: string[] = [];
          let currentField = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j]!;
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              fields.push(currentField.trim());
              currentField = '';
            } else {
              currentField += char;
            }
          }
          fields.push(currentField.trim());

          // Extract fields
          const [sku, name, description, kind, baseUomCode, isPerishableStr, shelfLifeDaysStr, standardCostStr] = fields;

          // Validate required fields
          if (!sku || !name || !kind || !baseUomCode) {
            throw new Error('Missing required fields: SKU, Name, Kind, or Base UOM');
          }

          // Validate kind
          const validKinds = ['raw_material', 'semi_finished', 'finished_good', 'packaging', 'consumable'];
          if (!validKinds.includes(kind)) {
            throw new Error(`Invalid kind: ${kind}. Must be one of: ${validKinds.join(', ')}`);
          }

          // Lookup UOM
          const baseUomId = uomMap.get(baseUomCode.toUpperCase());
          if (!baseUomId) {
            throw new Error(`UOM not found: ${baseUomCode}`);
          }

          // Parse boolean and numbers
          const isPerishable = isPerishableStr?.toLowerCase() === 'yes' || isPerishableStr?.toLowerCase() === 'true';
          const shelfLifeDays = shelfLifeDaysStr ? parseInt(shelfLifeDaysStr) : null;
          const standardCost = standardCostStr || null;

          // Check if SKU already exists
          const existing = await db
            .select({ id: products.id })
            .from(products)
            .where(and(eq(products.tenantId, currentUser.tenantId), eq(products.sku, sku)))
            .limit(1);

          if (existing.length > 0) {
            throw new Error(`SKU already exists: ${sku}`);
          }

          // Create product
          await db.insert(products).values({
            tenantId: currentUser.tenantId,
            sku,
            name,
            description: description || null,
            kind: kind as any,
            baseUomId,
            isPerishable,
            shelfLifeDays,
            standardCost,
            isActive: true,
            // Note: products table doesn't have createdBy field
          });

          imported++;
        } catch (error) {
          failed++;
          errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: line.substring(0, 100), // First 100 chars for context
          });
        }
      }

      return reply.send(
        createSuccessResponse(
          {
            imported,
            failed,
            errors: errors.slice(0, 100), // Limit to first 100 errors
          },
          `Import completed: ${imported} imported, ${failed} failed`
        )
      );
    }
  );
}
