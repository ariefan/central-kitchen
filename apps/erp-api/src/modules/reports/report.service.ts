import {
  salesSummaryQuerySchema,
  productMixQuerySchema,
  inventoryValuationQuerySchema,
  poSummaryQuerySchema,
} from "./report.schema.js";
import { reportRepository } from "./report.repository.js";
import type { RequestContext } from "@/shared/middleware/auth.js";

export class ReportServiceError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const groupByFormat = (group: string) => {
  switch (group) {
    case "week":
      return 'YYYY-"W"WW';
    case "month":
      return "YYYY-MM";
    default:
      return "YYYY-MM-DD";
  }
};

export const reportService = {
  async salesSummary(rawQuery: unknown, context: RequestContext) {
    const query = salesSummaryQuerySchema.parse(rawQuery ?? {});
    const where = reportRepository.buildSalesWhere(context.tenantId, query);
    const format = groupByFormat(query.groupBy);

    const [periods, totals, topProducts, paymentMethods] = await Promise.all([
      reportRepository.salesByPeriod(where, format),
      reportRepository.salesTotals(where),
      reportRepository.salesTopProducts(where),
      reportRepository.paymentBreakdown(where),
    ]);

    const totalSales = totals?.totalSales?.toString() ?? "0";
    const totalOrders = totals?.totalOrders ?? 0;
    const averageOrderValue =
      totalOrders > 0
        ? (parseFloat(totalSales) / totalOrders).toFixed(2)
        : "0.00";

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      salesByPeriod: periods.map((row: (typeof periods)[0]) => ({
        period: row.period ?? "",
        sales: row.sales?.toString() ?? "0",
        orders: row.orderCount,
        customers: row.customers,
      })),
      topProducts: topProducts.map((row: (typeof topProducts)[0]) => ({
        productName: row.productName ?? "",
        quantity: row.quantity?.toString() ?? "0",
        revenue: row.revenue?.toString() ?? "0",
      })),
      paymentMethods: paymentMethods.map((row: (typeof paymentMethods)[0]) => ({
        tender: row.tender ?? "",
        amount: row.amount?.toString() ?? "0",
        count: row.count,
      })),
    };
  },

  async productMix(rawQuery: unknown, context: RequestContext) {
    const query = productMixQuerySchema.parse(rawQuery ?? {});
    const rows = await reportRepository.productMix(context.tenantId, query);

    let totalRevenue = 0;
    let totalQuantity = 0;

    rows.forEach((row: (typeof rows)[0]) => {
      totalRevenue += parseFloat(row.revenue?.toString() ?? "0");
      totalQuantity += parseFloat(row.quantity?.toString() ?? "0");
    });

    const averagePrice =
      totalQuantity > 0 ? (totalRevenue / totalQuantity).toFixed(2) : "0.00";

    return {
      totalRevenue: totalRevenue.toString(),
      totalQuantity: totalQuantity.toString(),
      averagePrice,
      products: rows.map((row: (typeof rows)[0]) => {
        const quantity = parseFloat(row.quantity?.toString() ?? "0");
        const revenue = parseFloat(row.revenue?.toString() ?? "0");
        return {
          id: row.productId,
          name: row.productName ?? "",
          taxCategory: row.taxCategory,
          quantity: row.quantity?.toString() ?? "0",
          revenue: row.revenue?.toString() ?? "0",
          averagePrice: quantity > 0 ? (revenue / quantity).toFixed(2) : "0.00",
        };
      }),
    };
  },

  async inventoryValuation(rawQuery: unknown, context: RequestContext) {
    const query = inventoryValuationQuerySchema.parse(rawQuery ?? {});
    const rows = await reportRepository.inventoryValuation(
      context.tenantId,
      query
    );

    let totalValue = 0;
    let totalQuantity = 0;
    const locations = new Map<
      string,
      {
        locationId: string;
        locationName: string;
        value: number;
        quantity: number;
      }
    >();

    rows.forEach((row: (typeof rows)[0]) => {
      const quantity = parseFloat(row.quantity?.toString() ?? "0");
      const cost = parseFloat(row.averageCost?.toString() ?? "0");
      const value = quantity * cost;
      totalValue += value;
      totalQuantity += quantity;

      const locId = row.locationId ?? "";
      if (!locations.has(locId)) {
        locations.set(locId, {
          locationId: locId,
          locationName: row.locationName ?? "",
          value: 0,
          quantity: 0,
        });
      }
      const loc = locations.get(locId)!;
      loc.value += value;
      loc.quantity += quantity;
    });

    return {
      totalValue: totalValue.toString(),
      totalQuantity: totalQuantity.toString(),
      locations: Array.from(locations.values()).map((loc) => ({
        locationId: loc.locationId,
        locationName: loc.locationName,
        value: loc.value.toString(),
        quantity: loc.quantity.toString(),
      })),
      items: rows.map((row: (typeof rows)[0]) => {
        const quantity = parseFloat(row.quantity?.toString() ?? "0");
        const cost = parseFloat(row.averageCost?.toString() ?? "0");
        const value = quantity * cost;
        return {
          productId: row.productId,
          productName: row.productName ?? "",
          locationName: row.locationName ?? "",
          quantity: quantity.toString(),
          unitCost: cost.toString(),
          totalValue: value.toString(),
        };
      }),
    };
  },

  async purchaseOrderSummary(rawQuery: unknown, context: RequestContext) {
    const query = poSummaryQuerySchema.parse(rawQuery ?? {});
    const { statusTotals, totals, suppliers, trends } =
      await reportRepository.purchaseOrderStatus(context.tenantId, query);

    const totalValue = totals?.totalValue?.toString() ?? "0";
    const totalOrders = totals?.totalOrders ?? 0;
    const averageOrderValue =
      totalOrders > 0
        ? (parseFloat(totalValue) / totalOrders).toFixed(2)
        : "0.00";

    const statusByCount: Record<string, number> = {};
    const statusByValue: Record<string, string> = {};

    statusTotals.forEach((row: (typeof statusTotals)[0]) => {
      if (row.status) {
        statusByCount[row.status] = row.count;
        statusByValue[row.status] = row.totalValue?.toString() ?? "0";
      }
    });

    return {
      totalValue,
      totalOrders,
      averageOrderValue,
      statusByCount,
      statusByValue,
      suppliers: suppliers.map((row: (typeof suppliers)[0]) => ({
        supplierId: row.supplierId ?? "unknown",
        supplierName: row.supplierId
          ? `Supplier ${row.supplierId}`
          : "Unknown supplier",
        orderCount: row.orderCount,
        totalValue: row.totalValue?.toString() ?? "0",
      })),
      trends: trends.map((row: (typeof trends)[0]) => ({
        period: row.period ?? "",
        orderCount: row.orderCount,
        totalValue: row.totalValue?.toString() ?? "0",
      })),
    };
  },
};
