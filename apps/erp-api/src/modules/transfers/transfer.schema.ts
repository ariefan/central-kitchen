import { z } from 'zod';
import { docStatuses } from '@/config/schema.js';
import { successResponseSchema } from '@/modules/shared/responses.js';

export const transferStatuses = docStatuses.transfer;

export const transferItemSchema = z.object({
  productId: z.string().uuid(),
  uomId: z.string().uuid(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

export const transferCreateSchema = z.object({
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(transferItemSchema).min(1, 'At least one item is required'),
});

export const transferUpdateSchema = transferCreateSchema.partial().omit({ items: true });

export const transferSendSchema = z.object({
  id: z.string().uuid(),
});

export const transferReceiveSchema = z.object({
  items: z.array(z.object({
    transferItemId: z.string().uuid(),
    qtyReceived: z.number().nonnegative(),
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
});

export const transferQuerySchema = z.object({
  status: z.enum(transferStatuses).optional(),
  fromLocationId: z.string().uuid().optional(),
  toLocationId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const locationViewSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  code: z.string().nullable(),
}).nullable();

const transferItemResponseSchema = z.object({
  id: z.string(),
  transferId: z.string(),
  productId: z.string(),
  uomId: z.string(),
  quantity: z.string(),
  qtyReceived: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  product: z.object({
    id: z.string(),
    name: z.string().nullable(),
    sku: z.string().nullable(),
  }).nullable(),
  uom: z.object({
    id: z.string(),
    name: z.string().nullable(),
    code: z.string().nullable(),
  }).nullable(),
});

export const transferDetailSchema = z.object({
  id: z.string(),
  transferNumber: z.string(),
  fromLocationId: z.string(),
  toLocationId: z.string(),
  transferDate: z.date(),
  expectedDeliveryDate: z.date().nullable(),
  actualDeliveryDate: z.date().nullable(),
  status: z.enum(transferStatuses),
  requestedBy: z.string().nullable(),
  approvedBy: z.string().nullable(),
  sentBy: z.string().nullable(),
  receivedBy: z.string().nullable(),
  notes: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  fromLocation: locationViewSchema,
  toLocation: locationViewSchema,
  items: z.array(transferItemResponseSchema),
});

export const transferListItemSchema = transferDetailSchema.omit({ items: true });

export const transferResponseSchema = successResponseSchema(transferDetailSchema);
export const transfersResponseSchema = successResponseSchema(z.array(transferListItemSchema));

export type TransferQueryInput = z.infer<typeof transferQuerySchema>;
