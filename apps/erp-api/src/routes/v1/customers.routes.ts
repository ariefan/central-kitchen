import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import {
  createSuccessResponse,
  createPaginatedResponse,
  successResponseSchema,
  createNotFoundError,
  notFoundResponseSchema
} from '@/shared/utils/responses.js';
import {
  baseQuerySchema,
  createPaginatedResponseSchema
} from '@/shared/utils/schemas.js';
import { buildQueryConditions } from '@/shared/utils/query-builder.js';
import { db } from '@/config/database.js';
import { customers } from '@/config/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { getTenantId } from '@/shared/middleware/auth.js';

// Create schemas from the database schema (single source of truth)
const customerInsertSchema = createInsertSchema(customers, {
  // Override fields that need specific validation
  email: z.string().email(),
  phone: z.string().optional(),
}).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

// Customer filter schema for query params
const customerFiltersSchema = z.object({
  isActive: z.coerce.boolean().optional(),
});

// Combined query schema for GET /customers
const customerQuerySchema = baseQuerySchema.merge(customerFiltersSchema);

// Customer response schema
const customerSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  authUserId: z.string().uuid().nullable(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  contactPerson: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  paymentTerms: z.number().nullable(),
  creditLimit: z.string().nullable(),
  isActive: z.boolean(),
  metadata: z.unknown().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Response schemas
const customerResponseSchema = successResponseSchema(customerSchema);

const customersResponseSchema = createPaginatedResponseSchema(customerSchema);

export function customerRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customers - List all customers
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all customers with pagination, sorting, and search',
        tags: ['Customers'],
        querystring: customerQuerySchema,
        response: {
          200: customersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof customerQuerySchema> }>, reply: FastifyReply) => {
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
        searchFields: ['name', 'email', 'phone', 'code'], // Search in name, email, phone, and code
        sortBy,
        sortOrder,
        limit,
        offset,
        // Type assertion required: Drizzle's PgTable has deeply nested generic types
        // that are incompatible with our simplified TableOrColumns interface.
        // The runtime behavior is correct as we only access column properties.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        table: customers as any,
        allowedSortFields: ['name', 'code', 'email', 'createdAt', 'updatedAt', 'isActive'],
      });

      // Get total count
      const countResult = await db
        .select({ value: count() })
        .from(customers)
        .where(queryConditions.where);

      const total = countResult[0]?.value ?? 0;

      // Get paginated data
      let query = db.select().from(customers).where(queryConditions.where);

      // Apply sorting if provided
      if (queryConditions.orderBy) {
        // Type assertion required: Drizzle's query builder returns a complex chained type
        // that TypeScript cannot properly infer after orderBy is applied dynamically.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        query = query.orderBy(...queryConditions.orderBy) as any;
      }

      // Apply pagination
      const allCustomers = await query.limit(limit).offset(offset);

      return reply.send(createPaginatedResponse(allCustomers, total, limit, offset));
    }
  );

  // GET /api/v1/customers/:id - Get specific customer
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get specific customer',
        tags: ['Customers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: customerResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const customer = await db.select().from(customers)
        .where(and(eq(customers.id, request.params.id), eq(customers.tenantId, tenantId)))
        .limit(1);

      if (!customer.length) {
        return createNotFoundError('Customer not found', reply);
      }

      return reply.send(createSuccessResponse(customer[0], 'Customer retrieved successfully'));
    }
  );

  // POST /api/v1/customers - Create new customer
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new customer',
        tags: ['Customers'],
        body: customerInsertSchema,
        response: {
          201: customerResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof customerInsertSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const result = await db.insert(customers).values({
        ...request.body,
        tenantId,
      }).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Customer created successfully'));
    }
  );

  // PATCH /api/v1/customers/:id - Update customer
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update a customer',
        tags: ['Customers'],
        params: z.object({ id: z.string().uuid() }),
        body: customerInsertSchema.partial(),
        response: {
          200: customerResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<z.infer<typeof customerInsertSchema>> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if customer exists
      const existingCustomer = await db.select().from(customers)
        .where(and(eq(customers.id, request.params.id), eq(customers.tenantId, tenantId)))
        .limit(1);

      if (!existingCustomer.length) {
        return createNotFoundError('Customer not found', reply);
      }

      const result = await db.update(customers)
        .set(request.body)
        .where(and(eq(customers.id, request.params.id), eq(customers.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Customer updated successfully'));
    }
  );
  // DELETE /api/v1/customers/:id - Delete/deactivate customer
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete or deactivate customer',
        tags: ['Customers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              code: z.string(),
              isActive: z.boolean(),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if customer exists
      const existingCustomer = await db.select().from(customers)
        .where(and(eq(customers.id, request.params.id), eq(customers.tenantId, tenantId)))
        .limit(1);

      if (!existingCustomer.length) {
        return createNotFoundError('Customer not found', reply);
      }

      // Soft delete by deactivating
      const result = await db.update(customers)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(customers.id, request.params.id), eq(customers.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse({
        id: result[0]!.id,
        code: result[0]!.code,
        isActive: result[0]!.isActive,
      }, 'Customer deactivated successfully'));
    }
  );
}
