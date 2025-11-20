/**
 * Enums and constant values for ERP system
 *
 * SINGLE SOURCE OF TRUTH: All enums are imported from the database schema
 * to ensure contracts always match the database structure.
 *
 * @module @contracts/erp/enums
 * @see apps/erp-api/src/config/schema.ts - Original definitions
 */

import { z } from 'zod';

// ============================================================================
// RE-EXPORT FROM SCHEMA (Single Source of Truth)
// ============================================================================

/**
 * Location types for multi-location operations
 *
 * @see FEATURES.md ADM-004 - Location Management
 * @see USER_STORIES.md Epic 1 - Multi-location support
 */
export const locationTypes = ["central_kitchen", "outlet", "warehouse"] as const;
export const locationTypeSchema = z.enum(locationTypes);
export type LocationType = typeof locationTypes[number];

/**
 * Product kinds for inventory classification
 *
 * @see FEATURES.md ADM-001 - Product Catalog Management
 * @see USER_STORIES.md - Product classification requirements
 */
export const productKinds = ["raw_material", "semi_finished", "finished_good", "packaging", "consumable"] as const;
export const productKindSchema = z.enum(productKinds);
export type ProductKind = typeof productKinds[number];

/**
 * Stock adjustment reasons
 *
 * @see FEATURES.md INV-003 - Stock Adjustments
 * @see USER_STORIES.md - Inventory adjustment types
 */
export const adjustmentKinds = ["damage", "expiry", "theft", "found", "correction", "waste", "spoilage"] as const;
export const adjustmentKindSchema = z.enum(adjustmentKinds);
export type AdjustmentKind = typeof adjustmentKinds[number];

/**
 * Stock ledger transaction types
 *
 * - rcv: Receipt (Goods Receipt)
 * - iss: Issue (Sales, Consumption)
 * - xfer_in: Transfer In
 * - xfer_out: Transfer Out
 * - prod_in: Production Input (Finished Goods)
 * - prod_out: Production Output (Component Consumption)
 * - adj: Adjustment
 *
 * @see FEATURES.md INV-001 - Stock Ledger
 * @see USER_STORIES.md - Inventory tracking requirements
 */
export const ledgerTypes = ["rcv", "iss", "xfer_in", "xfer_out", "prod_in", "prod_out", "adj"] as const;
export const ledgerTypeSchema = z.enum(ledgerTypes);
export type LedgerType = typeof ledgerTypes[number];

/**
 * Reference document types for ledger entries
 *
 * Links ledger entries back to source documents.
 *
 * @see FEATURES.md RPT-004 - Stock Movement Audit
 */
export const refTypes = ["PO", "GR", "REQ", "XFER", "PROD", "ADJ", "ORDER", "RET", "COUNT"] as const;
export const refTypeSchema = z.enum(refTypes);
export type RefType = typeof refTypes[number];

/**
 * Order channels for sales
 *
 * @see FEATURES.md POS-002 - POS Order Creation
 * @see FEATURES.md ORD-001 - Online Ordering
 */
export const orderChannels = ["pos", "online", "wholesale"] as const;
export const orderChannelSchema = z.enum(orderChannels);
export type OrderChannel = typeof orderChannels[number];

/**
 * Order types for sales
 *
 * @see FEATURES.md POS-002 - Order types (dine-in, takeaway, delivery)
 */
export const orderTypes = ["dine_in", "take_away", "delivery"] as const;
export const orderTypeSchema = z.enum(orderTypes);
export type OrderType = typeof orderTypes[number];

/**
 * Order statuses for POS and online orders
 *
 * Simple status model:
 * - open: Order created, not yet paid
 * - paid: Payment completed
 * - voided: Cancelled before payment
 * - refunded: Refunded after payment
 *
 * @see FEATURES.md POS-003 - Payment Processing
 * @see FEATURES.md POS-004 - Order Refunds
 */
export const orderStatuses = ["open", "paid", "voided", "refunded"] as const;
export const orderStatusSchema = z.enum(orderStatuses);
export type OrderStatus = typeof orderStatuses[number];

// ============================================================================
// DOCUMENT STATUS WORKFLOWS
// ============================================================================

/**
 * Purchase Order statuses
 *
 * Status flow:
 * draft → pending_approval → approved → sent → confirmed → partial_receipt → completed
 *
 * Alternative paths:
 * - Any stage → cancelled
 * - pending_approval → rejected
 *
 * @see FEATURES.md PROC-001 to PROC-003 - Purchase Order workflow
 * @see USER_STORIES.md Epic 2 - Procurement workflow
 */
