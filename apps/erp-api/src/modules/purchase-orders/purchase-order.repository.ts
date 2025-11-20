import { and, count, eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  purchaseOrders,
  purchaseOrderItems,
  products,
  uoms,
} from '../../config/schema.js';
import type { QueryBuilderResult } from '../shared/pagination.js';

export const purchaseOrderRepository = {
  async count(where?: QueryBuilderResult['where']) {
    const result = await db
      .select({ value: count() })
      .from(purchaseOrders)
      .where(where);

    return result[0]?.value ?? 0;
  },

  async list(queryConditions: QueryBuilderResult) {
    let query = db.select().from(purchaseOrders).where(queryConditions.where);

    if (queryConditions.orderBy) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.orderBy(...queryConditions.orderBy) as any;
    }

    return query.limit(queryConditions.limit).offset(queryConditions.offset);
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1);
    return result[0] ?? null;
  },

  async findWithItems(id: string, tenantId: string) {
    const order = await this.findById(id, tenantId);
    if (!order) return null;

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .leftJoin(uoms, eq(purchaseOrderItems.uomId, uoms.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    return { order, items };
  },

  async create(data: typeof purchaseOrders.$inferInsert) {
    const [created] = await db.insert(purchaseOrders).values(data).returning();
    return created;
  },

  async insertItems(items: typeof purchaseOrderItems.$inferInsert[]) {
    if (!items.length) return [];
    return db.insert(purchaseOrderItems).values(items).returning();
  },

  async updateById(id: string, tenantId: string, data: Partial<typeof purchaseOrders.$inferInsert>) {
    const [updated] = await db
      .update(purchaseOrders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();
    return updated ?? null;
  },
};
