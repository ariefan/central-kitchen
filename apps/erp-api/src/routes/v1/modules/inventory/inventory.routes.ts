import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, createBadRequestError, notFoundResponseSchema } from '../../../../shared/utils/responses';
import { db } from '../../../../config/database';
import { lots, stockLedger, products, locations } from '../../../../config/schema';
import { eq, and, sql, desc, asc, sum, inArray, type SQL } from 'drizzle-orm';
import { getTenantId, getUserId } from '../../../../shared/middleware/auth';
import { PaginatedResponseWithMetadata } from '../../../../shared/types';

// Lot Management schemas
const lotCreateSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  lotNo: z.string().max(100).optional(),
  expiryDate: z.string().datetime().optional(),
  manufactureDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// Cost calculation schemas
const inventoryValuationSchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  costMethod: z.enum(['fifo', 'average']).default('fifo'),
});

// Stock movement schema
const stockMovementSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  quantity: z.number(),
  unitCost: z.number().optional(),
  refType: z.enum(['PO', 'GR', 'REQ', 'XFER', 'PROD', 'ADJ', 'ORDER', 'RET', 'COUNT']),
  refId: z.string().uuid(),
  note: z.string().optional(),
});

type InventoryQuery = {
  locationId?: string;
  productId?: string;
  lotNo?: string;
  includeExpired?: boolean;
  lowStock?: boolean;
  expiringSoon?: boolean;
};

type LotQuantityRow = {
  lotId: string | null;
  totalQuantity: string | null;
};

type LotAverageCostRow = {
  lotId: string | null;
  avgCost: number | null;
};

// Response schemas
const inventoryResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string(),
});

const inventoryListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});

const ledgerQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  type: z.enum(['rcv', 'iss', 'prod_in', 'prod_out', 'adj', 'cust_ret', 'sup_ret', 'waste']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  refType: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
});

