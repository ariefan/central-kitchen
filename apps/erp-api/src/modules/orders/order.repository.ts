import { and, count, eq, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  orders,
  orderItems,
  payments,
  stockLedger,
} from '../../config/schema.js';
import type { QueryBuilderResult } from '../shared/pagination.js';

export const orderRepository = {
  async count(where?: QueryBuilderResult['where']) {
    const result = await db
      .select({ value: count() })
      .from(orders)
      .where(where);

    return result[0]?.value ?? 0;
  },

  async list(queryConditions: QueryBuilderResult) {
    let query = db.select().from(orders).where(queryConditions.where);

    if (queryConditions.orderBy) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.orderBy(...queryConditions.orderBy) as any;
    }

    return query.limit(queryConditions.limit).offset(queryConditions.offset);
  },

  async create(data: typeof orders.$inferInsert) {
    const [created] = await db.insert(orders).values(data).returning();
    return created;
  },

  async createItems(items: typeof orderItems.$inferInsert[]) {
    if (!items.length) return [];
    return db.insert(orderItems).values(items).returning();
  },

  async findById(id: string, tenantId: string) {
    const result = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .limit(1);
    return result[0] ?? null;
  },

  async findOpenWithItems(id: string, tenantId: string) {
    return db
      .select({
        order: orders,
        item: orderItems,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId), eq(orders.status, 'open')));
  },

  async updateById(id: string, tenantId: string, data: Partial<typeof orders.$inferInsert>) {
    const [updated] = await db
      .update(orders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .returning();
    return updated ?? null;
  },

  async insertLedger(entries: typeof stockLedger.$inferInsert[]) {
    if (!entries.length) return [];
    return db.insert(stockLedger).values(entries).returning();
  },

  async findLedgerEntries(tenantId: string, refId: string) {
    return db
      .select()
      .from(stockLedger)
      .where(and(eq(stockLedger.tenantId, tenantId), eq(stockLedger.refType, 'ORDER'), eq(stockLedger.refId, refId)));
  },

  async insertPayment(data: typeof payments.$inferInsert) {
    const [inserted] = await db.insert(payments).values(data).returning();
    return inserted;
  },

  async listPayments(orderId: string) {
    return db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(payments.paidAt);
  },

  async getOrderItemWithOrder(itemId: string, tenantId: string) {
    const result = await db
      .select({
        orderItem: orderItems,
        order: orders,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orderItems.id, itemId), eq(orders.tenantId, tenantId)))
      .limit(1);

    return result[0] ?? null;
  },

  async listOrderItems(orderId: string) {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  },

  async recalcVariance(orderId: string) {
    await db.execute(sql`
      UPDATE ${orderItems}
      SET line_total = quantity * unit_price
      WHERE order_id = ${orderId}
    `);
  },
};
