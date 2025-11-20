import { z } from 'zod';
import { docStatuses } from '../../config/schema.js';
import { baseQuerySchema, createPaginatedResponseSchema } from '../../shared/utils/schemas.js';
import { successResponseSchema } from '../../shared/utils/responses.js';

export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  uomId: z.string().uuid(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().default(0),
  taxRate: z.number().nonnegative().optional().default(0),
  notes: z.string().optional(),
});

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().uuid(),
  locationId: z.string().uuid(),
  expectedDeliveryDate: z.string().datetime().optional(),
  paymentTerms: z.number().positive().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

export const purchaseOrderUpdateSchema = purchaseOrderCreateSchema.partial().omit({ items: true });

const purchaseOrderFiltersSchema = z.object({
  status: z.enum(docStatuses.purchaseOrder).optional(),
  supplierId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

export const purchaseOrderQuerySchema = baseQuerySchema.merge(purchaseOrderFiltersSchema);

export const purchaseOrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderNumber: z.string(),
  supplierId: z.string().uuid(),
  locationId: z.string().uuid(),
  orderDate: z.date(),
  expectedDeliveryDate: z.date().nullable(),
  actualDeliveryDate: z.date().nullable(),
  status: z.string(),
  subtotal: z.string(),
  taxAmount: z.string(),
  shippingCost: z.string(),
  discount: z.string(),
  totalAmount: z.string(),
  paymentTerms: z.number().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.date().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const purchaseOrderWithItemsSchema = purchaseOrderSchema.extend({
  items: z.array(z.any()),
});

export const purchaseOrderResponseSchema = successResponseSchema(purchaseOrderSchema);
export const purchaseOrderWithItemsResponseSchema = successResponseSchema(purchaseOrderWithItemsSchema);
export const purchaseOrdersResponseSchema = createPaginatedResponseSchema(purchaseOrderSchema);
