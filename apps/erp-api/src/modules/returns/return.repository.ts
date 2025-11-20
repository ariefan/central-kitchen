import { db } from '@/config/database.js';
import {
  returnOrders,
  returnOrderItems,
  customers,
  suppliers,
  locations,
  products,
  uoms,
  lots,
} from '@/config/schema.js';
import { and, eq, sql, desc, inArray, type SQL } from 'drizzle-orm';
import type { ReturnOrderQueryInput } from './return.schema.js';

type ReturnOrderRow = typeof returnOrders.$inferSelect;
type ReturnOrderInsert = typeof returnOrders.$inferInsert;
type ReturnOrderItemInsert = typeof returnOrderItems.$inferInsert;

type CustomerView = {
  id: string;
  name: string;
  email: string | null;
} | null;

type SupplierView = {
  id: string;
  name: string;
  code: string | null;
} | null;

type LocationView = {
  id: string;
  name: string;
  code: string;
} | null;

export type ReturnOrderItemView = {
  item: typeof returnOrderItems.$inferSelect;
  product: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
  uom: {
    id: string;
    code: string;
    name: string;
  } | null;
  lot: {
    id: string;
    lotNo: string | null;
    expiryDate: Date | null;
  } | null;
};

export type ReturnOrderDetail = ReturnOrderRow & {
  customer: CustomerView;
  supplier: SupplierView;
  location: LocationView;
  items: ReturnOrderItemView[];
};

type TransactionScope = Parameters<typeof db.transaction>[0];
type TransactionClient = Parameters<TransactionScope>[0];
type DbOrTxClient = typeof db | TransactionClient;

const baseReturnSelection = {
  returnOrder: returnOrders,
  customer: {
    id: customers.id,
    name: customers.name,
    email: customers.email,
  },
  supplier: {
    id: suppliers.id,
    name: suppliers.name,
    code: suppliers.code,
  },
  location: {
    id: locations.id,
    name: locations.name,
    code: locations.code,
  },
};

const buildWhereClause = (tenantId: string, filters: ReturnOrderQueryInput = {}) => {
  const whereConditions = [eq(returnOrders.tenantId, tenantId)];

  if (filters.returnType) {
    whereConditions.push(eq(returnOrders.returnType, filters.returnType));
  }

  if (filters.status) {
    whereConditions.push(eq(returnOrders.status, filters.status));
  }

  if (filters.customerId) {
    whereConditions.push(eq(returnOrders.customerId, filters.customerId));
  }

  if (filters.supplierId) {
    whereConditions.push(eq(returnOrders.supplierId, filters.supplierId));
  }

  if (filters.locationId) {
    whereConditions.push(eq(returnOrders.locationId, filters.locationId));
  }

  if (filters.dateFrom) {
    whereConditions.push(sql`${returnOrders.returnDate} >= ${new Date(filters.dateFrom)}`);
  }

  if (filters.dateTo) {
    whereConditions.push(sql`${returnOrders.returnDate} <= ${new Date(filters.dateTo)}`);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    whereConditions.push(sql`(${returnOrders.returnNumber} ILIKE ${term} OR ${returnOrders.reason} ILIKE ${term})`);
  }

  if (whereConditions.length === 1) {
    return whereConditions[0]!;
  }

  return and(...whereConditions)!;
};

const fetchReturnRows = async (whereClause: SQL<unknown>) => {
  const rows = await db.select(baseReturnSelection)
    .from(returnOrders)
    .leftJoin(customers, eq(returnOrders.customerId, customers.id))
    .leftJoin(suppliers, eq(returnOrders.supplierId, suppliers.id))
    .leftJoin(locations, eq(returnOrders.locationId, locations.id))
    .where(whereClause)
    .orderBy(desc(returnOrders.returnDate));

  const ids = rows.map((row) => row.returnOrder.id);
  const itemsMap = await getItemsMap(ids);

  return rows.map<ReturnOrderDetail>((row) => ({
    ...row.returnOrder,
    customer: row.customer ?? null,
    supplier: row.supplier ?? null,
    location: row.location ?? null,
    items: itemsMap.get(row.returnOrder.id) ?? [],
  }));
};

const getItemsMap = async (ids: string[]) => {
  const map = new Map<string, ReturnOrderItemView[]>();
  if (!ids.length) {
    return map;
  }

  const rows = await db.select({
    item: returnOrderItems,
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
    .from(returnOrderItems)
    .leftJoin(products, eq(returnOrderItems.productId, products.id))
    .leftJoin(uoms, eq(returnOrderItems.uomId, uoms.id))
    .leftJoin(lots, eq(returnOrderItems.lotId, lots.id))
    .where(inArray(returnOrderItems.returnOrderId, ids))
    .orderBy(returnOrderItems.createdAt);

  for (const row of rows) {
    const existing = map.get(row.item.returnOrderId) ?? [];
    existing.push(row);
    map.set(row.item.returnOrderId, existing);
  }

  return map;
};

export const returnRepository = {
  async list(tenantId: string, filters: ReturnOrderQueryInput) {
    return fetchReturnRows(buildWhereClause(tenantId, filters));
  },

  async findDetailedById(id: string, tenantId: string) {
    const clause = and(
      eq(returnOrders.id, id),
      eq(returnOrders.tenantId, tenantId),
    )!;
    const results = await fetchReturnRows(clause);
    return results[0] ?? null;
  },

  async findRawById(id: string, tenantId: string) {
    const clause = and(eq(returnOrders.id, id), eq(returnOrders.tenantId, tenantId))!;
    const rows = await db.select()
      .from(returnOrders)
      .where(clause)
      .limit(1);
    return rows[0] ?? null;
  },

  async insert(client: DbOrTxClient, data: ReturnOrderInsert, items: ReturnOrderItemInsert[]) {
    const [created] = await client.insert(returnOrders).values(data).returning();
    if (!created) {
      return null;
    }

    if (items.length) {
      await client.insert(returnOrderItems).values(items).returning();
    }

    return created;
  },

  async updateById(client: DbOrTxClient, id: string, tenantId: string, data: Partial<ReturnOrderInsert>) {
    const [updated] = await client.update(returnOrders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(returnOrders.id, id), eq(returnOrders.tenantId, tenantId)))
      .returning();
    return updated ?? null;
  },
};
