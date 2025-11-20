import { db } from '../../config/database.js';
import { posShifts, drawerMovements, locations, orders, orderItems, products } from '../../config/schema.js';
import { and, eq, isNull, sql, desc, inArray } from 'drizzle-orm';

export const posRepository = {
  listShifts(tenantId: string, filters: { locationId?: string; status?: string }) {
    const whereConditions = [eq(posShifts.tenantId, tenantId)];

    if (filters.locationId) {
      whereConditions.push(eq(posShifts.locationId, filters.locationId));
    }

    if (filters.status === 'open') {
      whereConditions.push(isNull(posShifts.closedAt));
    } else if (filters.status === 'closed') {
      whereConditions.push(sql`${posShifts.closedAt} IS NOT NULL`);
    }

    return db
      .select({
        id: posShifts.id,
        tenantId: posShifts.tenantId,
        locationId: posShifts.locationId,
        deviceId: posShifts.deviceId,
        openedBy: posShifts.openedBy,
        openedAt: posShifts.openedAt,
        closedBy: posShifts.closedBy,
        closedAt: posShifts.closedAt,
        floatAmount: posShifts.floatAmount,
        expectedCash: posShifts.expectedCash,
        actualCash: posShifts.actualCash,
        variance: posShifts.variance,
        location: {
          id: locations.id,
          name: locations.name,
        },
      })
      .from(posShifts)
      .leftJoin(locations, eq(posShifts.locationId, locations.id))
      .where(and(...whereConditions))
      .orderBy(desc(posShifts.openedAt));
  },

  findShiftById(id: string, tenantId: string) {
    return db
      .select({
        id: posShifts.id,
        tenantId: posShifts.tenantId,
        locationId: posShifts.locationId,
        deviceId: posShifts.deviceId,
        openedBy: posShifts.openedBy,
        openedAt: posShifts.openedAt,
        closedBy: posShifts.closedBy,
        closedAt: posShifts.closedAt,
        floatAmount: posShifts.floatAmount,
        expectedCash: posShifts.expectedCash,
        actualCash: posShifts.actualCash,
        variance: posShifts.variance,
        location: {
          id: locations.id,
          name: locations.name,
        },
      })
      .from(posShifts)
      .leftJoin(locations, eq(posShifts.locationId, locations.id))
      .where(and(eq(posShifts.id, id), eq(posShifts.tenantId, tenantId)))
      .limit(1);
  },

  openShift(data: typeof posShifts.$inferInsert) {
    return db.insert(posShifts).values(data).returning();
  },

  closeShift(id: string, tenantId: string, data: Partial<typeof posShifts.$inferInsert>) {
    return db
      .update(posShifts)
      .set(data)
      .where(and(eq(posShifts.id, id), eq(posShifts.tenantId, tenantId)))
      .returning();
  },

  insertDrawerMovement(data: typeof drawerMovements.$inferInsert) {
    return db.insert(drawerMovements).values(data).returning();
  },

  listDrawerMovements(shiftId: string) {
    return db.select().from(drawerMovements).where(eq(drawerMovements.shiftId, shiftId)).orderBy(desc(drawerMovements.createdAt));
  },

  async getKitchenOrders(params: {
    tenantId: string;
    locationId?: string;
    station?: string;
    kitchenStatus?: string;
    limit: number;
  }) {
    const whereConditions = [
      eq(orders.tenantId, params.tenantId),
      sql`${orders.kitchenStatus} IN ('confirmed', 'preparing', 'ready')`, // Only show active kitchen orders
    ];

    if (params.locationId) {
      whereConditions.push(eq(orders.locationId, params.locationId));
    }

    if (params.kitchenStatus) {
      whereConditions.push(eq(orders.kitchenStatus, params.kitchenStatus));
    }

    // Get orders
    const kitchenOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        type: orders.type,
        tableNo: orders.tableNo,
        kitchenStatus: orders.kitchenStatus,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(...whereConditions))
      .orderBy(orders.createdAt)
      .limit(params.limit);

    if (kitchenOrders.length === 0) {
      return [];
    }

    // Get order items for these orders
    const orderIds = kitchenOrders.map((o) => o.id);
    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        prepStatus: orderItems.prepStatus,
        station: orderItems.station,
        notes: orderItems.notes,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(inArray(orderItems.orderId, orderIds));

    // Filter items by station if specified
    let filteredItems = items;
    if (params.station && params.station !== 'all') {
      filteredItems = items.filter((item) => item.station === params.station || !item.station);
    }

    // Group items by order
    const itemsByOrder = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      if (!itemsByOrder.has(item.orderId)) {
        itemsByOrder.set(item.orderId, []);
      }
      itemsByOrder.get(item.orderId)!.push(item);
    }

    // Combine orders with their items
    return kitchenOrders.map((order) => ({
      ...order,
      totalItems: itemsByOrder.get(order.id)?.length || 0,
      items: itemsByOrder.get(order.id) || [],
    }));
  },
};
