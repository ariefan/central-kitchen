import { db } from '@/config/database.js';
import {
  recipes,
  recipeItems,
  products,
} from '@/config/schema.js';
import { and, eq, sql, desc } from 'drizzle-orm';
import type { RecipeQueryInput } from './recipe.schema.js';

const productSelection = {
  id: products.id,
  name: products.name,
  sku: products.sku,
};

export const recipeRepository = {
  async list(tenantId: string, filters: RecipeQueryInput) {
    const conditions = [eq(recipes.tenantId, tenantId)];
    if (filters.code) conditions.push(eq(recipes.code, filters.code));
    if (filters.finishedProductId) conditions.push(eq(recipes.finishedProductId, filters.finishedProductId));
    if (typeof filters.isActive === 'boolean') conditions.push(eq(recipes.isActive, filters.isActive));
    if (filters.search) conditions.push(sql`${recipes.name} ILIKE ${`%${filters.search}%`} OR ${recipes.code} ILIKE ${`%${filters.search}%`}`);

    const rows = await db.select({
      recipe: recipes,
      finishedProduct: productSelection,
    })
      .from(recipes)
      .leftJoin(products, eq(recipes.finishedProductId, products.id))
      .where(and(...conditions))
      .orderBy(desc(recipes.updatedAt));

    return rows.map((row) => ({
      ...row.recipe,
      finishedProduct: row.finishedProduct ?? null,
    }));
  },

  async findDetailedById(id: string, tenantId: string) {
    const rows = await db.select({
      recipe: recipes,
      finishedProduct: productSelection,
    })
      .from(recipes)
      .leftJoin(products, eq(recipes.finishedProductId, products.id))
      .where(and(eq(recipes.id, id), eq(recipes.tenantId, tenantId)))
      .limit(1);

    const data = rows[0];
    if (!data) return null;

    return {
      ...data.recipe,
      finishedProduct: data.finishedProduct ?? null,
    };
  },

  async findById(id: string, tenantId: string) {
    const rows = await db.select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.tenantId, tenantId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async latestVersionForCode(code: string, tenantId: string) {
    const rows = await db.select({ version: recipes.version })
      .from(recipes)
      .where(and(eq(recipes.code, code), eq(recipes.tenantId, tenantId)))
      .orderBy(desc(recipes.version))
      .limit(1);
    return rows[0]?.version ?? 0;
  },

  async insertRecipe(data: typeof recipes.$inferInsert) {
    const [recipe] = await db.insert(recipes).values(data).returning();
    return recipe ?? null;
  },

  async insertItems(items: typeof recipeItems.$inferInsert[]) {
    if (!items.length) return [];
    return db.insert(recipeItems).values(items).returning();
  },

  async updateRecipe(id: string, tenantId: string, data: Partial<typeof recipes.$inferInsert>) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<typeof recipes.$inferInsert>;

    const [updated] = await db.update(recipes)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(and(eq(recipes.id, id), eq(recipes.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  },

  async listIngredients(recipeId: string) {
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
};
