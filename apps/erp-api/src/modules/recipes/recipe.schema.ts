import { z } from 'zod';
import { successResponseSchema } from '@/modules/shared/responses.js';

export const recipeItemSchema = z.object({
  productId: z.string().uuid(),
  qtyBase: z.number().positive(),
  notes: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const recipeCreateSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  finishedProductId: z.string().uuid(),
  yieldQtyBase: z.number().positive(),
  instructions: z.string().optional(),
  items: z.array(recipeItemSchema).min(1, 'At least one ingredient is required'),
});

export const recipeUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  finishedProductId: z.string().uuid().optional(),
  yieldQtyBase: z.number().positive().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const recipeScaleSchema = z.object({
  scaleFactor: z.number().positive().optional(),
  targetYieldQty: z.number().positive().optional(),
}).refine((data) => data.scaleFactor !== undefined || data.targetYieldQty !== undefined, {
  message: 'Either scaleFactor or targetYieldQty must be provided',
});

export const recipeQuerySchema = z.object({
  code: z.string().optional(),
  finishedProductId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});

const productSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  sku: z.string().nullable(),
}).nullable();

const ingredientDetailSchema = z.object({
  id: z.string(),
  productId: z.string(),
  qtyBase: z.string(),
  sortOrder: z.number().nullable(),
  notes: z.string().nullable(),
  product: productSummarySchema,
});

export const recipeDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  finishedProductId: z.string(),
  yieldQtyBase: z.string(),
  instructions: z.string().nullable(),
  isActive: z.boolean(),
  version: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  finishedProduct: productSummarySchema,
  ingredients: z.array(ingredientDetailSchema).optional(),
});

export const recipeResponseSchema = successResponseSchema(recipeDetailSchema);
export const recipesResponseSchema = successResponseSchema(z.array(recipeDetailSchema));

export const recipeCostResponseSchema = successResponseSchema(z.object({
  recipeId: z.string(),
  recipeName: z.string(),
  baseYieldQty: z.number(),
  scaleFactor: z.number(),
  totalCost: z.number(),
  costPerUnit: z.number(),
  ingredientCosts: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number(),
    unitCost: z.number(),
    totalCost: z.number(),
  })),
}));

export const recipeScaleResponseSchema = successResponseSchema(z.object({
  recipeId: z.string(),
  scaleFactor: z.number(),
  originalYield: z.number(),
  scaledYield: z.number(),
  scaledIngredients: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
  })),
}));

export type RecipeQueryInput = z.infer<typeof recipeQuerySchema>;
