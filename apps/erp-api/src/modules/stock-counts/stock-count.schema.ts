import { z } from 'zod';
import { successResponseSchema } from '@/modules/shared/responses.js';

export const stockCountStatuses = ['draft', 'review', 'posted'] as const;

export const stockCountQuerySchema = z.object({
  status: z.enum(stockCountStatuses).optional(),
  locationId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

export const stockCountCreateSchema = z.object({
  locationId: z.string().uuid(),
  notes: z.string().optional(),
});

export const stockCountUpdateSchema = stockCountCreateSchema.partial();

export const stockCountLineCreateSchema = z.object({
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  countedQtyBase: z.number(),
});

export const stockCountLineUpdateSchema = z.object({
  countedQtyBase: z.number(),
});

const productViewSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  sku: z.string().nullable(),
}).nullable();

const lotViewSchema = z.object({
  id: z.string(),
  lotNo: z.string().nullable(),
  expiryDate: z.date().nullable(),
}).nullable();

export const stockCountLineSchema = z.object({
  id: z.string(),
  countId: z.string(),
  productId: z.string(),
  lotId: z.string().nullable(),
  systemQtyBase: z.string(),
  countedQtyBase: z.string(),
  varianceQtyBase: z.string(),
  createdAt: z.date(),
  product: productViewSchema,
  lot: lotViewSchema,
});

const locationViewSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  code: z.string().nullable(),
}).nullable();

export const stockCountDetailSchema = z.object({
  id: z.string(),
  countNumber: z.string(),
  locationId: z.string(),
  status: z.enum(stockCountStatuses),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  location: locationViewSchema,
  lines: z.array(stockCountLineSchema).optional(),
});

export const stockCountListItemSchema = z.object({
  id: z.string(),
  countNumber: z.string(),
  locationId: z.string(),
  status: z.enum(stockCountStatuses),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  location: locationViewSchema,
  lineCount: z.number().nonnegative(),
  totalVariance: z.string(),
});

export const stockCountResponseSchema = successResponseSchema(stockCountDetailSchema);
export const stockCountsResponseSchema = successResponseSchema(z.object({
  items: z.array(stockCountListItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
}));
export const stockCountLinesResponseSchema = successResponseSchema(z.array(stockCountLineSchema));
export const stockCountLineResponseSchema = successResponseSchema(stockCountLineSchema);

export type StockCountQueryInput = z.infer<typeof stockCountQuerySchema>;
