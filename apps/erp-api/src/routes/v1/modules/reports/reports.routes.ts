import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, notFoundResponseSchema } from '@/shared/utils/responses';
import { db } from '@/config/database';
import { orders, orderItems, payments, products, purchaseOrders, stockLedger, locations } from '@/config/schema';
import { eq, and, sql, desc, gte, lte, sum, count, avg } from 'drizzle-orm';
import { getTenantId } from '@/shared/middleware/auth';

// Query schemas
const dateRangeSchema = z.object({
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  locationId: z.string().uuid().optional(),
});

const salesSummarySchema = dateRangeSchema.extend({
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

const productMixSchema = dateRangeSchema.extend({
  limit: z.number().int().min(1).max(100).default(20),
});

const inventoryValuationSchema = z.object({
  locationId: z.string().uuid().optional(),
});

const poSummarySchema = dateRangeSchema.extend({
  status: z.enum(['draft', 'sent', 'approved', 'received']).optional(),
  supplierId: z.string().uuid().optional(),
});

// Response schemas
const salesSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    totalSales: z.string(),
    totalOrders: z.number(),
    averageOrderValue: z.string(),
    salesByPeriod: z.array(z.object({
      period: z.string(),
      sales: z.string(),
      orders: z.number(),
      customers: z.number(),
    })),
    topProducts: z.array(z.object({
      productName: z.string(),
      quantity: z.string(),
      revenue: z.string(),
    })),
    paymentMethods: z.array(z.object({
      tender: z.string(),
      amount: z.string(),
      count: z.number(),
    })),
  }),
  message: z.string(),
});

