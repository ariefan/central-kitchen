import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses.js';
import { db } from '../../../../config/database.js';
import { suppliers } from '../../../../config/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantId } from '../../../../shared/middleware/auth.js';
import { PaginatedResponse } from '../../../../shared/types/index.js';

// Create schemas from the database schema (single source of truth)
const supplierInsertSchema = createInsertSchema(suppliers).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

const supplierSelectSchema = createSelectSchema(suppliers);

// Response schemas
const supplierResponseSchema = z.object({
  success: z.literal(true),
  data: supplierSelectSchema,
  message: z.string(),
});

const suppliersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(supplierSelectSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
  message: z.string(),
});

export function supplierRoutes(fastify: FastifyInstance) {
  // GET /api/v1/suppliers - List all suppliers
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all suppliers with pagination',
        tags: ['Suppliers'],
        querystring: z.object({
          isActive: z.coerce.boolean().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        }),
        response: {
          200: suppliersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { isActive, search, limit, offset } = request.query as {
        isActive?: boolean;
        search?: string;
        limit?: number;
        offset?: number;
      };

      let whereConditions = [eq(suppliers.tenantId, tenantId)];

      if (isActive !== undefined) {
        whereConditions.push(eq(suppliers.isActive, isActive));
      }

      if (search) {
        whereConditions.push(sql`${suppliers.name} ILIKE ${'%' + search + '%'} OR ${suppliers.code} ILIKE ${'%' + search + '%'}`);
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(suppliers)
        .where(and(...whereConditions));

      const totalCount = Number(totalCountResult[0]?.count ?? 0);

      // Get paginated suppliers
      const paginatedSuppliers = await db.select().from(suppliers)
        .where(and(...whereConditions))
        .orderBy(suppliers.name)
        .limit(limit ?? 100)
        .offset(offset ?? 0);

      const paginatedResponse: PaginatedResponse<typeof paginatedSuppliers[0]> = {
        items: paginatedSuppliers,
        total: totalCount,
        limit: limit ?? 100,
        offset: offset ?? 0,
      };

      return reply.send(createSuccessResponse(paginatedResponse, 'Suppliers retrieved successfully'));
    }
  );

  // GET /api/v1/suppliers/:id - Get supplier by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get supplier by ID',
        tags: ['Suppliers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: supplierResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const supplier = await db.select().from(suppliers)
        .where(and(eq(suppliers.id, request.params.id), eq(suppliers.tenantId, tenantId)))
        .limit(1);

      if (!supplier.length) {
        return createNotFoundError('Supplier not found', reply);
      }

      return reply.send(createSuccessResponse(supplier[0], 'Supplier retrieved successfully'));
    }
  );

  // POST /api/v1/suppliers - Create new supplier
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new supplier',
        tags: ['Suppliers'],
        body: supplierInsertSchema,
        response: {
          201: supplierResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof supplierInsertSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const newSupplier = {
        ...request.body,
        tenantId,
      };

      const result = await db.insert(suppliers).values(newSupplier).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Supplier created successfully'));
    }
  );

  // PATCH /api/v1/suppliers/:id - Update supplier
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update supplier',
        tags: ['Suppliers'],
        params: z.object({ id: z.string().uuid() }),
        body: supplierInsertSchema.partial(),
        response: {
          200: supplierResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<z.infer<typeof supplierInsertSchema>> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if supplier exists
      const existingSupplier = await db.select().from(suppliers)
        .where(and(eq(suppliers.id, request.params.id), eq(suppliers.tenantId, tenantId)))
        .limit(1);

      if (!existingSupplier.length) {
        return createNotFoundError('Supplier not found', reply);
      }

      const result = await db.update(suppliers)
        .set({
          ...request.body,
          updatedAt: new Date(),
        })
        .where(and(eq(suppliers.id, request.params.id), eq(suppliers.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Supplier updated successfully'));
    }
  );
}