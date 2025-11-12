import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses.js';
import { db } from '../../../../config/database.js';
import { transfers, transferItems, locations, products, uoms, docStatuses } from '../../../../config/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantId, getUserId } from '../../../../shared/middleware/auth.js';

// Transfer Item schemas
const transferItemSchema = z.object({
  productId: z.string().uuid(),
  uomId: z.string().uuid(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

const transferCreateSchema = z.object({
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(transferItemSchema).min(1, 'At least one item is required'),
});

const transferUpdateSchema = transferCreateSchema.partial().omit({ items: true });

type TransferQuery = {
  status?: string;
  fromLocationId?: string;
  toLocationId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// Response schemas
const transferResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const transfersResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function transferRoutes(fastify: FastifyInstance) {
  // GET /api/v1/transfers - List all transfers
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all transfers',
        tags: ['Transfers'],
        querystring: z.object({
          status: z.enum(docStatuses.transfer).optional(),
          fromLocationId: z.string().uuid().optional(),
          toLocationId: z.string().uuid().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
        }),
        response: {
          200: transfersResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { status, fromLocationId, toLocationId, dateFrom, dateTo } = request.query as TransferQuery;

      let whereConditions = [eq(transfers.tenantId, tenantId)];

      if (status) {
        whereConditions.push(eq(transfers.status, status));
      }

      if (fromLocationId) {
        whereConditions.push(eq(transfers.fromLocationId, fromLocationId));
      }

      if (toLocationId) {
        whereConditions.push(eq(transfers.toLocationId, toLocationId));
      }

  
      if (dateFrom) {
        whereConditions.push(sql`${transfers.transferDate} >= ${new Date(dateFrom)}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${transfers.transferDate} <= ${new Date(dateTo)}`);
      }

      const allTransfers = await db.select()
        .from(transfers)
        .leftJoin(locations, eq(transfers.fromLocationId, locations.id))
        .where(and(...whereConditions))
        .orderBy(transfers.transferDate);

      return reply.send(createSuccessResponse(allTransfers, 'Transfers retrieved successfully'));
    }
  );

  // GET /api/v1/transfers/:id - Get transfer by ID with items
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get transfer by ID with items',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const transferData = await db.select({
        transfer: transfers,
        fromLocation: locations,
      })
        .from(transfers)
        .leftJoin(locations, eq(transfers.fromLocationId, locations.id))
        .where(and(eq(transfers.id, request.params.id), eq(transfers.tenantId, tenantId)))
        .limit(1);

      if (!transferData.length) {
        return createNotFoundError('Transfer not found', reply);
      }

      const transferRecord = transferData[0];

      // Get items for this transfer
      const items = await db.select()
        .from(transferItems)
        .leftJoin(products, eq(transferItems.productId, products.id))
        .leftJoin(uoms, eq(transferItems.uomId, uoms.id))
        .where(eq(transferItems.transferId, request.params.id));

      const transferWithItems = {
        ...transferRecord!.transfer,
        fromLocation: (transferRecord as typeof transferRecord & { fromLocation?: typeof locations }).fromLocation,
        items,
      };

      return reply.send(createSuccessResponse(transferWithItems, 'Transfer retrieved successfully'));
    }
  );

  // POST /api/v1/transfers - Create new transfer
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new transfer',
        tags: ['Transfers'],
        body: transferCreateSchema,
        response: {
          201: transferResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof transferCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Generate transfer number
      const transferNumber = `XFER-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      const newTransfer = {
        tenantId,
        transferNumber,
        fromLocationId: request.body.fromLocationId,
        toLocationId: request.body.toLocationId,
        expectedDeliveryDate: request.body.expectedDeliveryDate ? new Date(request.body.expectedDeliveryDate) : null,
        requestedBy: userId,
        notes: request.body.notes,
      };

      const result = await db.transaction(async (tx) => {
        const [transfer] = await tx.insert(transfers).values(newTransfer).returning();

        // Prepare items
        const itemsToInsert = request.body.items.map(item => ({
          transferId: transfer!.id,
          productId: item.productId,
          uomId: item.uomId,
          quantity: item.quantity.toString(),
          notes: item.notes ?? null,
        }));

        const insertedItems = await tx.insert(transferItems).values(itemsToInsert).returning();

        return {
          ...transfer!,
          items: insertedItems,
        };
      });

      return reply.status(201).send(createSuccessResponse(result, 'Transfer created successfully'));
    }
  );

  // PATCH /api/v1/transfers/:id - Update transfer (draft only)
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update transfer (draft only)',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        body: transferUpdateSchema,
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<z.infer<typeof transferUpdateSchema>> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if transfer exists and is in draft status
      const existingTransfer = await db.select().from(transfers)
        .where(and(
          eq(transfers.id, request.params.id),
          eq(transfers.tenantId, tenantId),
          eq(transfers.status, 'draft')
        ))
        .limit(1);

      if (!existingTransfer.length) {
        return createNotFoundError('Transfer not found or cannot be edited', reply);
      }

      const result = await db.update(transfers)
        .set({
          ...request.body,
          expectedDeliveryDate: request.body.expectedDeliveryDate ? new Date(request.body.expectedDeliveryDate) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(transfers.id, request.params.id), eq(transfers.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Transfer updated successfully'));
    }
  );

  // POST /api/v1/transfers/:id/send - Send transfer
  fastify.post(
    '/:id/send',
    {
      schema: {
        description: 'Send transfer',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if transfer exists and is approved
      const existingTransfer = await db.select().from(transfers)
        .where(and(
          eq(transfers.id, request.params.id),
          eq(transfers.tenantId, tenantId),
          sql`${transfers.status} IN ('draft', 'approved')`
        ))
        .limit(1);

      if (!existingTransfer.length) {
        return createNotFoundError('Transfer not found or cannot be sent', reply);
      }

      const result = await db.update(transfers)
        .set({
          status: 'sent',
          sentBy: userId,
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(transfers.id, request.params.id), eq(transfers.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Transfer sent successfully'));
    }
  );

  // POST /api/v1/transfers/:id/receive - Receive transfer
  fastify.post(
    '/:id/receive',
    {
      schema: {
        description: 'Receive transfer',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          items: z.array(z.object({
            transferItemId: z.string().uuid(),
            qtyReceived: z.number().nonnegative(),
            notes: z.string().optional(),
          })),
        }),
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: {
        items: Array<{
          transferItemId: string;
          qtyReceived: number;
          notes?: string;
        }>
      }
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if transfer exists and is sent
      const existingTransfer = await db.select().from(transfers)
        .where(and(
          eq(transfers.id, request.params.id),
          eq(transfers.tenantId, tenantId),
          eq(transfers.status, 'sent')
        ))
        .limit(1);

      if (!existingTransfer.length) {
        return createNotFoundError('Transfer not found or not ready for receiving', reply);
      }

      const result = await db.transaction(async (tx) => {
        // Update each transfer item received quantity
        for (const item of request.body.items) {
          await tx.update(transferItems)
            .set({
              qtyReceived: item.qtyReceived.toString(),
              notes: item.notes ?? null,
            })
            .where(and(
              eq(transferItems.transferId, request.params.id),
              eq(transferItems.id, item.transferItemId)
            ));
        }

        // Update transfer status if all items are received
        const allItems = await tx.select().from(transferItems)
          .where(eq(transferItems.transferId, request.params.id));

        const totalItems = allItems.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
        const totalReceived = allItems.reduce((sum, item) => sum + parseFloat(item.qtyReceived ?? '0'), 0);

        if (totalReceived >= totalItems) {
          await tx.update(transfers)
            .set({
              status: 'completed',
              receivedBy: userId,
              receivedAt: new Date(),
              actualDeliveryDate: new Date(),
              updatedAt: new Date(),
            })
            .where(and(eq(transfers.id, request.params.id), eq(transfers.tenantId, tenantId)));
        }

        // TODO: Create inventory movements
        // TODO: Update stock levels

        return {
          ...existingTransfer[0],
          itemsProcessed: request.body.items.length,
        };
      });

      return reply.send(createSuccessResponse(result, 'Transfer received successfully'));
    }
  );

  // POST /api/v1/transfers/:id/post - Finalize transfer
  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post/finalize transfer',
        tags: ['Transfers'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: transferResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if transfer exists and is completed
      const existingTransferData = await db.select().from(transfers)
        .where(and(
          eq(transfers.id, request.params.id),
          eq(transfers.tenantId, tenantId),
          eq(transfers.status, 'completed')
        ))
        .limit(1);

      if (!existingTransferData.length) {
        return createNotFoundError('Transfer not found or not completed', reply);
      }

      // Mark as posted for accounting/inventory purposes
      const existingTransfer = existingTransferData[0]!;
      const currentMetadata = existingTransfer.metadata ?? {};
      const updatedMetadata = { ...currentMetadata, postedAt: new Date() };

      const result = await db.update(transfers)
        .set({
          updatedAt: new Date(),
          metadata: updatedMetadata,
        })
        .where(and(eq(transfers.id, request.params.id), eq(transfers.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Transfer posted successfully'));
    }
  );
}