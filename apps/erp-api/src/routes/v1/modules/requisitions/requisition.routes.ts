import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses.js';
import { db } from '../../../../config/database.js';
import { requisitions, requisitionItems, locations, products, uoms, docStatuses } from '../../../../config/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantId, getUserId } from '../../../../shared/middleware/auth.js';

// Requisition Item schemas
const requisitionItemSchema = z.object({
  productId: z.string().uuid(),
  uomId: z.string().uuid(),
  qtyRequested: z.number().positive(),
  notes: z.string().optional(),
});

const requisitionCreateSchema = z.object({
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  requiredDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(requisitionItemSchema).min(1, 'At least one item is required'),
});

const requisitionUpdateSchema = requisitionCreateSchema.partial().omit({ items: true });

type RequisitionQuery = {
  status?: string;
  fromLocationId?: string;
  toLocationId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// Response schemas
const requisitionResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const requisitionsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function requisitionRoutes(fastify: FastifyInstance) {
  // GET /api/v1/requisitions - List all requisitions
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all requisitions',
        tags: ['Requisitions'],
        querystring: z.object({
          status: z.enum(docStatuses.requisition).optional(),
          fromLocationId: z.string().uuid().optional(),
          toLocationId: z.string().uuid().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
        }),
        response: {
          200: requisitionsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { status, fromLocationId, toLocationId, dateFrom, dateTo } = request.query as RequisitionQuery;

      let whereConditions = [eq(requisitions.tenantId, tenantId)];

      if (status) {
        whereConditions.push(eq(requisitions.status, status));
      }

      if (fromLocationId) {
        whereConditions.push(eq(requisitions.fromLocationId, fromLocationId));
      }

      if (toLocationId) {
        whereConditions.push(eq(requisitions.toLocationId, toLocationId));
      }

      if (dateFrom) {
        whereConditions.push(sql`${requisitions.requestedDate} >= ${new Date(dateFrom)}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${requisitions.requestedDate} <= ${new Date(dateTo)}`);
      }

      const allRequisitions = await db.select()
        .from(requisitions)
        .leftJoin(locations, eq(requisitions.fromLocationId, locations.id))
        .where(and(...whereConditions))
        .orderBy(requisitions.requestedDate);

      return reply.send(createSuccessResponse(allRequisitions, 'Requisitions retrieved successfully'));
    }
  );

  // GET /api/v1/requisitions/:id - Get requisition by ID with items
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get requisition by ID with items',
        tags: ['Requisitions'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: requisitionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const requisitionData = await db.select({
        requisition: requisitions,
        fromLocation: locations,
      })
        .from(requisitions)
        .leftJoin(locations, eq(requisitions.fromLocationId, locations.id))
        .where(and(eq(requisitions.id, request.params.id), eq(requisitions.tenantId, tenantId)))
        .limit(1);

      if (!requisitionData.length) {
        return createNotFoundError('Requisition not found', reply);
      }

      const requisition = requisitionData[0];

      // Get items for this requisition
      const items = await db.select()
        .from(requisitionItems)
        .leftJoin(products, eq(requisitionItems.productId, products.id))
        .leftJoin(uoms, eq(requisitionItems.uomId, uoms.id))
        .where(eq(requisitionItems.requisitionId, request.params.id));

      const requisitionWithItems = {
        ...requisition!.requisition,
        fromLocation: (requisition as typeof requisition & { fromLocation?: typeof locations }).fromLocation,
        items,
      };

      return reply.send(createSuccessResponse(requisitionWithItems, 'Requisition retrieved successfully'));
    }
  );

  // POST /api/v1/requisitions - Create new requisition
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new requisition',
        tags: ['Requisitions'],
        body: requisitionCreateSchema,
        response: {
          201: requisitionResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof requisitionCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Generate requisition number
      const reqNumber = `REQ-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      const newRequisition = {
        tenantId,
        reqNumber,
        fromLocationId: request.body.fromLocationId,
        toLocationId: request.body.toLocationId,
        requiredDate: request.body.requiredDate ? new Date(request.body.requiredDate) : null,
        requestedBy: userId,
        notes: request.body.notes,
      };

      const result = await db.transaction(async (tx) => {
        const [requisition] = await tx.insert(requisitions).values(newRequisition).returning();

        // Prepare items
        const reqItems = request.body.items.map(item => ({
          requisitionId: requisition!.id,
          productId: item.productId,
          uomId: item.uomId,
          qtyRequested: item.qtyRequested.toString(),
          notes: item.notes ?? null,
        }));

        await tx.insert(requisitionItems).values(reqItems);

        return {
          ...requisition!,
          items: reqItems,
        };
      });

      return reply.status(201).send(createSuccessResponse(result, 'Requisition created successfully'));
    }
  );

  // PATCH /api/v1/requisitions/:id - Update requisition (draft only)
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update requisition (draft only)',
        tags: ['Requisitions'],
        params: z.object({ id: z.string().uuid() }),
        body: requisitionUpdateSchema,
        response: {
          200: requisitionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<z.infer<typeof requisitionUpdateSchema>> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if requisition exists and is in draft status
      const existingRequisition = await db.select().from(requisitions)
        .where(and(
          eq(requisitions.id, request.params.id),
          eq(requisitions.tenantId, tenantId),
          eq(requisitions.status, 'draft')
        ))
        .limit(1);

      if (!existingRequisition.length) {
        return createNotFoundError('Requisition not found or cannot be edited', reply);
      }

      const result = await db.update(requisitions)
        .set({
          ...request.body,
          requiredDate: request.body.requiredDate ? new Date(request.body.requiredDate) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(requisitions.id, request.params.id), eq(requisitions.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Requisition updated successfully'));
    }
  );

  // POST /api/v1/requisitions/:id/approve - Approve requisition
  fastify.post(
    '/:id/approve',
    {
      schema: {
        description: 'Approve requisition',
        tags: ['Requisitions'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: requisitionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if requisition exists and is in draft status
      const existingRequisition = await db.select().from(requisitions)
        .where(and(
          eq(requisitions.id, request.params.id),
          eq(requisitions.tenantId, tenantId),
          eq(requisitions.status, 'draft')
        ))
        .limit(1);

      if (!existingRequisition.length) {
        return createNotFoundError('Requisition not found or already processed', reply);
      }

      const result = await db.update(requisitions)
        .set({
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(requisitions.id, request.params.id), eq(requisitions.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Requisition approved successfully'));
    }
  );

  // POST /api/v1/requisitions/:id/reject - Reject requisition
  fastify.post(
    '/:id/reject',
    {
      schema: {
        description: 'Reject requisition',
        tags: ['Requisitions'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().min(1, 'Reason is required'),
        }),
        response: {
          200: requisitionResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { reason: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if requisition exists and is in draft status
      const existingRequisition = await db.select().from(requisitions)
        .where(and(
          eq(requisitions.id, request.params.id),
          eq(requisitions.tenantId, tenantId),
          eq(requisitions.status, 'draft')
        ))
        .limit(1);

      if (!existingRequisition.length) {
        return createNotFoundError('Requisition not found or already processed', reply);
      }

      const result = await db.update(requisitions)
        .set({
          status: 'rejected',
          notes: `Rejected: ${request.body.reason}`,
          updatedAt: new Date(),
        })
        .where(and(eq(requisitions.id, request.params.id), eq(requisitions.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Requisition rejected successfully'));
    }
  );
}