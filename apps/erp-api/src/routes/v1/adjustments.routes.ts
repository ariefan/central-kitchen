import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, createBadRequestError, notFoundResponseSchema } from '@/shared/utils/responses.js';
import { db } from '@/config/database.js';
import { stockAdjustments, stockAdjustmentItems, products, locations, uoms, lots, stockLedger } from '@/config/schema.js';
import { eq, and, sql, desc, type SQL } from 'drizzle-orm';
import { getTenantId, getUserId } from '@/shared/middleware/auth.js';

type StockAdjustment = typeof stockAdjustments.$inferSelect;

// Adjustment Item schemas
const adjustmentItemSchema = z.object({
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  uomId: z.string().uuid(),
  qtyDelta: z.number(),
  unitCost: z.number().positive().optional(),
  reason: z.string().optional(),
});

// Stock Adjustment schemas
const stockAdjustmentCreateSchema = z.object({
  locationId: z.string().uuid(),
  reason: z.enum(['damage', 'expiry', 'theft', 'found', 'correction', 'waste', 'spoilage']),
  notes: z.string().optional(),
  items: z.array(adjustmentItemSchema).min(1, 'At least one item is required'),
});

const stockAdjustmentUpdateSchema = z.object({
  reason: z.enum(['damage', 'expiry', 'theft', 'found', 'correction', 'waste', 'spoilage']).optional(),
  notes: z.string().optional(),
});

type AdjustmentQuery = {
  reason?: string;
  status?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

// Response schemas
const adjustmentResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    adjNumber: z.string(),
    locationId: z.string(),
    reason: z.enum(['damage', 'expiry', 'theft', 'found', 'correction', 'waste', 'spoilage']),
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
  }),
  message: z.string(),
});

const adjustmentsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({
    id: z.string(),
    adjNumber: z.string(),
    locationId: z.string(),
    reason: z.enum(['damage', 'expiry', 'theft', 'found', 'correction', 'waste', 'spoilage']),
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
  })),
  message: z.string(),
});

