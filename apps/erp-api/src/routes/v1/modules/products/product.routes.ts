import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  createSuccessResponse,
  createPaginatedResponse,
  successResponseSchema,
  createNotFoundError,
  notFoundResponseSchema
} from '../../../../shared/utils/responses.js';
import {
  baseQuerySchema,
  createPaginatedResponseSchema
} from '../../../../shared/utils/schemas.js';
import { buildQueryConditions } from '../../../../shared/utils/query-builder.js';
import { db } from '../../../../config/database.js';
import { products, productKinds, productPacks, uoms } from '../../../../config/schema.js';
import { eq, and, sql, count } from 'drizzle-orm';
import { getTenantId } from '../../../../shared/middleware/auth.js';

// Create schemas from the database schema (single source of truth)
const productInsertSchema = createInsertSchema(products, {
  kind: z.enum(productKinds),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

// Override UUID validation to be less strict
const productSelectSchema = createSelectSchema(products).extend({
  id: z.string(),
  tenantId: z.string(),
  baseUomId: z.string(),
});

// Product with UOM schema for list endpoint
const productWithUomSchema = productSelectSchema.extend({
  baseUom: z.object({
    id: z.string().nullable(),
    code: z.string().nullable(),
    name: z.string().nullable(),
    symbol: z.string().nullable(),
  }).nullable(),
});

// Product filter schema for query params
const productFiltersSchema = z.object({
  kind: z.enum(productKinds).optional(),
  taxCategory: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

// Combined query schema for GET /products
const productQuerySchema = baseQuerySchema.merge(productFiltersSchema);

// Response schemas
const productResponseSchema = successResponseSchema(productSelectSchema);

const productsResponseSchema = createPaginatedResponseSchema(productWithUomSchema);

export function productRoutes(fastify: FastifyInstance) {
  // GET /api/v1/products - List all products
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all products with pagination, sorting, and search',
        tags: ['Products'],
        querystring: productQuerySchema,
        response: {
          200: productsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof productQuerySchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const {
        limit,
        offset,
        sortBy,
        sortOrder,
        search,
        kind,
        taxCategory,
        isActive,
      } = request.query;

      // Build filters object (excluding pagination/sort params)
      const filters: Record<string, unknown> = { tenantId };
      if (kind) filters.kind = kind;
      if (taxCategory) filters.taxCategory = taxCategory;
      if (isActive !== undefined) filters.isActive = isActive;

      // Build query conditions using our query builder
      const queryConditions = buildQueryConditions({
        filters,
        search,
        searchFields: ['name', 'sku', 'description'], // Search in name, sku, and description
        sortBy,
        sortOrder,
        limit,
        offset,
        // Type assertion required: Drizzle's PgTable has deeply nested generic types
        // that are incompatible with our simplified TableOrColumns interface.
        // The runtime behavior is correct as we only access column properties.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        table: products as any,
        allowedSortFields: ['name', 'sku', 'kind', 'isActive', 'createdAt', 'updatedAt'],
      });

      // Get total count
      const countResult = await db
        .select({ value: count() })
        .from(products)
        .where(queryConditions.where);

      const total = countResult[0]?.value ?? 0;

      // Get paginated data with UOM details
      let query = db
        .select({
          id: products.id,
          tenantId: products.tenantId,
          sku: products.sku,
          name: products.name,
          description: products.description,
          kind: products.kind,
          baseUomId: products.baseUomId,
          taxCategory: products.taxCategory,
          standardCost: products.standardCost,
          defaultPrice: products.defaultPrice,
          isPerishable: products.isPerishable,
          shelfLifeDays: products.shelfLifeDays,
          barcode: products.barcode,
          imageUrl: products.imageUrl,
          isActive: products.isActive,
          metadata: products.metadata,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          baseUom: {
            id: uoms.id,
            code: uoms.code,
            name: uoms.name,
            symbol: uoms.symbol,
          },
        })
        .from(products)
        .leftJoin(uoms, eq(products.baseUomId, uoms.id))
        .where(queryConditions.where);

      // Apply sorting if provided
      if (queryConditions.orderBy) {
        // Type assertion required: Drizzle's query builder returns a complex chained type
        // that TypeScript cannot properly infer after orderBy is applied dynamically.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        query = query.orderBy(...queryConditions.orderBy) as any;
      }

      // Apply pagination
      const allProducts = await query.limit(limit).offset(offset);

      return reply.send(createPaginatedResponse(allProducts, total, limit, offset));
    }
  );

  // GET /api/v1/products/:id - Get product by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get product by ID',
        tags: ['Products'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: productResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const product = await db.select().from(products)
        .where(and(eq(products.id, request.params.id), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!product.length) {
        return createNotFoundError('Product not found', reply);
      }

      return reply.send(createSuccessResponse(product[0], 'Product retrieved successfully'));
    }
  );

  // POST /api/v1/products - Create new product
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new product',
        tags: ['Products'],
        body: productInsertSchema,
        response: {
          201: productResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof productInsertSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const newProduct = {
        ...request.body,
        tenantId,
      };

      const result = await db.insert(products).values(newProduct).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Product created successfully'));
    }
  );

  // Product Packs endpoints
  const packInsertSchema = createInsertSchema(productPacks).omit({
    id: true,
    createdAt: true,
  });

  const packUpdateSchema = packInsertSchema.partial();

  const packSelectSchema = createSelectSchema(productPacks);

  // Type aliases for better inference
  type PackUpdateType = z.infer<typeof packUpdateSchema>;
  type PackUpdateRequest = FastifyRequest<{
    Params: { id: string; packId: string };
    Body: PackUpdateType;
  }>;

  const packResponseSchema = z.object({
    success: z.literal(true),
    data: packSelectSchema,
    message: z.string(),
  });

  const packsResponseSchema = z.object({
    success: z.literal(true),
    data: z.array(packSelectSchema),
    message: z.string(),
  });

  // GET /api/v1/products/:id/packs - Get all packs for a product
  fastify.get(
    '/:id/packs',
    {
      schema: {
        description: 'Get all packs for a product',
        tags: ['Products', 'Product Packs'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: packsResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify product exists and belongs to tenant
      const product = await db.select().from(products)
        .where(and(eq(products.id, request.params.id), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!product.length) {
        return createNotFoundError('Product not found', reply);
      }

      // Get packs with UOM information
      const packs = await db
        .select({
          id: productPacks.id,
          productId: productPacks.productId,
          uomId: productPacks.uomId,
          packName: productPacks.packName,
          toBaseFactor: productPacks.toBaseFactor,
          isDefault: productPacks.isDefault,
          createdAt: productPacks.createdAt,
          uom: {
            id: uoms.id,
            name: uoms.name,
            symbol: uoms.symbol,
          },
        })
        .from(productPacks)
        .leftJoin(uoms, eq(productPacks.uomId, uoms.id))
        .where(eq(productPacks.productId, request.params.id));

      return reply.send(createSuccessResponse(packs, 'Product packs retrieved successfully'));
    }
  );

  // POST /api/v1/products/:id/packs - Create a new pack for a product
  fastify.post(
    '/:id/packs',
    {
      schema: {
        description: 'Create a new pack for a product',
        tags: ['Products', 'Product Packs'],
        params: z.object({ id: z.string().uuid() }),
        body: packInsertSchema,
        response: {
          201: packResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof packInsertSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify product exists and belongs to tenant
      const product = await db.select().from(products)
        .where(and(eq(products.id, request.params.id), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!product.length) {
        return createNotFoundError('Product not found', reply);
      }

      const newPack = {
        ...request.body,
        productId: request.params.id,
      };

      const result = await db.insert(productPacks).values(newPack).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Product pack created successfully'));
    }
  );

  // PATCH /api/v1/products/:id/packs/:packId - Update a product pack
  fastify.patch(
    '/:id/packs/:packId',
    {
      schema: {
        description: 'Update a product pack',
        tags: ['Products', 'Product Packs'],
        params: z.object({
          id: z.string().uuid(),
          packId: z.string().uuid(),
        }),
        body: packUpdateSchema,
        response: {
          200: packResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: PackUpdateRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify product exists and belongs to tenant
      const product = await db.select().from(products)
        .where(and(eq(products.id, request.params.id), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!product.length) {
        return createNotFoundError('Product not found', reply);
      }

      const result = await db
        .update(productPacks)
        .set(request.body)
        .where(and(
          eq(productPacks.id, request.params.packId),
          eq(productPacks.productId, request.params.id)
        ))
        .returning();

      if (!result.length) {
        return createNotFoundError('Product pack not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'Product pack updated successfully'));
    }
  );

  // DELETE /api/v1/products/:id/packs/:packId - Delete a product pack
  fastify.delete(
    '/:id/packs/:packId',
    {
      schema: {
        description: 'Delete a product pack',
        tags: ['Products', 'Product Packs'],
        params: z.object({
          id: z.string().uuid(),
          packId: z.string().uuid(),
        }),
        response: {
          200: packResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string; packId: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify product exists and belongs to tenant
      const product = await db.select().from(products)
        .where(and(eq(products.id, request.params.id), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!product.length) {
        return createNotFoundError('Product not found', reply);
      }

      const result = await db
        .delete(productPacks)
        .where(and(
          eq(productPacks.id, request.params.packId),
          eq(productPacks.productId, request.params.id)
        ))
        .returning();

      if (!result.length) {
        return createNotFoundError('Product pack not found', reply);
      }

      return reply.send(createSuccessResponse(result[0], 'Product pack deleted successfully'));
    }
  );

  // GET /api/v1/uom - List all units of measure
  fastify.get(
    '/uom',
    {
      schema: {
        description: 'Get all units of measure',
        tags: ['Products'],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.object({
              id: z.string().uuid(),
              code: z.string(),
              name: z.string(),
              symbol: z.string().optional(),
              kind: z.string().optional(),
              createdAt: z.string().datetime().optional(),
            })),
            message: z.string(),
          }),
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const uomData = await db.select({
        id: uoms.id,
        code: uoms.code,
        name: uoms.name,
        symbol: uoms.symbol,
        kind: uoms.kind,
        createdAt: uoms.createdAt,
      })
        .from(uoms)
        .orderBy(uoms.code);

      // Convert Date objects to strings
      const formattedUomData = uomData.map(uom => ({
        ...uom,
        createdAt: uom.createdAt?.toISOString(),
      }));

      return reply.send(createSuccessResponse(formattedUomData, 'Units of measure retrieved successfully'));
    }
  );

  // GET /api/v1/categories - List all product categories (based on taxCategory field)
  fastify.get(
    '/categories',
    {
      schema: {
        description: 'Get all product categories',
        tags: ['Products'],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.object({
              value: z.string(),
              label: z.string(),
              count: z.number(),
            })),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const categoryData = await db
        .select({
          taxCategory: products.taxCategory,
        })
        .from(products)
        .where(and(
          eq(products.tenantId, tenantId),
          sql`${products.taxCategory} IS NOT NULL`
        ))
        .groupBy(products.taxCategory)
        .orderBy(products.taxCategory);

      const categoriesWithCounts = categoryData.map(cat => ({
        value: cat.taxCategory,
        label: cat.taxCategory ? cat.taxCategory.charAt(0).toUpperCase() + cat.taxCategory.slice(1).replace('_', ' ') : 'Unknown',
        count: 0, // We could add count if needed
      }));

      return reply.send(createSuccessResponse(categoriesWithCounts, 'Product categories retrieved successfully'));
    }
  );
}