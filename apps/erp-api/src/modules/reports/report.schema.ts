import { z } from "zod";
import { successResponseSchema } from "@/modules/shared/responses.js";

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  locationId: z.string().uuid().optional(),
});

export const salesSummaryQuerySchema = dateRangeSchema.extend({
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

export const productMixQuerySchema = dateRangeSchema.extend({
  limit: z.number().int().min(1).max(100).default(20),
});

export const inventoryValuationQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
});

export const poSummaryQuerySchema = dateRangeSchema.extend({
  status: z.enum(["draft", "sent", "approved", "received"]).optional(),
  supplierId: z.string().uuid().optional(),
});

export const salesSummarySchema = successResponseSchema(
  z.object({
    totalSales: z.string(),
    totalOrders: z.number(),
    averageOrderValue: z.string(),
    salesByPeriod: z.array(
      z.object({
        period: z.string(),
        sales: z.string(),
        orders: z.number(),
        customers: z.number(),
      })
    ),
    topProducts: z.array(
      z.object({
        productName: z.string(),
        quantity: z.string(),
        revenue: z.string(),
      })
    ),
    paymentMethods: z.array(
      z.object({
        tender: z.string(),
        amount: z.string(),
        count: z.number(),
      })
    ),
  })
);

export const productMixSchema = successResponseSchema(
  z.object({
    totalRevenue: z.string(),
    totalQuantity: z.string(),
    averagePrice: z.string(),
    products: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        taxCategory: z.string().nullable(),
        quantity: z.string(),
        revenue: z.string(),
        averagePrice: z.string(),
      })
    ),
  })
);

export const inventoryValuationSchema = successResponseSchema(
  z.object({
    totalValue: z.string(),
    totalQuantity: z.string(),
    locations: z.array(
      z.object({
        locationId: z.string(),
        locationName: z.string(),
        value: z.string(),
        quantity: z.string(),
      })
    ),
    items: z.array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        locationName: z.string(),
        quantity: z.string(),
        unitCost: z.string(),
        totalValue: z.string(),
      })
    ),
  })
);

export const poSummarySchema = successResponseSchema(
  z.object({
    totalValue: z.string(),
    totalOrders: z.number(),
    averageOrderValue: z.string(),
    statusByCount: z.record(z.string(), z.number()),
    statusByValue: z.record(z.string(), z.string()),
    suppliers: z.array(
      z.object({
        supplierId: z.string(),
        supplierName: z.string(),
        orderCount: z.number(),
        totalValue: z.string(),
      })
    ),
    trends: z.array(
      z.object({
        period: z.string(),
        orderCount: z.number(),
        totalValue: z.string(),
      })
    ),
  })
);
