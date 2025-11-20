/**
 * Product Variants API Routes (ADM-002)
 *
 * Manages product variants (size, flavor, color) with price differentials.
 * Variants inherit properties from their base product and are used in POS/ordering.
 *
 * @see FEATURES.md Section 12.2 - Product Variants (ADM-002)
 * @module routes/v1/product-variants
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/config/database.js';
import { productVariants, products } from '@/config/schema.js';
import {
  productVariantCreateSchema,
  productVariantUpdateSchema,
  productVariantQuerySchema,
  productVariantResponseSchema,
  productVariantsResponseSchema,
  type ProductVariantCreate,
  type ProductVariantUpdate,
  type ProductVariantQuery,
} from '@contracts';
import { getCurrentUser } from '@/shared/middleware/auth.js';
import {
  createSuccessResponse,
  createNotFoundError,
  createBadRequestError,
} from '@/shared/utils/responses.js';

/**
 * Register product variant routes
 *
 * API Endpoints (from FEATURES.md ADM-002):
 * - POST /api/v1/products/:productId/variants - Create variant for product
 * - GET /api/v1/products/:productId/variants - List variants for product
 * - GET /api/v1/product-variants/:id - Get variant details
 * - PATCH /api/v1/product-variants/:id - Update variant
 * - DELETE /api/v1/product-variants/:id - Delete variant
 */
