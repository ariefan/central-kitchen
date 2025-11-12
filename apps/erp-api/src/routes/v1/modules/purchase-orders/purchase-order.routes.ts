import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses';
import { db } from '../../../../config/database';
import { purchaseOrders, purchaseOrderItems, products, uoms, docStatuses } from '../../../../config/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantId, getUserId } from '../../../../shared/middleware/auth';

// Purchase Order schemas
const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  uomId: z.string().uuid(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().default(0),
  taxRate: z.number().nonnegative().optional().default(0),
  notes: z.string().optional(),
});

const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().uuid(),
  locationId: z.string().uuid(),
  expectedDeliveryDate: z.string().datetime().optional(),
  paymentTerms: z.number().positive().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

const purchaseOrderUpdateSchema = purchaseOrderCreateSchema.partial().omit({ items: true });

// Response schemas
const purchaseOrderResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const purchaseOrdersResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function purchaseOrderRoutes(fastify: FastifyInstance) {
  // GET /api/v1/purchase-orders - List all purchase orders
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all purchase orders',
        tags: ['Purchase Orders'],
        querystring: z.object({
          status: z.enum(docStatuses.purchaseOrder).optional(),
          supplierId: z.string().uuid().optional(),
          locationId: z.string().uuid().optional(),
        }),
        response: {
          200: purchaseOrdersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { status, supplierId, locationId } = request.query as {
        status?: string;
        supplierId?: string;
        locationId?: string;
      };

      let whereConditions = [eq(purchaseOrders.tenantId, tenantId)];

      if (status) {
        whereConditions.push(eq(purchaseOrders.status, status));
      }

      if (supplierId) {
        whereConditions.push(eq(purchaseOrders.supplierId, supplierId));
      }

      if (locationId) {
        whereConditions.push(eq(purchaseOrders.locationId, locationId));
      }

      const allOrders = await db.select().from(purchaseOrders)
        .where(and(...whereConditions))
        .orderBy(purchaseOrders.createdAt);
      return reply.send(createSuccessResponse(allOrders, 'Purchase orders retrieved successfully'));
    }
  );

  // GET /api/v1/purchase-orders/:id - Get purchase order by ID with items
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get purchase order by ID with items',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const purchaseOrder = await db.select().from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, request.params.id), eq(purchaseOrders.tenantId, tenantId)))
        .limit(1);

      if (!purchaseOrder.length) {
        return createNotFoundError('Purchase order not found', reply);
      }

      // Get items for this purchase order
      const items = await db.select()
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .leftJoin(uoms, eq(purchaseOrderItems.uomId, uoms.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, request.params.id));

      const orderWithItems = {
        ...purchaseOrder[0],
        items,
      };

      return reply.send(createSuccessResponse(orderWithItems, 'Purchase order retrieved successfully'));
    }
  );

  // POST /api/v1/purchase-orders - Create new purchase order
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new purchase order',
        tags: ['Purchase Orders'],
        body: purchaseOrderCreateSchema,
        response: {
          201: purchaseOrderResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof purchaseOrderCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Generate PO number
      const orderNumber = `PO-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      const orderItems = request.body.items.map(item => {
        const lineTotal = item.quantity * item.unitPrice;
        const lineDiscount = item.discount || 0;
        const lineSubtotal = lineTotal - lineDiscount;
        const lineTax = lineSubtotal * ((item.taxRate || 0) / 100);
        const finalLineTotal = lineSubtotal + lineTax;

        subtotal += lineSubtotal;
        totalTax += lineTax;

        return {
          ...item,
          lineTotal: finalLineTotal.toString(),
        };
      });

      const totalAmount = subtotal + totalTax;

      const newOrder = {
        tenantId,
        orderNumber,
        supplierId: request.body.supplierId,
        locationId: request.body.locationId,
        expectedDeliveryDate: request.body.expectedDeliveryDate ? new Date(request.body.expectedDeliveryDate) : null,
        status: 'draft',
        subtotal: subtotal.toString(),
        taxAmount: totalTax.toString(),
        totalAmount: totalAmount.toString(),
        paymentTerms: request.body.paymentTerms,
        notes: request.body.notes,
        createdBy: userId,
      };

      const result = await db.transaction(async (tx) => {
        const [order] = await tx.insert(purchaseOrders).values(newOrder).returning();

        // Insert items
        const itemsWithOrderId = orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity.toString(),
          uomId: item.uomId,
          unitPrice: item.unitPrice.toString(),
          discount: item.discount.toString(),
          taxRate: item.taxRate.toString(),
          lineTotal: item.lineTotal.toString(),
          notes: item.notes ?? null,
          purchaseOrderId: order!.id,
        }));

        await tx.insert(purchaseOrderItems).values(itemsWithOrderId);

        return order!;
      });

      return reply.status(201).send(createSuccessResponse(result, 'Purchase order created successfully'));
    }
  );

  // PATCH /api/v1/purchase-orders/:id - Update purchase order (draft only)
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update purchase order (draft only)',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: purchaseOrderUpdateSchema,
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<z.infer<typeof purchaseOrderUpdateSchema>> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if PO exists and is in draft status
      const existingOrder = await db.select().from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.id, request.params.id),
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.status, 'draft')
        ))
        .limit(1);

      if (!existingOrder.length) {
        return createNotFoundError('Purchase order not found or cannot be edited', reply);
      }

      const result = await db.update(purchaseOrders)
        .set({
          ...request.body,
          expectedDeliveryDate: request.body.expectedDeliveryDate ? new Date(request.body.expectedDeliveryDate) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseOrders.id, request.params.id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Purchase order updated successfully'));
    }
  );

  // POST /api/v1/purchase-orders/:id/approve - Approve purchase order
  fastify.post(
    '/:id/approve',
    {
      schema: {
        description: 'Approve purchase order',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if PO exists and is in draft status
      const existingOrder = await db.select().from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.id, request.params.id),
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.status, 'draft')
        ))
        .limit(1);

      if (!existingOrder.length) {
        return createNotFoundError('Purchase order not found or already processed', reply);
      }

      const result = await db.update(purchaseOrders)
        .set({
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseOrders.id, request.params.id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Purchase order approved successfully'));
    }
  );

  // POST /api/v1/purchase-orders/:id/reject - Reject purchase order
  fastify.post(
    '/:id/reject',
    {
      schema: {
        description: 'Reject purchase order',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().min(1, 'Reason is required'),
        }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { reason: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if PO exists and is in draft status
      const existingOrder = await db.select().from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.id, request.params.id),
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.status, 'draft')
        ))
        .limit(1);

      if (!existingOrder.length) {
        return createNotFoundError('Purchase order not found or already processed', reply);
      }

      const result = await db.update(purchaseOrders)
        .set({
          status: 'rejected',
          notes: `Rejected: ${request.body.reason}`,
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseOrders.id, request.params.id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Purchase order rejected successfully'));
    }
  );

  // POST /api/v1/purchase-orders/:id/send - Mark purchase order as sent to supplier
  fastify.post(
    '/:id/send',
    {
      schema: {
        description: 'Mark purchase order as sent to supplier',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          notes: z.string().optional(),
          sentVia: z.enum(['email', 'portal', 'phone', 'fax', 'other']).default('email'),
        }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { notes?: string, sentVia?: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if PO exists and is approved
      const existingOrder = await db.select().from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.id, request.params.id),
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.status, 'approved')
        ))
        .limit(1);

      const [purchaseOrder] = existingOrder;

      if (!purchaseOrder) {
        return createNotFoundError('Purchase order not found or must be approved before sending', reply);
      }

      const sentTimestamp = new Date();
      const existingMetadata = (purchaseOrder.metadata as Record<string, unknown> | null) ?? {};
      const updatedMetadata = {
        ...existingMetadata,
        sent: {
          by: userId,
          via: request.body.sentVia ?? 'email',
          at: sentTimestamp.toISOString(),
        },
      };

      const result = await db.update(purchaseOrders)
        .set({
          status: 'sent',
          notes: request.body.notes ?? purchaseOrder.notes ?? null,
          metadata: updatedMetadata,
          updatedAt: sentTimestamp,
        })
        .where(and(eq(purchaseOrders.id, request.params.id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Purchase order sent to supplier successfully'));
    }
  );

  // POST /api/v1/purchase-orders/:id/cancel - Cancel purchase order
  fastify.post(
    '/:id/cancel',
    {
      schema: {
        description: 'Cancel purchase order',
        tags: ['Purchase Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string().min(1, 'Reason is required'),
        }),
        response: {
          200: purchaseOrderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { reason: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if PO exists and can be cancelled (not already received or completed)
      const existingOrder = await db.select().from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.id, request.params.id),
          eq(purchaseOrders.tenantId, tenantId),
          sql`${purchaseOrders.status} NOT IN ('received', 'completed')`
        ))
        .limit(1);

      if (!existingOrder.length) {
        return createNotFoundError('Purchase order not found or cannot be cancelled', reply);
      }

      const result = await db.update(purchaseOrders)
        .set({
          status: 'cancelled',
          notes: `Cancelled: ${request.body.reason}`,
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseOrders.id, request.params.id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Purchase order cancelled successfully'));
    }
  );
}
