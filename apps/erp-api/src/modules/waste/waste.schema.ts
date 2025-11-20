import { z } from 'zod';
import { successResponseSchema } from '../../shared/utils/responses.js';

export const wasteReasons = ['damage', 'expiry', 'spoilage', 'waste'] as const;
export const wasteStatuses = ['draft', 'approved', 'posted'] as const;

export const wasteRecordSchema = z.object({
  locationId: z.string().uuid(),
  reason: z.enum(wasteReasons),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    lotId: z.string().uuid().optional(),
    uomId: z.string().uuid(),
    quantity: z.number().positive(),
    unitCost: z.number().optional(),
    estimatedValue: z.number().optional(),
    reason: z.string().optional(),
  })).min(1, 'At least one item is required'),
});

export const wasteAnalysisSchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  reason: z.enum(wasteReasons).optional(),
});

export const wasteQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  reason: z.enum(wasteReasons).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  status: z.enum(wasteStatuses).optional(),
});

export const wasteResponseSchema = successResponseSchema(z.any());
export const wasteListResponseSchema = successResponseSchema(z.array(z.any()));
