import { db } from '@/config/database.js';
import {
  stockCounts,
  stockCountLines,
  locations,
  products,
  lots,
  stockLedger,
} from '@/config/schema.js';
import { and, eq, ilike, sql, desc, inArray, type SQL } from 'drizzle-orm';
import type { StockCountQueryInput } from './stock-count.schema.js';

type Pagination = {
  limit: number;
  offset: number;
};

const combineWhere = (conditions: SQL[]) => {
  if (conditions.length === 0) {
    throw new Error('Missing conditions for stock count query');
  }
  if (conditions.length === 1) {
    return conditions[0]!;
  }
  return and(...conditions);
};

const buildWhereClause = (tenantId: string, filters: StockCountQueryInput) => {
  const conditions: SQL[] = [eq(stockCounts.tenantId, tenantId)];

  if (filters.status) {
    conditions.push(eq(stockCounts.status, filters.status));
  }

  if (filters.locationId) {
    conditions.push(eq(stockCounts.locationId, filters.locationId));
  }

  if (filters.search) {
    conditions.push(ilike(stockCounts.countNumber, `%${filters.search}%`));
  }

  return combineWhere(conditions);
};

const locationSelection = {
  id: locations.id,
  name: locations.name,
  code: locations.code,
};

const lineSelection = {
  id: stockCountLines.id,
  countId: stockCountLines.countId,
  productId: stockCountLines.productId,
  lotId: stockCountLines.lotId,
  systemQtyBase: stockCountLines.systemQtyBase,
  countedQtyBase: stockCountLines.countedQtyBase,
  varianceQtyBase: stockCountLines.varianceQtyBase,
  createdAt: stockCountLines.createdAt,
  product: {
    id: products.id,
    name: products.name,
    sku: products.sku,
  },
  lot: {
    id: lots.id,
    lotNo: lots.lotNo,
    expiryDate: lots.expiryDate,
  },
};

type LocationRow = {
  id: string | null;
  name: string | null;
  code: string | null;
};

type ItemRow = {
  id: string;
  countId: string;
  productId: string;
  lotId: string | null;
  systemQtyBase: string;
  countedQtyBase: string;
  varianceQtyBase: string;
  createdAt: Date;
  product: { id: string | null; name: string | null; sku: string | null } | null;
  lot: { id: string | null; lotNo: string | null; expiryDate: Date | null } | null;
};

const mapLine = (row: ItemRow) => ({
  id: row.id,
  countId: row.countId,
  productId: row.productId,
  lotId: row.lotId,
  systemQtyBase: row.systemQtyBase,
  countedQtyBase: row.countedQtyBase,
  varianceQtyBase: row.varianceQtyBase,
  createdAt: row.createdAt,
  product: row.product && row.product.id ? {
    id: row.product.id,
    name: row.product.name,
    sku: row.product.sku,
  } : null,
  lot: row.lot && row.lot.id ? {
    id: row.lot.id,
    lotNo: row.lot.lotNo,
    expiryDate: row.lot.expiryDate,
  } : null,
});

const mapLocation = (row: LocationRow | null | undefined) => (row?.id
  ? {
      id: row.id,
      name: row.name,
      code: row.code,
    }
  : null);