export function inventoryRoutes(fastify: FastifyInstance) {
  // GET /api/v1/inventory/lots - List all lots
  fastify.get(
    '/lots',
    {
      schema: {
        description: 'Get all inventory lots with filtering',
        tags: ['Inventory'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          productId: z.string().uuid().optional(),
          lotNo: z.string().optional(),
          includeExpired: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
          lowStock: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
          expiringSoon: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
        }),
        response: {
          200: inventoryListResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId, productId, lotNo, includeExpired, lowStock, expiringSoon } = request.query as InventoryQuery;

      let whereConditions = [eq(lots.tenantId, tenantId)];

      if (locationId) {
        whereConditions.push(eq(lots.locationId, locationId));
      }

      if (productId) {
        whereConditions.push(eq(lots.productId, productId));
      }

      if (lotNo) {
        whereConditions.push(sql`${lots.lotNo} ILIKE ${'%' + lotNo + '%'}`);
      }

      if (!includeExpired) {
        whereConditions.push(sql`(${lots.expiryDate} IS NULL OR ${lots.expiryDate} > ${new Date()})`);
      }

      if (expiringSoon) {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        whereConditions.push(sql`${lots.expiryDate} IS NOT NULL AND ${lots.expiryDate} <= ${thirtyDaysFromNow} AND ${lots.expiryDate} > ${new Date()}`);
      }

      const allLots = await db.select({
        lot: lots,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        location: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
        },
      })
        .from(lots)
        .leftJoin(products, eq(lots.productId, products.id))
        .leftJoin(locations, eq(lots.locationId, locations.id))
        .where(and(...whereConditions))
        .orderBy(asc(lots.expiryDate));

      // Get stock quantities for all lots
      const lotIds = allLots.map(lot => lot.lot.id);
      const stockQuantities = new Map<string, number>();

      if (lotIds.length > 0) {
        const stockLedgerData: LotQuantityRow[] = await db.select({
          lotId: stockLedger.lotId,
          totalQuantity: sum(sql`CASE WHEN ${stockLedger.type} = 'rcv' THEN ${stockLedger.qtyDeltaBase} ELSE -${stockLedger.qtyDeltaBase} END`).as('total'),
        })
          .from(stockLedger)
          .where(inArray(stockLedger.lotId, lotIds))
          .groupBy(stockLedger.lotId);

        stockLedgerData.forEach(row => {
          if (!row.lotId) {
            return;
          }
          stockQuantities.set(row.lotId, Number(row.totalQuantity ?? 0));
        });
      }

      // Attach stock quantities to lots
      const lotsWithQuantities = allLots.map(lot => ({
        ...lot,
        stockQuantity: stockQuantities.get(lot.lot.id) ?? 0,
      }));

      // Filter for low stock if requested (less than 10 units)
      let filteredLots = lotsWithQuantities;
      if (lowStock) {
        filteredLots = lotsWithQuantities.filter(lot => {
          const qty = Number(lot.stockQuantity);
          return qty > 0 && qty < 10;
        });
      }

      return reply.send(createSuccessResponse(filteredLots, 'Inventory lots retrieved successfully'));
    }
  );

  // OPTIONS /api/v1/inventory/lots - CORS preflight for lots endpoint
  fastify.options('/lots', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    reply.header('Access-Control-Max-Age', '86400');
    return reply.code(204).send();
  });

  // GET /api/v1/inventory/lots/:id - Get lot by ID
  fastify.get(
    '/lots/:id',
    {
      schema: {
        description: 'Get lot by ID with stock movements',
        tags: ['Inventory'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: inventoryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const lotData = await db.select({
        lot: lots,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        location: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
        },
      })
        .from(lots)
        .leftJoin(products, eq(lots.productId, products.id))
        .leftJoin(locations, eq(lots.locationId, locations.id))
        .where(and(
          eq(lots.id, request.params.id),
          eq(lots.tenantId, tenantId)
        ))
        .limit(1);

      if (!lotData.length) {
        return createNotFoundError('Lot not found', reply);
      }

      const lotRecord = lotData[0]!;

      // Get stock movements for this lot
      const stockMovements = await db.select()
        .from(stockLedger)
        .where(eq(stockLedger.lotId, request.params.id))
        .orderBy(desc(stockLedger.txnTs));

      // Calculate current stock
      const currentStock = stockMovements.reduce((total, movement) => {
        return total + Number(movement.qtyDeltaBase);
      }, 0);

      const lotWithMovements = {
        ...lotRecord.lot,
        product: lotRecord.product,
        location: lotRecord.location,
        currentStock,
        movements: stockMovements,
      };

      return reply.send(createSuccessResponse(lotWithMovements, 'Lot retrieved successfully'));
    }
  );

  // POST /api/v1/inventory/lots - Create new lot
  fastify.post(
    '/lots',
    {
      schema: {
        description: 'Create new inventory lot',
        tags: ['Inventory'],
        body: lotCreateSchema,
        response: {
          201: inventoryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof lotCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify product exists and belongs to tenant
      const productCheck = await db.select()
        .from(products)
        .where(and(
          eq(products.id, request.body.productId),
          eq(products.tenantId, tenantId)
        ))
        .limit(1);

      if (!productCheck.length) {
        return createNotFoundError('Product not found', reply);
      }

      // Verify location exists and belongs to tenant
      const locationCheck = await db.select()
        .from(locations)
        .where(and(
          eq(locations.id, request.body.locationId),
          eq(locations.tenantId, tenantId)
        ))
        .limit(1);

      if (!locationCheck.length) {
        return createNotFoundError('Location not found', reply);
      }

      // Check for unique lot constraint
      if (request.body.lotNo) {
        const existingLot = await db.select()
          .from(lots)
          .where(and(
            eq(lots.productId, request.body.productId),
            eq(lots.locationId, request.body.locationId),
            eq(lots.lotNo, request.body.lotNo),
            eq(lots.tenantId, tenantId)
          ))
          .limit(1);

        if (existingLot.length > 0) {
          return createBadRequestError('Lot number already exists for this product and location', reply);
        }
      }

      const result = await db.insert(lots)
        .values({
          tenantId,
          productId: request.body.productId,
          locationId: request.body.locationId,
          lotNo: request.body.lotNo ?? null,
          expiryDate: request.body.expiryDate ? new Date(request.body.expiryDate) : null,
          manufactureDate: request.body.manufactureDate ? new Date(request.body.manufactureDate) : null,
          notes: request.body.notes ?? null,
        })
        .returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Lot created successfully'));
    }
  );

  // POST /api/v1/inventory/valuation - Calculate inventory valuation
  fastify.post(
    '/valuation',
    {
      schema: {
        description: 'Calculate inventory valuation with cost method',
        tags: ['Inventory'],
        body: inventoryValuationSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              totalValue: z.number(),
              locationBreakdown: z.array(z.object({
                locationId: z.string(),
                locationName: z.string(),
                totalValue: z.number(),
                itemCount: z.number(),
              })),
              productBreakdown: z.array(z.object({
                productId: z.string(),
                productName: z.string(),
                totalQuantity: z.number(),
                totalValue: z.number(),
                averageCost: z.number(),
              })),
              costMethod: z.string(),
              calculatedAt: z.string(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof inventoryValuationSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId, productId, costMethod } = request.body;

      // Get lots with current stock
      let whereConditions = [eq(lots.tenantId, tenantId)];

      if (locationId) {
        whereConditions.push(eq(lots.locationId, locationId));
      }

      if (productId) {
        whereConditions.push(eq(lots.productId, productId));
      }

      const lotsData = await db.select({
        lot: lots,
        product: {
          id: products.id,
          name: products.name,
        },
        location: {
          id: locations.id,
          name: locations.name,
        },
      })
        .from(lots)
        .leftJoin(products, eq(lots.productId, products.id))
        .leftJoin(locations, eq(lots.locationId, locations.id))
        .where(and(...whereConditions));

      // Get stock quantities and costs for each lot
      const lotIds = lotsData.map(lot => lot.lot.id);
      const stockQuantities = new Map<string, number>();
      const avgCosts = new Map<string, number>();

      if (lotIds.length > 0) {
        // Get stock quantities
        const stockLedgerData: LotQuantityRow[] = await db.select({
          lotId: stockLedger.lotId,
          totalQuantity: sum(sql`CASE WHEN ${stockLedger.type} = 'rcv' THEN ${stockLedger.qtyDeltaBase} ELSE -${stockLedger.qtyDeltaBase} END`).as('total'),
        })
          .from(stockLedger)
          .where(inArray(stockLedger.lotId, lotIds))
          .groupBy(stockLedger.lotId);

        stockLedgerData.forEach(row => {
          if (!row.lotId) {
            return;
          }
          stockQuantities.set(row.lotId, Number(row.totalQuantity ?? 0));
        });

        // Get average costs
        const costData: LotAverageCostRow[] = await db.select({
          lotId: stockLedger.lotId,
          avgCost: sql<number>`AVG(${stockLedger.unitCost})`.as('avg_cost'),
        })
          .from(stockLedger)
          .where(and(
            inArray(stockLedger.lotId, lotIds),
            sql`${stockLedger.unitCost} IS NOT NULL`
          ))
          .groupBy(stockLedger.lotId);

        costData.forEach(row => {
          if (!row.lotId) {
            return;
          }
          avgCosts.set(row.lotId, Number(row.avgCost ?? 0));
        });
      }

      const lotsWithStock = lotsData.map(lot => ({
        ...lot,
        currentStock: stockQuantities.get(lot.lot.id) ?? 0,
        avgUnitCost: avgCosts.get(lot.lot.id) ?? 0,
      }));

      // Filter lots with positive stock
      const positiveStockLots = lotsWithStock.filter(lot => Number(lot.currentStock) > 0);

      // Calculate valuation based on cost method
      let totalValue = 0;
      const locationBreakdown = new Map<string, {
        locationId: string;
        locationName: string;
        totalValue: number;
        itemCount: number;
      }>();
      const productBreakdown = new Map<string, {
        productId: string;
        productName: string;
        totalQuantity: number;
        totalValue: number;
        averageCost: number;
      }>();

      for (const lot of positiveStockLots) {
        if (!lot.location || !lot.product) {
          continue;
        }

        const quantity = Number(lot.currentStock);
        const avgCost = Number(lot.avgUnitCost);
        const lotValue = quantity * avgCost;

        totalValue += lotValue;

        // Location breakdown
        const locKey = lot.location.id;
        if (!locationBreakdown.has(locKey)) {
          locationBreakdown.set(locKey, {
            locationId: locKey,
            locationName: lot.location.name,
            totalValue: 0,
            itemCount: 0,
          });
        }
        const locData = locationBreakdown.get(locKey);
        if (locData) {
          locData.totalValue += lotValue;
          locData.itemCount += 1;
        }

        // Product breakdown
        const prodKey = lot.product.id;
        if (!productBreakdown.has(prodKey)) {
          productBreakdown.set(prodKey, {
            productId: prodKey,
            productName: lot.product.name,
            totalQuantity: 0,
            totalValue: 0,
            averageCost: 0,
          });
        }
        const prodData = productBreakdown.get(prodKey);
        if (prodData) {
          prodData.totalQuantity += quantity;
          prodData.totalValue += lotValue;
          prodData.averageCost = prodData.totalValue / prodData.totalQuantity;
        }
      }

      return reply.send(createSuccessResponse({
        totalValue,
        locationBreakdown: Array.from(locationBreakdown.values()),
        productBreakdown: Array.from(productBreakdown.values()),
        costMethod,
        calculatedAt: new Date().toISOString(),
      }, 'Inventory valuation calculated successfully'));
    }
  );

  // GET /api/v1/inventory/cost/:productId - Get product cost analysis
  fastify.get(
    '/cost/:productId',
    {
      schema: {
        description: 'Get detailed cost analysis for a product',
        tags: ['Inventory'],
        params: z.object({ productId: z.string().uuid() }),
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          costMethod: z.enum(['fifo', 'average']).default('fifo'),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              productId: z.string(),
              productName: z.string(),
              currentStock: z.number(),
              averageCost: z.number(),
              totalValue: z.number(),
              lots: z.array(z.object({
                lotId: z.string(),
                lotNo: z.string().nullable(),
                quantity: z.number(),
                unitCost: z.number(),
                totalValue: z.number(),
                expiryDate: z.string().nullable(),
                receivedDate: z.string().nullable(),
              })),
              costTrend: z.array(z.object({
                date: z.string(),
                unitCost: z.number(),
                movementType: z.string(),
                quantity: z.number(),
              })),
            }),
            message: z.string(),
          }),
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { productId: string },
      Querystring: { locationId?: string, costMethod?: string }
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId } = request.query;

      // Verify product exists and belongs to tenant
      const productCheck = await db.select()
        .from(products)
        .where(and(
          eq(products.id, request.params.productId),
          eq(products.tenantId, tenantId)
        ))
        .limit(1);

      if (!productCheck.length) {
        return createNotFoundError('Product not found', reply);
      }

      const product = productCheck[0]!;

      // Get lots with stock and cost information
      let lotWhereConditions = [
        eq(lots.tenantId, tenantId),
        eq(lots.productId, request.params.productId)
      ];

      if (locationId) {
        lotWhereConditions.push(eq(lots.locationId, locationId));
      }

      const lotsData = await db.select({
        lot: lots,
      })
        .from(lots)
        .where(and(...lotWhereConditions));

      // Get stock quantities and costs for each lot
      const lotIds = lotsData.map(lot => lot.lot.id);
      const stockQuantities = new Map<string, number>();
      const avgCosts = new Map<string, number>();

      if (lotIds.length > 0) {
        // Get stock quantities
        const stockLedgerData: LotQuantityRow[] = await db.select({
          lotId: stockLedger.lotId,
          totalQuantity: sum(sql`CASE WHEN ${stockLedger.type} = 'rcv' THEN ${stockLedger.qtyDeltaBase} ELSE -${stockLedger.qtyDeltaBase} END`).as('total'),
        })
          .from(stockLedger)
          .where(inArray(stockLedger.lotId, lotIds))
          .groupBy(stockLedger.lotId);

        stockLedgerData.forEach(row => {
          if (!row.lotId) {
            return;
          }
          stockQuantities.set(row.lotId, Number(row.totalQuantity ?? 0));
        });

        // Get average costs
        const costData: LotAverageCostRow[] = await db.select({
          lotId: stockLedger.lotId,
          avgCost: sql<number>`AVG(${stockLedger.unitCost})`.as('avg_cost'),
        })
          .from(stockLedger)
          .where(and(
            inArray(stockLedger.lotId, lotIds),
            sql`${stockLedger.unitCost} IS NOT NULL`
          ))
          .groupBy(stockLedger.lotId);

        costData.forEach(row => {
          if (!row.lotId) {
            return;
          }
          avgCosts.set(row.lotId, Number(row.avgCost ?? 0));
        });
      }

      const lotsWithCosts = lotsData.map(lot => ({
        lot: lot.lot,
        currentStock: stockQuantities.get(lot.lot.id) ?? 0,
        avgUnitCost: avgCosts.get(lot.lot.id) ?? 0,
      }));

      // Filter positive stock lots
      const positiveStockLots = lotsWithCosts.filter(lot => Number(lot.currentStock) > 0);

      // Calculate totals
      let totalStock = 0;
      let totalValue = 0;
      const lotsResult: Array<{
        lotId: string;
        lotNo: string | null;
        quantity: number;
        unitCost: number;
        totalValue: number;
        expiryDate: string | null;
        receivedDate: string | null;
      }> = [];

      for (const lot of positiveStockLots) {
        const quantity = Number(lot.currentStock);
        const unitCost = Number(lot.avgUnitCost);
        const lotValue = quantity * unitCost;

        totalStock += quantity;
        totalValue += lotValue;

        lotsResult.push({
          lotId: lot.lot.id,
          lotNo: lot.lot.lotNo,
          quantity,
          unitCost,
          totalValue: lotValue,
          expiryDate: lot.lot.expiryDate?.toISOString() ?? null,
          receivedDate: lot.lot.receivedDate ? lot.lot.receivedDate.toISOString() : null,
        });
      }

      const averageCost = totalStock > 0 ? totalValue / totalStock : 0;

      // Get cost trend from recent stock movements
      let movementWhereConditions = [
        eq(stockLedger.tenantId, tenantId),
        eq(stockLedger.productId, request.params.productId),
        sql`${stockLedger.unitCost} IS NOT NULL`
      ];

      if (locationId) {
        movementWhereConditions.push(eq(stockLedger.locationId, locationId));
      }

      const costTrend = await db.select({
        date: sql<string>`DATE(${stockLedger.txnTs})`.as('date'),
        unitCost: stockLedger.unitCost,
        movementType: stockLedger.type,
        quantity: stockLedger.qtyDeltaBase,
      })
        .from(stockLedger)
        .where(and(...movementWhereConditions))
        .orderBy(desc(stockLedger.txnTs))
        .limit(50);

      return reply.send(createSuccessResponse({
        productId: product.id,
        productName: product.name,
        currentStock: totalStock,
        averageCost,
        totalValue,
        lots: lotsResult,
        costTrend: costTrend.map(trend => ({
          date: trend.date,
          unitCost: Number(trend.unitCost),
          movementType: trend.movementType,
          quantity: Number(trend.quantity),
        })),
      }, 'Product cost analysis retrieved successfully'));
    }
  );

  // POST /api/v1/inventory/movements - Record stock movement
  fastify.post(
    '/movements',
    {
      schema: {
        description: 'Record stock movement with cost tracking',
        tags: ['Inventory'],
        body: stockMovementSchema,
        response: {
          201: inventoryResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof stockMovementSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Validate product and location
      const productCheck = await db.select()
        .from(products)
        .where(and(
          eq(products.id, request.body.productId),
          eq(products.tenantId, tenantId)
        ))
        .limit(1);

      if (!productCheck.length) {
        return createNotFoundError('Product not found', reply);
      }

      const locationCheck = await db.select()
        .from(locations)
        .where(and(
          eq(locations.id, request.body.locationId),
          eq(locations.tenantId, tenantId)
        ))
        .limit(1);

      if (!locationCheck.length) {
        return createNotFoundError('Location not found', reply);
      }

      // Validate lot if provided
      if (request.body.lotId) {
        const lotCheck = await db.select()
          .from(lots)
          .where(and(
            eq(lots.id, request.body.lotId),
            eq(lots.tenantId, tenantId),
            eq(lots.productId, request.body.productId),
            eq(lots.locationId, request.body.locationId)
          ))
          .limit(1);

        if (!lotCheck.length) {
          return createNotFoundError('Lot not found or does not match product/location', reply);
        }
      }

      // Determine movement type and ensure quantity is positive
      const movementType = request.body.quantity > 0 ? 'rcv' : 'iss';
      const quantity = Math.abs(request.body.quantity);

      const signedQuantity = request.body.quantity > 0 ? quantity : -quantity;
      const movement: typeof stockLedger.$inferInsert = {
        tenantId,
        productId: request.body.productId,
        locationId: request.body.locationId,
        lotId: request.body.lotId ?? null,
        type: movementType,
        qtyDeltaBase: signedQuantity.toString(),
        unitCost: request.body.unitCost !== undefined ? request.body.unitCost.toString() : null,
        refType: request.body.refType,
        refId: request.body.refId,
        note: request.body.note ?? null,
        createdBy: userId,
      };

      const result = await db.insert(stockLedger)
        .values(movement)
        .returning();

      return reply.status(201).send(createSuccessResponse(result[0], 'Stock movement recorded successfully'));
    }
  );

  // GET /api/v1/inventory/ledger - Get full stock ledger visibility
  fastify.get(
    '/ledger',
    {
      schema: {
        description: 'Get full stock ledger with comprehensive filtering',
        tags: ['Inventory'],
        querystring: ledgerQuerySchema,
        response: {
          200: inventoryListResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof ledgerQuerySchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const {
        locationId,
        productId,
        type,
        dateFrom,
        dateTo,
        refType,
        limit,
        offset
      } = request.query;

      const whereConditions: SQL[] = [eq(stockLedger.tenantId, tenantId)];

      if (locationId) {
        whereConditions.push(eq(stockLedger.locationId, locationId));
      }

      if (productId) {
        whereConditions.push(eq(stockLedger.productId, productId));
      }

      if (type) {
        whereConditions.push(eq(stockLedger.type, type));
      }

      if (refType) {
        whereConditions.push(eq(stockLedger.refType, refType));
      }

      if (dateFrom) {
        whereConditions.push(sql`${stockLedger.txnTs} >= ${new Date(dateFrom)}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${stockLedger.txnTs} <= ${new Date(dateTo)}`);
      }

      // Get ledger entries with related data
      const ledgerEntries = await db
        .select({
          id: stockLedger.id,
          tenantId: stockLedger.tenantId,
          productId: stockLedger.productId,
          locationId: stockLedger.locationId,
          lotId: stockLedger.lotId,
          type: stockLedger.type,
          qtyDeltaBase: stockLedger.qtyDeltaBase,
          unitCost: stockLedger.unitCost,
          refType: stockLedger.refType,
          refId: stockLedger.refId,
          note: stockLedger.note,
          createdAt: stockLedger.txnTs,
          createdBy: stockLedger.createdBy,
          product: {
            id: products.id,
            name: products.name,
            sku: products.sku,
          },
          location: {
            id: locations.id,
            name: locations.name,
            code: locations.code,
          },
          lot: {
            id: lots.id,
            lotNo: lots.lotNo,
            expiryDate: lots.expiryDate,
          },
        })
        .from(stockLedger)
        .leftJoin(products, eq(stockLedger.productId, products.id))
        .leftJoin(locations, eq(stockLedger.locationId, locations.id))
        .leftJoin(lots, eq(stockLedger.lotId, lots.id))
        .where(and(...whereConditions))
        .orderBy(desc(stockLedger.txnTs))
        .limit(limit ?? 100)
        .offset(offset ?? 0);

      // Calculate summary statistics
      const totalEntries = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockLedger)
        .where(and(...whereConditions));

      const pageLimit = limit ?? 100;
      const pageOffset = offset ?? 0;
      const entryCount = totalEntries[0]?.count ?? 0;
      const totalPages = pageLimit > 0 ? Math.ceil(entryCount / pageLimit) : 0;
      const summary = {
        totalEntries: entryCount,
        totalPages,
        currentPage: pageLimit > 0 ? Math.floor(pageOffset / pageLimit) + 1 : 1,
        filters: { locationId, productId, type, dateFrom, dateTo, refType },
        period: {
          from: dateFrom ?? null,
          to: dateTo ?? null,
        },
      };

      const paginatedResponse: PaginatedResponseWithMetadata<typeof ledgerEntries[0]> = {
        entries: ledgerEntries,
        summary,
      };

      return reply.send(createSuccessResponse(paginatedResponse, 'Stock ledger retrieved successfully'));
    }
  );

  // GET /api/v1/inventory/onhand - Get on-hand inventory summary
  fastify.get(
    '/onhand',
    {
      schema: {
        description: 'Get on-hand inventory summary by product and location',
        tags: ['Inventory'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          productId: z.string().uuid().optional(),
        }),
        response: {
          200: inventoryListResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = request.query as { locationId?: string; productId?: string };
      const { locationId, productId } = query;

      // Simple query to get basic stock data
      const whereConditions = [eq(stockLedger.tenantId, tenantId)];

      if (locationId) {
        whereConditions.push(eq(stockLedger.locationId, locationId));
      }

      if (productId) {
        whereConditions.push(eq(stockLedger.productId, productId));
      }

      // Get current stock quantities
      const stockData = await db.select({
        productId: stockLedger.productId,
        locationId: stockLedger.locationId,
        totalQuantity: sql<number>`SUM(CASE WHEN ${stockLedger.type} = 'rcv' THEN ${stockLedger.qtyDeltaBase} ELSE -${stockLedger.qtyDeltaBase} END)`.as('total'),
        lastMovementAt: sql<string>`MAX(${stockLedger.txnTs})`.as('last_movement'),
      })
        .from(stockLedger)
        .where(and(...whereConditions))
        .groupBy(stockLedger.productId, stockLedger.locationId);

      // Get product and location details only if we have data
      const result = [];

      if (stockData.length > 0) {
        const productIds = stockData.map(item => item.productId);
        const locationIds = stockData.map(item => item.locationId);

        const [productDetails, locationDetails] = await Promise.all([
          db.select({
            id: products.id,
            sku: products.sku,
            name: products.name,
            isPerishable: products.isPerishable,
          })
            .from(products)
            .where(and(
              eq(products.tenantId, tenantId),
              inArray(products.id, productIds)
            )),
          db.select({
            id: locations.id,
            name: locations.name,
            type: locations.type,
          })
            .from(locations)
            .where(and(
              eq(locations.tenantId, tenantId),
              inArray(locations.id, locationIds)
            ))
        ]);

        const productMap = new Map(productDetails.map(p => [p.id, p]));
        const locationMap = new Map(locationDetails.map(l => [l.id, l]));

        for (const stock of stockData) {
          const product = productMap.get(stock.productId);
          const location = locationMap.get(stock.locationId);

          if (product && location) {
            const qty = Number(stock.totalQuantity);
            let status: 'in-stock' | 'low-stock' | 'out-of-stock';

            if (qty <= 0) {
              status = 'out-of-stock';
            } else if (qty < 10) {
              status = 'low-stock';
            } else {
              status = 'in-stock';
            }

            result.push({
              productId: stock.productId,
              productSku: product.sku,
              productName: product.name,
              locationId: stock.locationId,
              locationName: location.name,
              locationType: location.type,
              qtyBase: qty,
              qtyDefaultSellUom: qty,
              lastMovementAt: stock.lastMovementAt,
              status,
            });
          }
        }
      }

      return reply.send(createSuccessResponse(result, 'On-hand inventory retrieved successfully'));
    }
  );

  // GET /api/v1/inventory/stats - Get inventory statistics
  fastify.get(
    '/stats',
    {
      schema: {
        description: 'Get inventory statistics summary',
        tags: ['Inventory'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              totalProducts: z.number(),
              totalLocations: z.number(),
              lowStockItems: z.number(),
              outOfStockItems: z.number(),
              expiringSoonItems: z.number(),
              totalValue: z.number(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { locationId } = request.query as { locationId?: string };

      // Get base statistics
      const whereConditions = [eq(stockLedger.tenantId, tenantId)];
      if (locationId) {
        whereConditions.push(eq(stockLedger.locationId, locationId));
      }

      // Get current stock quantities
      const stockData = await db.select({
        productId: stockLedger.productId,
        locationId: stockLedger.locationId,
        totalQuantity: sql<number>`SUM(CASE WHEN ${stockLedger.type} = 'rcv' THEN ${stockLedger.qtyDeltaBase} ELSE -${stockLedger.qtyDeltaBase} END)`.as('total'),
      })
        .from(stockLedger)
        .where(and(...whereConditions))
        .groupBy(stockLedger.productId, stockLedger.locationId);

      // Count products
      const productCount = await db
        .select({ count: sql<number>`count(DISTINCT ${stockLedger.productId})` })
        .from(stockLedger)
        .where(and(...whereConditions));

      // Count locations
      const locationCount = await db
        .select({ count: sql<number>`count(DISTINCT ${stockLedger.locationId})` })
        .from(stockLedger)
        .where(and(...whereConditions));

      // Calculate stock status counts
      let lowStockItems = 0;
      let outOfStockItems = 0;

      for (const stock of stockData) {
        const qty = Number(stock.totalQuantity);
        if (qty <= 0) {
          outOfStockItems++;
        } else if (qty < 10) {
          lowStockItems++;
        }
      }

      // For expiring soon items, we need to check lots with expiry dates
      const lotWhereConditions = [eq(lots.tenantId, tenantId)];
      if (locationId) {
        lotWhereConditions.push(eq(lots.locationId, locationId));
      }

      const expiringLots = await db.select({ count: sql<number>`count(*)` })
        .from(lots)
        .where(and(
          ...lotWhereConditions,
          sql`${lots.expiryDate} IS NOT NULL`,
          sql`${lots.expiryDate} <= ${sql`CURRENT_DATE + INTERVAL '30 days'`}`,
          sql`${lots.expiryDate} > CURRENT_DATE`
        ));

      const expiringSoonItems = expiringLots[0]?.count ?? 0;

      // Simple total value calculation (using standard cost from products)
      const productIds = stockData.map(item => item.productId);
      let totalValue = 0;

      if (productIds.length > 0) {
        const productCosts = await db.select({
          id: products.id,
          standardCost: products.standardCost,
        })
          .from(products)
          .where(and(
            eq(products.tenantId, tenantId),
            inArray(products.id, productIds)
          ));

        const costMap = new Map(productCosts.map(p => [p.id, Number(p.standardCost ?? 0)]));

        for (const stock of stockData) {
          const qty = Number(stock.totalQuantity);
          const cost = costMap.get(stock.productId) ?? 0;
          totalValue += qty * cost;
        }
      }

      const stats = {
        totalProducts: Number(productCount[0]?.count ?? 0),
        totalLocations: Number(locationCount[0]?.count ?? 0),
        lowStockItems,
        outOfStockItems,
        expiringSoonItems: Number(expiringSoonItems),
        totalValue: Number(totalValue),
      };

      return reply.send(createSuccessResponse(stats, 'Inventory statistics retrieved successfully'));
    }
  );
}
