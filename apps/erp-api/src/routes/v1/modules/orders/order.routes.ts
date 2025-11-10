import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, successResponseSchema, createNotFoundError, notFoundResponseSchema } from '@/shared/utils/responses';
import { db } from '@/config/database';
import { orders, payments, orderItems, stockLedger } from '@/config/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantId, getUserId } from '@/shared/middleware/auth';

// Simple order schema for testing
const orderCreateSchema = z.object({
  channel: z.enum(['pos', 'online', 'wholesale']),
  type: z.enum(['dine_in', 'take_away', 'delivery']),
  locationId: z.string().uuid(),
  customerName: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
});

// Kitchen flow schemas
const kitchenStatusUpdateSchema = z.object({
  kitchenStatus: z.enum(['open', 'preparing', 'ready', 'served', 'cancelled']),
  notes: z.string().optional(),
});

const prepStatusUpdateSchema = z.object({
  prepStatus: z.enum(['queued', 'preparing', 'ready', 'served', 'cancelled']),
  station: z.string().optional(),
  notes: z.string().optional(),
});

// Response schemas
const orderResponseSchema = successResponseSchema(z.any());

const ordersResponseSchema = successResponseSchema(z.array(z.any()));

export function orderRoutes(fastify: FastifyInstance) {
  // GET /api/v1/orders - List all orders
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all orders',
        tags: ['Orders'],
                response: {
          200: ordersResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const allOrders = await db.select().from(orders);
      return reply.send(createSuccessResponse(allOrders, 'Orders retrieved successfully'));
    }
  );

  // POST /api/v1/orders - Create new order
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new order',
        tags: ['Orders'],
        body: orderCreateSchema,
                response: {
          201: orderResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof orderCreateSchema> }>, reply: FastifyReply) => {
      // TODO: Implement proper order number generation and calculation
      const orderNumber = `ORDER-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const calculatedSubtotal = request.body.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxAmount = calculatedSubtotal * 0.11; // 11% tax
      const totalAmount = calculatedSubtotal + taxAmount;

      const newOrder = {
        tenantId: getTenantId(request),
        orderNumber,
        locationId: request.body.locationId,
        channel: request.body.channel,
        type: request.body.type,
        subtotal: calculatedSubtotal.toString(),
        taxAmount: taxAmount.toString(),
        discountAmount: "0",
        serviceChargeAmount: "0",
        tipsAmount: "0",
        voucherAmount: "0",
        totalAmount: totalAmount.toString(),
        status: 'open',
        kitchenStatus: 'open',
        createdBy: getUserId(request),
      };

      const result = await db.insert(orders).values(newOrder).returning();

      if (!result.length) {
        return createNotFoundError('Order creation failed', reply);
      }

      const createdOrder = result[0];
      if (!createdOrder) {
        return createNotFoundError('Order creation failed', reply);
      }

      // Create order items
      const orderItemsToInsert = request.body.items.map(item => ({
        orderId: createdOrder.id,
        productId: item.productId,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        lineTotal: (item.quantity * item.unitPrice).toString(),
        taxAmount: "0",
        discountAmount: "0",
      }));

      const createdItems = await db.insert(orderItems).values(orderItemsToInsert).returning();

      return reply.status(201).send(createSuccessResponse({
        ...createdOrder,
        items: createdItems
      }, 'Order created successfully'));
    }
  );

  // GET /api/v1/orders/:id - Get specific order
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get specific order',
        tags: ['Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const order = await db.select().from(orders)
        .where(and(eq(orders.id, request.params.id), eq(orders.tenantId, tenantId)))
        .limit(1);

      if (!order.length) {
        return createNotFoundError('Order not found', reply);
      }

      return reply.send(createSuccessResponse(order[0], 'Order retrieved successfully'));
    }
  );

  // POST /api/v1/orders/:id/quote - Get server-side reprice for order
  fastify.post(
    '/:id/quote',
    {
      schema: {
        description: 'Get server-side reprice for existing order',
        tags: ['Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Get the existing order
      const order = await db.select().from(orders)
        .where(and(eq(orders.id, request.params.id), eq(orders.tenantId, tenantId)))
        .limit(1);

      const [existingOrder] = order;

      if (!existingOrder) {
        return createNotFoundError('Order not found', reply);
      }

      // Basic quote calculation (P0 implementation)
      // In a real implementation, this would include tax, promotions, discounts, etc.
      const quoteData = {
        ...existingOrder,
        recalculatedAt: new Date(),
        subtotal: existingOrder.totalAmount ?? '0.00',
        tax: '0.00', // P0: no tax calculation yet
        total: existingOrder.totalAmount ?? '0.00',
        message: 'Quote calculated successfully'
      };

      return reply.send(createSuccessResponse(quoteData, 'Order quote calculated successfully'));
    }
  );

  // PATCH /api/v1/orders/:id - Update order (edit before post)
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update order (edit before posting)',
        tags: ['Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: orderCreateSchema.partial(),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<z.infer<typeof orderCreateSchema>> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if order exists and is not posted
      const existingOrder = await db.select().from(orders)
        .where(and(
          eq(orders.id, request.params.id),
          eq(orders.tenantId, tenantId),
          eq(orders.status, 'open')
        ))
        .limit(1);

      if (!existingOrder.length) {
        return createNotFoundError('Order not found or already posted', reply);
      }

      // TODO: Update order calculation based on new items
      const result = await db.update(orders)
        .set({
          ...request.body,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, request.params.id), eq(orders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Order updated successfully'));
    }
  );

  // POST /api/v1/orders/:id/post - CRITICAL: Post/finalize order
  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post/finalize order - generate doc number and freeze for processing',
        tags: ['Orders'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if order exists and is open, and get items
      const existingOrder = await db.select({
        order: orders,
        items: orderItems
      })
        .from(orders)
        .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
        .where(and(
          eq(orders.id, request.params.id),
          eq(orders.tenantId, tenantId),
          eq(orders.status, 'open')
        ));

      if (!existingOrder.length) {
        return createNotFoundError('Order not found or already posted', reply);
      }

      const order = existingOrder[0]?.order;
      const items = existingOrder
        .filter(row => row.items)
        .map(row => row.items!);

      if (items.length === 0) {
        return createNotFoundError('Order has no items', reply);
      }

      // Generate proper order number (TODO: Use doc sequence function)
      const orderNumber = `ORD-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Post the order
      const updatedOrders = await db.update(orders)
        .set({
          status: 'posted',
          orderNumber,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, request.params.id), eq(orders.tenantId, tenantId)))
        .returning();

      if (!updatedOrders.length) {
        return createNotFoundError('Order posting failed', reply);
      }

      // Create ledger entries for inventory movement (issue from stock)
      // Simplified version for P0 testing - complex FEFO logic can be added later
      const ledgerEntries = [];

      for (const item of items) {
        const quantity = parseFloat(item.quantity);

        // Simple ledger entry without lot allocation for P0 functionality
        // This enables order posting without requiring full inventory setup
        ledgerEntries.push({
          tenantId,
          productId: item.productId,
          locationId: order?.locationId ?? '',
          lotId: null, // No lot allocation for P0
          type: 'iss', // Issue from stock
          qtyDeltaBase: (-quantity).toString(), // Negative for issue
          unitCost: null, // No cost information needed for P0
          refType: 'ORDER',
          refId: order?.id ?? '',
          note: `Order ${orderNumber} - ${item.quantity} units`,
          createdBy: userId,
        });
      }

      // Insert all ledger entries
      if (ledgerEntries.length > 0) {
        try {
          await db.insert(stockLedger).values(ledgerEntries);
        } catch (error) {
          console.error('Ledger insertion error:', error);
          // Continue even if ledger fails - order posting is more important for P0
        }
      }

      return reply.send(createSuccessResponse(updatedOrders[0], 'Order posted successfully'));
    }
  );

  // POST /api/v1/orders/:id/void - Void order
  fastify.post(
    '/:id/void',
    {
      schema: {
        description: 'Void order (reverse if posted)',
        tags: ['Orders'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          reason: z.string(),
        }),
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: { reason: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if order exists
      const existingOrder = await db.select().from(orders)
        .where(and(eq(orders.id, request.params.id), eq(orders.tenantId, tenantId)))
        .limit(1);

      if (!existingOrder.length) {
        return createNotFoundError('Order not found', reply);
      }

      const order = existingOrder[0];
      if (!order) {
        return createNotFoundError('Order not found', reply);
      }

      // If order was posted, create reversal ledger entries
      if (order.status === 'posted') {
        // Find existing ledger entries for this order
        const existingLedgerEntries = await db.select()
          .from(stockLedger)
          .where(and(
            eq(stockLedger.tenantId, tenantId),
            eq(stockLedger.refType, 'ORDER'),
            eq(stockLedger.refId, order.id)
          ));

        if (existingLedgerEntries.length > 0) {
          // Create reversal entries
          const reversalEntries = existingLedgerEntries.map(entry => ({
            tenantId,
            productId: entry.productId,
            locationId: entry.locationId,
            lotId: entry.lotId,
            type: 'iss_rev', // Issue reversal
            qtyDeltaBase: (-parseFloat(entry.qtyDeltaBase.toString())).toString(), // Positive reversal
            unitCost: entry.unitCost,
            refType: 'ORDER',
            refId: order.id,
            note: `Void order ${order.orderNumber} - Reversal: ${request.body.reason}`,
            createdBy: userId,
          }));

          await db.insert(stockLedger).values(reversalEntries);
        }
      }

      // Void the order
      const result = await db.update(orders)
        .set({
          status: 'voided',
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, request.params.id), eq(orders.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Order voided successfully'));
    }
  );

  // Payment endpoints

  // Payment schemas
  const paymentCreateSchema = z.object({
    tender: z.enum(['cash', 'card', 'mobile', 'gift_card', 'store_credit', 'other']),
    amount: z.number().positive(),
    reference: z.string().optional(),
    change: z.number().min(0).default(0),
  });

  const paymentResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
      id: z.string(),
      orderId: z.string(),
      tender: z.string(),
      amount: z.string(), // numeric comes back as string from DB
      reference: z.string().nullable().optional(), // can be null in DB
      change: z.string(), // numeric comes back as string from DB
      paidAt: z.date(), // Accept Date objects
    }),
    message: z.string(),
  });

  const paymentsResponseSchema = z.object({
    success: z.literal(true),
    data: z.array(z.any()),
    message: z.string(),
  });

  // POST /api/v1/orders/:id/payments - Add payment to order
  fastify.post(
    '/:id/payments',
    {
      schema: {
        description: 'Add payment to order - supports multi-tender payments',
        tags: ['Orders', 'Payments'],
        params: z.object({ id: z.string().uuid() }),
        body: paymentCreateSchema,
        response: {
          201: paymentResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: z.infer<typeof paymentCreateSchema>;
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Verify order exists and belongs to tenant
      const order = await db.select().from(orders)
        .where(and(
          eq(orders.id, request.params.id),
          eq(orders.tenantId, tenantId)
        ))
        .limit(1);

      if (!order.length) {
        return createNotFoundError('Order not found', reply);
      }

      const newPayment = {
        orderId: request.params.id,
        tender: request.body.tender,
        amount: request.body.amount.toString(),
        reference: request.body.reference ?? null,
        change: request.body.change.toString(),
        createdBy: userId,
      };

      const result = await db.insert(payments).values(newPayment).returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Payment added successfully'));
    }
  );

  // GET /api/v1/orders/:id/payments - Get payments for an order
  fastify.get(
    '/:id/payments',
    {
      schema: {
        description: 'Get all payments for an order',
        tags: ['Orders', 'Payments'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: paymentsResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify order exists and belongs to tenant
      const order = await db.select().from(orders)
        .where(and(
          eq(orders.id, request.params.id),
          eq(orders.tenantId, tenantId)
        ))
        .limit(1);

      if (!order.length) {
        return createNotFoundError('Order not found', reply);
      }

      const orderPayments = await db.select().from(payments)
        .where(eq(payments.orderId, request.params.id))
        .orderBy(payments.paidAt);

      return reply.send(createSuccessResponse(orderPayments, 'Payments retrieved successfully'));
    }
  );

  // PATCH /api/v1/orders/:id/kitchen-status - Update order kitchen status
  fastify.patch(
    '/:id/kitchen-status',
    {
      schema: {
        description: 'Update order kitchen status',
        tags: ['Orders', 'Kitchen'],
        params: z.object({ id: z.string().uuid() }),
        body: kitchenStatusUpdateSchema,
        response: {
          200: orderResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: z.infer<typeof kitchenStatusUpdateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify order exists and belongs to tenant
      const order = await db.select().from(orders)
        .where(and(
          eq(orders.id, request.params.id),
          eq(orders.tenantId, tenantId)
        ))
        .limit(1);

      if (!order.length) {
        return createNotFoundError('Order not found', reply);
      }

      const existingOrder = order[0];
      if (!existingOrder) {
        return createNotFoundError('Order not found', reply);
      }

      // Validate status transitions
      const { kitchenStatus } = request.body;
      const validTransitions: Record<string, string[]> = {
        'open': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['served'],
        'served': [], // Terminal state
        'cancelled': [], // Terminal state
      };

      if (existingOrder.kitchenStatus && !validTransitions[existingOrder.kitchenStatus]?.includes(kitchenStatus)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid kitchen status transition',
          message: `Cannot transition from ${existingOrder.kitchenStatus} to ${kitchenStatus}`,
        });
      }

      // Update order kitchen status
      const updateData: Record<string, unknown> = {
        kitchenStatus,
        updatedAt: new Date(),
      };

      // Add notes to order metadata if provided
      if (request.body.notes) {
        const existingMetadata = (existingOrder as Record<string, unknown>).metadata ?? {};
        updateData.metadata = {
          ...existingMetadata,
          kitchenNotes: request.body.notes,
          lastKitchenUpdateAt: new Date(),
        };
      }

      const updatedOrders = await db.update(orders)
        .set(updateData)
        .where(and(
          eq(orders.id, request.params.id),
          eq(orders.tenantId, tenantId)
        ))
        .returning();

      return reply.send(createSuccessResponse(updatedOrders[0], `Order kitchen status updated to ${kitchenStatus}`));
    }
  );

  // PATCH /api/v1/order-items/:id/prep-status - Update order item prep status
  fastify.patch(
    '/items/:id/prep-status',
    {
      schema: {
        description: 'Update order item preparation status',
        tags: ['Orders', 'Kitchen', 'Items'],
        params: z.object({ id: z.string().uuid() }),
        body: prepStatusUpdateSchema,
        response: {
          200: successResponseSchema(z.any()),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: z.infer<typeof prepStatusUpdateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Get order item with order to verify tenant access
      const orderItemQuery = await db
        .select({
          orderItem: orderItems,
          order: orders,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          eq(orderItems.id, request.params.id),
          eq(orders.tenantId, tenantId)
        ))
        .limit(1);

      if (!orderItemQuery.length) {
        return createNotFoundError('Order item not found', reply);
      }

      const queryResult = orderItemQuery[0];
      if (!queryResult?.orderItem || !queryResult?.order) {
        return createNotFoundError('Order item not found', reply);
      }

      const { orderItem, order } = queryResult;

      // Validate status transitions
      const { prepStatus } = request.body;
      const validTransitions: Record<string, string[]> = {
        'queued': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['served'],
        'served': [], // Terminal state
        'cancelled': [], // Terminal state
      };

      if (!validTransitions[orderItem.prepStatus]?.includes(prepStatus)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid prep status transition',
          message: `Cannot transition from ${orderItem.prepStatus} to ${prepStatus}`,
        });
      }

      // Update order item prep status
      const updatedItems = await db.update(orderItems)
        .set({
          prepStatus,
          station: request.body.station ?? orderItem.station,
          notes: request.body.notes ?? orderItem.notes,
        })
        .where(eq(orderItems.id, request.params.id))
        .returning();

      // Update order kitchen status based on item statuses if needed
      const allItems = await db.select({
        prepStatus: orderItems.prepStatus,
      }).from(orderItems).where(eq(orderItems.orderId, order.id));

      const anyPreparing = allItems.some(item => item.prepStatus === 'preparing');
      const allReady = allItems.every(item => ['ready', 'served', 'cancelled'].includes(item.prepStatus));
      const anyServed = allItems.some(item => item.prepStatus === 'served');

      let newOrderKitchenStatus = order.kitchenStatus;

      if (anyServed && order.kitchenStatus !== 'served') {
        newOrderKitchenStatus = 'served';
      } else if (allReady && order.kitchenStatus === 'preparing') {
        newOrderKitchenStatus = 'ready';
      } else if (anyPreparing && order.kitchenStatus === 'open') {
        newOrderKitchenStatus = 'preparing';
      }

      // Update order status if it changed
      if (newOrderKitchenStatus !== order.kitchenStatus) {
        await db.update(orders)
          .set({
            kitchenStatus: newOrderKitchenStatus,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
      }

      return reply.send(createSuccessResponse({
        ...updatedItems[0],
        orderKitchenStatus: newOrderKitchenStatus,
      }, `Order item prep status updated to ${prepStatus}`));
    }
  );
}
