/**
 * Common reusable schemas and patterns for ERP API contracts
 *
 * This module provides shared validation schemas used across all ERP modules,
 * ensuring consistency in pagination, sorting, filtering, and response formats.
 *
 * @module @contracts/erp/common
 */

import { z } from 'zod';

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Standard pagination parameters
 *
 * @property limit - Number of items per page (default: 20, max: 1000)
 * @property offset - Number of items to skip (default: 0)
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Pagination metadata included in responses
 */
export const paginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  currentPage: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// ============================================================================
// SORTING
// ============================================================================

/**
 * Standard sorting parameters
 *
 * @property sortBy - Field name to sort by
 * @property sortOrder - Sort direction (asc/desc, default: desc)
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type SortParams = z.infer<typeof sortSchema>;

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Standard search parameter
 *
 * @property search - Free text search query (min 1 char, max 100)
 */
export const searchSchema = z.object({
  search: z.string().min(1).max(100).optional(),
});

export type SearchParams = z.infer<typeof searchSchema>;

// ============================================================================
// BASE QUERY
// ============================================================================

/**
 * Base query schema combining pagination, sorting, and search
 *
 * Use this as the foundation for all list/query endpoints:
 * ```typescript
 * const myQuerySchema = baseQuerySchema.merge(z.object({
 *   status: z.enum(['active', 'inactive']).optional(),
 * }));
 * ```
 */
export const baseQuerySchema = paginationSchema
  .merge(sortSchema)
  .merge(searchSchema);

export type BaseQuery = z.infer<typeof baseQuerySchema>;

// ============================================================================
// COMMON FILTERS
// ============================================================================

/**
 * Date range filter for querying by date
 *
 * @property dateFrom - Start date (ISO 8601 datetime)
 * @property dateTo - End date (ISO 8601 datetime)
 */
export const dateRangeFilterSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * Location filter for multi-location queries
 *
 * @property locationId - UUID of the location
 */
export const locationFilterSchema = z.object({
  locationId: z.string().uuid().optional(),
});

/**
 * Status filter factory for documents with status enums
 *
 * @param statuses - Tuple of allowed status values
 * @returns Zod object schema with optional status field
 *
 * @example
 * ```typescript
 * const poStatusFilter = statusFilterSchema(['draft', 'approved', 'sent'] as const);
 * ```
 */
export const statusFilterSchema = <T extends readonly [string, ...string[]]>(
  statuses: T
) =>
  z.object({
    status: z.enum(statuses).optional(),
  });

export type DateRangeFilter = z.infer<typeof dateRangeFilterSchema>;
export type LocationFilter = z.infer<typeof locationFilterSchema>;

// ============================================================================
// API RESPONSES
// ============================================================================

/**
 * Standard success response wrapper
 *
 * All successful API responses use this format for consistency.
 *
 * @template T - Type of the data payload
 *
 * @example
 * ```typescript
 * const productResponseSchema = successResponseSchema(productSchema);
 * // Result: { success: true, data: Product, message: string }
 * ```
 */
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string(),
    timestamp: z.string().datetime().optional(),
  });

/**
 * Paginated response wrapper
 *
 * Used for list endpoints with pagination support.
 *
 * @template T - Type of the items in the array
 *
 * @example
 * ```typescript
 * const productsResponseSchema = paginatedResponseSchema(productSchema);
 * // Result: { success: true, data: { items: Product[], pagination: {...} }, message: string }
 * ```
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  successResponseSchema(
    z.object({
      items: z.array(itemSchema),
      pagination: paginationMetaSchema,
    })
  );

/**
 * Error response schema
 *
 * All error responses use this format for consistency.
 *
 * @example
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Invalid input data",
 *     "details": { "field": "quantity", "issue": "must be positive" }
 *   },
 *   "timestamp": "2025-01-18T10:30:00Z"
 * }
 * ```
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'CONFLICT',
      'INTERNAL_ERROR',
      'BUSINESS_RULE_VIOLATION',
      'INSUFFICIENT_STOCK',
      'INVALID_STATUS_TRANSITION',
    ]),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  timestamp: z.string().datetime(),
});

/**
 * Simple delete/void response
 */
export const deleteResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export type SuccessResponse<T> = {
  success: true;
  data: T;
  message: string;
  timestamp?: string;
};

