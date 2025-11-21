/**
 * Supplier Management API Routes (PROC-006)
 *
 * Manages supplier master data, contact information, payment terms,
 * and supplier product catalogs with pricing.
 *
 * @see FEATURES.md Section 2.6 - Supplier Management (PROC-006)
 * @module routes/v1/suppliers
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/config/database.js';
import { suppliers, supplierProducts, products, uoms } from '@/config/schema.js';
import {
  supplierCreateSchema,
  supplierUpdateSchema,
  supplierQuerySchema,
  supplierResponseSchema,
  suppliersResponseSchema,
  generateNextSupplierCode,
  type SupplierCreate,
  type SupplierUpdate,
  type SupplierQuery,
} from '@contracts/erp';
import { getCurrentUser } from '@/shared/middleware/auth.js';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
} from '@/shared/utils/responses.js';

/**
 * Register supplier routes
 *
 * API Endpoints (from FEATURES.md PROC-006):
 * - POST /api/v1/suppliers - Create supplier
 * - GET /api/v1/suppliers - List suppliers
 * - GET /api/v1/suppliers/:id - Get supplier details
 * - PATCH /api/v1/suppliers/:id - Update supplier
 * - DELETE /api/v1/suppliers/:id - Deactivate supplier
 */
export function supplierRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CREATE SUPPLIER
  // ============================================================================

  /**
   * POST /api/v1/suppliers
   *
   * Create a new supplier
   *
   * Business Rules (from FEATURES.md PROC-006):
   * - Supplier code is unique per tenant
   * - Email required for PO sending
   * - Payment terms default to 30 days
   * - Inactive suppliers cannot receive new POs
   *
   * @see FEATURES.md PROC-006 - "Supplier creation with code and name"
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new supplier',
        tags: ['Suppliers', 'Procurement'],
        body: supplierCreateSchema,
        response: {
          201: supplierResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: SupplierCreate }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const createData = request.body;

      // Generate supplier code if not provided
      let supplierCode = createData.code;
      if (!supplierCode) {
        // Get last supplier code
        const lastSupplier = await db
          .select({ code: suppliers.code })
          .from(suppliers)
          .where(
            and(
              eq(suppliers.tenantId, currentUser.tenantId),
              ilike(suppliers.code, 'SUP-%')
            )
          )
          .orderBy(desc(suppliers.code))
          .limit(1);

        if (lastSupplier.length > 0) {
          const lastSupplierItem = lastSupplier[0];
          if (!lastSupplierItem) {
            throw new Error('Failed to retrieve last supplier code');
          }
          supplierCode = generateNextSupplierCode(lastSupplierItem.code);
        } else {
          supplierCode = 'SUP-00001';
        }
      }

      // Check if code already exists
      const existingSupplier = await db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.tenantId, currentUser.tenantId),
            eq(suppliers.code, supplierCode.toUpperCase())
          )
        )
        .limit(1);

      if (existingSupplier.length > 0) {
        return createBadRequestError('Supplier code already exists', reply);
      }

      // Create supplier
      const newSuppliers = await db
        .insert(suppliers)
        .values({
          tenantId: currentUser.tenantId,
          code: supplierCode.toUpperCase(),
          name: createData.name,
          email: createData.email,
          phone: createData.phone || null,
          address: createData.address || null,
          city: createData.city || null,
          contactPerson: createData.primaryContactName || null,
          taxId: createData.taxId || null,
          paymentTerms: createData.paymentTerms || 30,
          creditLimit: createData.creditLimit != null ? String(Number(createData.creditLimit).toFixed(2)) : null,
          isActive: createData.isActive ?? true,
          notes: createData.notes || null,
          metadata: {
            postalCode: createData.postalCode,
            country: createData.country,
            leadTimeDays: createData.leadTimeDays || 7,
            businessLicense: createData.businessLicense,
            primaryContactPhone: createData.primaryContactPhone,
            rating: createData.rating,
          },
        })
        .returning();

      const supplier = newSuppliers[0];
      if (!supplier) {
        throw new Error('Failed to create supplier');
      }

      const responseData = {
        id: supplier.id,
        tenantId: supplier.tenantId,
        code: supplier.code,
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone,
        address: supplier.address,
        city: supplier.city,
        postalCode: (supplier.metadata as any)?.postalCode || null,
        country: (supplier.metadata as any)?.country || 'Singapore',
        paymentTerms: supplier.paymentTerms || 30,
        leadTimeDays: (supplier.metadata as any)?.leadTimeDays || 7,
        taxId: supplier.taxId,
        businessLicense: (supplier.metadata as any)?.businessLicense || null,
        primaryContactName: supplier.contactPerson,
        primaryContactPhone: (supplier.metadata as any)?.primaryContactPhone || null,
        rating: (supplier.metadata as any)?.rating || null,
        creditLimit: supplier.creditLimit ?? '0.00',
        isActive: supplier.isActive,
        notes: supplier.notes,
        totalPurchaseOrders: 0,
        totalSpent: '0.00',
        lastPurchaseOrderDate: null,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      };

      return reply.status(201).send(createSuccessResponse(responseData, 'Supplier created successfully'));
    }
  );

  // ============================================================================
  // GET SUPPLIERS LIST
  // ============================================================================

  /**
   * GET /api/v1/suppliers
   *
   * Get paginated list of suppliers with filters
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50)
   * - name: Filter by name (partial match)
   * - code: Filter by code (partial match)
   * - email: Filter by email
   * - isActive: Filter by active status
   * - minRating: Filter by minimum rating
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get paginated list of suppliers',
        tags: ['Suppliers', 'Procurement'],
        querystring: supplierQuerySchema,
        // Response schema removed to allow custom pagination format
      },
    },
    async (
      request: FastifyRequest<{ Querystring: SupplierQuery }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const query = request.query;

      const limit = query.limit || 50;
      const offset = query.offset || 0;

      // Build where conditions
      const conditions = [eq(suppliers.tenantId, currentUser.tenantId)];

      if (query.name) {
        conditions.push(ilike(suppliers.name, `%${query.name}%`));
      }

      if (query.code) {
        conditions.push(ilike(suppliers.code, `%${query.code}%`));
      }

      if (query.email) {
        conditions.push(ilike(suppliers.email, `%${query.email}%`));
      }

      if (query.isActive !== undefined) {
        conditions.push(eq(suppliers.isActive, query.isActive));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(suppliers)
        .where(and(...conditions));
      const count = countResult[0]?.count || 0;

      // Get suppliers
      const suppliersList = await db
        .select()
        .from(suppliers)
        .where(and(...conditions))
        .orderBy(desc(suppliers.createdAt))
        .limit(limit)
        .offset(offset);

      const items = suppliersList
        .filter((supplier) => {
          // Apply rating filter if specified
          if (query.minRating !== undefined) {
            const rating = (supplier.metadata as any)?.rating;
            if (rating === null || rating === undefined || rating < query.minRating) {
              return false;
            }
          }
          return true;
        })
        .map((supplier) => ({
          id: supplier.id,
          tenantId: supplier.tenantId,
          code: supplier.code,
          name: supplier.name,
          email: supplier.email || '',
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          postalCode: (supplier.metadata as any)?.postalCode || null,
          country: (supplier.metadata as any)?.country || 'Singapore',
          paymentTerms: supplier.paymentTerms || 30,
          leadTimeDays: (supplier.metadata as any)?.leadTimeDays || 7,
          taxId: supplier.taxId,
          businessLicense: (supplier.metadata as any)?.businessLicense || null,
          primaryContactName: supplier.contactPerson,
          primaryContactPhone: (supplier.metadata as any)?.primaryContactPhone || null,
          rating: (supplier.metadata as any)?.rating || null,
          creditLimit: supplier.creditLimit ?? '0.00',
          isActive: supplier.isActive,
          totalPurchaseOrders: 0,
          totalSpent: '0.00',
          lastPurchaseOrderDate: null,
          createdAt: supplier.createdAt,
          updatedAt: supplier.updatedAt,
        }));

      return reply.send({
        success: true,
        data: items,
        pagination: {
          total: count,
          limit,
          offset,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(count / limit),
          hasNext: offset + limit < count,
          hasPrev: offset > 0,
        },
        message: `Retrieved ${items.length} suppliers`,
      });
    }
  );

  // ============================================================================
  // GET SUPPLIER DETAILS
  // ============================================================================

  /**
   * GET /api/v1/suppliers/:id
   *
   * Get detailed information about a specific supplier
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get supplier details',
        tags: ['Suppliers', 'Procurement'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: supplierResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params;

      const supplier = await db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, id),
            eq(suppliers.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!supplier.length) {
        return createNotFoundError('Supplier not found', reply);
      }

      const supplierData = supplier[0];
      if (!supplierData) {
        return createNotFoundError('Supplier not found', reply);
      }

      // Get catalog items
      const catalogItems = await db
        .select()
        .from(supplierProducts)
        .where(eq(supplierProducts.supplierId, id));

      const responseData = {
        id: supplierData.id,
        tenantId: supplierData.tenantId,
        code: supplierData.code,
        name: supplierData.name,
        email: supplierData.email || '',
        phone: supplierData.phone,
        address: supplierData.address,
        city: supplierData.city,
        postalCode: (supplierData.metadata as any)?.postalCode || null,
        country: (supplierData.metadata as any)?.country || 'Singapore',
        paymentTerms: supplierData.paymentTerms || 30,
        leadTimeDays: (supplierData.metadata as any)?.leadTimeDays || 7,
        taxId: supplierData.taxId,
        businessLicense: (supplierData.metadata as any)?.businessLicense || null,
        primaryContactName: supplierData.contactPerson,
        contactPerson: supplierData.contactPerson, // Alias for backward compatibility
        primaryContactPhone: (supplierData.metadata as any)?.primaryContactPhone || null,
        rating: (supplierData.metadata as any)?.rating || null,
        creditLimit: supplierData.creditLimit ?? '0.00',
        isActive: supplierData.isActive,
        notes: supplierData.notes,
        totalPurchaseOrders: 0,
        totalSpent: '0.00',
        lastPurchaseOrderDate: null,
        catalogItems: catalogItems.map((item) => ({
          id: item.id,
          supplierId: item.supplierId,
          productId: item.productId,
          supplierSku: item.supplierSku,
          unitCost: item.unitPrice || '0.00', // Return as unitCost for test
          uomId: item.uomId,
          leadTimeDays: item.leadTimeDays,
          moq: item.minOrderQty, // Return as moq for test
          isPrimary: item.isPrimary,
          isActive: item.isActive,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        createdAt: supplierData.createdAt,
        updatedAt: supplierData.updatedAt,
      };

      return reply.send(createSuccessResponse(responseData));
    }
  );

  // ============================================================================
  // UPDATE SUPPLIER
  // ============================================================================

  /**
   * PATCH /api/v1/suppliers/:id
   *
   * Update supplier information
   *
   * Business Rules:
   * - Cannot change supplier code once created
   * - All fields are optional (partial update)
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update supplier',
        tags: ['Suppliers', 'Procurement'],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: supplierUpdateSchema,
        response: {
          200: supplierResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: SupplierUpdate;
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params;
      const updateData = request.body;

      // Check if supplier exists
      const existingSupplier = await db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, id),
            eq(suppliers.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!existingSupplier.length) {
        return createNotFoundError('Supplier not found', reply);
      }

      const currentSupplier = existingSupplier[0];
      if (!currentSupplier) {
        return createNotFoundError('Supplier not found', reply);
      }

      const currentMetadata = (currentSupplier.metadata as any) || {};

      // Prepare update object
      const updates: any = {};

      if (updateData.name !== undefined) {
        updates.name = updateData.name;
      }

      if (updateData.email !== undefined) {
        updates.email = updateData.email;
      }

      if (updateData.phone !== undefined) {
        updates.phone = updateData.phone;
      }

      if (updateData.address !== undefined) {
        updates.address = updateData.address;
      }

      if (updateData.city !== undefined) {
        updates.city = updateData.city;
      }

      if (updateData.primaryContactName !== undefined) {
        updates.contactPerson = updateData.primaryContactName;
      }

      // Support contactPerson as alias for backward compatibility
      if ((updateData as any).contactPerson !== undefined) {
        updates.contactPerson = (updateData as any).contactPerson;
      }

      if (updateData.taxId !== undefined) {
        updates.taxId = updateData.taxId;
      }

      if (updateData.paymentTerms !== undefined) {
        updates.paymentTerms = updateData.paymentTerms;
      }

      if (updateData.isActive !== undefined) {
        updates.isActive = updateData.isActive;
      }

      if (updateData.notes !== undefined) {
        updates.notes = updateData.notes;
      }

      // Update metadata fields
      const newMetadata = { ...currentMetadata };
      if (updateData.postalCode !== undefined) {
        newMetadata.postalCode = updateData.postalCode;
      }
      if (updateData.country !== undefined) {
        newMetadata.country = updateData.country;
      }
      if (updateData.leadTimeDays !== undefined) {
        newMetadata.leadTimeDays = updateData.leadTimeDays;
      }
      if (updateData.businessLicense !== undefined) {
        newMetadata.businessLicense = updateData.businessLicense;
      }
      if (updateData.primaryContactPhone !== undefined) {
        newMetadata.primaryContactPhone = updateData.primaryContactPhone;
      }
      if (updateData.rating !== undefined) {
        newMetadata.rating = updateData.rating;
      }

      if (Object.keys(updates).length > 0 || JSON.stringify(newMetadata) !== JSON.stringify(currentMetadata)) {
        updates.metadata = newMetadata;
        updates.updatedAt = new Date();
      }

      // Update supplier
      const updatedSuppliers = await db
        .update(suppliers)
        .set(updates)
        .where(eq(suppliers.id, id))
        .returning();

      const updatedSupplier = updatedSuppliers[0];
      if (!updatedSupplier) {
        throw new Error('Failed to update supplier');
      }

      const responseData = {
        id: updatedSupplier.id,
        tenantId: updatedSupplier.tenantId,
        code: updatedSupplier.code,
        name: updatedSupplier.name,
        email: updatedSupplier.email || '',
        phone: updatedSupplier.phone,
        address: updatedSupplier.address,
        city: updatedSupplier.city,
        postalCode: (updatedSupplier.metadata as any)?.postalCode || null,
        country: (updatedSupplier.metadata as any)?.country || 'Singapore',
        paymentTerms: updatedSupplier.paymentTerms || 30,
        leadTimeDays: (updatedSupplier.metadata as any)?.leadTimeDays || 7,
        taxId: updatedSupplier.taxId,
        businessLicense: (updatedSupplier.metadata as any)?.businessLicense || null,
        primaryContactName: updatedSupplier.contactPerson,
        contactPerson: updatedSupplier.contactPerson, // Alias for backward compatibility
        primaryContactPhone: (updatedSupplier.metadata as any)?.primaryContactPhone || null,
        rating: (updatedSupplier.metadata as any)?.rating || null,
        isActive: updatedSupplier.isActive,
        notes: updatedSupplier.notes,
        totalPurchaseOrders: 0,
        totalSpent: '0.00',
        lastPurchaseOrderDate: null,
        createdAt: updatedSupplier.createdAt,
        updatedAt: updatedSupplier.updatedAt,
      };

      return reply.send(createSuccessResponse(responseData, 'Supplier updated successfully'));
    }
  );

  // ============================================================================
  // DEACTIVATE SUPPLIER
  // ============================================================================

  /**
   * DELETE /api/v1/suppliers/:id
   *
   * Deactivate a supplier (soft delete)
   *
   * Business Rules (from FEATURES.md PROC-006):
   * - Inactive suppliers cannot receive new POs
   * - Supplier is not physically deleted
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Deactivate supplier',
        tags: ['Suppliers', 'Procurement'],
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

      // Check if supplier exists
      const existingSupplier = await db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, id),
            eq(suppliers.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!existingSupplier.length) {
        return createNotFoundError('Supplier not found', reply);
      }

      // Deactivate supplier
      await db
        .update(suppliers)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id));

      return reply.send({
        success: true,
        message: 'Supplier deactivated successfully',
      });
    }
  );

  // ============================================================================
  // SUPPLIER CATALOG MANAGEMENT
  // ============================================================================

  /**
   * POST /api/v1/suppliers/:supplierId/catalog
   *
   * Add product to supplier catalog
   */
  fastify.post(
    '/:supplierId/catalog',
    {
      schema: {
        description: 'Add product to supplier catalog',
        tags: ['Suppliers', 'Procurement'],
        params: z.object({
          supplierId: z.string().uuid(),
        }),
        body: z.object({
          productId: z.string().uuid(),
          supplierSku: z.string().max(100).optional(),
          unitCost: z.number().nonnegative(), // Accept unitCost from test
          uomId: z.string().uuid(),
          leadTimeDays: z.number().int().nonnegative().optional(),
          moq: z.number().nonnegative().optional(), // Accept moq from test
          isPrimary: z.boolean().default(false),
          isActive: z.boolean().default(true),
        }),
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              supplierId: z.string().uuid(),
              productId: z.string().uuid(),
              supplierSku: z.string().nullable(),
              unitCost: z.string(),
              uomId: z.string().uuid(),
              leadTimeDays: z.number().nullable(),
              moq: z.string().nullable(),
              isPrimary: z.boolean(),
              isActive: z.boolean(),
              notes: z.string().nullable(),
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { supplierId: string };
        Body: {
          productId: string;
          supplierSku?: string;
          unitCost: number; // Received as unitCost from test
          uomId: string;
          leadTimeDays?: number;
          moq?: number; // Received as moq from test
          isPrimary?: boolean;
          isActive?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { supplierId } = request.params;
      const catalogData = request.body;

      // Check if supplier exists and belongs to tenant
      const supplier = await db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, supplierId),
            eq(suppliers.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!supplier.length) {
        return createNotFoundError('Supplier not found', reply);
      }

      // Check if product already exists in catalog
      const existingCatalogItem = await db
        .select()
        .from(supplierProducts)
        .where(
          and(
            eq(supplierProducts.supplierId, supplierId),
            eq(supplierProducts.productId, catalogData.productId)
          )
        )
        .limit(1);

      if (existingCatalogItem.length > 0) {
        return createBadRequestError(
          'Product already exists in supplier catalog',
          reply
        );
      }

      // Create catalog item
      const newCatalogItems = await db
        .insert(supplierProducts)
        .values({
          supplierId,
          productId: catalogData.productId,
          supplierSku: catalogData.supplierSku || null,
          unitPrice: catalogData.unitCost.toString(), // Map unitCost to unitPrice
          uomId: catalogData.uomId,
          leadTimeDays: catalogData.leadTimeDays || null,
          minOrderQty: catalogData.moq ? catalogData.moq.toString() : null, // Map moq to minOrderQty
          isPrimary: catalogData.isPrimary ?? false,
          isActive: catalogData.isActive ?? true,
        })
        .returning();

      const catalogItem = newCatalogItems[0];
      if (!catalogItem) {
        throw new Error('Failed to create catalog item');
      }

      return reply.status(201).send(
        createSuccessResponse(
          {
            id: catalogItem.id,
            supplierId: catalogItem.supplierId,
            productId: catalogItem.productId,
            supplierSku: catalogItem.supplierSku,
            unitCost: catalogItem.unitPrice || '0.00', // Return as unitCost for test
            uomId: catalogItem.uomId,
            leadTimeDays: catalogItem.leadTimeDays,
            moq: catalogItem.minOrderQty, // Return as moq for test
            isPrimary: catalogItem.isPrimary,
            isActive: catalogItem.isActive,
            createdAt: catalogItem.createdAt.toISOString(),
            updatedAt: catalogItem.updatedAt.toISOString(),
          },
          'Catalog item added successfully'
        )
      );
    }
  );

  /**
   * PATCH /api/v1/suppliers/:supplierId/catalog/:catalogItemId
   *
   * Update catalog item
   */
  fastify.patch(
    '/:supplierId/catalog/:catalogItemId',
    {
      schema: {
        description: 'Update supplier catalog item',
        tags: ['Suppliers', 'Procurement'],
        params: z.object({
          supplierId: z.string().uuid(),
          catalogItemId: z.string().uuid(),
        }),
        body: z.object({
          supplierSku: z.string().max(100).optional(),
          unitCost: z.number().nonnegative().optional(), // Accept unitCost from test
          uomId: z.string().uuid().optional(),
          leadTimeDays: z.number().int().nonnegative().optional(),
          moq: z.number().nonnegative().optional(), // Accept moq from test
          isPrimary: z.boolean().optional(),
          isActive: z.boolean().optional(),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { supplierId: string; catalogItemId: string };
        Body: {
          supplierSku?: string;
          unitCost?: number; // Received as unitCost from test
          uomId?: string;
          leadTimeDays?: number;
          moq?: number; // Received as moq from test
          isPrimary?: boolean;
          isActive?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { supplierId, catalogItemId } = request.params;
      const updateData = request.body;

      // Check if catalog item exists
      const existingItem = await db
        .select()
        .from(supplierProducts)
        .where(
          and(
            eq(supplierProducts.id, catalogItemId),
            eq(supplierProducts.supplierId, supplierId)
          )
        )
        .limit(1);

      if (!existingItem.length) {
        return createNotFoundError('Catalog item not found', reply);
      }

      // Build update object
      const updates: any = {};
      if (updateData.supplierSku !== undefined) {
        updates.supplierSku = updateData.supplierSku;
      }
      if (updateData.unitCost !== undefined) {
        updates.unitPrice = updateData.unitCost.toString(); // Map unitCost to unitPrice
      }
      if (updateData.uomId !== undefined) {
        updates.uomId = updateData.uomId;
      }
      if (updateData.leadTimeDays !== undefined) {
        updates.leadTimeDays = updateData.leadTimeDays;
      }
      if (updateData.moq !== undefined) {
        updates.minOrderQty = updateData.moq.toString(); // Map moq to minOrderQty
      }
      if (updateData.isPrimary !== undefined) {
        updates.isPrimary = updateData.isPrimary;
      }
      if (updateData.isActive !== undefined) {
        updates.isActive = updateData.isActive;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
      }

      // Update catalog item
      const updatedItems = await db
        .update(supplierProducts)
        .set(updates)
        .where(eq(supplierProducts.id, catalogItemId))
        .returning();

      const updatedItem = updatedItems[0];
      if (!updatedItem) {
        throw new Error('Failed to update catalog item');
      }

      return reply.send(
        createSuccessResponse(
          {
            id: updatedItem.id,
            supplierId: updatedItem.supplierId,
            productId: updatedItem.productId,
            supplierSku: updatedItem.supplierSku,
            unitCost: updatedItem.unitPrice || '0.00', // Return as unitCost for test
            uomId: updatedItem.uomId,
            leadTimeDays: updatedItem.leadTimeDays,
            moq: updatedItem.minOrderQty, // Return as moq for test
            isPrimary: updatedItem.isPrimary,
            isActive: updatedItem.isActive,
            createdAt: updatedItem.createdAt.toISOString(),
            updatedAt: updatedItem.updatedAt.toISOString(),
          },
          'Catalog item updated successfully'
        )
      );
    }
  );
}
