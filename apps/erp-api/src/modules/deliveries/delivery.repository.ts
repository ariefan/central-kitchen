import { db } from '@/config/database.js';
import {
  deliveries,
  orders,
  customers,
  addresses,
} from '@/config/schema.js';
import { and, eq, sql, desc } from 'drizzle-orm';
import type { DeliveryQueryInput, AddressQueryInput } from './delivery.schema.js';

export const deliveryRepository = {
  async list(tenantId: string, filters: DeliveryQueryInput) {
    const conditions = [eq(orders.tenantId, tenantId)];
    if (filters.status) conditions.push(eq(deliveries.status, filters.status));
    if (filters.provider) conditions.push(eq(deliveries.provider, filters.provider));
    if (filters.orderId) conditions.push(eq(deliveries.orderId, filters.orderId));
    if (filters.customerId) conditions.push(eq(orders.customerId, filters.customerId));
    if (filters.dateFrom) conditions.push(sql`${deliveries.updatedAt} >= ${new Date(filters.dateFrom)}`);
    if (filters.dateTo) conditions.push(sql`${deliveries.updatedAt} <= ${new Date(filters.dateTo)}`);

    const rows = await db.select({
      delivery: deliveries,
      order: orders,
      customer: customers,
    })
      .from(deliveries)
      .innerJoin(orders, eq(deliveries.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(deliveries.updatedAt));

    return rows.map(({ delivery, order, customer }) => ({
      ...delivery,
      order,
      customer: customer ?? null,
    }));
  },

  async findById(id: string, tenantId: string) {
    const rows = await db.select({
      delivery: deliveries,
      order: orders,
      customer: customers,
    })
      .from(deliveries)
      .innerJoin(orders, eq(deliveries.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(deliveries.id, id), eq(orders.tenantId, tenantId)))
      .limit(1);

    const result = rows[0];
    if (!result) return null;

    return {
      ...result.delivery,
      order: result.order,
      customer: result.customer ?? null,
    };
  },

  async insertDelivery(data: typeof deliveries.$inferInsert) {
    const [delivery] = await db.insert(deliveries).values(data).returning();
    return delivery ?? null;
  },

  async updateDelivery(id: string, data: Partial<typeof deliveries.$inferInsert>) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<typeof deliveries.$inferInsert>;

    const [delivery] = await db.update(deliveries)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, id))
      .returning();

    return delivery ?? null;
  },

  async listAddresses(tenantId: string, filters: AddressQueryInput) {
    const conditions = [eq(customers.tenantId, tenantId)];
    if (filters.customerId) conditions.push(eq(addresses.customerId, filters.customerId));

    const rows = await db.select({
      address: addresses,
      customer: customers,
    })
      .from(addresses)
      .innerJoin(customers, eq(addresses.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(addresses.isDefault, addresses.createdAt);

    return rows.map(({ address, customer }) => ({
      ...address,
      customer: customer ?? null,
    }));
  },

  async insertAddress(data: typeof addresses.$inferInsert) {
    const [address] = await db.insert(addresses).values(data).returning();
    return address ?? null;
  },

  async unsetDefaultAddresses(customerId: string) {
    await db.update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.customerId, customerId));
  },
};