export type PaginatedResponse<T> = {
  success: true;
  data: {
    items: T[];
    pagination: PaginationMeta;
  };
  message: string;
};

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type DeleteResponse = z.infer<typeof deleteResponseSchema>;

// ============================================================================
// APPROVAL WORKFLOWS
// ============================================================================

/**
 * Standard approval schema for documents requiring approval
 *
 * Used by: Purchase Orders, Transfers, Adjustments, Returns, etc.
 *
 * @see FEATURES.md - All approval workflows
 */
export const approvalSchema = z.object({
  approvalNotes: z.string().max(1000).optional(),
});

/**
 * Standard rejection schema for documents
 *
 * @property rejectionReason - Required explanation for rejection
 */
export const rejectionSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(1000),
});

export type ApprovalInput = z.infer<typeof approvalSchema>;
export type RejectionInput = z.infer<typeof rejectionSchema>;

// ============================================================================
// DOCUMENT LINE ITEMS
// ============================================================================

/**
 * Base schema for document line items (PO, Transfer, Order, etc.)
 *
 * Common fields across all line item types. Extend this for specific documents.
 *
 * @see USER_STORIES.md - Purchase Orders, Transfers, Orders
 * @see FEATURES.md PROC-001, XFER-001, POS-002
 *
 * @example
 * ```typescript
 * const purchaseOrderItemSchema = baseLineItemSchema.extend({
 *   unitPrice: z.number().nonnegative(),
 *   discount: z.number().nonnegative().default(0),
 * });
 * ```
 */
export const baseLineItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
  uomId: z.string().uuid('Invalid UOM ID'),
  notes: z.string().max(500).optional(),
});

export type BaseLineItem = z.infer<typeof baseLineItemSchema>;

// ============================================================================
// LOT TRACKING
// ============================================================================

/**
 * Lot tracking fields for perishable products
 *
 * CRITICAL: Required for all perishable products per FEATURES.md
 *
 * @see FEATURES.md PROC-005 - Lot tracking requirement
 * @see FEATURES.md INV-002 - FEFO picking
 *
 * @property lotId - UUID reference to existing lot (for shipment/consumption)
 * @property lotNumber - Lot/batch number (for receipt/creation)
 * @property expiryDate - Product expiry date (REQUIRED for perishables)
 * @property manufactureDate - Product manufacture date
 */
export const lotTrackingSchema = z.object({
  lotId: z.string().uuid().optional(),
  lotNumber: z.string().min(1).max(100).optional(),
  expiryDate: z.string().datetime().optional(),
  manufactureDate: z.string().datetime().optional(),
});

/**
 * Lot tracking input for goods receipts
 *
 * Validation rule: If product.isPerishable = true, lotNumber and expiryDate are REQUIRED
 */
export const lotTrackingInputSchema = z.object({
  lotNumber: z.string().min(1).max(100),
  expiryDate: z.string().datetime(),
  manufactureDate: z.string().datetime().optional(),
});

export type LotTracking = z.infer<typeof lotTrackingSchema>;
export type LotTrackingInput = z.infer<typeof lotTrackingInputSchema>;

// ============================================================================
// USER ATTRIBUTION
// ============================================================================

/**
 * User attribution fields for audit trail
 *
 * All documents track who created/modified them.
 *
 * @property createdBy - UUID of user who created the document
 * @property createdAt - Timestamp when created
 * @property updatedBy - UUID of user who last updated (nullable)
 * @property updatedAt - Timestamp when last updated
 */
export const userAttributionSchema = z.object({
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedBy: z.string().uuid().nullable(),
  updatedAt: z.date(),
});

/**
 * Extended attribution for workflow documents
 *
 * Tracks all actors in document lifecycle.
 */
