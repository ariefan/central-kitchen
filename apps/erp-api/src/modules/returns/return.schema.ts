import { z } from 'zod';
import { successResponseSchema } from '@/modules/shared/responses.js';

export const returnTypes = ['customer', 'supplier'] as const;
export const returnStatuses = ['requested', 'approved', 'rejected', 'posted', 'completed'] as const;
export const referenceTypes = ['ORDER', 'PO'] as const;

export const returnOrderItemSchema = z.object({
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  uomId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const returnOrderCreateSchema = z.object({
  returnType: z.enum(returnTypes),
  referenceType: z.enum(referenceTypes).optional(),
  referenceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  reason: z.string().min(1),
  totalAmount: z.number().positive().optional(),
  notes: z.string().optional(),
  items: z.array(returnOrderItemSchema).min(1, 'At least one item is required'),
}).refine((data) => {
  if (data.returnType === 'customer' && !data.customerId) {
    return false;
  }
  if (data.returnType === 'supplier' && !data.supplierId) {
    return false;
  }
  return true;
}, {
  message: 'CustomerId is required for customer returns, SupplierId is required for supplier returns',
});

export const returnOrderUpdateSchema = z.object({
  reason: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const returnOrderQuerySchema = z.object({
  returnType: z.enum(returnTypes).optional(),
  status: z.enum(returnStatuses).optional(),
  customerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
});

export const returnOrderResponseSchema = successResponseSchema(z.any());
export const returnOrdersResponseSchema = successResponseSchema(z.array(z.any()));

export type ReturnOrderQueryInput = z.infer<typeof returnOrderQuerySchema>;
