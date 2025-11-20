import { z } from 'zod';
import {
  wasteRecordSchema,
  wasteAnalysisSchema,
  wasteQuerySchema,
} from './waste.schema.js';
import { wasteRepository } from './waste.repository.js';
import type { RequestContext } from '../../shared/middleware/auth.js';
import { db } from '../../config/database.js';
import {
  locations,
  products,
  uoms,
  lots,
  stockAdjustments,
  stockAdjustmentItems,
} from '../../config/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { generateDocNumber } from '../shared/doc-sequence.js';

export type WasteQuery = z.infer<typeof wasteQuerySchema>;

export const wasteService = {
  async listRecords(rawQuery: unknown, context: RequestContext) {
    const query = wasteQuerySchema.parse(rawQuery ?? {});
    const adjustments = await wasteRepository.listAdjustments(context.tenantId, query);

    const records = await Promise.all(
      adjustments.map(async (record) => {
        const items = await wasteRepository.getItemsForAdjustment(record.adjustment.id, {
          productId: query.productId,
          reason: query.reason,
        });

        const totalValue = items.reduce((sum, item) => {
          const quantity = Number(item.item.qtyDelta);
          const value = Number(item.item.unitCost ?? 0) * quantity;
          return sum + value;
        }, 0);

        return {
          ...record.adjustment,
          location: record.location,
          items,
          totalValue,
        };
      })
    );

    return query.productId || query.reason ? records.filter(rec => rec.items.length > 0) : records;
  },

  async getRecord(id: string, context: RequestContext) {
    const record = await wasteRepository.findById(id, context.tenantId);
    if (!record) return null;

    const items = await wasteRepository.getItemsForAdjustment(id, {});
    const totalValue = items.reduce((sum, item) => {
      const quantity = Number(item.item.qtyDelta);
      const value = Number(item.item.unitCost ?? 0) * quantity;
      return sum + value;
    }, 0);
    const totalQuantity = items.reduce((sum, item) => sum + Number(item.item.qtyDelta), 0);

    return {
      ...record.adjustment,
      location: record.location,
      items,
      totalValue,
      totalQuantity,
    };
  },

  async createRecord(rawBody: unknown, context: RequestContext) {
    const body = wasteRecordSchema.parse(rawBody);

    const locationCheck = await db.select()
      .from(locations)
      .where(and(eq(locations.id, body.locationId), eq(locations.tenantId, context.tenantId)))
      .limit(1);
    if (!locationCheck.length) {
      throw new Error('Location not found');
    }

    const productIds = body.items.map(item => item.productId);
    if (productIds.length) {
      const productCheck = await db.select({ id: products.id })
        .from(products)
        .where(and(sql`${products.id} = ANY(${productIds})`, eq(products.tenantId, context.tenantId)));
      if (productCheck.length !== productIds.length) {
        throw new Error('One or more products not found');
      }
    }

    const uomIds = body.items.map(item => item.uomId);
    const uomCheck = await db.select({ id: uoms.id })
      .from(uoms)
      .where(sql`${uoms.id} = ANY(${uomIds})`);
    if (uomCheck.length !== uomIds.length) {
      throw new Error('One or more UOMs not found');
    }

    const lotIds = body.items.map(item => item.lotId).filter(Boolean) as string[];
    if (lotIds.length) {
      const lotCheck = await db.select({ id: lots.id })
        .from(lots)
        .where(sql`${lots.id} = ANY(${lotIds})`);
      if (lotCheck.length !== lotIds.length) {
        throw new Error('One or more lots not found');
      }
    }

    const result = await db.transaction(async (tx) => {
      const adjNumber = generateDocNumber('WASTE', { tenantId: context.tenantId });
      const [adjustment] = await tx.insert(stockAdjustments)
        .values({
          tenantId: context.tenantId,
          adjNumber,
          locationId: body.locationId,
          reason: body.reason,
          status: 'draft',
          notes: body.notes ?? null,
          createdBy: context.userId,
        })
        .returning();

      if (!adjustment) {
        throw new Error('Failed to create waste record');
      }

      const items = await tx.insert(stockAdjustmentItems).values(
        body.items.map(item => ({
          adjustmentId: adjustment.id,
          productId: item.productId,
          lotId: item.lotId ?? null,
          uomId: item.uomId,
          qtyDelta: (-item.quantity).toString(),
          unitCost: item.unitCost?.toString() ?? null,
          reason: item.reason ?? null,
        }))
      ).returning();

      return {
        ...adjustment,
        items,
      };
    });

    return result;
  },

  async approveRecord(id: string, context: RequestContext) {
    const existingRecord = await db.select()
      .from(stockAdjustments)
      .where(and(
        eq(stockAdjustments.id, id),
        eq(stockAdjustments.tenantId, context.tenantId),
        eq(stockAdjustments.status, 'draft'),
        sql`${stockAdjustments.reason} IN ('damage', 'expiry', 'spoilage', 'waste')`
      ))
      .limit(1);

    if (!existingRecord.length) {
      return null;
    }

    const [result] = await db.update(stockAdjustments)
      .set({
        status: 'posted',
        approvedBy: context.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(stockAdjustments.id, id), eq(stockAdjustments.tenantId, context.tenantId)))
      .returning();

    if (!result) {
      throw new Error('Failed to approve waste record');
    }

    const [locationDetails] = await db.select({
      id: locations.id,
      name: locations.name,
      code: locations.code,
    })
      .from(locations)
      .where(and(eq(locations.id, result.locationId), eq(locations.tenantId, context.tenantId)))
      .limit(1);

    const adjustmentItems = await db.select()
      .from(stockAdjustmentItems)
      .where(eq(stockAdjustmentItems.adjustmentId, id));

    return {
      ...result,
      location: locationDetails ?? null,
      items: adjustmentItems,
    };
  },

  async analyze(rawBody: unknown, context: RequestContext) {
    const body = wasteAnalysisSchema.parse(rawBody ?? {});
    const { locationId, productId, reason, dateFrom, dateTo } = body;

    const whereConditions = [eq(stockAdjustments.tenantId, context.tenantId)];
    whereConditions.push(sql`${stockAdjustments.reason} IN ('damage', 'expiry', 'spoilage', 'waste')`);

    if (locationId) whereConditions.push(eq(stockAdjustments.locationId, locationId));
    if (dateFrom) whereConditions.push(sql`${stockAdjustments.createdAt} >= ${new Date(dateFrom)}`);
    if (dateTo) whereConditions.push(sql`${stockAdjustments.createdAt} <= ${new Date(dateTo)}`);

    const wasteData = await db
      .select({
        adjustment: stockAdjustments,
        item: stockAdjustmentItems,
        product: {
          id: products.id,
          name: products.name,
        },
        location: {
          id: locations.id,
          name: locations.name,
        },
      })
      .from(stockAdjustments)
      .leftJoin(stockAdjustmentItems, eq(stockAdjustmentItems.adjustmentId, stockAdjustments.id))
      .leftJoin(products, eq(stockAdjustmentItems.productId, products.id))
      .leftJoin(locations, eq(stockAdjustments.locationId, locations.id))
      .where(and(...whereConditions));

    let filteredData = wasteData;
    if (productId) {
      filteredData = filteredData.filter(row => row.item?.productId === productId);
    }
    if (reason) {
      filteredData = filteredData.filter(row => row.adjustment?.reason === reason);
    }

    const totalRecords = new Set(filteredData.map(row => row.adjustment?.id)).size;
    const totalValue = filteredData.reduce((sum, row) => {
      if (!row.item) return sum;
      const unitCost = Number(row.item.unitCost ?? 0);
      const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
      return sum + (unitCost * quantity);
    }, 0);
    const totalQuantity = filteredData.reduce((sum, row) => {
      if (!row.item) return sum;
      return sum + Math.abs(Number(row.item.qtyDelta || 0));
    }, 0);

    const byReason = new Map<string, { count: number; totalValue: number; totalQuantity: number }>();
    filteredData.forEach(row => {
      if (!row.adjustment || !row.item) return;
      const key = row.adjustment.reason;
      if (!byReason.has(key)) {
        byReason.set(key, { count: 0, totalValue: 0, totalQuantity: 0 });
      }
      const data = byReason.get(key)!;
      const unitCost = Number(row.item.unitCost ?? 0);
      const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
      data.count += 1;
      data.totalValue += unitCost * quantity;
      data.totalQuantity += quantity;
    });

    const byReasonArray = Array.from(byReason.entries()).map(([reasonKey, data]) => ({
      reason: reasonKey,
      count: data.count,
      totalValue: data.totalValue,
      totalQuantity: data.totalQuantity,
      percentage: totalRecords > 0 ? (data.count / totalRecords) * 100 : 0,
    }));

    const byProduct = new Map<string, { productId: string; productName: string; totalValue: number; totalQuantity: number; wasteQuantity: number }>();
    filteredData.forEach(row => {
      if (!row.product || !row.item) return;
      const key = row.product.id;
      if (!byProduct.has(key)) {
        byProduct.set(key, {
          productId: key,
          productName: row.product.name,
          totalValue: 0,
          totalQuantity: 0,
          wasteQuantity: 0,
        });
      }
      const data = byProduct.get(key)!;
      const unitCost = Number(row.item.unitCost ?? 0);
      const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
      data.totalValue += unitCost * quantity;
      data.totalQuantity += quantity;
      data.wasteQuantity += quantity;
    });

    const byLocation = new Map<string, { locationId: string; locationName: string; totalValue: number; totalQuantity: number }>();
    filteredData.forEach(row => {
      if (!row.location || !row.item) return;
      const key = row.location.id;
      if (!byLocation.has(key)) {
        byLocation.set(key, {
          locationId: key,
          locationName: row.location.name,
          totalValue: 0,
          totalQuantity: 0,
        });
      }
      const data = byLocation.get(key)!;
      const unitCost = Number(row.item.unitCost ?? 0);
      const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
      data.totalValue += unitCost * quantity;
      data.totalQuantity += quantity;
    });

    const now = new Date();
    const period = {
      from: dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      to: dateTo ?? now.toISOString(),
      days: 30,
    };
    if (dateFrom && dateTo) {
      period.days = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24));
    }

    const byProductArray = Array.from(byProduct.values()).map(product => ({
      productId: product.productId,
      productName: product.productName,
      totalValue: product.totalValue,
      totalQuantity: product.totalQuantity,
      wasteRate: totalQuantity > 0 ? (product.wasteQuantity / totalQuantity) * 100 : 0,
    }));

    return {
      summary: {
        totalRecords,
        totalValue,
        totalQuantity,
        averageValuePerRecord: totalRecords > 0 ? totalValue / totalRecords : 0,
      },
      byReason: byReasonArray,
      byProduct: byProductArray,
      byLocation: Array.from(byLocation.values()),
      trend: [],
      period,
    };
  },
};
