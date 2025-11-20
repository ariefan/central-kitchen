import {
  stockCountCreateSchema,
  stockCountUpdateSchema,
  stockCountLineCreateSchema,
  stockCountLineUpdateSchema,
  stockCountQuerySchema,
} from './stock-count.schema.js';
import { stockCountRepository } from './stock-count.repository.js';
import type { RequestContext } from '@/shared/middleware/auth.js';
import { normalizePaginationParams } from '@/modules/shared/pagination.js';
import { generateDocNumber } from '@/modules/shared/doc-sequence.js';
import { recordInventoryMovements } from '@/modules/shared/ledger.service.js';
import { db } from '@/config/database.js';
import { locations } from '@/config/schema.js';
import { and, eq } from 'drizzle-orm';

export class StockCountServiceError extends Error {
  constructor(
    message: string,
    public kind: 'bad_request' | 'not_found' = 'bad_request',
  ) {
    super(message);
  }
}

const ensureLocation = async (locationId: string, tenantId: string) => {
  const rows = await db.select().from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)))
    .limit(1);
  if (!rows.length) {
    throw new StockCountServiceError('Location not found', 'not_found');
  }
  return rows[0]!;
};

const ensureCountExists = async (id: string, context: RequestContext) => {
  const count = await stockCountRepository.findById(id, context.tenantId);
  if (!count) {
    throw new StockCountServiceError('Stock count not found', 'not_found');
  }
  return count;
};

export const stockCountService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const query = stockCountQuerySchema.parse(rawQuery ?? {});
    const pagination = normalizePaginationParams({ limit: query.limit, offset: query.offset });
    const { items, total } = await stockCountRepository.list(context.tenantId, query, pagination);

    return {
      items,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  },

  async getById(id: string, context: RequestContext) {
    return stockCountRepository.findDetailedById(id, context.tenantId);
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = stockCountCreateSchema.parse(rawBody ?? {});
    await ensureLocation(body.locationId, context.tenantId);

    const countNumber = generateDocNumber('SC', { tenantId: context.tenantId });
    const created = await stockCountRepository.insertCount({
      tenantId: context.tenantId,
      countNumber,
      locationId: body.locationId,
      status: 'draft',
      notes: body.notes ?? null,
    });

    if (!created) {
      throw new StockCountServiceError('Failed to create stock count');
    }

    return stockCountRepository.findDetailedById(created.id, context.tenantId);
  },

  async update(id: string, rawBody: unknown, context: RequestContext) {
    const body = stockCountUpdateSchema.parse(rawBody ?? {});
    const existing = await ensureCountExists(id, context);
    if (existing.status !== 'draft') {
      throw new StockCountServiceError('Stock count cannot be updated unless it is in draft status');
    }

    if (body.locationId && body.locationId !== existing.locationId) {
      await ensureLocation(body.locationId, context.tenantId);
    }

    await stockCountRepository.updateCount(id, context.tenantId, {
      locationId: body.locationId ?? existing.locationId,
      notes: body.notes ?? existing.notes ?? null,
    });

    return stockCountRepository.findDetailedById(id, context.tenantId);
  },

  async listLines(countId: string, context: RequestContext) {
    await ensureCountExists(countId, context);
    return stockCountRepository.listLines(countId);
  },

  async addLine(countId: string, rawBody: unknown, context: RequestContext) {
    const body = stockCountLineCreateSchema.parse(rawBody ?? {});
    const count = await ensureCountExists(countId, context);
    if (count.status !== 'draft') {
      throw new StockCountServiceError('Stock count not found or cannot be edited', 'not_found');
    }

    const systemQty = await stockCountRepository.sumLedgerQuantity(
      context.tenantId,
      count.locationId,
      body.productId,
      body.lotId ?? null,
    );

    const countedQty = body.countedQtyBase.toString();
    const variance = (parseFloat(countedQty) - parseFloat(systemQty)).toString();

    const inserted = await stockCountRepository.insertLine({
      countId,
      productId: body.productId,
      lotId: body.lotId ?? null,
      systemQtyBase: systemQty,
      countedQtyBase: countedQty,
      varianceQtyBase: variance,
    });

    if (!inserted) {
      throw new StockCountServiceError('Failed to create stock count line');
    }

    return stockCountRepository.getLineById(inserted.id);
  },

  async updateLine(lineId: string, rawBody: unknown, context: RequestContext) {
    const body = stockCountLineUpdateSchema.parse(rawBody ?? {});
    const line = await stockCountRepository.findLineWithCount(lineId, context.tenantId, ['draft']);
    if (!line) {
      throw new StockCountServiceError('Stock count line not found or cannot be edited', 'not_found');
    }

    const systemQty = line.line.systemQtyBase;
    const countedQty = body.countedQtyBase.toString();
    const variance = (parseFloat(countedQty) - parseFloat(systemQty)).toString();

    const updated = await stockCountRepository.updateLine(lineId, {
      countedQtyBase: countedQty,
      varianceQtyBase: variance,
    });

    if (!updated) {
      throw new StockCountServiceError('Failed to update stock count line');
    }

    return stockCountRepository.getLineById(updated.id);
  },

  async deleteLine(lineId: string, context: RequestContext) {
    const line = await stockCountRepository.findLineWithCount(lineId, context.tenantId, ['draft']);
    if (!line) {
      throw new StockCountServiceError('Stock count line not found or cannot be deleted', 'not_found');
    }
    return stockCountRepository.deleteLine(lineId);
  },

  async review(id: string, context: RequestContext) {
    const count = await ensureCountExists(id, context);
    if (count.status !== 'draft') {
      throw new StockCountServiceError('Stock count not found or cannot be reviewed', 'not_found');
    }

    await stockCountRepository.recalcVariances(id);
    await stockCountRepository.updateCount(id, context.tenantId, { status: 'review' });
    return stockCountRepository.findDetailedById(id, context.tenantId);
  },

  async post(id: string, context: RequestContext) {
    const count = await ensureCountExists(id, context);
    if (count.status !== 'review') {
      throw new StockCountServiceError('Stock count not found or must be reviewed before posting', 'not_found');
    }

    const varianceLines = await stockCountRepository.getVarianceLines(id);
    if (!varianceLines.length) {
      throw new StockCountServiceError('No variance found to post', 'not_found');
    }

    await recordInventoryMovements(
      varianceLines.map((line) => ({
        tenantId: context.tenantId,
        productId: line.productId,
        locationId: count.locationId,
        lotId: line.lotId,
        type: 'adj',
        qtyDeltaBase: line.varianceQtyBase,
        unitCost: '0.00',
        refType: 'STOCK_COUNT',
        refId: id,
        note: `Stock count variance: ${line.varianceQtyBase}`,
        createdBy: context.userId ?? null,
      })),
      db,
    );

    await stockCountRepository.updateCount(id, context.tenantId, { status: 'posted' });
    return stockCountRepository.findDetailedById(id, context.tenantId);
  },
};