export const purchaseOrderStatuses = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "sent",
  "confirmed",
  "partial_receipt",
  "completed",
  "cancelled",
] as const;
export const purchaseOrderStatusSchema = z.enum(purchaseOrderStatuses);
export type PurchaseOrderStatus = typeof purchaseOrderStatuses[number];

/**
 * Transfer statuses
 *
 * Status flow:
 * draft → pending_approval → approved → sent → in_transit → partial_receipt → completed
 *
 * Alternative paths:
 * - Any stage → cancelled
 * - pending_approval → rejected
 *
 * @see FEATURES.md XFER-001 - Inter-Location Stock Transfers
 * @see USER_STORIES.md Epic 4 - Stock Movement & Transfers
 */
export const transferStatuses = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "sent",
  "in_transit",
  "partial_receipt",
  "completed",
  "cancelled",
] as const;
export const transferStatusSchema = z.enum(transferStatuses);
export type TransferStatus = typeof transferStatuses[number];

/**
 * Requisition statuses
 *
 * Status flow:
 * draft → pending_approval → approved → issued → partial_delivery → completed
 *
 * Alternative paths:
 * - Any stage → cancelled
 * - pending_approval → rejected
 *
 * @see FEATURES.md XFER-002 - Stock Requisitions
 * @see USER_STORIES.md Epic 4 - Requisition workflow
 */
export const requisitionStatuses = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "issued",
  "partial_delivery",
  "completed",
  "cancelled",
] as const;
export const requisitionStatusSchema = z.enum(requisitionStatuses);
export type RequisitionStatus = typeof requisitionStatuses[number];

/**
 * Production Order statuses
 *
 * Status flow:
 * scheduled → in_progress → completed
 *
 * Alternative paths:
 * - Any stage → cancelled
 * - Any stage → on_hold (temporary pause)
 *
 * @see FEATURES.md PROD-002 - Production Orders
 * @see USER_STORIES.md Epic 5 - Production & Recipes
 */
export const productionStatuses = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
] as const;
export const productionStatusSchema = z.enum(productionStatuses);
export type ProductionStatus = typeof productionStatuses[number];

/**
 * Stock Count statuses
 *
 * Status flow:
 * draft → counting → review → posted
 *
 * @see FEATURES.md INV-004 - Physical Stock Counts
 * @see USER_STORIES.md Epic 3 - Stock count workflow
 */
export const countStatuses = ["draft", "counting", "review", "posted"] as const;
export const countStatusSchema = z.enum(countStatuses);
export type CountStatus = typeof countStatuses[number];

/**
 * Adjustment statuses
 *
 * Status flow:
 * draft → approved → posted
 *
 * @see FEATURES.md INV-003 - Stock Adjustments
 * @see USER_STORIES.md Epic 3 - Adjustment approval workflow
 */
export const adjustmentStatuses = ["draft", "approved", "posted"] as const;
export const adjustmentStatusSchema = z.enum(adjustmentStatuses);
export type AdjustmentStatus = typeof adjustmentStatuses[number];

/**
 * Return Order statuses
 *
 * Status flow:
 * requested → approved → completed
 *
 * Alternative path:
 * - requested → rejected
 *
 * @see FEATURES.md RET-001 - Supplier Returns
 * @see FEATURES.md RET-002 - Customer Returns
 * @see USER_STORIES.md Epic 8 - Returns Management
 */
export const returnStatuses = ["requested", "approved", "rejected", "completed"] as const;
export const returnStatusSchema = z.enum(returnStatuses);
export type ReturnStatus = typeof returnStatuses[number];

/**
 * Goods Receipt statuses (simple workflow)
 *
 * Status flow:
 * draft → posted
 *
 * @see FEATURES.md PROC-004 to PROC-005 - Goods Receipts
 */
export const goodsReceiptStatuses = ["draft", "posted"] as const;
export const goodsReceiptStatusSchema = z.enum(goodsReceiptStatuses);
export type GoodsReceiptStatus = typeof goodsReceiptStatuses[number];

/**
 * Delivery statuses for order fulfillment
 *
 * Status flow:
 * requested → assigned → picked_up → in_transit → delivered
 *
 * Alternative path:
 * - Any stage → failed
 *
 * @see FEATURES.md ORD-002 - Delivery Management
 * @see USER_STORIES.md Epic 7 - Order delivery workflow
 */
export const deliveryStatuses = [
  "requested",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
] as const;
export const deliveryStatusSchema = z.enum(deliveryStatuses);
export type DeliveryStatus = typeof deliveryStatuses[number];

// ============================================================================
// COMPOSITE DOCUMENT STATUSES (All document types)
// ============================================================================