export function productVariantRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CREATE VARIANT FOR PRODUCT
  // ============================================================================

  /**
   * POST /api/v1/products/:productId/variants
   *
   * Create a new variant for a product
   *
   * Business Rules (from FEATURES.md ADM-002):
   * - Variant name unique per product
   * - Price differential can be positive (upcharge) or negative (discount)
   * - Variants inherit base product properties
   * - Used in POS and online ordering
   *
   * @see FEATURES.md ADM-002 - "Variant creation linked to base product"
   */
  fastify.post(
    '/products/:productId/variants',
    {
      schema: {
        description: 'Create a new product variant',
        tags: ['Product Variants', 'Products'],
        params: z.object({
          productId: z.string().uuid(),
        }),
        body: productVariantCreateSchema.omit({ productId: true }),
        response: {
          201: productVariantResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { productId: string };
        Body: Omit<ProductVariantCreate, 'productId'>;
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { productId } = request.params;
      const createData = request.body;

      // Verify product exists and belongs to tenant
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!product) {
        return createNotFoundError('Product not found', reply);
      }

      // Check if variant name already exists for this product
      const existingVariant = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, productId),
            eq(productVariants.variantName, createData.variantName)
          )
        )
        .limit(1);

      if (existingVariant.length > 0) {
        return createBadRequestError(
          `Variant with name '${createData.variantName}' already exists for this product`,
          reply
        );
      }

      // Create variant
      const now = new Date();
      const [newVariant] = await db
        .insert(productVariants)
        .values({
          productId,
          variantName: createData.variantName,
          priceDifferential: createData.priceDifferential?.toString() || '0',
          barcode: createData.barcode,
          sku: createData.sku,
          isActive: createData.isActive ?? true,
          displayOrder: createData.displayOrder ?? 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!newVariant) {
        return createBadRequestError('Failed to create variant', reply);
      }

      return reply.status(201).send(
        createSuccessResponse(
          {
            ...newVariant,
            createdAt: new Date(newVariant.createdAt),
            updatedAt: new Date(newVariant.updatedAt),
          },
          'Product variant created successfully'
        )
      );
    }
  );

  // ============================================================================
  // LIST VARIANTS FOR PRODUCT
  // ============================================================================

  /**
   * GET /api/v1/products/:productId/variants
   *
   * List all variants for a product
   *
   * Business Rules:
   * - Returns variants ordered by displayOrder
   * - Can filter by active status
   * - Includes variant details with price differentials
   *
   * @see FEATURES.md ADM-002 - "List variants"
   */
  fastify.get(
    '/products/:productId/variants',
    {
      schema: {
        description: 'List variants for a product',
        tags: ['Product Variants', 'Products'],
        params: z.object({
          productId: z.string().uuid(),
        }),
        querystring: productVariantQuerySchema,
        response: {
          200: productVariantsResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { productId: string };
        Querystring: ProductVariantQuery;
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { productId } = request.params;
      const query = request.query;

      // Verify product exists and belongs to tenant
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!product) {
        return createNotFoundError('Product not found', reply);
      }

      // Build where conditions
      const whereConditions = [eq(productVariants.productId, productId)];

      // Apply filters
      if (query.isActive !== undefined) {
        whereConditions.push(eq(productVariants.isActive, query.isActive));
      }

      // Get total count
      const countResult = await db
        .select({ count: productVariants.id })
        .from(productVariants)
        .where(and(...whereConditions));

      const total = countResult.length;

      // Get paginated results
      const limit = query.limit || 50;
      const offset = query.offset || 0;

      const results = await db
        .select()
        .from(productVariants)
        .where(and(...whereConditions))
        .orderBy(productVariants.displayOrder, desc(productVariants.createdAt))
        .limit(limit)
        .offset(offset);

      // Calculate pagination metadata
      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);
      const hasNext = offset + limit < total;
      const hasPrev = offset > 0;

      return reply.send(
        createSuccessResponse(
          {
            items: results.map((variant) => ({
              ...variant,
              createdAt: new Date(variant.createdAt),
              updatedAt: new Date(variant.updatedAt),
            })),
            pagination: {
              total,
              limit,
              offset,
              currentPage,
              totalPages,
              hasNext,
              hasPrev,
            },
          },
          'Product variants retrieved successfully'
        )
      );
    }
  );

  // ============================================================================
  // GET VARIANT BY ID
  // ============================================================================

  /**
   * GET /api/v1/product-variants/:id
   *
   * Get variant details by ID
   *
   * Business Rules:
   * - Variant must belong to product owned by current tenant
   * - Return full variant details
   */
  fastify.get(
    '/product-variants/:id',
    {
      schema: {
        description: 'Get product variant by ID',
        tags: ['Product Variants'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: productVariantResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);

      // Get variant with product to verify tenant
      const result = await db
        .select({
          variant: productVariants,
          productTenantId: products.tenantId,
        })
        .from(productVariants)
        .leftJoin(products, eq(productVariants.productId, products.id))
        .where(eq(productVariants.id, request.params.id))
        .limit(1);

      if (!result.length || !result[0]) {
        return createNotFoundError('Product variant not found', reply);
      }

      const { variant, productTenantId } = result[0];

      // Verify tenant ownership
      if (productTenantId !== currentUser.tenantId) {
        return createNotFoundError('Product variant not found', reply);
      }

      return reply.send(
        createSuccessResponse(
          {
            ...variant,
            createdAt: new Date(variant.createdAt),
            updatedAt: new Date(variant.updatedAt),
          },
          'Product variant retrieved successfully'
        )
      );
    }
  );

  // ============================================================================
  // UPDATE VARIANT
  // ============================================================================

  /**
   * PATCH /api/v1/product-variants/:id
   *
   * Update product variant
   *
   * Business Rules:
   * - Can update name, price differential, barcode, SKU, status, display order
   * - Cannot change product association
   * - Variant must belong to product owned by current tenant
   */
  fastify.patch(
    '/product-variants/:id',
    {
      schema: {
        description: 'Update product variant',
        tags: ['Product Variants'],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: productVariantUpdateSchema,
        response: {
          200: productVariantResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: ProductVariantUpdate;
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const updateData = request.body;

      // Verify variant exists and belongs to tenant (through product)
      const result = await db
        .select({
          variant: productVariants,
          productTenantId: products.tenantId,
        })
        .from(productVariants)
        .leftJoin(products, eq(productVariants.productId, products.id))
        .where(eq(productVariants.id, request.params.id))
        .limit(1);

      if (!result.length || !result[0]) {
        return createNotFoundError('Product variant not found', reply);
      }

      const { variant, productTenantId } = result[0];

      if (productTenantId !== currentUser.tenantId) {
        return createNotFoundError('Product variant not found', reply);
      }

      // If updating variant name, check for uniqueness
      if (updateData.variantName && updateData.variantName !== variant.variantName) {
        const existingVariant = await db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, variant.productId),
              eq(productVariants.variantName, updateData.variantName)
            )
          )
          .limit(1);

        if (existingVariant.length > 0) {
          return createBadRequestError(
            `Variant with name '${updateData.variantName}' already exists for this product`,
            reply
          );
        }
      }

      // Update variant
      const updatePayload: any = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Convert priceDifferential to string if provided
      if (updateData.priceDifferential !== undefined) {
        updatePayload.priceDifferential = updateData.priceDifferential.toString();
      }

      const [updatedVariant] = await db
        .update(productVariants)
        .set(updatePayload)
        .where(eq(productVariants.id, request.params.id))
        .returning();

      if (!updatedVariant) {
        return createBadRequestError('Failed to update variant', reply);
      }

      return reply.send(
        createSuccessResponse(
          {
            ...updatedVariant,
            createdAt: new Date(updatedVariant.createdAt),
            updatedAt: new Date(updatedVariant.updatedAt),
          },
          'Product variant updated successfully'
        )
      );
    }
  );

  // ============================================================================
  // DELETE VARIANT
  // ============================================================================

  /**
   * DELETE /api/v1/product-variants/:id
   *
   * Delete product variant
   *
   * Business Rules:
   * - Physical delete (not soft delete)
   * - Variant must belong to product owned by current tenant
   * - Cannot delete if variant is used in active orders (future enhancement)
   */
  fastify.delete(
    '/product-variants/:id',
    {
      schema: {
        description: 'Delete product variant',
        tags: ['Product Variants'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: productVariantResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);

      // Verify variant exists and belongs to tenant (through product)
      const result = await db
        .select({
          variant: productVariants,
          productTenantId: products.tenantId,
        })
        .from(productVariants)
        .leftJoin(products, eq(productVariants.productId, products.id))
        .where(eq(productVariants.id, request.params.id))
        .limit(1);

      if (!result.length || !result[0]) {
        return createNotFoundError('Product variant not found', reply);
      }

      const { productTenantId } = result[0];

      if (productTenantId !== currentUser.tenantId) {
        return createNotFoundError('Product variant not found', reply);
      }

      // Delete variant
      const [deletedVariant] = await db
        .delete(productVariants)
        .where(eq(productVariants.id, request.params.id))
        .returning();

      if (!deletedVariant) {
        return createBadRequestError('Failed to delete variant', reply);
      }

      return reply.send(
        createSuccessResponse(
          {
            ...deletedVariant,
            createdAt: new Date(deletedVariant.createdAt),
            updatedAt: new Date(deletedVariant.updatedAt),
          },
          'Product variant deleted successfully'
        )
      );
    }
  );
}
