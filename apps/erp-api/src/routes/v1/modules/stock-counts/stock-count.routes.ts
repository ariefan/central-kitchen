import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSuccessResponse, createNotFoundError, notFoundResponseSchema } from '../../../../shared/utils/responses.js';
import { db } from '../../../../config/database.js';
import {
  stockCounts,
  stockCountLines,
  products,
  locations,
  lots,
  stockLedger
} from '../../../../config/schema.js';
import { eq, and, sql, desc, ilike, type SQL } from 'drizzle-orm';
import { getTenantId, getUserId } from '../../../../shared/middleware/auth.js';
import { PaginatedResponse } from '../../../../shared/types/index.js';

// Stock Count schemas
const stockCountCreateSchema = z.object({
  locationId: z.string().uuid(),
  notes: z.string().optional(),
});

const stockCountUpdateSchema = stockCountCreateSchema.partial();

const stockCountLineCreateSchema = z.object({
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  countedQtyBase: z.number(),
});

const stockCountLineUpdateSchema = z.object({
  countedQtyBase: z.number(),
});

// Response schemas
const stockCountLineSchema = z.object({
  id: z.string(),
  countId: z.string(),
  productId: z.string(),
  lotId: z.string().nullable(),
  systemQtyBase: z.string(),
  countedQtyBase: z.string(),
  varianceQtyBase: z.string(),
  createdAt: z.date(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string().optional(),
  }).nullable().optional(),
  lot: z.object({
    id: z.string(),
    lotNo: z.string().nullable(),
    expiryDate: z.date().nullable(),
  }).nullable().optional(),
});

const stockCountResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    countNumber: z.string(),
    locationId: z.string(),
    status: z.string(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    location: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable().optional(),
    lines: z.array(stockCountLineSchema).optional(),
  }),
  message: z.string(),
});

const stockCountsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.object({
    id: z.string(),
    countNumber: z.string(),
    locationId: z.string(),
    status: z.string(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    location: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }).nullable().optional(),
    lineCount: z.number(),
    totalVariance: z.string(),
  })),
  message: z.string(),
});

const stockCountLinesResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(stockCountLineSchema),
  message: z.string(),
});

type StockCountCreateType = z.infer<typeof stockCountCreateSchema>;
type StockCountUpdateType = z.infer<typeof stockCountUpdateSchema>;
type StockCountLineCreateType = z.infer<typeof stockCountLineCreateSchema>;
type StockCountLineUpdateType = z.infer<typeof stockCountLineUpdateSchema>;

