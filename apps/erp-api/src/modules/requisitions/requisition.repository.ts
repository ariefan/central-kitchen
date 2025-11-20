import { db } from '@/config/database.js';
import {
  requisitions,
  requisitionItems,
  locations,
  products,
  uoms,
} from '@/config/schema.js';
import { and, eq, sql, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { RequisitionQueryInput } from './requisition.schema.js';

const toLocations = alias(locations, 'to_location');

const locationSelection = {
  id: locations.id,
  name: locations.name,
  code: locations.code,
};

const toLocationSelection = {
  id: toLocations.id,
  name: toLocations.name,
  code: toLocations.code,
};

type LocationRecord = {
  id: string | null;
  name: string | null;
  code: string | null;
};

type ItemRow = {
  id: string;
  requisitionId: string;
  productId: string;
  uomId: string;
  qtyRequested: string;
  qtyIssued: string;
  notes: string | null;
  createdAt: Date;
  product: { id: string | null; name: string | null; sku: string | null } | null;
  uom: { id: string | null; name: string | null; code: string | null } | null;
};

const mapLocation = (row: LocationRecord | null | undefined) => (row?.id ? {
  id: row.id,
  name: row.name,
  code: row.code,
} : null);

const mapItem = (row: ItemRow) => ({
  id: row.id,
  requisitionId: row.requisitionId,
  productId: row.productId,
  uomId: row.uomId,
  qtyRequested: row.qtyRequested,
  qtyIssued: row.qtyIssued,
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

export const requisitionRepository = {
  async list(tenantId: string, filters: RequisitionQueryInput) {
    const conditions = [eq(requisitions.tenantId, tenantId)];

    if (filters.status) conditions.push(eq(requisitions.status, filters.status));
    if (filters.fromLocationId) conditions.push(eq(requisitions.fromLocationId, filters.fromLocationId));
    if (filters.toLocationId) conditions.push(eq(requisitions.toLocationId, filters.toLocationId));
    if (filters.dateFrom) conditions.push(sql`${requisitions.requestedDate} >= ${new Date(filters.dateFrom)}`);
    if (filters.dateTo) conditions.push(sql`${requisitions.requestedDate} <= ${new Date(filters.dateTo)}`);

    const rowsRaw = await db.select({
      requisition: requisitions,
      fromLocation: locationSelection,
      toLocation: toLocationSelection,
    })
      .from(requisitions)
      .leftJoin(locations, eq(requisitions.fromLocationId, locations.id))
      .leftJoin(toLocations, eq(requisitions.toLocationId, toLocations.id))
      .where(and(...conditions))
      .orderBy(desc(requisitions.requestedDate));
    const rows = rowsRaw as unknown as Array<{
      requisition: typeof requisitions.$inferSelect;
      fromLocation: LocationRecord | null;
      toLocation: LocationRecord | null;
    }>;

    return rows.map((row) => ({
      ...row.requisition,
      fromLocation: mapLocation(row.fromLocation),
      toLocation: mapLocation(row.toLocation),
    }));
  },

  async findDetailedById(id: string, tenantId: string) {
    const rowsRaw = await db.select({
      requisition: requisitions,
      fromLocation: locationSelection,
      toLocation: toLocationSelection,
    })
      .from(requisitions)
      .leftJoin(locations, eq(requisitions.fromLocationId, locations.id))
      .leftJoin(toLocations, eq(requisitions.toLocationId, toLocations.id))
      .where(and(eq(requisitions.id, id), eq(requisitions.tenantId, tenantId)))
      .limit(1);
    const rows = rowsRaw as unknown as Array<{
      requisition: typeof requisitions.$inferSelect;
      fromLocation: LocationRecord | null;
      toLocation: LocationRecord | null;
    }>;

    const data = rows[0];
    if (!data) {
      return null;
    }

    const items = await this.listItems(id);

    return {
      ...data.requisition,
      fromLocation: mapLocation(data.fromLocation),
      toLocation: mapLocation(data.toLocation),
      items,
    };
  },

  async findById(id: string, tenantId: string) {
    const rows = await db.select()
      .from(requisitions)
      .where(and(eq(requisitions.id, id), eq(requisitions.tenantId, tenantId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async insertRequisition(data: typeof requisitions.$inferInsert) {
    const [requisition] = await db.insert(requisitions).values(data).returning();
    return requisition ?? null;
  },

  async insertItems(items: typeof requisitionItems.$inferInsert[]) {
    if (!items.length) return [];
    return db.insert(requisitionItems).values(items).returning();
  },

  async updateRequisition(id: string, tenantId: string, data: Partial<typeof requisitions.$inferInsert>) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<typeof requisitions.$inferInsert>;
    const [updated] = await db.update(requisitions)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(and(eq(requisitions.id, id), eq(requisitions.tenantId, tenantId)))
      .returning();
    return updated ?? null;
  },

  async listItems(requisitionId: string) {
    const rowsRaw = await db.select({
      id: requisitionItems.id,
      requisitionId: requisitionItems.requisitionId,
      productId: requisitionItems.productId,
      uomId: requisitionItems.uomId,
      qtyRequested: requisitionItems.qtyRequested,
      qtyIssued: requisitionItems.qtyIssued,
      notes: requisitionItems.notes,
      createdAt: requisitionItems.createdAt,
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
    })
      .from(requisitionItems)
      .leftJoin(products, eq(requisitionItems.productId, products.id))
      .leftJoin(uoms, eq(requisitionItems.uomId, uoms.id))
      .where(eq(requisitionItems.requisitionId, requisitionId));
    const rows = rowsRaw as unknown as ItemRow[];

    return rows.map(mapItem);
  },
};
