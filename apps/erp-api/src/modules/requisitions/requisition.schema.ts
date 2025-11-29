import { z } from "zod";
import { docStatuses } from "@/config/schema.js";
import { successResponseSchema } from "@/modules/shared/responses.js";

export const requisitionStatuses = docStatuses.requisition;

export const requisitionItemSchema = z.object({
  productId: z.string().uuid(),
  uomId: z.string().uuid(),
  qtyRequested: z.number().positive(),
  notes: z.string().optional(),
});

export const requisitionCreateSchema = z.object({
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  requiredDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(requisitionItemSchema).min(1, "At least one item is required"),
});

export const requisitionUpdateSchema = requisitionCreateSchema
  .partial()
  .omit({ items: true });

export const requisitionQuerySchema = z.object({
  status: z.enum(requisitionStatuses).optional(),
  fromLocationId: z.string().uuid().optional(),
  toLocationId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const requisitionRejectSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

const locationViewSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    code: z.string().nullable(),
  })
  .nullable();

const requisitionItemResponseSchema = z.object({
  id: z.string(),
  requisitionId: z.string(),
  productId: z.string(),
  uomId: z.string(),
  qtyRequested: z.string(),
  qtyIssued: z.string(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  product: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      sku: z.string().nullable(),
    })
    .nullable(),
  uom: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      code: z.string().nullable(),
    })
    .nullable(),
});

export const requisitionDetailSchema = z.object({
  id: z.string(),
  reqNumber: z.string(),
  fromLocationId: z.string(),
  toLocationId: z.string(),
  status: z.enum(requisitionStatuses),
  requestedDate: z.date(),
  requiredDate: z.date().nullable(),
  issuedDate: z.date().nullable(),
  deliveredDate: z.date().nullable(),
  requestedBy: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.date().nullable(),
  transferId: z.string().nullable(),
  issueStatus: z.enum(["pending", "partial", "fully_issued"]),
  notes: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  fromLocation: locationViewSchema,
  toLocation: locationViewSchema,
  items: z.array(requisitionItemResponseSchema),
});

export const requisitionListItemSchema = requisitionDetailSchema.omit({
  items: true,
});

export const requisitionResponseSchema = successResponseSchema(
  requisitionDetailSchema
);
export const requisitionsResponseSchema = successResponseSchema(
  z.array(requisitionListItemSchema)
);

export type RequisitionQueryInput = z.infer<typeof requisitionQuerySchema>;