/**
 * Document statuses registry
 *
 * Central registry of all document status enums.
 * Use this to access status arrays for specific document types.
 *
 * @example
 * ```typescript
 * import { docStatuses } from '@contracts/erp/enums';
 *
 * const poStatusSchema = z.enum(docStatuses.purchaseOrder);
 * ```
 */
export const docStatuses = {
  purchaseOrder: purchaseOrderStatuses,
  goodsReceipt: goodsReceiptStatuses,
  transfer: transferStatuses,
  requisition: requisitionStatuses,
  production: productionStatuses,
  count: countStatuses,
  adjustment: adjustmentStatuses,
  return: returnStatuses,
  delivery: deliveryStatuses,
} as const;

export type DocStatuses = typeof docStatuses;

// ============================================================================
// PAYMENT & POS ENUMS
// ============================================================================

/**
 * Payment methods
 *
 * @see FEATURES.md POS-003 - Payment Processing (multi-tender)
 */
export const paymentMethods = [
  "cash",
  "card",
  "mobile_payment",
  "gift_card",
  "store_credit",
  "bank_transfer",
] as const;
export const paymentMethodSchema = z.enum(paymentMethods);
export type PaymentMethod = typeof paymentMethods[number];

/**
 * Payment statuses
 *
 * @see FEATURES.md POS-003 - Payment processing workflow
 */
export const paymentStatuses = ["pending", "completed", "failed", "refunded"] as const;
export const paymentStatusSchema = z.enum(paymentStatuses);
export type PaymentStatus = typeof paymentStatuses[number];

/**
 * Kitchen prep statuses for KDS
 *
 * @see FEATURES.md POS-005 - Kitchen Display System
 */
export const prepStatuses = ["queued", "preparing", "ready"] as const;
export const prepStatusSchema = z.enum(prepStatuses);
export type PrepStatus = typeof prepStatuses[number];

/**
 * Kitchen stations
 *
 * @see FEATURES.md POS-005 - KDS station filtering
 */
export const kitchenStations = ["hot", "cold", "drinks", "grill", "fryer", "dessert"] as const;
export const kitchenStationSchema = z.enum(kitchenStations);
export type KitchenStation = typeof kitchenStations[number];

// ============================================================================
// QUALITY CONTROL ENUMS
// ============================================================================

/**
 * Alert types
 *
 * @see FEATURES.md QC-001 - Temperature Monitoring
 * @see FEATURES.md QC-002 - Expiry Management
 * @see FEATURES.md QC-003 - Low Stock Alerts
 */
export const alertTypes = ["temperature", "expiry", "low_stock", "quality"] as const;
export const alertTypeSchema = z.enum(alertTypes);
export type AlertType = typeof alertTypes[number];

/**
 * Alert priorities
 *
 * @see FEATURES.md QC-001 - Alert priority levels
 */
export const alertPriorities = ["low", "medium", "high", "critical"] as const;
export const alertPrioritySchema = z.enum(alertPriorities);
export type AlertPriority = typeof alertPriorities[number];

/**
 * Alert statuses
 *
 * Status flow:
 * active → acknowledged → resolved
 *
 * @see FEATURES.md QC-001 - Alert lifecycle
 */
export const alertStatuses = ["active", "acknowledged", "resolved"] as const;
export const alertStatusSchema = z.enum(alertStatuses);
export type AlertStatus = typeof alertStatuses[number];

/**
 * Quality check statuses
 *
 * @see FEATURES.md PROC-005 - Quality status in goods receipts
 */
export const qualityStatuses = ["passed", "failed", "pending"] as const;
export const qualityStatusSchema = z.enum(qualityStatuses);
export type QualityStatus = typeof qualityStatuses[number];

// ============================================================================
// CUSTOMER & LOYALTY ENUMS
// ============================================================================

/**
 * Loyalty tiers
 *
 * @see FEATURES.md CUS-002 - Loyalty Program
 */
export const loyaltyTiers = ["bronze", "silver", "gold", "platinum"] as const;
export const loyaltyTierSchema = z.enum(loyaltyTiers);
export type LoyaltyTier = typeof loyaltyTiers[number];

/**
 * Voucher types
 *
 * @see FEATURES.md CUS-003 - Vouchers & Promotions
 */
export const voucherTypes = ["percentage_off", "fixed_amount", "gift_card", "free_item"] as const;
export const voucherTypeSchema = z.enum(voucherTypes);
export type VoucherType = typeof voucherTypes[number];

/**
 * Transaction types for loyalty ledger
 *
 * @see FEATURES.md CUS-002 - Loyalty points tracking
 */
