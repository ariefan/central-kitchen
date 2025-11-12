import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses';
import { db } from '../../../../config/database';
import { deliveries, orders, customers, addresses } from '../../../../config/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantId } from '../../../../shared/middleware/auth';

// Delivery status enum
const deliveryStatuses = ['requested', 'assigned', 'picked_up', 'delivered', 'failed'] as const;

// Address schemas
const addressCreateSchema = z.object({
  customerId: z.string().uuid(),
  label: z.string().max(64).optional(),
  line1: z.string().max(255).min(1, 'Address line 1 is required'),
  line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  lat: z.string().optional(),
  lon: z.string().optional(),
  isDefault: z.boolean().default(false),
});

// Delivery schemas
const deliveryCreateSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.string().max(64).optional(),
  trackingCode: z.string().max(128).optional(),
  fee: z.number().min(0).default(0).transform(val => val.toString()),
});

const deliveryUpdateSchema = z.object({
  status: z.enum(deliveryStatuses).optional(),
  provider: z.string().max(64).optional(),
  trackingCode: z.string().max(128).optional(),
  fee: z.number().min(0).optional().transform(val => val?.toString()),
});

// Query types
type DeliveryQuery = {
  status?: string;
  provider?: string;
  orderId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// Response schemas
const deliveryResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const deliveriesResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function deliveryRoutes(fastify: FastifyInstance) {
  // Simple delivery management endpoints

  // GET /api/v1/deliveries - List all deliveries
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all deliveries',
        tags: ['Deliveries'],
        querystring: z.object({
          status: z.enum(deliveryStatuses).optional(),
          provider: z.string().max(64).optional(),
          orderId: z.string().uuid().optional(),
          customerId: z.string().uuid().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
        }),
        response: {
          200: deliveriesResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { status, provider, orderId, customerId, dateFrom, dateTo } = request.query as DeliveryQuery;

      let whereConditions = [eq(orders.tenantId, tenantId)];

      if (status) {
        whereConditions.push(eq(deliveries.status, status));
      }

      if (provider) {
        whereConditions.push(eq(deliveries.provider, provider));
      }

      if (orderId) {
        whereConditions.push(eq(deliveries.orderId, orderId));
      }

      if (customerId) {
        whereConditions.push(eq(orders.customerId, customerId));
      }

      if (dateFrom) {
        whereConditions.push(sql`${deliveries.updatedAt} >= ${new Date(dateFrom)}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${deliveries.updatedAt} <= ${new Date(dateTo)}`);
      }

      const allDeliveries = await db.select()
        .from(deliveries)
        .innerJoin(orders, eq(deliveries.orderId, orders.id))
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(and(...whereConditions))
        .orderBy(deliveries.updatedAt);

      return reply.send(createSuccessResponse(allDeliveries, 'Deliveries retrieved successfully'));
    }
  );

  // GET /api/v1/deliveries/:id - Get delivery by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get delivery by ID',
        tags: ['Deliveries'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: deliveryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const deliveryData = await db.select()
        .from(deliveries)
        .innerJoin(orders, eq(deliveries.orderId, orders.id))
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(and(
          eq(deliveries.id, request.params.id),
          eq(orders.tenantId, tenantId)
        ))
        .limit(1);

      if (!deliveryData.length) {
        return createNotFoundError('Delivery not found', reply);
      }

      // Extract delivery object from joined result
      const deliveryRecord = {
        deliveries: deliveryData[0]!.deliveries,
        orders: deliveryData[0]!.orders,
        customers: deliveryData[0]!.customers ?? null,
      };

      return reply.send(createSuccessResponse(deliveryRecord, 'Delivery retrieved successfully'));
    }
  );

  // POST /api/v1/deliveries - Create new delivery
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new delivery',
        tags: ['Deliveries'],
        body: deliveryCreateSchema,
        response: {
          201: deliveryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Body: z.infer<typeof deliveryCreateSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify order exists and belongs to tenant
      const orderCheck = await db.select()
        .from(orders)
        .where(and(
          eq(orders.id, request.body.orderId),
          eq(orders.tenantId, tenantId)
        ))
        .limit(1);

      if (!orderCheck.length) {
        return createNotFoundError('Order not found', reply);
      }

      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx.insert(deliveries)
          .values({
            ...request.body,
            orderId: request.body.orderId,
          })
          .returning();

        return delivery;
      });

      return reply.status(201).send(createSuccessResponse(result, 'Delivery created successfully'));
    }
  );

  // PATCH /api/v1/deliveries/:id - Update delivery status
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update delivery status',
        tags: ['Deliveries'],
        params: z.object({ id: z.string().uuid() }),
        body: deliveryUpdateSchema,
        response: {
          200: deliveryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: z.infer<typeof deliveryUpdateSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify delivery exists and belongs to tenant
      const deliveryCheck = await db.select()
        .from(deliveries)
        .innerJoin(orders, eq(deliveries.orderId, orders.id))
        .where(and(
          eq(deliveries.id, request.params.id),
          eq(orders.tenantId, tenantId)
        ))
        .limit(1);

      if (!deliveryCheck.length) {
        return createNotFoundError('Delivery not found', reply);
      }

      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx.update(deliveries)
          .set({
            ...request.body,
            updatedAt: new Date(),
          })
          .where(eq(deliveries.id, request.params.id))
          .returning();

        // If delivered, update order status to reflect completion
        if (request.body.status === 'delivered') {
          await tx.update(orders)
            .set({
              updatedAt: new Date(),
            })
            .where(eq(orders.id, delivery!.orderId));
        }

        return delivery;
      });

      return reply.send(createSuccessResponse(result, 'Delivery updated successfully'));
    }
  );

  // Customer Address Management (simplified)

  // GET /api/v1/addresses - Get all addresses (with customer filter)
  fastify.get(
    '/addresses',
    {
      schema: {
        description: 'Get customer addresses',
        tags: ['Deliveries'],
        querystring: z.object({
          customerId: z.string().uuid().optional(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.any()),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { customerId } = request.query as { customerId?: string };

      let whereConditions = [eq(customers.tenantId, tenantId)];

      if (customerId) {
        whereConditions.push(eq(addresses.customerId, customerId));
      }

      const customerAddresses = await db.select()
        .from(addresses)
        .innerJoin(customers, eq(addresses.customerId, customers.id))
        .where(and(...whereConditions))
        .orderBy(addresses.isDefault, addresses.createdAt);

      return reply.send(createSuccessResponse(customerAddresses, 'Customer addresses retrieved successfully'));
    }
  );

  // POST /api/v1/addresses - Create new address
  fastify.post(
    '/addresses',
    {
      schema: {
        description: 'Create new customer address',
        tags: ['Deliveries'],
        body: addressCreateSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.any(),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Body: z.infer<typeof addressCreateSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify customer exists and belongs to tenant
      const customerCheck = await db.select()
        .from(customers)
        .where(and(
          eq(customers.id, request.body.customerId),
          eq(customers.tenantId, tenantId)
        ))
        .limit(1);

      if (!customerCheck.length) {
        return createNotFoundError('Customer not found', reply);
      }

      const result = await db.transaction(async (tx) => {
        // If setting as default, unset other default addresses
        if (request.body.isDefault) {
          await tx.update(addresses)
            .set({ isDefault: false })
            .where(eq(addresses.customerId, request.body.customerId));
        }

        const [address] = await tx.insert(addresses)
          .values({
            ...request.body,
            customerId: request.body.customerId,
          })
          .returning();

        return address;
      });

      return reply.status(201).send(createSuccessResponse(result, 'Address created successfully'));
    }
  );
}