import { z } from 'zod';
import { baseQuerySchema, createPaginatedResponseSchema } from '../../shared/utils/schemas.js';
import { successResponseSchema } from '../../shared/utils/responses.js';

export const goodsReceiptItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

export const goodsReceiptCreateSchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  receiptDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(goodsReceiptItemSchema).min(1, 'At least one item is required'),
});

export const goodsReceiptUpdateSchema = goodsReceiptCreateSchema
  .omit({ items: true, purchaseOrderId: true })
  .partial();

export const goodsReceiptQuerySchema = baseQuerySchema.merge(z.object({
  locationId: z.string().uuid().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}));

export const goodsReceiptSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  receiptNumber: z.string(),
  purchaseOrderId: z.string().uuid().nullable(),
  locationId: z.string().uuid(),
  receiptDate: z.date().nullable(),
  receivedBy: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.unknown().nullable(),
});

export const goodsReceiptItemDetailSchema = z.object({
  id: z.string().uuid().optional(),
  goodsReceiptId: z.string().uuid(),
  purchaseOrderItemId: z.string().uuid(),
  productId: z.string().uuid(),
  uomId: z.string().uuid(),
  unitCost: z.string(),
  quantityOrdered: z.string(),
  quantityReceived: z.string(),
  notes: z.string().nullable(),
});

export const goodsReceiptWithItemsSchema = goodsReceiptSchema.extend({
  items: z.array(z.unknown()).optional(),
});

export const goodsReceiptResponseSchema = successResponseSchema(goodsReceiptWithItemsSchema);
export const goodsReceiptsResponseSchema = createPaginatedResponseSchema(goodsReceiptSchema);
