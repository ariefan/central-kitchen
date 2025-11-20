import { goodsReceiptRepository } from './goods-receipt.repository.js';
import {
  goodsReceiptCreateSchema,
  goodsReceiptQuerySchema,
} from './goods-receipt.schema.js';
import { normalizePaginationParams, buildQueryConditions } from '../shared/pagination.js';
import { generateDocNumber } from '../shared/doc-sequence.js';
import type { RequestContext } from '../../shared/middleware/auth.js';
import { db } from '../../config/database.js';
import { goodsReceipts, goodsReceiptItems, purchaseOrderItems, products, uoms } from '../../config/schema.js';
import { sql, eq } from 'drizzle-orm';

export const goodsReceiptService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const query = goodsReceiptQuerySchema.parse(rawQuery);
    const pagination = normalizePaginationParams({ limit: query.limit, offset: query.offset });

    const filters: Record<string, unknown> = { tenantId: context.tenantId };
    if (query.locationId) filters.locationId = query.locationId;
    if (query.purchaseOrderId) filters.purchaseOrderId = query.purchaseOrderId;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;

    const whereClauses = [];
    if (filters.dateFrom) {
      whereClauses.push(sql`${goodsReceipts.receiptDate} >= ${new Date(filters.dateFrom as string)}`);
    }
    if (filters.dateTo) {
      whereClauses.push(sql`${goodsReceipts.receiptDate} <= ${new Date(filters.dateTo as string)}`);
    }

    const queryConditions = buildQueryConditions({
      filters: {
        tenantId: context.tenantId,
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
      },
      search: query.search,
      searchFields: ['receiptNumber', 'notes'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: pagination.limit,
      offset: pagination.offset,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      table: goodsReceipts as any,
      allowedSortFields: ['receiptNumber', 'receiptDate', 'createdAt', 'updatedAt'],
    });

    if (whereClauses.length) {
      queryConditions.where = queryConditions.where
        ? sql`${queryConditions.where} AND ${sql.join(whereClauses, sql` AND `)}`
        : sql`${sql.join(whereClauses, sql` AND `)}`;
    }

    const [items, countResult] = await Promise.all([
      goodsReceiptRepository.list(queryConditions),
      goodsReceiptRepository.count(queryConditions.where),
    ]);

    const total = Number(countResult[0]?.value ?? 0);
    const hasNext = pagination.offset + pagination.limit < total;
    const hasPrev = pagination.offset > 0;

    return {
      items,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasNext,
      hasPrev,
    };
  },

  async getById(id: string, context: RequestContext) {
    return goodsReceiptRepository.findById(id, context.tenantId);
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = goodsReceiptCreateSchema.parse(rawBody);
    const receiptNumber = generateDocNumber('GR', { tenantId: context.tenantId });

    const result = await db.transaction(async (tx) => {
      const [receipt] = await tx.insert(goodsReceipts).values({
        tenantId: context.tenantId,
        receiptNumber,
        purchaseOrderId: body.purchaseOrderId ?? null,
        locationId: body.locationId,
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
        receivedBy: context.userId,
        notes: body.notes ?? null,
      }).returning();

      if (!receipt) {
        throw new Error('Failed to create goods receipt');
      }

      const receiptItems = await Promise.all(body.items.map(async (item) => {
        const [poItem] = await tx.select({
          poItem: purchaseOrderItems,
          product: products,
          uom: uoms,
        })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .leftJoin(uoms, eq(purchaseOrderItems.uomId, uoms.id))
          .where(eq(purchaseOrderItems.id, item.purchaseOrderItemId))
          .limit(1);

        if (!poItem?.poItem || !poItem.product || !poItem.uom) {
          throw new Error(`Purchase order item ${item.purchaseOrderItemId} not found`);
        }

        const receivedQty = item.quantity;

        return {
          goodsReceiptId: receipt.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          productId: poItem.poItem.productId,
          uomId: poItem.poItem.uomId,
          unitCost: poItem.poItem.unitPrice,
          quantityOrdered: poItem.poItem.quantity,
          quantityReceived: receivedQty.toString(),
          notes: item.notes ?? null,
        } satisfies typeof goodsReceiptItems.$inferInsert;
      }));

      await tx.insert(goodsReceiptItems).values(receiptItems);

      return {
        ...receipt,
        items: receiptItems,
      };
    });

    return result;
  },

  async post(id: string, context: RequestContext) {
    const result = await goodsReceiptRepository.findById(id, context.tenantId);
    if (!result) {
      return null;
    }

    const [updatedReceipt] = await db.update(goodsReceipts)
      .set({
        updatedAt: new Date(),
        metadata: sql`jsonb_set(COALESCE(metadata, '{}'), '{postedAt}', to_jsonb(${new Date()}))`,
      })
      .where(eq(goodsReceipts.id, id))
      .returning();

    return updatedReceipt ?? null;
  },
};
