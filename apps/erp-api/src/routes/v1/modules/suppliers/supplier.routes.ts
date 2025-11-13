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
import { suppliers } from '../../../../config/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { getTenantId } from '../../../../shared/middleware/auth.js';

// Create schemas from the database schema (single source of truth)
const supplierInsertSchema = createInsertSchema(suppliers).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

const supplierSelectSchema = createSelectSchema(suppliers);

// Supplier filter schema for query params
const supplierFiltersSchema = z.object({
  isActive: z.coerce.boolean().optional(),
});

// Combined query schema for GET /suppliers
const supplierQuerySchema = baseQuerySchema.merge(supplierFiltersSchema);

// Response schemas
const supplierResponseSchema = successResponseSchema(supplierSelectSchema);

const suppliersResponseSchema = createPaginatedResponseSchema(supplierSelectSchema);

export function supplierRoutes(fastify: FastifyInstance) {
  // GET /api/v1/suppliers - List all suppliers
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all suppliers with pagination, sorting, and search',
        tags: ['Suppliers'],
        querystring: supplierQuerySchema,
        response: {
          200: suppliersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof supplierQuerySchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const {
        limit,
        offset,
        sortBy,
        sortOrder,
        search,
        isActive,
      } = request.query;

      // Build filters object (excluding pagination/sort params)
      const filters: Record<string, unknown> = { tenantId };
      if (isActive !== undefined) filters.isActive = isActive;

      // Build query conditions using our query builder
      const queryConditions = buildQueryConditions({
        filters,
        search,
        searchFields: ['name', 'code', 'email', 'phone'], // Search in name, code, email, and phone
        sortBy,
        sortOrder,
        limit,
        offset,
        // Type assertion required: Drizzle's PgTable has deeply nested generic types
        // that are incompatible with our simplified TableOrColumns interface.
        // The runtime behavior is correct as we only access column properties.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        table: suppliers as any,
        allowedSortFields: ['name', 'code', 'email', 'createdAt', 'updatedAt', 'isActive'],
      });

      // Get total count
      const countResult = await db
        .select({ value: count() })
        .from(suppliers)
        .where(queryConditions.where);

      const total = countResult[0]?.value ?? 0;

      // Get paginated data
      let query = db.select().from(suppliers).where(queryConditions.where);

      // Apply sorting if provided
      if (queryConditions.orderBy) {
        // Type assertion required: Drizzle's query builder returns a complex chained type
        // that TypeScript cannot properly infer after orderBy is applied dynamically.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        query = query.orderBy(...queryConditions.orderBy) as any;
      }

      // Apply pagination
      const allSuppliers = await query.limit(limit).offset(offset);

      return reply.send(createPaginatedResponse(allSuppliers, total, limit, offset));
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