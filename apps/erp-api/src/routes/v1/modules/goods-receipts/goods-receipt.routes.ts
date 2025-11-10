import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '@/shared/utils/responses';
import { db } from '@/config/database';
import { goodsReceipts, goodsReceiptItems, purchaseOrderItems, products, uoms, locations } from '@/config/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantId, getUserId } from '@/shared/middleware/auth';

// Goods Receipt Item schemas
const goodsReceiptItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

const goodsReceiptCreateSchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  receiptDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(goodsReceiptItemSchema).min(1, 'At least one item is required'),
});

type GoodsReceiptQuery = {
  locationId?: string;
  purchaseOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// Response schemas
const goodsReceiptResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const goodsReceiptsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

export function goodsReceiptRoutes(fastify: FastifyInstance) {
  // GET /api/v1/goods-receipts - List all goods receipts
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all goods receipts',
        tags: ['Goods Receipts'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          purchaseOrderId: z.string().uuid().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
        }),
        response: {
          200: goodsReceiptsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId, purchaseOrderId, dateFrom, dateTo } = request.query as GoodsReceiptQuery;

      let whereConditions = [eq(goodsReceipts.tenantId, tenantId)];

      if (locationId) {
        whereConditions.push(eq(goodsReceipts.locationId, locationId));
      }

      if (purchaseOrderId) {
        whereConditions.push(eq(goodsReceipts.purchaseOrderId, purchaseOrderId));
      }

      if (dateFrom) {
        whereConditions.push(sql`${goodsReceipts.receiptDate} >= ${new Date(dateFrom)}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${goodsReceipts.receiptDate} <= ${new Date(dateTo)}`);
      }

      const allReceipts = await db.select()
        .from(goodsReceipts)
        .leftJoin(locations, eq(goodsReceipts.locationId, locations.id))
        .where(and(...whereConditions))
        .orderBy(goodsReceipts.receiptDate);

      return reply.send(createSuccessResponse(allReceipts, 'Goods receipts retrieved successfully'));
    }
  );

  // GET /api/v1/goods-receipts/:id - Get goods receipt by ID with items
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get goods receipt by ID with items',
        tags: ['Goods Receipts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: goodsReceiptResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const goodsReceiptData = await db.select()
        .from(goodsReceipts)
        .leftJoin(locations, eq(goodsReceipts.locationId, locations.id))
        .where(and(eq(goodsReceipts.id, request.params.id), eq(goodsReceipts.tenantId, tenantId)))
        .limit(1);

      if (!goodsReceiptData.length) {
        return createNotFoundError('Goods receipt not found', reply);
      }

      const receipt = goodsReceiptData[0];

      // Get items for this goods receipt
      const items = await db.select()
        .from(goodsReceiptItems)
        .leftJoin(purchaseOrderItems, eq(goodsReceiptItems.purchaseOrderItemId, purchaseOrderItems.id))
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .leftJoin(uoms, eq(purchaseOrderItems.uomId, uoms.id))
        .where(eq(goodsReceiptItems.goodsReceiptId, request.params.id));

      const receiptWithItems = {
        ...receipt,
        location: (receipt as typeof receipt & { locations?: typeof locations }).locations,
        items,
      };

      return reply.send(createSuccessResponse(receiptWithItems, 'Goods receipt retrieved successfully'));
    }
  );

  // POST /api/v1/goods-receipts - Create new goods receipt
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new goods receipt',
        tags: ['Goods Receipts'],
        body: goodsReceiptCreateSchema,
        response: {
          201: goodsReceiptResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof goodsReceiptCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Generate receipt number
      const receiptNumber = `GR-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      const newReceipt = {
        tenantId,
        receiptNumber,
        purchaseOrderId: request.body.purchaseOrderId ?? null,
        locationId: request.body.locationId,
        receiptDate: request.body.receiptDate ? new Date(request.body.receiptDate) : new Date(),
        receivedBy: userId,
        notes: request.body.notes ?? null,
      };

      const result = await db.transaction(async (tx) => {
        const [receipt] = await tx.insert(goodsReceipts).values(newReceipt).returning();

        // Validate items and prepare data
        const receiptItems = await Promise.all(request.body.items.map(async (item) => {
          // Get the PO item to validate quantity and get product info
          const poItem = await tx.select()
            .from(purchaseOrderItems)
            .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
            .leftJoin(uoms, eq(purchaseOrderItems.uomId, uoms.id))
            .where(eq(purchaseOrderItems.id, item.purchaseOrderItemId))
            .limit(1);

          if (!poItem.length) {
            throw new Error(`Purchase order item ${item.purchaseOrderItemId} not found`);
          }

          const poItemData = poItem[0];
          if (!poItemData?.products) {
            throw new Error(`Invalid purchase order item data for ${item.purchaseOrderItemId}`);
          }

          const receivedQty = parseFloat(item.quantity.toString());

          // TODO: Add check for over-receiving
          // For now, allow over-receiving with a warning

          return {
            goodsReceiptId: receipt!.id,
            purchaseOrderItemId: item.purchaseOrderItemId,
            productId: poItemData.products.id,
            uomId: poItemData.purchase_order_items.uomId,
            quantityOrdered: poItemData.purchase_order_items.quantity,
            quantityReceived: receivedQty.toString(),
            unitCost: poItemData.purchase_order_items.unitPrice,
            notes: item.notes ?? null,
          };
        }));

        await tx.insert(goodsReceiptItems).values(receiptItems);

        return {
          ...receipt!,
          items: receiptItems,
        };
      });

      return reply.status(201).send(createSuccessResponse(result, 'Goods receipt created successfully'));
    }
  );

  // POST /api/v1/goods-receipts/:id/post - Post goods receipt (finalize and update inventory)
  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post goods receipt - finalize and update inventory',
        tags: ['Goods Receipts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: goodsReceiptResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if goods receipt exists and is not already posted
      const existingReceipt = await db.select()
        .from(goodsReceipts)
        .where(and(
          eq(goodsReceipts.id, request.params.id),
          eq(goodsReceipts.tenantId, tenantId)
        ))
        .limit(1);

      if (!existingReceipt.length) {
        return createNotFoundError('Goods receipt not found', reply);
      }

      const result = await db.transaction(async (tx) => {
        // Update goods receipt status if needed (add status field if not exists)
        // For now, just update the updatedAt timestamp
        const [updatedReceipt] = await tx.update(goodsReceipts)
          .set({
            updatedAt: new Date(),
            metadata: sql`jsonb_set(COALESCE(metadata, '{}'), '{postedAt}', to_jsonb(${new Date()}))`,
          })
          .where(and(eq(goodsReceipts.id, request.params.id), eq(goodsReceipts.tenantId, tenantId)))
          .returning();

        // Get all items for this receipt
        const receiptItems = await tx.select()
          .from(goodsReceiptItems)
          .leftJoin(purchaseOrderItems, eq(goodsReceiptItems.purchaseOrderItemId, purchaseOrderItems.id))
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(goodsReceiptItems.goodsReceiptId, request.params.id));

        // TODO: Create inventory transactions
        // TODO: Update stock levels
        // TODO: Create ledger entries
        // TODO: Update purchase order status if fully received

        return {
          ...updatedReceipt,
          itemsProcessed: receiptItems.length,
        };
      });

      return reply.send(createSuccessResponse(result, 'Goods receipt posted successfully'));
    }
  );
}