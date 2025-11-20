import { db } from '@/config/database.js';
import {
  transfers,
  transferItems,
  locations,
  products,
  uoms,
} from '@/config/schema.js';
import { and, eq, sql, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { TransferQueryInput } from './transfer.schema.js';

const locationSelection = {
  id: locations.id,
  name: locations.name,
  code: locations.code,
};
type LocationRecord = {
  id: string | null;
  name: string | null;
  code: string | null;
};
const toLocations = alias(locations, 'to_location');
const toLocationSelection = {
  id: toLocations.id,
  name: toLocations.name,
  code: toLocations.code,
};

const itemSelection = {
  id: transferItems.id,
  transferId: transferItems.transferId,
  productId: transferItems.productId,
  uomId: transferItems.uomId,
  quantity: transferItems.quantity,
  qtyReceived: transferItems.qtyReceived,
  notes: transferItems.notes,
  createdAt: transferItems.createdAt,
  product: {
    id: products.id,
    name: products.name,
    sku: products.sku,
  },
  uom: {
    id: uoms.id,
    name: uoms.name,
    code: uoms.code,
  },
};

type ItemRow = {
  id: string;
  transferId: string;
  productId: string;
  uomId: string;
  quantity: string;
  qtyReceived: string | null;
  notes: string | null;
  createdAt: Date;
  product: { id: string | null; name: string | null; sku: string | null } | null;
  uom: { id: string | null; name: string | null; code: string | null } | null;
};

const mapLocation = (row: LocationRecord | null | undefined) => (row?.id
  ? {
      id: row.id,
      name: row.name,
      code: row.code,
    }
  : null);

const mapItem = (row: ItemRow) => ({
  id: row.id,
  transferId: row.transferId,
  productId: row.productId,
  uomId: row.uomId,
  quantity: row.quantity,
  qtyReceived: row.qtyReceived,
  notes: row.notes,
  createdAt: row.createdAt,
  product: row.product && row.product.id ? {
    id: row.product.id,
    name: row.product.name,
    sku: row.product.sku,
  } : null,
  uom: row.uom && row.uom.id ? {
    id: row.uom.id,
    name: row.uom.name,
    code: row.uom.code,
  } : null,
});

export const transferRepository = {
  async list(tenantId: string, filters: TransferQueryInput) {
    const conditions = [eq(transfers.tenantId, tenantId)];

    if (filters.status) {
      conditions.push(eq(transfers.status, filters.status));
    }
    if (filters.fromLocationId) {
      conditions.push(eq(transfers.fromLocationId, filters.fromLocationId));
    }
    if (filters.toLocationId) {
      conditions.push(eq(transfers.toLocationId, filters.toLocationId));
    }
    if (filters.dateFrom) {
      conditions.push(sql`${transfers.transferDate} >= ${new Date(filters.dateFrom)}`);
    }
    if (filters.dateTo) {
      conditions.push(sql`${transfers.transferDate} <= ${new Date(filters.dateTo)}`);
    }

    const rowsRaw = await db.select({
      transfer: transfers,
      fromLocation: locationSelection,
      toLocation: toLocationSelection,
    })
      .from(transfers)
      .leftJoin(locations, eq(transfers.fromLocationId, locations.id))
      .leftJoin(toLocations, eq(transfers.toLocationId, toLocations.id))
      .where(and(...conditions))
      .orderBy(desc(transfers.transferDate));
    const rows = rowsRaw as unknown as Array<{
      transfer: typeof transfers.$inferSelect;
      fromLocation: LocationRecord | null;
      toLocation: LocationRecord | null;
    }>;

    return rows.map((row) => ({
      ...row.transfer,
      fromLocation: mapLocation(row.fromLocation),
      toLocation: mapLocation(row.toLocation),
    }));
  },

  async findDetailedById(id: string, tenantId: string) {
    const rowsRaw = await db.select({
      transfer: transfers,
      fromLocation: locationSelection,
      toLocation: toLocationSelection,
    })
      .from(transfers)
      .leftJoin(locations, eq(transfers.fromLocationId, locations.id))
      .leftJoin(toLocations, eq(transfers.toLocationId, toLocations.id))
      .where(and(eq(transfers.id, id), eq(transfers.tenantId, tenantId)))
      .limit(1);
    const rows = rowsRaw as unknown as Array<{
      transfer: typeof transfers.$inferSelect;
      fromLocation: LocationRecord | null;
      toLocation: LocationRecord | null;
    }>;

    const data = rows[0];
    if (!data) {
      return null;
    }

    const items = await this.listItems(id);

    return {
      ...data.transfer,
      fromLocation: mapLocation(data.fromLocation),
      toLocation: mapLocation(data.toLocation),
      items,
    };
  },

  async findById(id: string, tenantId: string) {
    const rows = await db.select()
      .from(transfers)
      .where(and(eq(transfers.id, id), eq(transfers.tenantId, tenantId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async insertTransfer(data: typeof transfers.$inferInsert) {
    const [transfer] = await db.insert(transfers).values(data).returning();
    return transfer ?? null;
  },

  async insertItems(items: typeof transferItems.$inferInsert[]) {
    if (!items.length) return [];
    return db.insert(transferItems).values(items).returning();
  },

  async updateTransfer(id: string, tenantId: string, data: Partial<typeof transfers.$inferInsert>) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<typeof transfers.$inferInsert>;
    const [updated] = await db.update(transfers)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(and(eq(transfers.id, id), eq(transfers.tenantId, tenantId)))
      .returning();
    return updated ?? null;
  },

  async listItems(transferId: string) {
    const rowsRaw = await db.select(itemSelection)
      .from(transferItems)
      .leftJoin(products, eq(transferItems.productId, products.id))
      .leftJoin(uoms, eq(transferItems.uomId, uoms.id))
      .where(eq(transferItems.transferId, transferId));
    const rows = rowsRaw as unknown as ItemRow[];

    return rows.map(mapItem);
  },

  async updateItemReceived(transferId: string, itemId: string, qty: string, notes?: string | null) {
    const [updated] = await db.update(transferItems)
      .set({
        qtyReceived: qty,
        notes: notes ?? null,
      })
      .where(and(eq(transferItems.transferId, transferId), eq(transferItems.id, itemId)))
      .returning({ id: transferItems.id });
    return Boolean(updated);
  },

  async getTotals(transferId: string) {
    const totals = await db.select({
      totalQty: sql<string>`COALESCE(SUM(${transferItems.quantity}), '0')`,
      totalReceived: sql<string>`COALESCE(SUM(${transferItems.qtyReceived}), '0')`,
    })
      .from(transferItems)
      .where(eq(transferItems.transferId, transferId));
    const row = totals[0];

    return {
      totalQty: row?.totalQty ?? '0',
      totalReceived: row?.totalReceived ?? '0',
    };
  },
};
