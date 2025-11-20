import { z } from "zod";
import { orderDetailSchema } from "@contracts/erp";
import { successResponseSchema } from "@/modules/shared/responses.js";
import { createPaginatedResponseSchema } from "@/shared/utils/schemas.js";
export {
  baseQuerySchema,
  kitchenStatusUpdateSchema,
  orderCreateSchema,
  orderItemInputSchema,
  orderQuerySchema,
  orderDetailSchema,
  orderUpdateSchema,
  orderPaymentSchema,
  prepStatusUpdateSchema,
} from "@contracts/erp";

export const orderResponseSchema = successResponseSchema(orderDetailSchema);
export const ordersResponseSchema = createPaginatedResponseSchema(orderDetailSchema);

export const paymentResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    orderId: z.string(),
    tender: z.string(),
    amount: z.string(),
    reference: z.string().nullable().optional(),
    change: z.string(),
    paidAt: z.date(),
  }),
  message: z.string(),
});

export const paymentsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  message: z.string(),
});
