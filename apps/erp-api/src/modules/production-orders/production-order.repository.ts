import { db } from '@/config/database.js';
import {
  productionOrders,
  recipes,
  locations,
  products,
  recipeItems,
} from '@/config/schema.js';
import { and, eq, sql, desc } from 'drizzle-orm';
import type { ProductionOrderQueryInput } from './production-order.schema.js';

const recipeSelection = {
  id: recipes.id,
  code: recipes.code,
  name: recipes.name,
  instructions: recipes.instructions,
  yieldQtyBase: recipes.yieldQtyBase,
};

const locationSelection = {
  id: locations.id,
  name: locations.name,
  code: locations.code,
};

const productSelection = {
  id: products.id,
  name: products.name,
  sku: products.sku,
};

export const productionOrderRepository = {
  async list(tenantId: string, filters: ProductionOrderQueryInput) {
    const conditions = [eq(productionOrders.tenantId, tenantId)];

    if (filters.status) conditions.push(eq(productionOrders.status, filters.status));
    if (filters.recipeId) conditions.push(eq(productionOrders.recipeId, filters.recipeId));
    if (filters.locationId) conditions.push(eq(productionOrders.locationId, filters.locationId));
    if (filters.dateFrom) conditions.push(sql`${productionOrders.scheduledAt} >= ${new Date(filters.dateFrom)}`);
    if (filters.dateTo) conditions.push(sql`${productionOrders.scheduledAt} <= ${new Date(filters.dateTo)}`);

    const rows = await db.select({
      order: productionOrders,
      recipe: recipeSelection,
      location: locationSelection,
      finishedProduct: productSelection,
    })
      .from(productionOrders)
      .leftJoin(recipes, eq(productionOrders.recipeId, recipes.id))
      .leftJoin(locations, eq(productionOrders.locationId, locations.id))
      .leftJoin(products, eq(recipes.finishedProductId, products.id))
      .where(and(...conditions))
      .orderBy(desc(productionOrders.scheduledAt));

    return rows.map((row) => ({
      ...row.order,
      recipe: row.recipe ?? null,
      location: row.location ?? null,
      finishedProduct: row.finishedProduct ?? null,
    }));
  },

  async findDetailedById(id: string, tenantId: string) {
    const rows = await db.select({
      order: productionOrders,
      recipe: recipeSelection,
      location: locationSelection,
      finishedProduct: productSelection,
    })
      .from(productionOrders)
      .leftJoin(recipes, eq(productionOrders.recipeId, recipes.id))
      .leftJoin(locations, eq(productionOrders.locationId, locations.id))
      .leftJoin(products, eq(recipes.finishedProductId, products.id))
      .where(and(eq(productionOrders.id, id), eq(productionOrders.tenantId, tenantId)))
      .limit(1);

    const data = rows[0];
    if (!data) return null;

    return {
      ...data.order,
      recipe: data.recipe ?? null,
      location: data.location ?? null,
      finishedProduct: data.finishedProduct ?? null,
    };
  },

  async findById(id: string, tenantId: string) {
    const rows = await db.select()
      .from(productionOrders)
      .where(and(eq(productionOrders.id, id), eq(productionOrders.tenantId, tenantId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async insert(order: typeof productionOrders.$inferInsert) {
    const [created] = await db.insert(productionOrders).values(order).returning();
    return created ?? null;
  },

  async update(id: string, tenantId: string, data: Partial<typeof productionOrders.$inferInsert>) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<typeof productionOrders.$inferInsert>;

    const [updated] = await db.update(productionOrders)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(and(eq(productionOrders.id, id), eq(productionOrders.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  },

  async getRecipeIngredients(recipeId: string) {
    const rows = await db.select({
      item: recipeItems,
      product: productSelection,
    })
      .from(recipeItems)
      .leftJoin(products, eq(recipeItems.productId, products.id))
      .where(eq(recipeItems.recipeId, recipeId))
      .orderBy(recipeItems.sortOrder);

    return rows;
  },

  async getRecipeSummary(recipeId: string, tenantId: string) {
    const rows = await db.select({
      recipe: recipes,
      finishedProduct: productSelection,
    })
      .from(recipes)
      .leftJoin(products, eq(recipes.finishedProductId, products.id))
      .where(and(eq(recipes.id, recipeId), eq(recipes.tenantId, tenantId)))
      .limit(1);

    return rows[0] ?? null;
  },
};