export function reportRoutes(fastify: FastifyInstance) {
  // GET /api/v1/reports/sales-summary - Sales summary by period/location
  fastify.get(
    '/sales-summary',
    {
      schema: {
        description: 'Get sales summary report',
        tags: ['Reports'],
        querystring: salesSummarySchema,
        response: {
          200: salesSummaryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof salesSummarySchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { dateFrom, dateTo, locationId, groupBy } = request.query;

      // Build date grouping expression
      let dateFormat: string;
      switch (groupBy) {
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      const whereConditions = [
        eq(orders.tenantId, tenantId),
        eq(orders.status, 'posted'),
        gte(orders.createdAt, new Date(dateFrom)),
        lte(orders.createdAt, new Date(dateTo)),
      ];

      if (locationId) {
        whereConditions.push(eq(orders.locationId, locationId));
      }

      try {
        // Get sales summary by period
        const salesByPeriodData = await db
          .select({
            period: sql<string>`to_char(${orders.createdAt}, ${dateFormat})`,
            sales: sum(orders.totalAmount),
            orders: count(orders.id),
            customers: count(sql`distinct ${orders.customerId}`),
          })
          .from(orders)
          .where(and(...whereConditions))
          .groupBy(sql`to_char(${orders.createdAt}, ${dateFormat})`)
          .orderBy(sql`to_char(${orders.createdAt}, ${dateFormat})`);

        // Get overall totals
        const totalsData = await db
          .select({
            totalSales: sum(orders.totalAmount),
            totalOrders: count(orders.id),
          })
          .from(orders)
          .where(and(...whereConditions));

        // Get top products
        const topProductsData = await db
          .select({
            productName: products.name,
            quantity: sum(orderItems.quantity),
            revenue: sum(orderItems.lineTotal),
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(and(...whereConditions))
          .groupBy(products.name, orderItems.productId)
          .orderBy(desc(sql`sum(${orderItems.lineTotal})`))
          .limit(10);

        // Get payment methods
        const paymentMethodsData = await db
          .select({
            tender: payments.tender,
            amount: sum(payments.amount),
            count: count(payments.id),
          })
          .from(payments)
          .innerJoin(orders, eq(payments.orderId, orders.id))
          .where(and(...whereConditions))
          .groupBy(payments.tender)
          .orderBy(desc(sql`sum(${payments.amount})`));

        const totalSales = totalsData[0]?.totalSales?.toString() ?? '0';
        const totalOrders = totalsData[0]?.totalOrders ?? 0;
        const averageOrderValue = totalOrders > 0 ? (parseFloat(totalSales) / totalOrders).toFixed(2) : '0.00';

        const result = {
          totalSales,
          totalOrders,
          averageOrderValue,
          salesByPeriod: salesByPeriodData.map(row => ({
            period: row.period ?? '',
            sales: row.sales?.toString() ?? '0',
            orders: row.orders,
            customers: row.customers,
          })),
          topProducts: topProductsData.map(row => ({
            productName: row.productName ?? '',
            quantity: row.quantity?.toString() ?? '0',
            revenue: row.revenue?.toString() ?? '0',
          })),
          paymentMethods: paymentMethodsData.map(row => ({
            tender: row.tender ?? '',
            amount: row.amount?.toString() ?? '0',
            count: row.count,
          })),
        };

        return reply.send(createSuccessResponse(result, 'Sales summary retrieved successfully'));
      } catch (error) {
        console.error('Sales summary error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: 'Failed to generate sales summary',
        });
      }
    }
  );

  // GET /api/v1/reports/product-mix - Product performance
  fastify.get(
    '/product-mix',
    {
      schema: {
        description: 'Get product mix report',
        tags: ['Reports'],
        querystring: productMixSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              totalRevenue: z.string(),
              totalQuantity: z.string(),
              averagePrice: z.string(),
              products: z.array(z.object({
                id: z.string(),
                name: z.string(),
                taxCategory: z.string().nullable(),
                quantity: z.string(),
                revenue: z.string(),
                averagePrice: z.string(),
              })),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof productMixSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { dateFrom, dateTo, limit } = request.query;

      const whereConditions = [
        eq(orders.tenantId, tenantId),
        eq(orders.status, 'posted'),
        gte(orders.createdAt, new Date(dateFrom)),
        lte(orders.createdAt, new Date(dateTo)),
      ];

      try {
        // Build the query with explicit typing
        const productMixQuery = db
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
          .where(and(...whereConditions));

        const productMixData = await productMixQuery
          .groupBy(products.id, products.name, products.taxCategory)
          .orderBy(desc(sql`sum(${orderItems.lineTotal})`))
          .limit(limit);

        // Calculate totals with proper typing
        let totalRevenue = 0;
        let totalQuantity = 0;

        productMixData.forEach(item => {
          const itemRevenue = parseFloat(item.revenue?.toString() ?? '0');
          const itemQuantity = parseFloat(item.quantity?.toString() ?? '0');
          totalRevenue += itemRevenue;
          totalQuantity += itemQuantity;
        });

        const averagePrice = totalQuantity > 0 ? (totalRevenue / totalQuantity).toFixed(2) : '0.00';

        const result = {
          totalRevenue: totalRevenue.toString(),
          totalQuantity: totalQuantity.toString(),
          averagePrice,
          products: productMixData.map(row => {
            const quantity = parseFloat(row.quantity?.toString() ?? '0');
            const revenue = parseFloat(row.revenue?.toString() ?? '0');

            return {
              id: row.productId,
              name: row.productName ?? '',
              taxCategory: row.taxCategory,
              quantity: row.quantity?.toString() ?? '0',
              revenue: row.revenue?.toString() ?? '0',
              averagePrice: quantity > 0 ? (revenue / quantity).toFixed(2) : '0.00',
            };
          }),
        };

        return reply.send(createSuccessResponse(result, 'Product mix report retrieved successfully'));
      } catch (error) {
        console.error('Product mix error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: 'Failed to generate product mix report',
        });
      }
    }
  );

  // GET /api/v1/reports/inventory-valuation - Stock value
  fastify.get(
    '/inventory-valuation',
    {
      schema: {
        description: 'Get inventory valuation report',
        tags: ['Reports'],
        querystring: inventoryValuationSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              totalValue: z.string(),
              totalQuantity: z.string(),
              locations: z.array(z.object({
                locationId: z.string(),
                locationName: z.string(),
                value: z.string(),
                quantity: z.string(),
              })),
              items: z.array(z.object({
                productId: z.string(),
                productName: z.string(),
                locationName: z.string(),
                quantity: z.string(),
                unitCost: z.string(),
                totalValue: z.string(),
              })),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof inventoryValuationSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId } = request.query;

      try {
        // Get current stock levels with costs
        const whereConditions = [eq(stockLedger.tenantId, tenantId)];
        if (locationId) {
          whereConditions.push(eq(stockLedger.locationId, locationId));
        }

        const stockData = await db
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
          .where(and(...whereConditions))
          .groupBy(products.id, products.name, locations.id, locations.name)
          .having(sql`sum(${stockLedger.qtyDeltaBase}) > 0`);

        // Calculate totals with proper typing
        let totalValue = 0;
        let totalQuantity = 0;

        stockData.forEach(item => {
          const quantity = parseFloat(item.quantity?.toString() ?? '0');
          const cost = parseFloat(item.averageCost?.toString() ?? '0');
          const value = quantity * cost;

          totalValue += value;
          totalQuantity += quantity;
        });

        // Group by locations
        const locationsMap = new Map<string, {
          locationId: string;
          locationName: string;
          value: number;
          quantity: number;
        }>();

        stockData.forEach(item => {
          const quantity = parseFloat(item.quantity?.toString() ?? '0');
          const cost = parseFloat(item.averageCost?.toString() ?? '0');
          const value = quantity * cost;

          // Location aggregation
          const locKey = item.locationId ?? '';
          if (!locationsMap.has(locKey)) {
            locationsMap.set(locKey, {
              locationId: locKey,
              locationName: item.locationName ?? '',
              value: 0,
              quantity: 0,
            });
          }
          const loc = locationsMap.get(locKey)!;
          loc.value += value;
          loc.quantity += quantity;
        });

        const result = {
          totalValue: totalValue.toString(),
          totalQuantity: totalQuantity.toString(),
          locations: Array.from(locationsMap.values()).map(loc => ({
            locationId: loc.locationId,
            locationName: loc.locationName,
            value: loc.value.toString(),
            quantity: loc.quantity.toString(),
          })),
          items: stockData.map(item => {
            const quantity = parseFloat(item.quantity?.toString() ?? '0');
            const cost = parseFloat(item.averageCost?.toString() ?? '0');
            const value = quantity * cost;

            return {
              productId: item.productId,
              productName: item.productName ?? '',
              locationName: item.locationName ?? '',
              quantity: quantity.toString(),
              unitCost: cost.toString(),
              totalValue: value.toString(),
            };
          }),
        };

        return reply.send(createSuccessResponse(result, 'Inventory valuation report retrieved successfully'));
      } catch (error) {
        console.error('Inventory valuation error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: 'Failed to generate inventory valuation report',
        });
      }
    }
  );

  // GET /api/v1/reports/po-summary - Procurement insights
  fastify.get(
    '/po-summary',
    {
      schema: {
        description: 'Get purchase order summary report',
        tags: ['Reports'],
        querystring: poSummarySchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              totalValue: z.string(),
              totalOrders: z.number(),
              averageOrderValue: z.string(),
              statusByCount: z.record(z.string(), z.number()),
              statusByValue: z.record(z.string(), z.string()),
              suppliers: z.array(z.object({
                supplierId: z.string(),
                supplierName: z.string(),
                orderCount: z.number(),
                totalValue: z.string(),
              })),
              trends: z.array(z.object({
                period: z.string(),
                orderCount: z.number(),
                totalValue: z.string(),
              })),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof poSummarySchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { dateFrom, dateTo, status, supplierId } = request.query;

      const whereConditions = [
        eq(purchaseOrders.tenantId, tenantId),
        gte(purchaseOrders.createdAt, new Date(dateFrom)),
        lte(purchaseOrders.createdAt, new Date(dateTo)),
      ];

      if (status) {
        whereConditions.push(eq(purchaseOrders.status, status));
      }

      if (supplierId) {
        whereConditions.push(eq(purchaseOrders.supplierId, supplierId));
      }

      try {
        // Get PO totals by status
        const statusTotalsData = await db
          .select({
            status: purchaseOrders.status,
            count: count(purchaseOrders.id),
            totalValue: sum(purchaseOrders.totalAmount),
          })
          .from(purchaseOrders)
          .where(and(...whereConditions))
          .groupBy(purchaseOrders.status);

        // Get overall totals
        const totalsData = await db
          .select({
            totalValue: sum(purchaseOrders.totalAmount),
            totalOrders: count(purchaseOrders.id),
          })
          .from(purchaseOrders)
          .where(and(...whereConditions));

        // Get supplier breakdown
        const suppliersData = await db
          .select({
            supplierId: purchaseOrders.supplierId,
            orderCount: count(purchaseOrders.id),
            totalValue: sum(purchaseOrders.totalAmount),
          })
          .from(purchaseOrders)
          .where(and(...whereConditions))
          .groupBy(purchaseOrders.supplierId)
          .orderBy(desc(sql`sum(${purchaseOrders.totalAmount})`))
          .limit(10);

        // Get monthly trends
        const trendsData = await db
          .select({
            period: sql<string>`to_char(${purchaseOrders.createdAt}, 'YYYY-MM')`,
            orderCount: count(purchaseOrders.id),
            totalValue: sum(purchaseOrders.totalAmount),
          })
          .from(purchaseOrders)
          .where(and(...whereConditions))
          .groupBy(sql`to_char(${purchaseOrders.createdAt}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${purchaseOrders.createdAt}, 'YYYY-MM')`);

        const totalValue = totalsData[0]?.totalValue?.toString() ?? '0';
        const totalOrders = totalsData[0]?.totalOrders ?? 0;
        const averageOrderValue = totalOrders > 0 ? (parseFloat(totalValue) / totalOrders).toFixed(2) : '0.00';

        const statusByCount: { [key: string]: number } = {};
        const statusByValue: { [key: string]: string } = {};

        statusTotalsData.forEach(row => {
          if (row.status) {
            statusByCount[row.status] = row.count;
            statusByValue[row.status] = row.totalValue?.toString() ?? '0';
          }
        });

        const result = {
          totalValue,
          totalOrders,
          averageOrderValue,
          statusByCount,
          statusByValue,
          suppliers: suppliersData.map(row => ({
            supplierId: row.supplierId,
            supplierName: `Supplier ${row.supplierId}`,
            orderCount: row.orderCount,
            totalValue: row.totalValue?.toString() ?? '0',
          })),
          trends: trendsData.map(row => ({
            period: row.period ?? '',
            orderCount: row.orderCount,
            totalValue: row.totalValue?.toString() ?? '0',
          })),
        };

        return reply.send(createSuccessResponse(result, 'Purchase order summary retrieved successfully'));
      } catch (error) {
        console.error('PO summary error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: 'Failed to generate purchase order summary',
        });
      }
    }
  );
}