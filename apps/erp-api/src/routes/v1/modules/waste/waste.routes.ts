import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, createBadRequestError, notFoundResponseSchema } from '@/shared/utils/responses';
import { db } from '@/config/database';
import { stockAdjustments, stockAdjustmentItems, products, locations, uoms, lots } from '@/config/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getTenantId, getUserId } from '@/shared/middleware/auth';

// Waste management schemas
const wasteRecordSchema = z.object({
  locationId: z.string().uuid(),
  reason: z.enum(['damage', 'expiry', 'spoilage', 'waste']),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    lotId: z.string().uuid().optional(),
    uomId: z.string().uuid(),
    quantity: z.number().positive(),
    unitCost: z.number().optional(),
    estimatedValue: z.number().optional(),
    reason: z.string().optional(),
  })).min(1, 'At least one item is required'),
});

const wasteAnalysisSchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  reason: z.enum(['damage', 'expiry', 'spoilage', 'waste']).optional(),
});


type WasteQuery = {
  locationId?: string;
  productId?: string;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
};

// Response schemas
const wasteResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    adjNumber: z.string(),
    locationId: z.string(),
    reason: z.enum(['damage', 'expiry', 'spoilage', 'waste']),
    status: z.enum(['draft', 'approved', 'posted']),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.string().nullable(),
    approvedBy: z.string().nullable(),
    approvedAt: z.date().nullable(),
    location: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable(),
    items: z.array(z.any()),
    totalValue: z.number().optional(),
    totalQuantity: z.number().optional(),
  }),
  message: z.string(),
});

const wasteListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({
    id: z.string(),
    adjNumber: z.string(),
    locationId: z.string(),
    reason: z.enum(['damage', 'expiry', 'spoilage', 'waste']),
    status: z.enum(['draft', 'approved', 'posted']),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.string().nullable(),
    approvedBy: z.string().nullable(),
    approvedAt: z.date().nullable(),
    location: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable(),
    items: z.array(z.any()),
    totalValue: z.number().optional(),
  })),
  message: z.string(),
});

