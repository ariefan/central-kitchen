/**
 * Central Kitchen ERP Contracts Package
 *
 * Single source of truth for all API contracts across the ERP system.
 * Ensures type safety between backend (Fastify) and frontend (Next.js).
 *
 * @module @contracts/erp
 * @version 1.0.0
 *
 * @see FEATURES.md - Complete feature specifications
 * @see USER_STORIES.md - User requirements
 */

// ============================================================================
// COMMON EXPORTS
// ============================================================================

export * from './common.js';
export * from './primitives.js';
export * from './enums.js';

// ============================================================================
// AUTHENTICATION MODULE EXPORTS
// ============================================================================

export * from './auth/auth.js';

// ============================================================================
// ADMIN MODULE EXPORTS
// ============================================================================

export * from './admin/locations.js';

// ============================================================================
// PROCUREMENT MODULE EXPORTS
// ============================================================================

export * from './procurement/purchase-orders.js';
export * from './procurement/goods-receipts.js';

// ============================================================================
// INVENTORY MODULE EXPORTS
// ============================================================================

export * from './inventory/transfers.js';
export * from './inventory/requisitions.js';
export * from './inventory/inventory.js';
export * from './inventory/adjustments.js';

// ============================================================================
// PRODUCTION MODULE EXPORTS
// ============================================================================

export * from './production/recipes.js';
export * from './production/production-orders.js';
export * from './production/waste.js';

// ============================================================================
// SALES MODULE EXPORTS
// ============================================================================

export * from './sales/orders.js';
export * from './sales/pos.js';
export * from './sales/deliveries.js';
export * from './sales/returns.js';

// ============================================================================
// QUALITY MODULE EXPORTS
// ============================================================================

export * from './quality/temperature.js';
export * from './quality/alerts.js';

// ============================================================================
// CUSTOMER MODULE EXPORTS
// ============================================================================

export * from './customers/customers.js';
export * from './customers/loyalty.js';
export * from './customers/vouchers.js';

// ============================================================================
// ADMIN MODULE EXPORTS
// ============================================================================

export * from './admin/users.js';
export * from './admin/suppliers.js';
export * from './admin/products.js';
export * from './admin/uoms.js';
export * from './admin/locations.js';
export * from './admin/menus.js';
export * from './admin/pricebooks.js';
export * from './admin/categories.js';
export * from './admin/stock-counts.js';

// ============================================================================
// REPORTS MODULE EXPORTS
// ============================================================================

export * from './reports/reports.js';

// ============================================================================
// RE-EXPORT COMMON HELPERS FOR CONVENIENCE
// ============================================================================

export {
  // Response builders
  type SuccessResponse,
  type PaginatedResponse,
  type ErrorResponse,
  type DeleteResponse,

  // Query types
  type PaginationParams,
  type SortParams,
  type BaseQuery,
  type DateRangeFilter,
  type LocationFilter,

  // Common input types
  type ApprovalInput,
  type RejectionInput,
  type BaseLineItem,
  type LotTracking,
  type LotTrackingInput,

  // Relation types
  type ProductRelation,
  type LocationRelation,
  type UomRelation,
  type LotRelation,
  type UserRelation,
  type SupplierRelation,
  type CustomerRelation,
} from './common.js';

export {
  // Money & Currency
  type MoneyAmount,
  type Currency,
  type TaxRate,
  type DiscountRate,

  // Quantities
  type Quantity,
  type StockQuantity,
  type QuantityDelta,

  // Identifiers
  type UUID,
  type DocumentNumber,
  type SKU,
  type EntityCode,
  type Barcode,
  type LotNumber,

  // Dates
  type DateTimeInput,
  type DateInput,
  type TimeInput,
  type DurationMinutes,

  // Contact
  type Email,
  type Phone,
  type URL,

  // Geographic
  type Latitude,
  type Longitude,
  type PostalCode,
} from './primitives.js';

export {
  // Document status types
  type PurchaseOrderStatus,
  type GoodsReceiptStatus,
  type TransferStatus,
  type RequisitionStatus,
  type ProductionStatus,
  type CountStatus,
  type AdjustmentStatus,
  type ReturnStatus,
  type DeliveryStatus,

  // Entity types
  type LocationType,
  type ProductKind,
  type AdjustmentKind,
  type LedgerType,
  type RefType,
  type OrderChannel,
  type OrderType,
  type OrderStatus,

  // Payment & POS types
  type PaymentMethod,
  type PaymentStatus,
  type PrepStatus,
  type KitchenStation,

  // Quality types
  type AlertType,
  type AlertPriority,
  type AlertStatus,
  type QualityStatus,

  // Customer types
  type LoyaltyTier,
  type VoucherType,
  type LoyaltyTransactionType,

  // Return types
  type ReturnReason,
  type ReturnType,

  // User types
  type UserRole,

  // Status registries
  type DocStatuses,
} from './enums.js';

// ============================================================================
// VERSION INFO
// ============================================================================

export const CONTRACTS_VERSION = '1.0.0';
export const CONTRACTS_BUILD_DATE = '2025-11-20';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
  name: '@contracts/erp',
  version: CONTRACTS_VERSION,
  buildDate: CONTRACTS_BUILD_DATE,
  description: 'Type-safe API contracts for Central Kitchen ERP',
  modules: [
    'common',
    'primitives',
    'enums',
    'procurement/purchase-orders',
    'procurement/goods-receipts',
    'inventory/transfers',
    'inventory/requisitions',
    'inventory/inventory',
    'inventory/adjustments',
    'production/recipes',
    'production/production-orders',
    'production/waste',
    'sales/orders',
    'sales/pos',
    'sales/deliveries',
    'sales/returns',
    'quality/temperature',
    'quality/alerts',
    'customers/customers',
    'customers/loyalty',
    'customers/vouchers',
    'admin/users',
    'admin/suppliers',
    'admin/products',
    'admin/uoms',
    'admin/locations',
    'admin/menus',
    'admin/pricebooks',
    'admin/categories',
    'admin/stock-counts',
    'reports/reports',
  ],
} as const;
