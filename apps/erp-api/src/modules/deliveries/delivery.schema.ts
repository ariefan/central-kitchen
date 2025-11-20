import { z } from 'zod';
import { successResponseSchema } from '@/modules/shared/responses.js';

export const deliveryStatuses = ['requested', 'assigned', 'picked_up', 'delivered', 'failed'] as const;

const customerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
}).nullable();

const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  status: z.string().nullable(),
  totalAmount: z.string().nullable(),
}).nullable();

export const deliveryQuerySchema = z.object({
  status: z.enum(deliveryStatuses).optional(),
  provider: z.string().max(64).optional(),
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const deliveryCreateSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.string().max(64).optional(),
  trackingCode: z.string().max(128).optional(),
  fee: z.number().min(0).default(0),
});

export const deliveryUpdateSchema = z.object({
  status: z.enum(deliveryStatuses).optional(),
  provider: z.string().max(64).optional(),
  trackingCode: z.string().max(128).optional(),
  fee: z.number().min(0).optional(),
});

export const addressQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
});

export const addressCreateSchema = z.object({
  customerId: z.string().uuid(),
  label: z.string().max(64).optional(),
  line1: z.string().max(255),
  line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  lat: z.string().optional(),
  lon: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const deliveryDetailSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  provider: z.string().nullable(),
  trackingCode: z.string().nullable(),
  fee: z.string().nullable(),
  status: z.enum(deliveryStatuses),
  updatedAt: z.date().optional(),
  order: orderSchema,
  customer: customerSchema,
});

export const addressSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  label: z.string().nullable(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  lat: z.string().nullable(),
  lon: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.date(),
  customer: customerSchema,
});

export const deliveryResponseSchema = successResponseSchema(deliveryDetailSchema);
export const deliveriesResponseSchema = successResponseSchema(z.array(deliveryDetailSchema));
export const addressResponseSchema = successResponseSchema(addressSchema);
export const addressesResponseSchema = successResponseSchema(z.array(addressSchema));

export type DeliveryQueryInput = z.infer<typeof deliveryQuerySchema>;
export type AddressQueryInput = z.infer<typeof addressQuerySchema>;