export function wasteRoutes(fastify: FastifyInstance) {
  // GET /api/v1/waste/records - List waste records
  fastify.get(
    '/records',
    {
      schema: {
        description: 'Get all waste records with filtering',
        tags: ['Waste Management'],
        querystring: z.object({
          locationId: z.string().uuid().optional(),
          productId: z.string().uuid().optional(),
          reason: z.enum(['damage', 'expiry', 'spoilage', 'waste']).optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
          status: z.enum(['draft', 'approved', 'posted']).optional(),
        }),
        response: {
          200: wasteListResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId, productId, reason, dateFrom, dateTo, status } = request.query as WasteQuery;

      let whereConditions = [eq(stockAdjustments.tenantId, tenantId)];

      // Filter for waste-related adjustments only
      whereConditions.push(sql`${stockAdjustments.reason} IN ('damage', 'expiry', 'spoilage', 'waste')`);

      if (locationId) {
        whereConditions.push(eq(stockAdjustments.locationId, locationId));
      }

      if (status) {
        whereConditions.push(eq(stockAdjustments.status, status));
      }

      if (dateFrom) {
        whereConditions.push(sql`${stockAdjustments.createdAt} >= ${new Date(dateFrom)}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${stockAdjustments.createdAt} <= ${new Date(dateTo)}`);
      }

      const wasteRecords = await db.select({
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

      // Get items for each waste record and filter by product/reason if specified
      const wasteRecordsWithItems = await Promise.all(
        wasteRecords.map(async (record) => {
          const itemsWhereConditions = [eq(stockAdjustmentItems.adjustmentId, record.adjustment.id)];

          if (productId) {
            itemsWhereConditions.push(eq(stockAdjustmentItems.productId, productId));
          }

          if (reason) {
            itemsWhereConditions.push(sql`${stockAdjustmentItems.reason} ILIKE ${'%' + reason + '%'}`);
          }

          const items = await db.select({
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
            .where(and(...itemsWhereConditions));

          // Calculate total waste value
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

      // Filter out records with no items if product filter was applied
      const filteredRecords = productId || reason
        ? wasteRecordsWithItems.filter(record => record.items.length > 0)
        : wasteRecordsWithItems;

      return reply.send(createSuccessResponse(filteredRecords, 'Waste records retrieved successfully'));
    }
  );

  // GET /api/v1/waste/records/:id - Get waste record by ID
  fastify.get(
    '/records/:id',
    {
      schema: {
        description: 'Get waste record by ID with items',
        tags: ['Waste Management'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: wasteResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const recordData = await db.select({
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
          eq(stockAdjustments.id, request.params.id),
          eq(stockAdjustments.tenantId, tenantId),
          sql`${stockAdjustments.reason} IN ('damage', 'expiry', 'spoilage', 'waste')`
        ))
        .limit(1);

      if (!recordData.length) {
        return createNotFoundError('Waste record not found', reply);
      }

      const record = recordData[0]!;

      // Get items with full details
      const items = await db.select({
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
        .where(eq(stockAdjustmentItems.adjustmentId, request.params.id));

      // Calculate totals
      const totalValue = items.reduce((sum, item) => {
        const quantity = Number(item.item.qtyDelta);
        const value = Number(item.item.unitCost ?? 0) * quantity;
        return sum + value;
      }, 0);

      const totalQuantity = items.reduce((sum, item) => sum + Number(item.item.qtyDelta), 0);

      return reply.send(createSuccessResponse({
        ...record.adjustment,
        location: record.location,
        items,
        totalValue,
        totalQuantity,
      }, 'Waste record retrieved successfully'));
    }
  );

  // POST /api/v1/waste/records - Create new waste record
  fastify.post(
    '/records',
    {
      schema: {
        description: 'Create new waste record',
        tags: ['Waste Management'],
        body: wasteRecordSchema,
        response: {
          201: wasteResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof wasteRecordSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Verify location exists
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

      // Verify all products and UOMs exist
      const productIds = request.body.items.map(item => item.productId);
      const uomIds = request.body.items.map(item => item.uomId);

      const productCheck = await db.select()
        .from(products)
        .where(and(
          sql`${products.id} IN (${sql.join(productIds, sql.raw)})`,
          eq(products.tenantId, tenantId)
        ));

      if (productCheck.length !== productIds.length) {
        return createBadRequestError('One or more products not found', reply);
      }

      const uomCheck = await db.select()
        .from(uoms)
        .where(sql`${uoms.id} IN (${sql.join(uomIds, sql.raw)})`);

      if (uomCheck.length !== uomIds.length) {
        return createBadRequestError('One or more UOMs not found', reply);
      }

      // Verify lots exist if provided
      const lotIds = request.body.items.map(item => item.lotId).filter(Boolean);
      if (lotIds.length > 0) {
        const lotCheck = await db.select()
          .from(lots)
          .where(sql`${lots.id} IN (${sql.join(lotIds, sql.raw)})`);

        if (lotCheck.length !== lotIds.length) {
          return createBadRequestError('One or more lots not found', reply);
        }
      }

      const result = await db.transaction(async (tx) => {
        // Generate waste record number
        const adjNumber = `WASTE-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        // Create stock adjustment
        const [adjustment] = await tx.insert(stockAdjustments)
          .values({
            tenantId,
            adjNumber,
            locationId: request.body.locationId,
            reason: request.body.reason,
            status: 'draft',
            notes: request.body.notes ?? null,
            createdBy: userId,
          })
          .returning();

        // Create adjustment items (waste items)
        const itemsToInsert = request.body.items.map(item => ({
          adjustmentId: adjustment!.id,
          productId: item.productId,
          lotId: item.lotId ?? null,
          uomId: item.uomId,
          qtyDelta: (-item.quantity).toString(), // Negative for waste as string
          unitCost: item.unitCost?.toString() ?? null,
          reason: item.reason ?? null,
        }));

        const insertedItems = await tx.insert(stockAdjustmentItems)
          .values(itemsToInsert)
          .returning();

        // Get location details for response
        const [locationDetails] = await tx.select({
          id: locations.id,
          name: locations.name,
          code: locations.code,
        })
        .from(locations)
        .where(and(
          eq(locations.id, request.body.locationId),
          eq(locations.tenantId, tenantId)
        ))
        .limit(1);

        return {
          ...adjustment,
          location: locationDetails ?? null,
          items: insertedItems,
        };
      });

      return reply.status(201).send(createSuccessResponse(result, 'Waste record created successfully'));
    }
  );

  // POST /api/v1/waste/records/:id/approve - Approve and post waste record
  fastify.post(
    '/records/:id/approve',
    {
      schema: {
        description: 'Approve and post waste record to update inventory',
        tags: ['Waste Management'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: wasteResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if waste record exists and is in draft status
      const existingRecord = await db.select()
        .from(stockAdjustments)
        .where(and(
          eq(stockAdjustments.id, request.params.id),
          eq(stockAdjustments.tenantId, tenantId),
          eq(stockAdjustments.status, 'draft'),
          sql`${stockAdjustments.reason} IN ('damage', 'expiry', 'spoilage', 'waste')`
        ))
        .limit(1);

      if (!existingRecord.length) {
        return createNotFoundError('Waste record not found or cannot be approved', reply);
      }

      const result = await db.update(stockAdjustments)
        .set({
          status: 'posted',
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(stockAdjustments.id, request.params.id), eq(stockAdjustments.tenantId, tenantId)))
        .returning();

      // TODO: Create inventory movements to actually reduce stock
      // TODO: Update lot quantities
      // TODO: Create stock ledger entries

      // Get location details for response
      const [locationDetails] = await db.select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(and(
        eq(locations.id, result[0]!.locationId),
        eq(locations.tenantId, tenantId)
      ))
      .limit(1);

      // Get adjustment items for response
      const adjustmentItems = await db.select()
        .from(stockAdjustmentItems)
        .where(eq(stockAdjustmentItems.adjustmentId, request.params.id));

      const responseWithLocationAndItems = {
        ...result[0]!,
        location: locationDetails ?? null,
        items: adjustmentItems,
      };

      return reply.send(createSuccessResponse(responseWithLocationAndItems, 'Waste record approved and posted successfully'));
    }
  );

  // POST /api/v1/waste/analysis - Get waste analysis
  fastify.post(
    '/analysis',
    {
      schema: {
        description: 'Get comprehensive waste analysis',
        tags: ['Waste Management'],
        body: wasteAnalysisSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              summary: z.object({
                totalRecords: z.number(),
                totalValue: z.number(),
                totalQuantity: z.number(),
                averageValuePerRecord: z.number(),
              }),
              byReason: z.array(z.object({
                reason: z.string(),
                count: z.number(),
                totalValue: z.number(),
                totalQuantity: z.number(),
                percentage: z.number(),
              })),
              byProduct: z.array(z.object({
                productId: z.string(),
                productName: z.string(),
                totalValue: z.number(),
                totalQuantity: z.number(),
                wasteRate: z.number(),
              })),
              byLocation: z.array(z.object({
                locationId: z.string(),
                locationName: z.string(),
                totalValue: z.number(),
                totalQuantity: z.number(),
              })),
              trend: z.array(z.object({
                date: z.string(),
                value: z.number(),
                quantity: z.number(),
                recordCount: z.number(),
              })),
              period: z.object({
                from: z.string(),
                to: z.string(),
                days: z.number(),
              }),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof wasteAnalysisSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId, productId, dateFrom, dateTo, reason } = request.body;

      let whereConditions = [
        eq(stockAdjustments.tenantId, tenantId),
        sql`${stockAdjustments.reason} IN ('damage', 'expiry', 'spoilage', 'waste')`,
        eq(stockAdjustments.status, 'posted')
      ];

      if (locationId) {
        whereConditions.push(eq(stockAdjustments.locationId, locationId));
      }

      if (dateFrom) {
        whereConditions.push(sql`${stockAdjustments.createdAt} >= ${new Date(dateFrom)}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${stockAdjustments.createdAt} <= ${new Date(dateTo)}`);
      }

      // Get all relevant waste adjustments with items
      const wasteData = await db.select({
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
        .innerJoin(stockAdjustmentItems, eq(stockAdjustments.id, stockAdjustmentItems.adjustmentId))
        .leftJoin(products, eq(stockAdjustmentItems.productId, products.id))
        .leftJoin(locations, eq(stockAdjustments.locationId, locations.id))
        .where(and(...whereConditions));

      // Apply additional filters
      let filteredData = wasteData;
      if (productId) {
        filteredData = filteredData.filter(row => row.item?.productId === productId);
      }
      if (reason) {
        filteredData = filteredData.filter(row => row.adjustment?.reason === reason);
      }

      // Calculate summary statistics with null safety
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

      // Group by reason with null safety
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

      const byReasonArray = Array.from(byReason.entries()).map(([reason, data]) => ({
        reason,
        count: data.count,
        totalValue: data.totalValue,
        totalQuantity: data.totalQuantity,
        percentage: totalRecords > 0 ? (data.count / totalRecords) * 100 : 0,
      }));

      // Group by product with null safety
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
            wasteQuantity: 0
          });
        }
        const data = byProduct.get(key)!;
        const unitCost = Number(row.item.unitCost ?? 0);
        const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
        data.totalValue += unitCost * quantity;
        data.totalQuantity += quantity;
        data.wasteQuantity += quantity;
      });

      // Group by location with null safety
      const byLocation = new Map<string, { locationId: string; locationName: string; totalValue: number; totalQuantity: number }>();
      filteredData.forEach(row => {
        if (!row.location || !row.item) return;
        const key = row.location.id;
        if (!byLocation.has(key)) {
          byLocation.set(key, {
            locationId: key,
            locationName: row.location.name,
            totalValue: 0,
            totalQuantity: 0
          });
        }
        const data = byLocation.get(key)!;
        const unitCost = Number(row.item.unitCost ?? 0);
        const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
        data.totalValue += unitCost * quantity;
        data.totalQuantity += quantity;
      });

      // Calculate period
      const now = new Date();
      const period = {
        from: dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: dateTo ?? now.toISOString(),
        days: 30,
      };

      if (dateFrom && dateTo) {
        period.days = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate waste rates for products
      const byProductArray = Array.from(byProduct.values()).map(product => ({
        productId: product.productId,
        productName: product.productName,
        totalValue: product.totalValue,
        totalQuantity: product.totalQuantity,
        wasteRate: totalQuantity > 0 ? (product.wasteQuantity / totalQuantity) * 100 : 0,
      }));

      return reply.send(createSuccessResponse({
        summary: {
          totalRecords,
          totalValue,
          totalQuantity,
          averageValuePerRecord: totalRecords > 0 ? totalValue / totalRecords : 0,
        },
        byReason: byReasonArray,
        byProduct: byProductArray,
        byLocation: Array.from(byLocation.values()),
        trend: [], // TODO: Implement trend analysis
        period,
      }, 'Waste analysis retrieved successfully'));
    }
  );
}