export function adjustmentRoutes(fastify: FastifyInstance) {
  // GET /api/v1/adjustments - List all stock adjustments
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all stock adjustments with items',
        tags: ['Adjustments'],
        querystring: z.object({
          reason: z.enum(['damage', 'expiry', 'theft', 'found', 'correction', 'waste', 'spoilage']).optional(),
          status: z.enum(['draft', 'approved', 'posted']).optional(),
          locationId: z.string().uuid().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
          search: z.string().optional(),
        }),
        response: {
          200: adjustmentsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { reason, status, locationId, dateFrom, dateTo, search } = request.query as AdjustmentQuery;

      const whereConditions: SQL[] = [eq(stockAdjustments.tenantId, tenantId)];

      if (reason) {
        whereConditions.push(eq(stockAdjustments.reason, reason));
      }

      if (status) {
        whereConditions.push(eq(stockAdjustments.status, status));
      }

      if (locationId) {
        whereConditions.push(eq(stockAdjustments.locationId, locationId));
      }

      if (dateFrom) {
        whereConditions.push(sql`${stockAdjustments.createdAt} >= ${dateFrom}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${stockAdjustments.createdAt} <= ${dateTo}`);
      }

      if (search) {
        whereConditions.push(sql`(stock_adjustments.adj_number ILIKE ${'%' + search + '%'} OR stock_adjustments.reason ILIKE ${'%' + search + '%'} OR stock_adjustments.notes ILIKE ${'%' + search + '%'})`);
      }

      const allAdjustments = await db.select({
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

      // Get items for each adjustment
      const adjustmentsWithItems = await Promise.all(
        allAdjustments.map(async (adjRow) => {
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
            .where(eq(stockAdjustmentItems.adjustmentId, adjRow.adjustment.id))
            .orderBy(stockAdjustmentItems.createdAt);

          return {
            ...adjRow.adjustment,
            location: adjRow.location,
            items,
          };
        })
      );

      return reply.send(createSuccessResponse(adjustmentsWithItems, 'Stock adjustments retrieved successfully'));
    }
  );

  // GET /api/v1/adjustments/:id - Get adjustment by ID with items
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get stock adjustment by ID with full item list',
        tags: ['Adjustments'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: adjustmentResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const adjustmentData = await db.select({
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
          eq(stockAdjustments.tenantId, tenantId)
        ))
        .limit(1);

      if (!adjustmentData.length) {
        return createNotFoundError('Stock adjustment not found', reply);
      }

      const adjustmentRecord = adjustmentData[0]!;

      // Get detailed items with product and UOM information
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
        .where(eq(stockAdjustmentItems.adjustmentId, request.params.id))
        .orderBy(stockAdjustmentItems.createdAt);

      const adjustmentWithItems = {
        ...adjustmentRecord.adjustment,
        location: adjustmentRecord.location,
        items,
      };

      return reply.send(createSuccessResponse(adjustmentWithItems, 'Stock adjustment retrieved successfully'));
    }
  );

  // POST /api/v1/adjustments - Create new stock adjustment
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new stock adjustment with items',
        tags: ['Adjustments'],
        body: stockAdjustmentCreateSchema,
        response: {
          201: adjustmentResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof stockAdjustmentCreateSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      try {
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

        // Verify all product IDs exist and belong to tenant
        const productIds = request.body.items.map(item => item.productId);
        const productCheck = await db.select()
          .from(products)
          .where(and(
            eq(products.tenantId, tenantId)
          ));

        const foundProductIds = new Set(productCheck.map(p => p.id));
        const missingProducts = productIds.filter(id => !foundProductIds.has(id));

        if (missingProducts.length > 0) {
          return createBadRequestError('One or more products not found', reply);
        }

        const result = await db.transaction(async (tx) => {
        // Generate adjustment number
        const adjNumberResult = await tx.execute(sql`
          SELECT COALESCE(MAX(CAST(SUBSTRING(adj_number FROM '\\d+$') AS INTEGER)), 0) + 1 as next_number
          FROM ${stockAdjustments}
          WHERE ${stockAdjustments.tenantId} = ${tenantId}
          AND ${stockAdjustments.adjNumber} LIKE 'ADJ-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%'
        `);

        const rawNextNumber = adjNumberResult.rows[0]?.next_number;
        const parsedNextNumber = typeof rawNextNumber === 'number'
          ? rawNextNumber
          : typeof rawNextNumber === 'string'
            ? Number.parseInt(rawNextNumber, 10)
            : 1;
        const safeNextNumber = Number.isNaN(parsedNextNumber) ? 1 : parsedNextNumber;
        const adjNumber = `ADJ-${new Date().getFullYear()}-${safeNextNumber.toString().padStart(5, '0')}`;

        // Create stock adjustment
        const adjustmentInsert: typeof stockAdjustments.$inferInsert = {
          tenantId,
          adjNumber,
          locationId: request.body.locationId,
          reason: request.body.reason,
          notes: request.body.notes ?? null,
          createdBy: userId,
        };

        const [adjustment] = await tx.insert(stockAdjustments)
          .values(adjustmentInsert)
          .returning();

        // Insert adjustment items
        const itemsToInsert: typeof stockAdjustmentItems.$inferInsert[] = request.body.items.map((item) => ({
          adjustmentId: adjustment!.id,
          productId: item.productId,
          lotId: item.lotId ?? null,
          uomId: item.uomId,
          qtyDelta: item.qtyDelta.toString(),
          unitCost: item.unitCost?.toString() ?? '0.000000',
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
          ...adjustment!,
          location: locationDetails ?? null,
          items: insertedItems,
        };
      });

      return reply.status(201).send(createSuccessResponse(result, 'Stock adjustment created successfully'));
      } catch (error) {
        console.error('Stock adjustment creation error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: 'Failed to create stock adjustment',
        });
      }
    }
  );

  // PATCH /api/v1/adjustments/:id - Update adjustment
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update stock adjustment basic information',
        tags: ['Adjustments'],
        params: z.object({ id: z.string().uuid() }),
        body: stockAdjustmentUpdateSchema,
        response: {
          200: adjustmentResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string },
      Body: z.infer<typeof stockAdjustmentUpdateSchema>
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if adjustment exists and belongs to tenant
      const existingAdjustment = await db.select()
        .from(stockAdjustments)
        .where(and(
          eq(stockAdjustments.id, request.params.id),
          eq(stockAdjustments.tenantId, tenantId)
        ))
        .limit(1);

      if (!existingAdjustment.length) {
        return createNotFoundError('Stock adjustment not found', reply);
      }

      // Prevent updates if already posted
      if (existingAdjustment[0]!.status === 'posted') {
        return createBadRequestError('Cannot update posted adjustment', reply);
      }

      const updatePayload: Partial<typeof stockAdjustments.$inferInsert> & { updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (request.body.reason !== undefined) {
        updatePayload.reason = request.body.reason;
      }

      if (request.body.notes !== undefined) {
        updatePayload.notes = request.body.notes ?? null;
      }

      const result = await db.update(stockAdjustments)
        .set(updatePayload)
        .where(and(eq(stockAdjustments.id, request.params.id), eq(stockAdjustments.tenantId, tenantId)))
        .returning();

      if (!result) {
        return createNotFoundError('Stock adjustment not found', reply);
      }

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

      return reply.send(createSuccessResponse(responseWithLocationAndItems, 'Stock adjustment updated successfully'));
    }
  );

  // POST /api/v1/adjustments/:id/approve - Approve stock adjustment
  fastify.post(
    '/:id/approve',
    {
      schema: {
        description: 'Approve stock adjustment',
        tags: ['Adjustments'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: adjustmentResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      const adjustmentData = await db.select()
        .from(stockAdjustments)
        .where(and(
          eq(stockAdjustments.id, request.params.id),
          eq(stockAdjustments.tenantId, tenantId)
        ))
        .limit(1);

      if (!adjustmentData.length) {
        return createNotFoundError('Stock adjustment not found', reply);
      }

      const adjustment = adjustmentData[0]!;

      if (adjustment.status !== 'draft') {
        return createBadRequestError('Stock adjustment can only be approved from draft status', reply);
      }

      const result = await db.transaction(async (tx): Promise<StockAdjustment | null> => {
        const updatedAdjustment = await tx.update(stockAdjustments)
          .set({
            status: 'approved',
            approvedBy: userId,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(stockAdjustments.id, request.params.id), eq(stockAdjustments.tenantId, tenantId)))
          .returning();

        return updatedAdjustment[0] ?? null;
      });

      if (!result) {
        return createNotFoundError('Stock adjustment not found', reply);
      }

      // Get location details for response
      const [locationDetails] = await db.select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(and(
        eq(locations.id, result.locationId),
        eq(locations.tenantId, tenantId)
      ))
      .limit(1);

      // Get adjustment items for response
      const adjustmentItems = await db.select()
        .from(stockAdjustmentItems)
        .where(eq(stockAdjustmentItems.adjustmentId, request.params.id));

      const responseWithLocationAndItems = {
        ...result,
        location: locationDetails ?? null,
        items: adjustmentItems,
      };

      return reply.send(createSuccessResponse(responseWithLocationAndItems, 'Stock adjustment approved successfully'));
    }
  );

  // POST /api/v1/adjustments/:id/post - Post adjustment to stock ledger
  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post approved adjustment to stock ledger',
        tags: ['Adjustments'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: adjustmentResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      const adjustmentData = await db.select({
        adjustment: stockAdjustments,
        items: stockAdjustmentItems,
      })
        .from(stockAdjustments)
        .leftJoin(stockAdjustmentItems, eq(stockAdjustments.id, stockAdjustmentItems.adjustmentId))
        .where(and(
          eq(stockAdjustments.id, request.params.id),
          eq(stockAdjustments.tenantId, tenantId)
        ))
        .limit(1);

      if (!adjustmentData.length) {
        return createNotFoundError('Stock adjustment not found', reply);
      }

      const adjustment = adjustmentData[0]!.adjustment;

      if (adjustment.status !== 'approved') {
        return createBadRequestError('Stock adjustment can only be posted from approved status', reply);
      }

      const result = await db.transaction(async (tx): Promise<StockAdjustment | null> => {
        // Update adjustment status to posted
        const updatedAdjustment = await tx.update(stockAdjustments)
          .set({
            status: 'posted',
            updatedAt: new Date(),
          })
          .where(and(eq(stockAdjustments.id, request.params.id), eq(stockAdjustments.tenantId, tenantId)))
          .returning();

        // Get all items for this adjustment
        const adjustmentItems = await tx.select()
          .from(stockAdjustmentItems)
          .where(eq(stockAdjustmentItems.adjustmentId, request.params.id));

        // Create stock ledger entries for each item
        const ledgerEntries: typeof stockLedger.$inferInsert[] = adjustmentItems.map(item => ({
          tenantId,
          productId: item.productId,
          locationId: adjustment.locationId,
          lotId: item.lotId,
          txnTs: new Date(),
          type: 'adj' as const,
          qtyDeltaBase: item.qtyDelta,
          unitCost: item.unitCost,
          refType: 'ADJ' as const,
          refId: request.params.id,
          note: `${adjustment.reason}: ${item.reason ?? adjustment.notes ?? 'Stock adjustment'}`,
          createdBy: userId,
        }));

        // Insert all ledger entries
        if (ledgerEntries.length > 0) {
          await tx.insert(stockLedger)
            .values(ledgerEntries);
        }

        return updatedAdjustment[0] ?? null;
      });

      if (!result) {
        return createNotFoundError('Stock adjustment not found', reply);
      }

      // Get location details for response
      const [locationDetails] = await db.select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(and(
        eq(locations.id, result.locationId),
        eq(locations.tenantId, tenantId)
      ))
      .limit(1);

      // Get adjustment items for response
      const adjustmentItems = await db.select()
        .from(stockAdjustmentItems)
        .where(eq(stockAdjustmentItems.adjustmentId, request.params.id));

      const responseWithLocationAndItems = {
        ...result,
        location: locationDetails ?? null,
        items: adjustmentItems,
      };

      return reply.send(createSuccessResponse(responseWithLocationAndItems, 'Stock adjustment posted successfully'));
    }
  );

  // GET /api/v1/adjustments/analysis - Get adjustments analysis
  fastify.post(
    '/analysis',
    {
      schema: {
        description: 'Get adjustments analysis and reporting',
        tags: ['Adjustments'],
        body: z.object({
          locationId: z.string().uuid().optional(),
          reason: z.enum(['damage', 'expiry', 'theft', 'found', 'correction', 'waste', 'spoilage']).optional(),
          productId: z.string().uuid().optional(),
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              summary: z.object({
                totalAdjustments: z.number(),
                totalQuantity: z.number(),
                totalValue: z.number(),
                averageValuePerAdjustment: z.number(),
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
              })),
              byLocation: z.array(z.object({
                locationId: z.string(),
                locationName: z.string(),
                totalValue: z.number(),
                totalQuantity: z.number(),
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
    async (request: FastifyRequest<{ Body: {
      locationId?: string;
      reason?: string;
      productId?: string;
      dateFrom?: string;
      dateTo?: string;
    } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { locationId, reason, productId, dateFrom, dateTo } = request.body;

      // Build where conditions
      const whereConditions: SQL[] = [eq(stockAdjustments.tenantId, tenantId)];

      if (locationId) {
        whereConditions.push(eq(stockAdjustments.locationId, locationId));
      }

      if (reason) {
        whereConditions.push(eq(stockAdjustments.reason, reason));
      }

      if (dateFrom) {
        whereConditions.push(sql`${stockAdjustments.createdAt} >= ${dateFrom}`);
      }

      if (dateTo) {
        whereConditions.push(sql`${stockAdjustments.createdAt} <= ${dateTo}`);
      }

      // Get all adjustment data
      const data = await db.select({
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
        .leftJoin(stockAdjustmentItems, eq(stockAdjustments.id, stockAdjustmentItems.adjustmentId))
        .leftJoin(products, eq(stockAdjustmentItems.productId, products.id))
        .leftJoin(locations, eq(stockAdjustments.locationId, locations.id))
        .where(and(...whereConditions));

      // Filter by productId if provided
      const filteredData = productId
        ? data.filter(row => row.item?.productId === productId)
        : data;

      // Calculate summary statistics
      const totalAdjustments = new Set(filteredData.map(row => row.adjustment.id)).size;
      const totalValue = filteredData.reduce((sum, row) => {
        if (!row.item) return sum;
        const unitCost = Number(row.item.unitCost ?? 0);
        const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
        return sum + (unitCost * quantity);
      }, 0);
      const totalQuantity = filteredData.reduce((sum, row) => {
        if (!row.item) return sum;
        const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
        return sum + quantity;
      }, 0);

      // Group by reason
      const byReason = new Map<string, { count: number; totalValue: number; totalQuantity: number }>();
      filteredData.forEach(row => {
        if (!row.item) return;
        const key = row.adjustment.reason;
        const unitCost = Number(row.item.unitCost ?? 0);
        const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
        const existing = byReason.get(key);
        if (existing) {
          existing.count += 1;
          existing.totalValue += unitCost * quantity;
          existing.totalQuantity += quantity;
          return;
        }
        byReason.set(key, {
          count: 1,
          totalValue: unitCost * quantity,
          totalQuantity: quantity,
        });
      });

      const byReasonArray = Array.from(byReason.entries()).map(([reason, reasonData]) => ({
        reason,
        count: reasonData.count,
        totalValue: reasonData.totalValue,
        totalQuantity: reasonData.totalQuantity,
        percentage: totalAdjustments > 0 ? (reasonData.count / totalAdjustments) * 100 : 0,
      }));

      // Group by product
      const byProduct = new Map<string, { productId: string; productName: string; totalValue: number; totalQuantity: number }>();
      filteredData.forEach(row => {
        if (!row.product || !row.item) return;
        const key = row.item.productId;
        const unitCost = Number(row.item.unitCost ?? 0);
        const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
        const existing = byProduct.get(key);
        if (existing) {
          existing.totalValue += unitCost * quantity;
          existing.totalQuantity += quantity;
          return;
        }
        byProduct.set(key, {
          productId: key,
          productName: row.product.name,
          totalValue: unitCost * quantity,
          totalQuantity: quantity,
        });
      });

      // Group by location
      const byLocation = new Map<string, { locationId: string; locationName: string; totalValue: number; totalQuantity: number }>();
      filteredData.forEach(row => {
        if (!row.location || !row.item) return;
        const key = row.location.id;
        const unitCost = Number(row.item.unitCost ?? 0);
        const quantity = Math.abs(Number(row.item.qtyDelta ?? 0));
        const existing = byLocation.get(key);
        if (existing) {
          existing.totalValue += unitCost * quantity;
          existing.totalQuantity += quantity;
          return;
        }
        byLocation.set(key, {
          locationId: key,
          locationName: row.location.name,
          totalValue: unitCost * quantity,
          totalQuantity: quantity,
        });
      });

      // Calculate period
      const now = new Date();
      const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const periodFrom = dateFrom ?? defaultFrom;
      const periodTo = dateTo ?? now.toISOString();
      const periodDays = dateFrom && dateTo
        ? Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      const period = {
        from: periodFrom,
        to: periodTo,
        days: periodDays,
      };

      return reply.send(createSuccessResponse({
        summary: {
          totalAdjustments,
          totalValue,
          totalQuantity,
          averageValuePerAdjustment: totalAdjustments > 0 ? totalValue / totalAdjustments : 0,
        },
        byReason: byReasonArray,
        byProduct: Array.from(byProduct.values()),
        byLocation: Array.from(byLocation.values()),
        period,
      }, 'Adjustments analysis retrieved successfully'));
    }
  );
}