export const loyaltyTransactionTypes = [
  "earned",
  "redeemed",
  "expired",
  "adjusted",
  "bonus",
  "refunded",
] as const;
export const loyaltyTransactionTypeSchema = z.enum(loyaltyTransactionTypes);
export type LoyaltyTransactionType = typeof loyaltyTransactionTypes[number];

// ============================================================================
// RETURN REASON ENUMS
// ============================================================================

/**
 * Return reasons for customer and supplier returns
 *
 * @see FEATURES.md RET-001 - Supplier Returns
 * @see FEATURES.md RET-002 - Customer Returns
 */
export const returnReasons = [
  "damaged",
  "expired",
  "wrong_item",
  "excess",
  "defective",
  "changed_mind",
  "quality_issue",
] as const;
export const returnReasonSchema = z.enum(returnReasons);
export type ReturnReason = typeof returnReasons[number];

/**
 * Return types
 *
 * @see FEATURES.md RET-001, RET-002
 */
export const returnTypes = ["supplier_return", "customer_return"] as const;
export const returnTypeSchema = z.enum(returnTypes);
export type ReturnType = typeof returnTypes[number];

// ============================================================================
// USER ROLES
// ============================================================================

/**
 * User roles for RBAC
 *
 * @see FEATURES.md AUTH-001 - Role-based access control
 */
export const userRoles = [
  "admin",
  "manager",
  "cashier",
  "staff",
  "kitchen_staff",
  "warehouse_staff",
  "driver",
] as const;
export const userRoleSchema = z.enum(userRoles);
export type UserRole = typeof userRoles[number];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get valid status transitions for a document type
 *
 * Business rules for status transitions are enforced at the API layer.
 *
 * @param docType - Document type
 * @param currentStatus - Current status
 * @returns Array of valid next statuses
 *
 * @example
 * ```typescript
 * const validTransitions = getValidStatusTransitions('purchaseOrder', 'draft');
 * // Returns: ['pending_approval', 'cancelled']
 * ```
 */
export function getValidStatusTransitions(
  docType: keyof DocStatuses,
  currentStatus: string
): readonly string[] {
  // Status transition rules by document type
  const transitions: Record<keyof DocStatuses, Record<string, readonly string[]>> = {
    purchaseOrder: {
      draft: ['pending_approval', 'cancelled'],
      pending_approval: ['approved', 'rejected', 'cancelled'],
      approved: ['sent', 'cancelled'],
      sent: ['confirmed', 'cancelled'],
      confirmed: ['partial_receipt', 'completed', 'cancelled'],
      partial_receipt: ['completed', 'cancelled'],
    },
    goodsReceipt: {
      draft: ['posted'],
    },
    transfer: {
      draft: ['pending_approval', 'cancelled'],
      pending_approval: ['approved', 'rejected', 'cancelled'],
      approved: ['sent', 'cancelled'],
      sent: ['in_transit', 'cancelled'],
      in_transit: ['partial_receipt', 'completed', 'cancelled'],
      partial_receipt: ['completed', 'cancelled'],
    },
    requisition: {
      draft: ['pending_approval', 'cancelled'],
      pending_approval: ['approved', 'rejected', 'cancelled'],
      approved: ['issued', 'cancelled'],
      issued: ['partial_delivery', 'completed', 'cancelled'],
      partial_delivery: ['completed', 'cancelled'],
    },
    production: {
      scheduled: ['in_progress', 'on_hold', 'cancelled'],
      on_hold: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'on_hold', 'cancelled'],
    },
    count: {
      draft: ['counting'],
      counting: ['review'],
      review: ['posted', 'counting'], // Can go back to counting if errors
    },
    adjustment: {
      draft: ['approved'],
      approved: ['posted'],
    },
    return: {
      requested: ['approved', 'rejected'],
      approved: ['completed'],
    },
    delivery: {
      requested: ['assigned', 'failed'],
      assigned: ['picked_up', 'failed'],
      picked_up: ['in_transit', 'failed'],
      in_transit: ['delivered', 'failed'],
    },
  };

  return transitions[docType]?.[currentStatus] || [];
}

/**
 * Check if a status transition is valid
 *
 * @param docType - Document type
 * @param currentStatus - Current status
 * @param nextStatus - Proposed next status
 * @returns True if transition is allowed
 */
export function isValidStatusTransition(
  docType: keyof DocStatuses,
  currentStatus: string,
  nextStatus: string
): boolean {
  const validTransitions = getValidStatusTransitions(docType, currentStatus);
  return validTransitions.includes(nextStatus);
}
