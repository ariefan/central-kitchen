import { z } from 'zod';
import {
  lotCreateSchema,
  lotQuerySchema,
  inventoryValuationSchema,
  stockMovementSchema,
  ledgerQuerySchema,
} from './inventory.schema.js';
import { db } from '../../config/database.js';
import { lots, stockLedger, products, locations } from '../../config/schema.js';
import { eq, and, sql, asc, sum, inArray, desc } from 'drizzle-orm';
import type { RequestContext } from '../../shared/middleware/auth.js';
import { recordInventoryMovements } from '../shared/ledger.service.js';

type LotQuantityRow = {
  lotId: string | null;
  totalQuantity: string | null;
};

export const inventoryService = {
  async listLots(query: z.infer<typeof lotQuerySchema>, context: RequestContext) {
    const { locationId, productId, lotNo, includeExpired, lowStock, expiringSoon } = query;

    let whereConditions = [eq(lots.tenantId, context.tenantId)];

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
        if (row.lotId) {
          stockQuantities.set(row.lotId, Number(row.totalQuantity ?? 0));
        }
      });
    }

    let filteredLots = allLots.map(lot => ({
      ...lot,
      stockQuantity: stockQuantities.get(lot.lot.id) ?? 0,
    }));

    if (lowStock) {
      filteredLots = filteredLots.filter(lot => {
        const qty = Number(lot.stockQuantity);
        return qty > 0 && qty < 10;
      });
    }

    return filteredLots;
  },

  async getLotById(id: string, context: RequestContext) {
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
      .where(and(eq(lots.id, id), eq(lots.tenantId, context.tenantId)))
      .limit(1);

    if (!lotData.length) {
      return null;
    }

    const stockMovements = await db.select()
      .from(stockLedger)
      .where(eq(stockLedger.lotId, id))
      .orderBy(desc(stockLedger.txnTs));

    const currentStock = stockMovements.reduce((total, movement) => total + Number(movement.qtyDeltaBase), 0);

    return {
      ...lotData[0]!.lot,
      product: lotData[0]!.product,
      location: lotData[0]!.location,
      currentStock,
      movements: stockMovements,
    };
  },

  async createLot(rawBody: unknown, context: RequestContext) {
    const body = lotCreateSchema.parse(rawBody);

    const productCheck = await db.select()
      .from(products)
      .where(and(eq(products.id, body.productId), eq(products.tenantId, context.tenantId)))
      .limit(1);

    if (!productCheck.length) {
      throw new Error('Product not found');
    }

    const locationCheck = await db.select()
      .from(locations)
      .where(and(eq(locations.id, body.locationId), eq(locations.tenantId, context.tenantId)))
      .limit(1);

    if (!locationCheck.length) {
      throw new Error('Location not found');
    }

    if (body.lotNo) {
      const existingLot = await db.select()
        .from(lots)
        .where(and(
          eq(lots.productId, body.productId),
          eq(lots.locationId, body.locationId),
          eq(lots.lotNo, body.lotNo),
          eq(lots.tenantId, context.tenantId)
        ))
        .limit(1);

      if (existingLot.length > 0) {
        throw new Error('Lot number already exists for this product and location');
      }
    }

    const [created] = await db.insert(lots)
      .values({
        tenantId: context.tenantId,
        productId: body.productId,
        locationId: body.locationId,
        lotNo: body.lotNo ?? null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        manufactureDate: body.manufactureDate ? new Date(body.manufactureDate) : null,
        notes: body.notes ?? null,
      })
      .returning();

    return created;
  },

  async calculateValuation(rawBody: unknown, context: RequestContext) {
    const body = inventoryValuationSchema.parse(rawBody);

    let whereConditions = [eq(lots.tenantId, context.tenantId)];

    if (body.locationId) {
      whereConditions.push(eq(lots.locationId, body.locationId));
    }

    if (body.productId) {
      whereConditions.push(eq(lots.productId, body.productId));
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

    return {
      lots: lotsData,
      costMethod: body.costMethod,
      calculatedAt: new Date().toISOString(),
    };
  },

  async recordMovement(rawBody: unknown, context: RequestContext) {
    const body = stockMovementSchema.parse(rawBody);

    const entry = {
      tenantId: context.tenantId,
      productId: body.productId,
      locationId: body.locationId,
      lotId: body.lotId ?? null,
      type: body.quantity >= 0 ? 'rcv' : 'iss',
      qtyDeltaBase: body.quantity.toString(),
      unitCost: body.unitCost?.toString() ?? null,
      refType: body.refType,
      refId: body.refId,
      note: body.note ?? null,
      createdBy: context.userId,
    };

    return recordInventoryMovements([entry]);
  },

  async listLedger(rawQuery: unknown, context: RequestContext) {
    const query = ledgerQuerySchema.parse(rawQuery ?? {});
    const whereConditions = [eq(stockLedger.tenantId, context.tenantId)];

    if (query.locationId) {
      whereConditions.push(eq(stockLedger.locationId, query.locationId));
    }

    if (query.productId) {
      whereConditions.push(eq(stockLedger.productId, query.productId));
    }

    if (query.type) {
      whereConditions.push(eq(stockLedger.type, query.type));
    }

    if (query.refType) {
      whereConditions.push(eq(stockLedger.refType, query.refType));
    }

    if (query.dateFrom) {
      whereConditions.push(sql`${stockLedger.txnTs} >= ${new Date(query.dateFrom)}`);
    }

    if (query.dateTo) {
      whereConditions.push(sql`${stockLedger.txnTs} <= ${new Date(query.dateTo)}`);
    }

    const rows = await db.select()
      .from(stockLedger)
      .where(and(...whereConditions))
      .orderBy(desc(stockLedger.txnTs))
      .limit(query.limit)
      .offset(query.offset);

    return rows;
  },
};
