import {
  recipeQuerySchema,
  recipeCreateSchema,
  recipeUpdateSchema,
  recipeScaleSchema,
} from './recipe.schema.js';
import { recipeRepository } from './recipe.repository.js';
import type { RequestContext } from '@/shared/middleware/auth.js';
import { db } from '@/config/database.js';
import { products } from '@/config/schema.js';
import { and, eq } from 'drizzle-orm';

export class RecipeServiceError extends Error {
  constructor(
    message: string,
    public kind: 'bad_request' | 'not_found' = 'bad_request',
  ) {
    super(message);
  }
}

const ensureProduct = async (productId: string, tenantId: string) => {
  const rows = await db.select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);
  if (!rows.length) {
    throw new RecipeServiceError('Product not found', 'not_found');
  }
  return rows[0]!;
};

const ensureProductsExist = async (productIds: string[], tenantId: string) => {
  if (!productIds.length) return;
  const rows = await db.select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)));
  const found = new Set(rows.map((row) => row.id));
  const missing = productIds.filter((id) => !found.has(id));
  if (missing.length) {
    throw new RecipeServiceError('One or more ingredient products not found');
  }
};

export const recipeService = {
  async list(rawQuery: unknown, context: RequestContext) {
    const raw = (rawQuery ?? {}) as Record<string, unknown>;
    const normalizedIsActive = typeof raw.isActive === 'string'
      ? raw.isActive === 'true'
      : typeof raw.isActive === 'boolean'
        ? raw.isActive
        : undefined;

    const query = recipeQuerySchema.parse({
      ...raw,
      isActive: normalizedIsActive,
    });
    return recipeRepository.list(context.tenantId, query);
  },

  async getById(id: string, context: RequestContext) {
    const recipe = await recipeRepository.findDetailedById(id, context.tenantId);
    if (!recipe) {
      return null;
    }
    const ingredients = await recipeRepository.listIngredients(id);
    return {
      ...recipe,
      ingredients: ingredients.map((ingredient) => ({
        id: ingredient.item.id,
        productId: ingredient.item.productId,
        qtyBase: ingredient.item.qtyBase ?? '0',
        sortOrder: ingredient.item.sortOrder,
        notes: ingredient.item.notes ?? null,
        product: ingredient.product ?? null,
      })),
    };
  },

  async create(rawBody: unknown, context: RequestContext) {
    const body = recipeCreateSchema.parse(rawBody ?? {});
    await ensureProduct(body.finishedProductId, context.tenantId);
    await ensureProductsExist(body.items.map((item) => item.productId), context.tenantId);

    const nextVersion = (await recipeRepository.latestVersionForCode(body.code, context.tenantId)) + 1;
    const recipe = await recipeRepository.insertRecipe({
      tenantId: context.tenantId,
      code: body.code,
      name: body.name,
      finishedProductId: body.finishedProductId,
      yieldQtyBase: body.yieldQtyBase.toString(),
      instructions: body.instructions ?? null,
      version: nextVersion,
    });

    if (!recipe) {
      throw new RecipeServiceError('Failed to create recipe');
    }

    await recipeRepository.insertItems(
      body.items.map((item, index) => ({
        recipeId: recipe.id,
        productId: item.productId,
        qtyBase: item.qtyBase.toString(),
        sortOrder: item.sortOrder ?? index,
        notes: item.notes ?? null,
      }))
    );

    return this.getById(recipe.id, context);
  },

  async calculateCost(id: string, scaleFactorRaw: number | undefined, context: RequestContext) {
    const recipe = await recipeRepository.findById(id, context.tenantId);
    if (!recipe) {
      return null;
    }

    const scaleFactor = scaleFactorRaw ?? 1;
    const ingredients = await recipeRepository.listIngredients(id);

    // Placeholder costs (0) as before
    const ingredientCosts = ingredients.map((ingredient) => ({
      productId: ingredient.item.productId,
      productName: ingredient.product?.name ?? 'Unknown',
      quantity: Number(ingredient.item.qtyBase ?? '0') * scaleFactor,
      unitCost: 0,
      totalCost: 0,
    }));

    const totalCost = 0;
    const baseYield = Number(recipe.yieldQtyBase ?? '0');

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      baseYieldQty: baseYield,
      scaleFactor,
      totalCost,
      costPerUnit: baseYield * scaleFactor > 0 ? totalCost / (baseYield * scaleFactor) : 0,
      ingredientCosts,
    };
  },

  async scaleRecipe(id: string, rawBody: unknown, context: RequestContext) {
    const body = recipeScaleSchema.parse(rawBody ?? {});
    const recipe = await recipeRepository.findById(id, context.tenantId);
    if (!recipe) {
      return null;
    }

    const baseYield = Number(recipe.yieldQtyBase ?? '0');
    const scaleFactor = body.targetYieldQty && baseYield > 0
      ? body.targetYieldQty / baseYield
      : body.scaleFactor ?? 1;

    const ingredients = await recipeRepository.listIngredients(id);
    return {
      recipeId: recipe.id,
      scaleFactor,
      originalYield: baseYield,
      scaledYield: baseYield * scaleFactor,
      scaledIngredients: ingredients.map((ingredient) => ({
        productId: ingredient.item.productId,
        quantity: Number(ingredient.item.qtyBase ?? '0') * scaleFactor,
      })),
    };
  },

  async update(id: string, rawBody: unknown, context: RequestContext) {
    const body = recipeUpdateSchema.parse(rawBody ?? {});
    const existing = await recipeRepository.findById(id, context.tenantId);
    if (!existing) {
      return null;
    }

    if (body.finishedProductId) {
      await ensureProduct(body.finishedProductId, context.tenantId);
    }

    await recipeRepository.updateRecipe(id, context.tenantId, {
      name: body.name,
      finishedProductId: body.finishedProductId,
      yieldQtyBase: body.yieldQtyBase ? body.yieldQtyBase.toString() : undefined,
      instructions: body.instructions ?? null,
      isActive: body.isActive,
    });

    return recipeRepository.findDetailedById(id, context.tenantId);
  },
};
