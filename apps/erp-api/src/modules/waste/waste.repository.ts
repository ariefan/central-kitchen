import { db } from '../../config/database.js';
import {
  stockAdjustments,
  stockAdjustmentItems,
  products,
  locations,
  uoms,
  lots,
} from '../../config/schema.js';
import { and, eq, sql, desc } from 'drizzle-orm';
import type { WasteQuery } from './waste.service.js';

export const wasteRepository = {
  async listAdjustments(tenantId: string, filters: WasteQuery) {
    const whereConditions = [eq(stockAdjustments.tenantId, tenantId)];
    whereConditions.push(sql`${stockAdjustments.reason} IN ('damage', 'expiry', 'spoilage', 'waste')`);

    if (filters.locationId) whereConditions.push(eq(stockAdjustments.locationId, filters.locationId));
    if (filters.status) whereConditions.push(eq(stockAdjustments.status, filters.status));
    if (filters.dateFrom) whereConditions.push(sql`${stockAdjustments.createdAt} >= ${new Date(filters.dateFrom)}`);
    if (filters.dateTo) whereConditions.push(sql`${stockAdjustments.createdAt} <= ${new Date(filters.dateTo)}`);

    const adjustments = await db.select({
      adjustment: stockAdjustments,
      location: {
        id: locations.id,
        name: locations.name,
        code: locations.code,
      },
    })
      .from(stockAdjustments)
      .leftJoin(locations, eq(stockAdjustments.locationId, locations.id))
      .where(and(...whereConditions))
      .orderBy(desc(stockAdjustments.createdAt));

    return adjustments;
  },

  async getItemsForAdjustment(adjustmentId: string, filters: Pick<WasteQuery, 'productId' | 'reason'>) {
    const whereConditions = [eq(stockAdjustmentItems.adjustmentId, adjustmentId)];

    if (filters.productId) whereConditions.push(eq(stockAdjustmentItems.productId, filters.productId));
    if (filters.reason) whereConditions.push(sql`${stockAdjustmentItems.reason} ILIKE ${'%' + filters.reason + '%'}`);

    return db.select({
      item: stockAdjustmentItems,
      product: {
        id: products.id,
        name: products.name,
        sku: products.sku,
      },
      uom: {
        id: uoms.id,
        code: uoms.code,
        name: uoms.name,
      },
      lot: {
        id: lots.id,
        lotNo: lots.lotNo,
        expiryDate: lots.expiryDate,
      },
    })
      .from(stockAdjustmentItems)
      .leftJoin(products, eq(stockAdjustmentItems.productId, products.id))
      .leftJoin(uoms, eq(stockAdjustmentItems.uomId, uoms.id))
      .leftJoin(lots, eq(stockAdjustmentItems.lotId, lots.id))
      .where(and(...whereConditions));
  },

  async findById(id: string, tenantId: string) {
    const adjustment = await db.select({
      adjustment: stockAdjustments,
      location: {
        id: locations.id,
        name: locations.name,
        code: locations.code,
      },
    })
      .from(stockAdjustments)
      .leftJoin(locations, eq(stockAdjustments.locationId, locations.id))
      .where(and(
        eq(stockAdjustments.id, id),
        eq(stockAdjustments.tenantId, tenantId),
        sql`${stockAdjustments.reason} IN ('damage', 'expiry', 'spoilage', 'waste')`
      ))
      .limit(1);

    return adjustment[0] ?? null;
  },

  async insertAdjustment(data: typeof stockAdjustments.$inferInsert) {
    const [adjustment] = await db.insert(stockAdjustments).values(data).returning();
    return adjustment;
  },

  async insertItems(items: typeof stockAdjustmentItems.$inferInsert[]) {
    if (!items.length) return [];
    return db.insert(stockAdjustmentItems).values(items).returning();
  },
};