export const workflowAttributionSchema = userAttributionSchema.extend({
  submittedBy: z.string().uuid().nullable(),
  submittedAt: z.date().nullable(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.date().nullable(),
  rejectedBy: z.string().uuid().nullable(),
  rejectedAt: z.date().nullable(),
  completedBy: z.string().uuid().nullable(),
  completedAt: z.date().nullable(),
  cancelledBy: z.string().uuid().nullable(),
  cancelledAt: z.date().nullable(),
});

export type UserAttribution = z.infer<typeof userAttributionSchema>;
export type WorkflowAttribution = z.infer<typeof workflowAttributionSchema>;

// ============================================================================
// DOCUMENT HEADER BASE
// ============================================================================

/**
 * Base schema for all documents (PO, Transfer, Order, etc.)
 *
 * Common fields across all document types.
 *
 * @property id - UUID primary key
 * @property tenantId - Multi-tenant isolation
 * @property documentNumber - Auto-generated doc number (e.g., PO-202501-00001)
 * @property locationId - Primary location for the document
 * @property notes - Optional notes/remarks
 * @property metadata - Additional JSON data
 */
export const baseDocumentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  documentNumber: z.string(),
  locationId: z.string().uuid(),
  notes: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BaseDocument = z.infer<typeof baseDocumentSchema>;

// ============================================================================
// VARIANCE TRACKING
// ============================================================================

/**
 * Variance tracking for quantity discrepancies
 *
 * Used in: Goods Receipts, Transfers, Stock Counts
 *
 * @property orderedQty - Original requested/ordered quantity
 * @property actualQty - Actual received/counted quantity
 * @property varianceQty - Difference (actual - ordered)
 * @property variancePct - Percentage variance
 * @property varianceNotes - Explanation for variance
 */
export const varianceTrackingSchema = z.object({
  orderedQty: z.string().optional(), // Numeric as string from DB
  actualQty: z.string(),
  varianceQty: z.string().optional(), // Calculated
  variancePct: z.string().optional(), // Calculated percentage
  varianceNotes: z.string().max(500).optional(),
});

export type VarianceTracking = z.infer<typeof varianceTrackingSchema>;

// ============================================================================
// RELATION OBJECTS
// ============================================================================

/**
 * Minimal product relation for nested objects
 */
export const productRelationSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().nullable(),
  name: z.string().nullable(),
  kind: z.string().optional(),
  isPerishable: z.boolean().optional(),
});

/**
 * Minimal location relation for nested objects
 */
export const locationRelationSchema = z.object({
  id: z.string().uuid(),
  code: z.string().nullable(),
  name: z.string().nullable(),
  locationType: z.string().optional(),
});

/**
 * Minimal UOM relation for nested objects
 */
export const uomRelationSchema = z.object({
  id: z.string().uuid(),
  code: z.string().nullable(),
  name: z.string().nullable(),
});

/**
 * Minimal lot relation for nested objects
 */
export const lotRelationSchema = z.object({
  id: z.string().uuid(),
  lotNo: z.string().nullable(),
  expiryDate: z.date().nullable(),
});

/**
 * Minimal user relation for nested objects
 */
export const userRelationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

/**
 * Minimal supplier relation for nested objects
 */
export const supplierRelationSchema = z.object({
  id: z.string().uuid(),
  code: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

/**
 * Minimal customer relation for nested objects
 */
export const customerRelationSchema = z.object({
  id: z.string().uuid(),
  code: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export type ProductRelation = z.infer<typeof productRelationSchema>;
export type LocationRelation = z.infer<typeof locationRelationSchema>;
export type UomRelation = z.infer<typeof uomRelationSchema>;
export type LotRelation = z.infer<typeof lotRelationSchema>;
export type UserRelation = z.infer<typeof userRelationSchema>;
export type SupplierRelation = z.infer<typeof supplierRelationSchema>;
export type CustomerRelation = z.infer<typeof customerRelationSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a paginated response schema for a specific item type
 *
 * @template T - The Zod schema for the item type
 * @param itemSchema - Zod schema to wrap
 * @returns Paginated response schema
 *
 * @example
 * ```typescript
 * const productsResponse = createPaginatedResponseSchema(productSchema);
 * ```
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T
) {
  return paginatedResponseSchema(itemSchema);
}

/**
 * Create a success response schema for a specific data type
 *
 * @template T - The Zod schema for the data type
 * @param dataSchema - Zod schema to wrap
 * @returns Success response schema
 *
 * @example
 * ```typescript
 * const productResponse = createSuccessResponseSchema(productSchema);
 * ```
 */
export function createSuccessResponseSchema<T extends z.ZodTypeAny>(
  dataSchema: T
) {
  return successResponseSchema(dataSchema);
}