export function stockCountRoutes(fastify: FastifyInstance) {
  // GET /api/v1/stock-counts - List all stock counts
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all stock counts',
        tags: ['Stock Counts'],
        querystring: z.object({
          status: z.enum(['draft', 'review', 'posted']).optional(),
          locationId: z.string().uuid().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        }),
        response: {
          200: stockCountsResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { status, locationId, search, limit, offset } = request.query as {
        status?: string;
        locationId?: string;
        search?: string;
        limit?: number;
        offset?: number;
      };

      const whereConditions: SQL[] = [eq(stockCounts.tenantId, tenantId)];

      if (status) {
        whereConditions.push(eq(stockCounts.status, status));
      }

      if (locationId) {
        whereConditions.push(eq(stockCounts.locationId, locationId));
      }

      if (search) {
        whereConditions.push(ilike(stockCounts.countNumber, `%${search}%`));
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockCounts)
        .leftJoin(locations, eq(stockCounts.locationId, locations.id))
        .where(and(...whereConditions));

      const totalCount = totalCountResult[0]?.count ?? 0;

      // Get stock counts with location and line count info
      const rawCounts = await db
        .select({
          id: stockCounts.id,
          countNumber: stockCounts.countNumber,
          locationId: stockCounts.locationId,
          status: stockCounts.status,
          notes: stockCounts.notes,
          createdAt: stockCounts.createdAt,
          updatedAt: stockCounts.updatedAt,
          location_id: locations.id,
          location_name: locations.name,
          location_code: locations.code,
          lineCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${stockCountLines}
            WHERE ${stockCountLines.countId} = ${stockCounts.id}
          )`.as('line_count'),
          totalVariance: sql<string>`(
            SELECT COALESCE(SUM(${stockCountLines.varianceQtyBase}), 0)
            FROM ${stockCountLines}
            WHERE ${stockCountLines.countId} = ${stockCounts.id}
          )`.as('total_variance'),
        })
        .from(stockCounts)
        .leftJoin(locations, eq(stockCounts.locationId, locations.id))
        .where(and(...whereConditions))
        .orderBy(desc(stockCounts.createdAt))
        .limit(limit ?? 100)
        .offset(offset ?? 0);

      const items = rawCounts.map((count) => ({
        id: count.id,
        countNumber: count.countNumber,
        locationId: count.locationId,
        status: count.status,
        notes: count.notes,
        createdAt: count.createdAt,
        updatedAt: count.updatedAt,
        location: count.location_id ? {
          id: count.location_id,
          name: count.location_name ?? '',
          code: count.location_code ?? '',
        } : null,
        lineCount: count.lineCount ?? 0,
        totalVariance: count.totalVariance ?? '0.000000',
      }));

      const paginatedResponse: PaginatedResponse<typeof items[0]> = {
        items,
        total: totalCount,
        limit: limit ?? 100,
        offset: offset ?? 0,
      };

      return reply.send(createSuccessResponse(paginatedResponse, 'Stock counts retrieved successfully'));
    }
  );

  // GET /api/v1/stock-counts/:id - Get stock count by ID with lines
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get stock count by ID with lines',
        tags: ['Stock Counts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: stockCountResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const stockCount = await db.select().from(stockCounts)
        .leftJoin(locations, eq(stockCounts.locationId, locations.id))
        .where(and(eq(stockCounts.id, request.params.id), eq(stockCounts.tenantId, tenantId)))
        .limit(1);

      if (!stockCount.length) {
        return createNotFoundError('Stock count not found', reply);
      }

      const countData = stockCount[0]!;

      // Get lines for this stock count
      const lines = await db
        .select({
          id: stockCountLines.id,
          countId: stockCountLines.countId,
          productId: stockCountLines.productId,
          lotId: stockCountLines.lotId,
          systemQtyBase: stockCountLines.systemQtyBase,
          countedQtyBase: stockCountLines.countedQtyBase,
          varianceQtyBase: stockCountLines.varianceQtyBase,
          createdAt: stockCountLines.createdAt,
          product_id: products.id,
          product_name: products.name,
          product_sku: products.sku,
          lot_id: lots.id,
          lot_number: lots.lotNo,
          lot_expiry: lots.expiryDate,
        })
        .from(stockCountLines)
        .leftJoin(products, eq(stockCountLines.productId, products.id))
        .leftJoin(lots, eq(stockCountLines.lotId, lots.id))
        .where(eq(stockCountLines.countId, request.params.id))
        .orderBy(products.name, lots.lotNo);

      const formattedLines = lines.map((line) => ({
        id: line.id,
        countId: line.countId,
        productId: line.productId,
        lotId: line.lotId,
        systemQtyBase: line.systemQtyBase,
        countedQtyBase: line.countedQtyBase,
        varianceQtyBase: line.varianceQtyBase,
        createdAt: line.createdAt,
        product: line.product_id ? {
          id: line.product_id,
          name: line.product_name ?? '',
          sku: line.product_sku,
        } : null,
        lot: line.lot_id ? {
          id: line.lot_id,
          lotNo: line.lot_number ?? '',
          expiryDate: line.lot_expiry,
        } : null,
      }));

      const response = {
        id: countData.stock_counts.id,
        countNumber: countData.stock_counts.countNumber,
        locationId: countData.stock_counts.locationId,
        status: countData.stock_counts.status,
        notes: countData.stock_counts.notes,
        createdAt: countData.stock_counts.createdAt,
        updatedAt: countData.stock_counts.updatedAt,
        location: countData.locations ?? null,
        lines: formattedLines,
      };

      return reply.send(createSuccessResponse(response, 'Stock count retrieved successfully'));
    }
  );

  // POST /api/v1/stock-counts - Create new stock count
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new stock count',
        tags: ['Stock Counts'],
        body: stockCountCreateSchema,
        response: {
          201: stockCountResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: StockCountCreateType }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Generate count number
      const countNumber = `SC-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      const newCount = {
        tenantId,
        countNumber,
        locationId: request.body.locationId,
        status: 'draft',
        notes: request.body.notes ?? null,
      };

      const result = await db.insert(stockCounts).values(newCount).returning();

      // Get the full count with location info
      const countWithLocation = await db
        .select({
          id: stockCounts.id,
          countNumber: stockCounts.countNumber,
          locationId: stockCounts.locationId,
          status: stockCounts.status,
          notes: stockCounts.notes,
          createdAt: stockCounts.createdAt,
          updatedAt: stockCounts.updatedAt,
          location_id: locations.id,
          location_name: locations.name,
          location_code: locations.code,
        })
        .from(stockCounts)
        .leftJoin(locations, eq(stockCounts.locationId, locations.id))
        .where(eq(stockCounts.id, result[0]!.id))
        .limit(1);

      const response = {
        ...countWithLocation[0]!,
        location: countWithLocation[0]!.location_id ? {
          id: countWithLocation[0]!.location_id,
          name: countWithLocation[0]!.location_name ?? '',
          code: countWithLocation[0]!.location_code ?? '',
        } : null,
        lines: [],
      };

      return reply.status(201).send(createSuccessResponse(response, 'Stock count created successfully'));
    }
  );

  // PATCH /api/v1/stock-counts/:id - Update stock count
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update stock count (draft only)',
        tags: ['Stock Counts'],
        params: z.object({ id: z.string().uuid() }),
        body: stockCountUpdateSchema,
        response: {
          200: stockCountResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }, Body: StockCountUpdateType }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if stock count exists and is in draft status
      const existingCount = await db.select().from(stockCounts)
        .where(and(
          eq(stockCounts.id, request.params.id),
          eq(stockCounts.tenantId, tenantId),
          eq(stockCounts.status, 'draft')
        ))
        .limit(1);

      if (!existingCount.length) {
        return createNotFoundError('Stock count not found or cannot be edited', reply);
      }

      const result = await db.update(stockCounts)
        .set({
          ...request.body,
          updatedAt: new Date(),
        })
        .where(and(eq(stockCounts.id, request.params.id), eq(stockCounts.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Stock count updated successfully'));
    }
  );

  // Stock Count Lines endpoints

  // GET /api/v1/stock-counts/:id/lines - Get lines for a stock count
  fastify.get(
    '/:id/lines',
    {
      schema: {
        description: 'Get lines for a stock count',
        tags: ['Stock Counts', 'Stock Count Lines'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: stockCountLinesResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify stock count exists and belongs to tenant
      const count = await db.select().from(stockCounts)
        .where(and(eq(stockCounts.id, request.params.id), eq(stockCounts.tenantId, tenantId)))
        .limit(1);

      if (!count.length) {
        return createNotFoundError('Stock count not found', reply);
      }

      const lines = await db
        .select({
          id: stockCountLines.id,
          countId: stockCountLines.countId,
          productId: stockCountLines.productId,
          lotId: stockCountLines.lotId,
          systemQtyBase: stockCountLines.systemQtyBase,
          countedQtyBase: stockCountLines.countedQtyBase,
          varianceQtyBase: stockCountLines.varianceQtyBase,
          createdAt: stockCountLines.createdAt,
          product_id: products.id,
          product_name: products.name,
          product_sku: products.sku,
          lot_id: lots.id,
          lot_number: lots.lotNo,
          lot_expiry: lots.expiryDate,
        })
        .from(stockCountLines)
        .leftJoin(products, eq(stockCountLines.productId, products.id))
        .leftJoin(lots, eq(stockCountLines.lotId, lots.id))
        .where(eq(stockCountLines.countId, request.params.id))
        .orderBy(products.name, lots.lotNo);

      const formattedLines = lines.map((line) => ({
        id: line.id,
        countId: line.countId,
        productId: line.productId,
        lotId: line.lotId,
        systemQtyBase: line.systemQtyBase,
        countedQtyBase: line.countedQtyBase,
        varianceQtyBase: line.varianceQtyBase,
        createdAt: line.createdAt,
        product: line.product_id ? {
          id: line.product_id,
          name: line.product_name ?? '',
          sku: line.product_sku,
        } : null,
        lot: line.lot_id ? {
          id: line.lot_id,
          lotNo: line.lot_number ?? '',
          expiryDate: line.lot_expiry,
        } : null,
      }));

      return reply.send(createSuccessResponse(formattedLines, 'Stock count lines retrieved successfully'));
    }
  );

  // POST /api/v1/stock-counts/:id/lines - Add line to stock count
  fastify.post(
    '/:id/lines',
    {
      schema: {
        description: 'Add line to stock count',
        tags: ['Stock Counts', 'Stock Count Lines'],
        params: z.object({ id: z.string().uuid() }),
        body: stockCountLineCreateSchema,
        response: {
          201: stockCountLineSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: StockCountLineCreateType;
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Verify stock count exists and is in draft status
      const count = await db.select().from(stockCounts)
        .where(and(
          eq(stockCounts.id, request.params.id),
          eq(stockCounts.tenantId, tenantId),
          eq(stockCounts.status, 'draft')
        ))
        .limit(1);

      if (!count.length) {
        return createNotFoundError('Stock count not found or cannot be edited', reply);
      }

      // Get current system quantity for this product/lot
      let systemQty = '0';
      if (request.body.lotId) {
        // Get quantity for specific lot
        const lotResult = await db
          .select({
            qty: sql<number>`COALESCE(SUM(${stockLedger.qtyDeltaBase}), 0)`.as('total_qty'),
          })
          .from(stockLedger)
          .where(and(
            eq(stockLedger.lotId, request.body.lotId),
            eq(stockLedger.productId, request.body.productId),
            eq(stockLedger.locationId, count[0]!.locationId)
          ));

        systemQty = (lotResult[0]?.qty ?? 0).toString();
      } else {
        // Get total quantity for product at location (all lots)
        const productResult = await db
          .select({
            qty: sql<number>`COALESCE(SUM(${stockLedger.qtyDeltaBase}), 0)`.as('total_qty'),
          })
          .from(stockLedger)
          .where(and(
            eq(stockLedger.productId, request.body.productId),
            eq(stockLedger.locationId, count[0]!.locationId)
          ));

        systemQty = (productResult[0]?.qty ?? 0).toString();
      }

      const countedQty = request.body.countedQtyBase.toString();
      const variance = (parseFloat(countedQty) - parseFloat(systemQty)).toString();

      const newLine = {
        countId: request.params.id,
        productId: request.body.productId,
        lotId: request.body.lotId ?? null,
        systemQtyBase: systemQty,
        countedQtyBase: countedQty,
        varianceQtyBase: variance,
      };

      const result = await db.insert(stockCountLines).values(newLine).returning();

      // Get the full line with product info
      const fullLine = await db
        .select({
          id: stockCountLines.id,
          countId: stockCountLines.countId,
          productId: stockCountLines.productId,
          lotId: stockCountLines.lotId,
          systemQtyBase: stockCountLines.systemQtyBase,
          countedQtyBase: stockCountLines.countedQtyBase,
          varianceQtyBase: stockCountLines.varianceQtyBase,
          createdAt: stockCountLines.createdAt,
          product_id: products.id,
          product_name: products.name,
          product_sku: products.sku,
          lot_id: lots.id,
          lot_number: lots.lotNo,
          lot_expiry: lots.expiryDate,
        })
        .from(stockCountLines)
        .leftJoin(products, eq(stockCountLines.productId, products.id))
        .leftJoin(lots, eq(stockCountLines.lotId, lots.id))
        .where(eq(stockCountLines.id, result[0]!.id))
        .limit(1);

      const line = fullLine[0];
      if (!line) {
        return createNotFoundError('Failed to create stock count line', reply);
      }

      const response = {
        id: line.id,
        countId: line.countId,
        productId: line.productId,
        lotId: line.lotId,
        systemQtyBase: line.systemQtyBase,
        countedQtyBase: line.countedQtyBase,
        varianceQtyBase: line.varianceQtyBase,
        createdAt: line.createdAt,
        product: line.product_id ? {
          id: line.product_id,
          name: line.product_name ?? '',
          sku: line.product_sku,
        } : null,
        lot: line.lot_id ? {
          id: line.lot_id,
          lotNo: line.lot_number ?? '',
          expiryDate: line.lot_expiry,
        } : null,
      };

      return reply.status(201).send(createSuccessResponse(response, 'Stock count line added successfully'));
    }
  );

  // PATCH /api/v1/stock-counts/lines/:lineId - Update stock count line
  fastify.patch(
    '/lines/:lineId',
    {
      schema: {
        description: 'Update stock count line',
        tags: ['Stock Counts', 'Stock Count Lines'],
        params: z.object({ lineId: z.string().uuid() }),
        body: stockCountLineUpdateSchema,
        response: {
          200: stockCountLineSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { lineId: string };
      Body: StockCountLineUpdateType;
    }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Get the stock count line and verify it belongs to a draft count for this tenant
      const lineInfo = await db
        .select({
          lineId: stockCountLines.id,
          countId: stockCountLines.countId,
          countStatus: stockCounts.status,
          systemQtyBase: stockCountLines.systemQtyBase,
          tenantId: stockCounts.tenantId,
        })
        .from(stockCountLines)
        .innerJoin(stockCounts, eq(stockCountLines.countId, stockCounts.id))
        .where(and(
          eq(stockCountLines.id, request.params.lineId),
          eq(stockCounts.tenantId, tenantId),
          eq(stockCounts.status, 'draft')
        ))
        .limit(1);

      if (!lineInfo.length) {
        return createNotFoundError('Stock count line not found or cannot be edited', reply);
      }

      const systemQty = lineInfo[0]!.systemQtyBase;
      const countedQty = request.body.countedQtyBase.toString();
      const variance = (parseFloat(countedQty) - parseFloat(systemQty)).toString();

      const result = await db.update(stockCountLines)
        .set({
          countedQtyBase: countedQty,
          varianceQtyBase: variance,
        })
        .where(eq(stockCountLines.id, request.params.lineId))
        .returning();

      // Get the full line with product info
      const fullLine = await db
        .select({
          id: stockCountLines.id,
          countId: stockCountLines.countId,
          productId: stockCountLines.productId,
          lotId: stockCountLines.lotId,
          systemQtyBase: stockCountLines.systemQtyBase,
          countedQtyBase: stockCountLines.countedQtyBase,
          varianceQtyBase: stockCountLines.varianceQtyBase,
          createdAt: stockCountLines.createdAt,
          product_id: products.id,
          product_name: products.name,
          product_sku: products.sku,
          lot_id: lots.id,
          lot_number: lots.lotNo,
          lot_expiry: lots.expiryDate,
        })
        .from(stockCountLines)
        .leftJoin(products, eq(stockCountLines.productId, products.id))
        .leftJoin(lots, eq(stockCountLines.lotId, lots.id))
        .where(eq(stockCountLines.id, result[0]!.id))
        .limit(1);

      const line = fullLine[0];
      if (!line) {
        return createNotFoundError('Failed to update stock count line', reply);
      }

      const response = {
        id: line.id,
        countId: line.countId,
        productId: line.productId,
        lotId: line.lotId,
        systemQtyBase: line.systemQtyBase,
        countedQtyBase: line.countedQtyBase,
        varianceQtyBase: line.varianceQtyBase,
        createdAt: line.createdAt,
        product: line.product_id ? {
          id: line.product_id,
          name: line.product_name ?? '',
          sku: line.product_sku,
        } : null,
        lot: line.lot_id ? {
          id: line.lot_id,
          lotNo: line.lot_number ?? '',
          expiryDate: line.lot_expiry,
        } : null,
      };

      return reply.send(createSuccessResponse(response, 'Stock count line updated successfully'));
    }
  );

  // DELETE /api/v1/stock-counts/lines/:lineId - Remove line from stock count
  fastify.delete(
    '/lines/:lineId',
    {
      schema: {
        description: 'Remove line from stock count',
        tags: ['Stock Counts', 'Stock Count Lines'],
        params: z.object({ lineId: z.string().uuid() }),
        response: {
          200: stockCountLineSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { lineId: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Get the stock count line and verify it belongs to a draft count for this tenant
      const lineInfo = await db
        .select({
          lineId: stockCountLines.id,
          countId: stockCountLines.countId,
          countStatus: stockCounts.status,
        })
        .from(stockCountLines)
        .innerJoin(stockCounts, eq(stockCountLines.countId, stockCounts.id))
        .where(and(
          eq(stockCountLines.id, request.params.lineId),
          eq(stockCounts.tenantId, tenantId),
          eq(stockCounts.status, 'draft')
        ))
        .limit(1);

      if (!lineInfo.length) {
        return createNotFoundError('Stock count line not found or cannot be deleted', reply);
      }

      const result = await db.delete(stockCountLines)
        .where(eq(stockCountLines.id, request.params.lineId))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Stock count line removed successfully'));
    }
  );

  // POST /api/v1/stock-counts/:id/review - Compute variance and mark as reviewed
  fastify.post(
    '/:id/review',
    {
      schema: {
        description: 'Compute variance and mark stock count as reviewed',
        tags: ['Stock Counts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: stockCountResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Check if stock count exists and is in draft status
      const existingCount = await db.select().from(stockCounts)
        .where(and(
          eq(stockCounts.id, request.params.id),
          eq(stockCounts.tenantId, tenantId),
          eq(stockCounts.status, 'draft')
        ))
        .limit(1);

      if (!existingCount.length) {
        return createNotFoundError('Stock count not found or cannot be reviewed', reply);
      }

      // Recalculate all variances to ensure they're correct
      await db.execute(sql`
        UPDATE ${stockCountLines}
        SET variance_qty_base = counted_qty_base - system_qty_base
        WHERE count_id = ${request.params.id}
      `);

      const result = await db.update(stockCounts)
        .set({
          status: 'review',
          updatedAt: new Date(),
        })
        .where(and(eq(stockCounts.id, request.params.id), eq(stockCounts.tenantId, tenantId)))
        .returning();

      return reply.send(createSuccessResponse(result[0], 'Stock count reviewed successfully'));
    }
  );

  // POST /api/v1/stock-counts/:id/post - Post variance via ledger
  fastify.post(
    '/:id/post',
    {
      schema: {
        description: 'Post stock count variance to ledger',
        tags: ['Stock Counts'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: stockCountResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if stock count exists and is in review status
      const existingCount = await db.select({
        id: stockCounts.id,
        locationId: stockCounts.locationId,
        status: stockCounts.status,
      }).from(stockCounts)
        .where(and(
          eq(stockCounts.id, request.params.id),
          eq(stockCounts.tenantId, tenantId),
          eq(stockCounts.status, 'review')
        ))
        .limit(1);

      if (!existingCount.length) {
        return createNotFoundError('Stock count not found or must be reviewed before posting', reply);
      }

      const count = existingCount[0]!;

      // Get all lines with variance
      const varianceLines = await db.select().from(stockCountLines)
        .where(and(
          eq(stockCountLines.countId, request.params.id),
          sql`ABS(${stockCountLines.varianceQtyBase}) > 0.000001`
        ));

      if (!varianceLines.length) {
        return createNotFoundError('No variance found to post', reply);
      }

      // Post variances to ledger in a transaction
      await db.transaction(async (tx) => {
        for (const line of varianceLines) {
          const variance = parseFloat(line.varianceQtyBase);

          if (Math.abs(variance) < 0.000001) continue; // Skip zero variance

          // Create ledger entry for variance
          await tx.insert(stockLedger).values({
            tenantId,
            locationId: count.locationId,
            productId: line.productId,
            lotId: line.lotId,
            type: variance > 0 ? 'adj' : 'adj', // Use 'adj' for both positive and negative adjustments
            qtyDeltaBase: variance.toString(),
            unitCost: '0.00', // Stock adjustments typically don't affect cost
            refType: 'stock_count',
            refId: request.params.id,
            note: `Stock count variance: ${line.varianceQtyBase}`,
            createdBy: userId,
          });

          // Lot quantities are automatically tracked via the stock ledger
          // No need to manually update lot quantity
        }

        // Mark stock count as posted
        await tx.update(stockCounts)
          .set({
            status: 'posted',
            updatedAt: new Date(),
          })
          .where(and(eq(stockCounts.id, request.params.id), eq(stockCounts.tenantId, tenantId)));
      });

      const result = await db.select().from(stockCounts)
        .where(and(eq(stockCounts.id, request.params.id), eq(stockCounts.tenantId, tenantId)))
        .limit(1);

      return reply.send(createSuccessResponse(result[0], 'Stock count variance posted to ledger successfully'));
    }
  );
}
