import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  goodsReceipts,
  goodsReceiptItems,
  purchaseOrderItems,
  products,
  uoms,
  locations,
} from '../../config/schema.js';
import type { QueryBuilderResult } from '../shared/pagination.js';

export const goodsReceiptRepository = {
  async list(query: QueryBuilderResult) {
    let selectQuery = db.select({
      id: goodsReceipts.id,
      tenantId: goodsReceipts.tenantId,
      receiptNumber: goodsReceipts.receiptNumber,
      purchaseOrderId: goodsReceipts.purchaseOrderId,
      locationId: goodsReceipts.locationId,
      receiptDate: goodsReceipts.receiptDate,
      receivedBy: goodsReceipts.receivedBy,
      notes: goodsReceipts.notes,
      createdAt: goodsReceipts.createdAt,
      updatedAt: goodsReceipts.updatedAt,
      metadata: goodsReceipts.metadata,
    })
      .from(goodsReceipts)
      .leftJoin(locations, eq(goodsReceipts.locationId, locations.id))
      .where(query.where);

    if (query.orderBy) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectQuery = selectQuery.orderBy(...query.orderBy) as any;
    }

    return selectQuery.limit(query.limit).offset(query.offset);
  },

  count(where?: QueryBuilderResult['where']) {
    return db.select({ value: sql<string>`count(*)` }).from(goodsReceipts).where(where);
  },

  async findById(id: string, tenantId: string) {
    const receipt = await db.select()
      .from(goodsReceipts)
      .leftJoin(locations, eq(goodsReceipts.locationId, locations.id))
      .where(and(eq(goodsReceipts.id, id), eq(goodsReceipts.tenantId, tenantId)))
      .limit(1);

    if (!receipt.length) return null;

    const items = await db.select()
      .from(goodsReceiptItems)
      .leftJoin(purchaseOrderItems, eq(goodsReceiptItems.purchaseOrderItemId, purchaseOrderItems.id))
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .leftJoin(uoms, eq(purchaseOrderItems.uomId, uoms.id))
      .where(eq(goodsReceiptItems.goodsReceiptId, id));

    return {
      receipt: receipt[0],
      items,
    };
  },

  async create(data: typeof goodsReceipts.$inferInsert, items: typeof goodsReceiptItems.$inferInsert[]) {
    return db.transaction(async (tx) => {
      const [receipt] = await tx.insert(goodsReceipts).values(data).returning();
      if (!receipt) return null;

      if (items.length) {
        await tx.insert(goodsReceiptItems).values(
          items.map(item => ({
            ...item,
            goodsReceiptId: receipt.id,
          }))
        );
      }

      return receipt;
    });
  },

  updateMetadata(id: string, tenantId: string, metadata: unknown) {
    return db.update(goodsReceipts)
      .set({
        updatedAt: new Date(),
        metadata,
      })
      .where(and(eq(goodsReceipts.id, id), eq(goodsReceipts.tenantId, tenantId)))
      .returning();
  },
};