export const stockCountRepository = {
  async list(tenantId: string, filters: StockCountQueryInput, pagination: Pagination) {
    const whereClause = buildWhereClause(tenantId, filters);

    const totalResult = await db
      .select({ total: sql<string>`count(*)` })
      .from(stockCounts)
      .where(whereClause);
    const total = Number(totalResult[0]?.total ?? 0);

    const rowsRaw = await db.select({
      id: stockCounts.id,
      countNumber: stockCounts.countNumber,
      locationId: stockCounts.locationId,
      status: stockCounts.status,
      notes: stockCounts.notes,
      createdAt: stockCounts.createdAt,
      updatedAt: stockCounts.updatedAt,
      location: locationSelection,
      lineCount: sql<string>`(
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
      .where(whereClause)
      .orderBy(desc(stockCounts.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset);
    const rows = rowsRaw as unknown as Array<{
      id: string;
      countNumber: string;
      locationId: string;
      status: string;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
      location: LocationRow | null;
      lineCount: string | null;
      totalVariance: string | null;
    }>;

    const items = rows.map((row) => ({
      id: row.id,
      countNumber: row.countNumber,
      locationId: row.locationId,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      location: mapLocation(row.location),
      lineCount: Number(row.lineCount ?? 0),
      totalVariance: row.totalVariance ?? '0',
    }));

    return {
      total,
      items,
    };
  },

  async findDetailedById(id: string, tenantId: string) {
    const rowsRaw = await db.select({
      count: stockCounts,
      location: locationSelection,
    })
      .from(stockCounts)
      .leftJoin(locations, eq(stockCounts.locationId, locations.id))
      .where(and(eq(stockCounts.id, id), eq(stockCounts.tenantId, tenantId)))
      .limit(1);
    const rows = rowsRaw as unknown as Array<{
      count: typeof stockCounts.$inferSelect;
      location: LocationRow | null;
    }>;

    const data = rows[0];
    if (!data) {
      return null;
    }

    const lines = await this.listLines(id);

    return {
      ...data.count,
      location: mapLocation(data.location),
      lines,
    };
  },

  async findById(id: string, tenantId: string) {
    const rows = await db.select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, id), eq(stockCounts.tenantId, tenantId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async insertCount(data: typeof stockCounts.$inferInsert) {
    const [created] = await db.insert(stockCounts).values(data).returning();
    return created ?? null;
  },

  async updateCount(id: string, tenantId: string, data: Partial<typeof stockCounts.$inferInsert>) {
    const [updated] = await db.update(stockCounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(stockCounts.id, id), eq(stockCounts.tenantId, tenantId)))
      .returning();
    return updated ?? null;
  },

  async listLines(countId: string) {
    const rowsRaw = await db.select(lineSelection)
      .from(stockCountLines)
      .leftJoin(products, eq(stockCountLines.productId, products.id))
      .leftJoin(lots, eq(stockCountLines.lotId, lots.id))
      .where(eq(stockCountLines.countId, countId))
      .orderBy(products.name, lots.lotNo);
    const rows = rowsRaw as unknown as ItemRow[];

    return rows.map(mapLine);
  },

  async getLineById(lineId: string) {
    const rowsRaw = await db.select(lineSelection)
      .from(stockCountLines)
      .leftJoin(products, eq(stockCountLines.productId, products.id))
      .leftJoin(lots, eq(stockCountLines.lotId, lots.id))
      .where(eq(stockCountLines.id, lineId))
      .limit(1);
    const rows = rowsRaw as unknown as ItemRow[];
    const line = rows[0];
    return line ? mapLine(line) : null;
  },

  async insertLine(data: typeof stockCountLines.$inferInsert) {
    const [line] = await db.insert(stockCountLines).values(data).returning();
    return line ?? null;
  },

  async updateLine(lineId: string, data: Partial<typeof stockCountLines.$inferInsert>) {
    const [line] = await db.update(stockCountLines)
      .set(data)
      .where(eq(stockCountLines.id, lineId))
      .returning();
    return line ?? null;
  },

  async deleteLine(lineId: string) {
    const [line] = await db.delete(stockCountLines)
      .where(eq(stockCountLines.id, lineId))
      .returning();
    return line ?? null;
  },

  async findLineWithCount(lineId: string, tenantId: string, allowedStatuses: string[]) {
    const rows = await db.select({
      line: stockCountLines,
      count: stockCounts,
    })
      .from(stockCountLines)
      .innerJoin(stockCounts, eq(stockCountLines.countId, stockCounts.id))
      .where(and(
        eq(stockCountLines.id, lineId),
        eq(stockCounts.tenantId, tenantId),
        allowedStatuses.length ? inArray(stockCounts.status, allowedStatuses) : sql`TRUE`,
      ))
      .limit(1);

    return rows[0] ?? null;
  },

  async recalcVariances(countId: string) {
    await db.execute(sql`
      UPDATE ${stockCountLines}
      SET variance_qty_base = counted_qty_base - system_qty_base
      WHERE count_id = ${countId}
    `);
  },

  async getVarianceLines(countId: string) {
    return db.select()
      .from(stockCountLines)
      .where(and(
        eq(stockCountLines.countId, countId),
        sql`ABS(${stockCountLines.varianceQtyBase}) > 0.000001`,
      ));
  },

  async sumLedgerQuantity(tenantId: string, locationId: string, productId: string, lotId?: string | null) {
    const [result] = await db.select({
      qty: sql<string>`COALESCE(SUM(${stockLedger.qtyDeltaBase}), 0)::text`,
    })
      .from(stockLedger)
      .where(and(
        eq(stockLedger.tenantId, tenantId),
        eq(stockLedger.locationId, locationId),
        eq(stockLedger.productId, productId),
        lotId
          ? eq(stockLedger.lotId, lotId)
          : sql`TRUE`,
      ));

    return lotId ? result?.qty ?? '0' : result?.qty ?? '0';
  },
};
