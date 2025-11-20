import { db } from "@/config/database.js";
import {
  orders,
  orderItems,
  payments,
  products,
  purchaseOrders,
  stockLedger,
  locations,
} from "@/config/schema.js";
import {
  and,
  eq,
  gte,
  lte,
  sum,
  count,
  avg,
  desc,
  sql,
  type SQL,
} from "drizzle-orm";
import type {
  salesSummaryQuerySchema,
  productMixQuerySchema,
  inventoryValuationQuerySchema,
  poSummaryQuerySchema,
} from "./report.schema.js";
import type { z } from "zod";

type SalesSummaryQuery = z.infer<typeof salesSummaryQuerySchema>;
type ProductMixQuery = z.infer<typeof productMixQuerySchema>;
type InventoryValuationQuery = z.infer<typeof inventoryValuationQuerySchema>;
type PoSummaryQuery = z.infer<typeof poSummaryQuerySchema>;

type WhereClauseArray = (SQL<unknown> | undefined)[];

export const reportRepository = {
  buildSalesWhere(
    tenantId: string,
    params: SalesSummaryQuery
  ): WhereClauseArray {
    const where = [
      eq(orders.tenantId, tenantId),
      eq(orders.status, "posted"),
      gte(orders.createdAt, new Date(params.dateFrom)),
      lte(orders.createdAt, new Date(params.dateTo)),
    ];

    if (params.locationId) {
      where.push(eq(orders.locationId, params.locationId));
    }

    return where;
  },

  async salesByPeriod(where: WhereClauseArray, format: string) {
    const rows = await db
      .select({
        period: sql<string>`to_char(${orders.createdAt}, ${format})`,
        sales: sum(orders.totalAmount),
        orderCount: count(orders.id),
        customers: count(sql`distinct ${orders.customerId}`),
      })
      .from(orders)
      .where(and(...where))
      .groupBy(sql`to_char(${orders.createdAt}, ${format})`)
      .orderBy(sql`to_char(${orders.createdAt}, ${format})`);

    return rows;
  },

  async salesTotals(where: WhereClauseArray) {
    const rows = await db
      .select({
        totalSales: sum(orders.totalAmount),
        totalOrders: count(orders.id),
      })
      .from(orders)
      .where(and(...where));

    return rows[0];
  },

  async salesTopProducts(where: WhereClauseArray) {
    return db
      .select({
        productName: products.name,
        quantity: sum(orderItems.quantity),
        revenue: sum(orderItems.lineTotal),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(and(...where))
      .groupBy(products.name, orderItems.productId)
      .orderBy(desc(sql`sum(${orderItems.lineTotal})`))
      .limit(10);
  },

  async paymentBreakdown(where: WhereClauseArray) {
    return db
      .select({
        tender: payments.tender,
        amount: sum(payments.amount),
        count: count(payments.id),
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(...where))
      .groupBy(payments.tender)
      .orderBy(desc(sql`sum(${payments.amount})`));
  },

  async productMix(tenantId: string, params: ProductMixQuery) {
    const where = [
      eq(orders.tenantId, tenantId),
      eq(orders.status, "posted"),
      gte(orders.createdAt, new Date(params.dateFrom)),
      lte(orders.createdAt, new Date(params.dateTo)),
    ];

    return db
      .select({
        productId: products.id,
        productName: products.name,
        taxCategory: products.taxCategory,
        quantity: sum(orderItems.quantity),
        revenue: sum(orderItems.lineTotal),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(and(...where))
      .groupBy(products.id, products.name, products.taxCategory)
      .orderBy(desc(sql`sum(${orderItems.lineTotal})`))
      .limit(params.limit);
  },

  async inventoryValuation(tenantId: string, params: InventoryValuationQuery) {
    const where = [eq(stockLedger.tenantId, tenantId)];
    if (params.locationId) {
      where.push(eq(stockLedger.locationId, params.locationId));
    }

    return db
      .select({
        productId: products.id,
        productName: products.name,
        locationId: locations.id,
        locationName: locations.name,
        quantity: sum(stockLedger.qtyDeltaBase),
        averageCost: avg(sql<number>`CAST(${stockLedger.unitCost} AS NUMERIC)`),
      })
      .from(stockLedger)
      .innerJoin(products, eq(stockLedger.productId, products.id))
      .innerJoin(locations, eq(stockLedger.locationId, locations.id))
      .where(and(...where))
      .groupBy(products.id, products.name, locations.id, locations.name)
      .having(sql`sum(${stockLedger.qtyDeltaBase}) > 0`);
  },

  async purchaseOrderStatus(tenantId: string, params: PoSummaryQuery) {
    const where = [
      eq(purchaseOrders.tenantId, tenantId),
      gte(purchaseOrders.createdAt, new Date(params.dateFrom)),
      lte(purchaseOrders.createdAt, new Date(params.dateTo)),
    ];
    if (params.status) where.push(eq(purchaseOrders.status, params.status));
    if (params.supplierId)
      where.push(eq(purchaseOrders.supplierId, params.supplierId));

    const statusTotals = await db
      .select({
        status: purchaseOrders.status,
        count: count(purchaseOrders.id),
        totalValue: sum(purchaseOrders.totalAmount),
      })
      .from(purchaseOrders)
      .where(and(...where))
      .groupBy(purchaseOrders.status);

    const totals = await db
      .select({
        totalValue: sum(purchaseOrders.totalAmount),
        totalOrders: count(purchaseOrders.id),
      })
      .from(purchaseOrders)
      .where(and(...where));

    const suppliers = await db
      .select({
        supplierId: purchaseOrders.supplierId,
        orderCount: count(purchaseOrders.id),
        totalValue: sum(purchaseOrders.totalAmount),
      })
      .from(purchaseOrders)
      .where(and(...where))
      .groupBy(purchaseOrders.supplierId)
      .orderBy(desc(sql`sum(${purchaseOrders.totalAmount})`))
      .limit(10);

    const trends = await db
      .select({
        period: sql<string>`to_char(${purchaseOrders.createdAt}, 'YYYY-MM')`,
        orderCount: count(purchaseOrders.id),
        totalValue: sum(purchaseOrders.totalAmount),
      })
      .from(purchaseOrders)
      .where(and(...where))
      .groupBy(sql`to_char(${purchaseOrders.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${purchaseOrders.createdAt}, 'YYYY-MM')`);

    return { statusTotals, totals: totals[0], suppliers, trends };
  },
};
