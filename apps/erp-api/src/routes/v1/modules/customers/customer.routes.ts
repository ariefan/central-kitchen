import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses';
import { db } from '../../../../config/database';
import { customers } from '../../../../config/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantId } from '../../../../shared/middleware/auth';
import { PaginatedResponse } from '../../../../shared/types';

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

// Simple response schemas for now
const customerResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const customersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(z.any()),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
  message: z.string(),
});

export function customerRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customers - List all customers
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all customers with pagination',
        tags: ['Customers'],
        querystring: z.object({
          search: z.string().optional(),
          isActive: z.boolean().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        }),
        response: {
          200: customersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { search, isActive, limit, offset } = request.query as {
        search?: string;
        isActive?: boolean;
        limit?: number;
        offset?: number;
      };

      // Build where conditions
      const whereConditions = [eq(customers.tenantId, tenantId)];

      if (isActive !== undefined) {
        whereConditions.push(eq(customers.isActive, isActive));
      }

      if (search) {
        whereConditions.push(sql`(${customers.name} ILIKE ${'%' + search + '%'} OR ${customers.email} ILIKE ${'%' + search + '%'} OR ${customers.phone} ILIKE ${'%' + search + '%'})`);
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(and(...whereConditions));

      const totalCount = Number(totalCountResult[0]?.count ?? 0);

      // Get paginated customers
      const paginatedCustomers = await db
        .select()
        .from(customers)
        .where(and(...whereConditions))
        .orderBy(customers.name)
        .limit(limit ?? 100)
        .offset(offset ?? 0);

      const paginatedResponse: PaginatedResponse<typeof paginatedCustomers[0]> = {
        items: paginatedCustomers,
        total: totalCount,
        limit: limit ?? 100,
        offset: offset ?? 0,
      };

      return reply.send(createSuccessResponse(paginatedResponse, 'Customers retrieved successfully'));
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
}