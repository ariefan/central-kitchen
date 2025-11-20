import { z } from 'zod';
import { successResponseSchema } from '@/modules/shared/responses.js';

export const productionStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'] as const;

export const productionOrderQuerySchema = z.object({
  status: z.enum(productionStatuses).optional(),
  recipeId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const productionOrderCreateSchema = z.object({
  recipeId: z.string().uuid(),
  locationId: z.string().uuid(),
  plannedQtyBase: z.number().positive(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

export const productionOrderUpdateSchema = z.object({
  plannedQtyBase: z.number().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  status: z.enum(productionStatuses).optional(),
});

export const productionOrderExecuteSchema = z.object({
  actualQtyBase: z.number().positive(),
  notes: z.string().optional(),
});

const recipeSummarySchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string().nullable(),
  instructions: z.string().nullable(),
  yieldQtyBase: z.string().nullable(),
}).nullable();

const locationSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  code: z.string().nullable(),
}).nullable();

const productSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  sku: z.string().nullable(),
}).nullable();

const ingredientSchema = z.object({
  id: z.string(),
  productId: z.string(),
  qtyBase: z.string(),
  sortOrder: z.number().nullable(),
  requiredQty: z.number().optional(),
  product: productSummarySchema,
});

export const productionOrderDetailSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  recipeId: z.string(),
  locationId: z.string(),
  status: z.enum(productionStatuses),
  plannedQtyBase: z.string().nullable(),
  producedQtyBase: z.string().nullable(),
  scheduledAt: z.date().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  recipe: recipeSummarySchema,
  location: locationSummarySchema,
  finishedProduct: productSummarySchema,
  ingredients: z.array(ingredientSchema).optional(),
  scaleFactor: z.number().optional(),
});

export const productionOrderListItemSchema = productionOrderDetailSchema.omit({
  ingredients: true,
  scaleFactor: true,
});

export const productionOrderResponseSchema = successResponseSchema(productionOrderDetailSchema);
export const productionOrdersResponseSchema = successResponseSchema(z.array(productionOrderListItemSchema));

export type ProductionOrderQueryInput = z.infer<typeof productionOrderQuerySchema>;
