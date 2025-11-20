/**
 * Reporting & Analytics Contracts
 *
 * Covers all 8 reporting user stories (US-RPT-001 to US-RPT-008)
 *
 * @see USER_STORIES.md - Epic: Reporting & Analytics
 * @see FEATURES.md - Feature sections RPT-001 to RPT-008
 *
 * @module reports/reports
 */

import { z } from 'zod';
import {
  paginationSchema,
  type PaginatedResponse,
  type SuccessResponse,
  dateRangeFilterSchema,
  locationFilterSchema,
} from '../common.js';
import type { MoneyAmount, DateInput } from '../primitives.js';

// ============================================================================
// COMMON REPORT FILTERS
// ============================================================================

/**
 * Base report query parameters
 * All reports support date range and location filtering
 *
 * @see USER_STORIES.md - All reporting user stories require date range
 */
export const baseReportQuerySchema = z
  .object({
    startDate: z.string().datetime().optional().describe('Report start date (ISO 8601)'),
    endDate: z.string().datetime().optional().describe('Report end date (ISO 8601)'),
    locationId: z.string().uuid().optional().describe('Filter by location'),
  })
  .describe('Base query parameters for all reports');

export type BaseReportQuery = z.infer<typeof baseReportQuerySchema>;

// ============================================================================
// US-RPT-001: DAILY SALES REPORT
// ============================================================================

/**
 * Daily Sales Report Query
 *
 * @see USER_STORIES.md - US-RPT-001: Daily Sales Report
 * @see FEATURES.md - RPT-001: Operational Reports
 */
export const dailySalesReportQuerySchema = baseReportQuerySchema.extend({
  reportDate: z
    .string()
    .datetime()
    .optional()
    .describe('Specific date for report (defaults to today)'),
  compareWith: z
    .enum(['previous_day', 'previous_week', 'previous_month', 'none'])
    .optional()
    .default('previous_day')
    .describe('Comparison period'),
});

export type DailySalesReportQuery = z.infer<typeof dailySalesReportQuerySchema>;

/**
 * Sales breakdown by payment method
 */
export const paymentMethodBreakdownSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'mobile_payment', 'gift_card', 'store_credit']),
  totalAmount: z.number().nonnegative().describe('Total sales for this payment method'),
  transactionCount: z.number().int().nonnegative().describe('Number of transactions'),
  averageValue: z.number().nonnegative().describe('Average transaction value'),
});

export type PaymentMethodBreakdown = z.infer<typeof paymentMethodBreakdownSchema>;

/**
 * Sales breakdown by order type
 */
export const orderTypeBreakdownSchema = z.object({
  orderType: z.enum(['dine_in', 'take_away', 'delivery']),
  totalAmount: z.number().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  averageOrderValue: z.number().nonnegative(),
});

export type OrderTypeBreakdown = z.infer<typeof orderTypeBreakdownSchema>;

/**
 * Sales breakdown by channel
 */
export const channelBreakdownSchema = z.object({
  channel: z.enum(['pos', 'online', 'mobile_app']),
  totalAmount: z.number().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  averageOrderValue: z.number().nonnegative(),
});

export type ChannelBreakdown = z.infer<typeof channelBreakdownSchema>;

/**
 * Hourly sales data point
 */
export const hourlySalesSchema = z.object({
  hour: z.number().int().min(0).max(23).describe('Hour of day (0-23)'),
  totalAmount: z.number().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  averageOrderValue: z.number().nonnegative(),
});

export type HourlySales = z.infer<typeof hourlySalesSchema>;

/**
 * Top selling product
 */
export const topProductSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  quantitySold: z.number().nonnegative(),
  totalRevenue: z.number().nonnegative(),
  rank: z.number().int().positive(),
});

export type TopProduct = z.infer<typeof topProductSchema>;

/**
 * Daily Sales Report Response
 *
 * @see USER_STORIES.md - US-RPT-001: Daily Sales Report
 */
export const dailySalesReportSchema = z.object({
  reportDate: z.string().datetime(),
  locationId: z.string().uuid().optional(),
  locationName: z.string().optional(),

  // Overall metrics
  totalSales: z.number().nonnegative().describe('Total sales amount'),
  totalOrders: z.number().int().nonnegative().describe('Number of orders'),
  averageOrderValue: z.number().nonnegative().describe('Average order value'),
  totalTax: z.number().nonnegative().describe('Total tax collected'),
  totalDiscounts: z.number().nonnegative().describe('Total discounts given'),
  netSales: z.number().nonnegative().describe('Net sales (after discounts)'),

  // Breakdowns
  paymentMethods: z.array(paymentMethodBreakdownSchema),
  orderTypes: z.array(orderTypeBreakdownSchema),
  channels: z.array(channelBreakdownSchema),
  hourlySales: z.array(hourlySalesSchema),
  topProducts: z.array(topProductSchema).max(10).describe('Top 10 products'),

  // Comparison (if enabled)
  comparison: z
    .object({
      period: z.string().describe('Comparison period description'),
      salesChange: z.number().describe('Sales change %'),
      ordersChange: z.number().describe('Orders change %'),
      aovChange: z.number().describe('AOV change %'),
    })
    .optional(),
});

export type DailySalesReport = z.infer<typeof dailySalesReportSchema>;
export type DailySalesReportResponse = SuccessResponse<DailySalesReport>;

// ============================================================================
// US-RPT-002: INVENTORY VALUATION REPORT
// ============================================================================

/**
 * Inventory Valuation Report Query
 *
 * @see USER_STORIES.md - US-RPT-002: Inventory Valuation Report
 */
export const inventoryValuationReportQuerySchema = baseReportQuerySchema.extend({
  categoryId: z.string().uuid().optional().describe('Filter by product category'),
  productKind: z
    .enum(['raw_material', 'semi_finished', 'finished_good', 'packaging', 'consumable'])
    .optional()
    .describe('Filter by product kind'),
  includeZeroStock: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include products with zero on-hand'),
});

export type InventoryValuationReportQuery = z.infer<typeof inventoryValuationReportQuerySchema>;

/**
 * Product inventory valuation line
 */
export const inventoryValuationLineSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  categoryName: z.string().optional(),
  productKind: z.enum(['raw_material', 'semi_finished', 'finished_good', 'packaging', 'consumable']),

  quantityOnHand: z.number().nonnegative().describe('Current on-hand quantity'),
  uomCode: z.string().describe('Unit of measure'),

  unitCost: z.number().nonnegative().describe('Unit cost (average or FIFO)'),
  extendedValue: z.number().nonnegative().describe('Extended value (qty × cost)'),

  lastReceiptDate: z.string().datetime().optional().describe('Last goods receipt date'),
  lastIssueDate: z.string().datetime().optional().describe('Last issue date'),
  daysInStock: z.number().int().nonnegative().optional().describe('Days since last receipt'),
  turnoverRate: z.number().nonnegative().optional().describe('Annual turnover rate'),
  isSlowMoving: z.boolean().describe('Flagged as slow-moving stock'),
});

export type InventoryValuationLine = z.infer<typeof inventoryValuationLineSchema>;

/**
 * Category summary in valuation report
 */
export const categoryValuationSummarySchema = z.object({
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  totalValue: z.number().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  percentOfTotal: z.number().min(0).max(100),
});

export type CategoryValuationSummary = z.infer<typeof categoryValuationSummarySchema>;

/**
 * Inventory Valuation Report Response
 *
 * @see USER_STORIES.md - US-RPT-002: Inventory Valuation Report
 */
export const inventoryValuationReportSchema = z.object({
  reportDate: z.string().datetime(),
  locationId: z.string().uuid().optional(),
  locationName: z.string().optional(),

  // Summary
  totalInventoryValue: z.number().nonnegative().describe('Total inventory value'),
  totalItems: z.number().int().nonnegative().describe('Number of items with stock'),
  totalSkus: z.number().int().nonnegative().describe('Number of unique SKUs'),

  // Breakdowns
  byCategory: z.array(categoryValuationSummarySchema),
  byProductKind: z.array(
    z.object({
      productKind: z.enum([
        'raw_material',
        'semi_finished',
        'finished_good',
        'packaging',
        'consumable',
      ]),
      totalValue: z.number().nonnegative(),
      itemCount: z.number().int().nonnegative(),
    }),
  ),

  // Slow-moving stock summary
  slowMovingValue: z.number().nonnegative().describe('Total value of slow-moving items'),
  slowMovingCount: z.number().int().nonnegative().describe('Count of slow-moving items'),

  // Detail lines
  items: z.array(inventoryValuationLineSchema),
});

export type InventoryValuationReport = z.infer<typeof inventoryValuationReportSchema>;
export type InventoryValuationReportResponse = SuccessResponse<InventoryValuationReport>;

// ============================================================================
// US-RPT-003: PRODUCT PERFORMANCE REPORT
// ============================================================================

/**
 * Product Performance Report Query
 *
 * @see USER_STORIES.md - US-RPT-003: Product Performance Report
 */
export const productPerformanceQuerySchema = baseReportQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  sortBy: z
    .enum(['revenue', 'quantity', 'profit', 'margin'])
    .optional()
    .default('revenue')
    .describe('Sort metric'),
  limit: z.number().int().positive().max(100).optional().default(50).describe('Top N products'),
});

export type ProductPerformanceQuery = z.infer<typeof productPerformanceQuerySchema>;

/**
 * Product performance line
 */
export const productPerformanceLineSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  categoryName: z.string().optional(),

  quantitySold: z.number().nonnegative().describe('Total quantity sold'),
  totalRevenue: z.number().nonnegative().describe('Total revenue'),
  totalCost: z.number().nonnegative().optional().describe('Total cost (if available)'),
  grossProfit: z.number().optional().describe('Gross profit (revenue - cost)'),
  profitMarginPercent: z.number().optional().describe('Profit margin %'),

  averagePrice: z.number().nonnegative().describe('Average selling price'),
  transactionCount: z.number().int().nonnegative().describe('Number of transactions'),

  rank: z.number().int().positive().describe('Rank by selected metric'),

  // Trend indicators
  salesTrend: z.enum(['up', 'down', 'stable']).optional().describe('Sales trend vs previous period'),
  trendPercentage: z.number().optional().describe('Trend % change'),
});

export type ProductPerformanceLine = z.infer<typeof productPerformanceLineSchema>;

/**
 * Product Performance Report Response
 *
 * @see USER_STORIES.md - US-RPT-003: Product Performance Report
 */
export const productPerformanceReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  locationId: z.string().uuid().optional(),

  // Summary
  totalRevenue: z.number().nonnegative(),
  totalCost: z.number().nonnegative().optional(),
  totalGrossProfit: z.number().optional(),
  overallMarginPercent: z.number().optional(),
  totalProductsSold: z.number().int().nonnegative().describe('Unique products sold'),
  totalUnitsSold: z.number().nonnegative().describe('Total units sold'),

  // Top performers
  topByRevenue: z.array(productPerformanceLineSchema).max(10),
  topByQuantity: z.array(productPerformanceLineSchema).max(10),
  topByProfit: z.array(productPerformanceLineSchema).max(10).optional(),

  // All products (paginated or limited)
  products: z.array(productPerformanceLineSchema),
});

export type ProductPerformanceReport = z.infer<typeof productPerformanceReportSchema>;
export type ProductPerformanceReportResponse = SuccessResponse<ProductPerformanceReport>;

// ============================================================================
// US-RPT-004: STOCK MOVEMENT REPORT
// ============================================================================

/**
 * Stock Movement Report Query
 *
 * @see USER_STORIES.md - US-RPT-004: Stock Movement Report
 */
export const stockMovementReportQuerySchema = baseReportQuerySchema
  .extend({
    productId: z.string().uuid().optional().describe('Filter by product'),
    movementType: z
      .enum(['gr', 'iss', 'adj', 'xfer_in', 'xfer_out', 'prod_in', 'prod_out'])
      .optional()
      .describe('Filter by movement type'),
  })
  .merge(paginationSchema);

export type StockMovementReportQuery = z.infer<typeof stockMovementReportQuerySchema>;

/**
 * Stock movement line
 */
export const stockMovementLineSchema = z.object({
  transactionDate: z.string().datetime(),
  productSku: z.string(),
  productName: z.string(),
  locationName: z.string(),
  lotNumber: z.string().optional(),

  movementType: z.enum(['gr', 'iss', 'adj', 'xfer_in', 'xfer_out', 'prod_in', 'prod_out']),
  movementTypeLabel: z.string().describe('Human-readable movement type'),

  quantityDelta: z.number().describe('Quantity change (+ or -)'),
  uomCode: z.string(),
  runningBalance: z.number().nonnegative().describe('Balance after movement'),

  unitCost: z.number().nonnegative().optional(),
  totalValue: z.number().optional().describe('Movement value (qty × cost)'),

  referenceDoc: z.string().optional().describe('Reference document number'),
  referenceType: z.string().optional().describe('Reference document type'),
  notes: z.string().optional(),
  createdBy: z.string().describe('User who created movement'),
});

export type StockMovementLine = z.infer<typeof stockMovementLineSchema>;

/**
 * Movement type summary
 */
export const movementTypeSummarySchema = z.object({
  movementType: z.enum(['gr', 'iss', 'adj', 'xfer_in', 'xfer_out', 'prod_in', 'prod_out']),
  movementTypeLabel: z.string(),
  totalQuantity: z.number().describe('Total quantity moved'),
  transactionCount: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative().optional(),
});

export type MovementTypeSummary = z.infer<typeof movementTypeSummarySchema>;

/**
 * Stock Movement Report Response
 *
 * @see USER_STORIES.md - US-RPT-004: Stock Movement Report
 */
export const stockMovementReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),

  // Summary
  openingBalance: z.number().nonnegative().optional().describe('Opening balance'),
  totalReceipts: z.number().nonnegative().describe('Total receipts (GR, transfers in, production in)'),
  totalIssues: z.number().nonnegative().describe('Total issues (sales, transfers out, production out)'),
  totalAdjustments: z.number().describe('Net adjustments (+ or -)'),
  closingBalance: z.number().nonnegative().optional().describe('Closing balance'),

  // Breakdown
  byMovementType: z.array(movementTypeSummarySchema),

  // Detail
  movements: z.array(stockMovementLineSchema),

  // Pagination
  pagination: z.object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export type StockMovementReport = z.infer<typeof stockMovementReportSchema>;
export type StockMovementReportResponse = SuccessResponse<StockMovementReport>;

// ============================================================================
// US-RPT-005: WASTE & SPOILAGE REPORT
// ============================================================================

/**
 * Waste & Spoilage Report Query
 *
 * @see USER_STORIES.md - US-RPT-005: Waste & Spoilage Report
 */
export const wasteSpoilageReportQuerySchema = baseReportQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  wasteReason: z
    .enum(['damage', 'expiry', 'theft', 'spillage', 'production_waste', 'other'])
    .optional()
    .describe('Filter by waste reason'),
});

export type WasteSpoilageReportQuery = z.infer<typeof wasteSpoilageReportQuerySchema>;

/**
 * Waste line item
 */
export const wasteLineSchema = z.object({
  date: z.string().datetime(),
  productSku: z.string(),
  productName: z.string(),
  categoryName: z.string().optional(),
  locationName: z.string(),

  wasteReason: z.enum(['damage', 'expiry', 'theft', 'spillage', 'production_waste', 'other']),
  wasteReasonLabel: z.string(),

  quantity: z.number().nonnegative(),
  uomCode: z.string(),
  unitCost: z.number().nonnegative(),
  totalValue: z.number().nonnegative().describe('Waste value (qty × cost)'),

  notes: z.string().optional(),
  reportedBy: z.string().describe('User who reported waste'),
});

export type WasteLine = z.infer<typeof wasteLineSchema>;

/**
 * Waste by reason summary
 */
export const wasteByReasonSchema = z.object({
  wasteReason: z.enum(['damage', 'expiry', 'theft', 'spillage', 'production_waste', 'other']),
  wasteReasonLabel: z.string(),
  totalQuantity: z.number().nonnegative(),
  totalValue: z.number().nonnegative(),
  incidentCount: z.number().int().nonnegative(),
  percentOfTotal: z.number().min(0).max(100),
});

export type WasteByReason = z.infer<typeof wasteByReasonSchema>;

/**
 * Top waste products
 */
export const topWasteProductSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  totalQuantity: z.number().nonnegative(),
  totalValue: z.number().nonnegative(),
  rank: z.number().int().positive(),
});

export type TopWasteProduct = z.infer<typeof topWasteProductSchema>;

/**
 * Waste & Spoilage Report Response
 *
 * @see USER_STORIES.md - US-RPT-005: Waste & Spoilage Report
 */
export const wasteReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  locationId: z.string().uuid().optional(),

  // Summary
  totalWasteValue: z.number().nonnegative().describe('Total waste value'),
  totalWasteQuantity: z.number().nonnegative().describe('Total waste quantity (base UOM)'),
  totalIncidents: z.number().int().nonnegative().describe('Number of waste incidents'),

  // Waste percentage (if usage data available)
  totalUsage: z.number().nonnegative().optional().describe('Total usage in period'),
  wastePercentage: z.number().min(0).max(100).optional().describe('Waste % of total usage'),

  // Breakdowns
  byReason: z.array(wasteByReasonSchema),
  byLocation: z
    .array(
      z.object({
        locationId: z.string().uuid(),
        locationName: z.string(),
        totalValue: z.number().nonnegative(),
        percentOfTotal: z.number().min(0).max(100),
      }),
    )
    .optional(),
  topWasteProducts: z.array(topWasteProductSchema).max(10),

  // Detail
  wasteItems: z.array(wasteLineSchema),

  // Trend
  trend: z
    .object({
      previousPeriodValue: z.number().nonnegative(),
      changePercent: z.number(),
      changeDirection: z.enum(['up', 'down', 'stable']),
    })
    .optional(),
});

export type WasteReport = z.infer<typeof wasteReportSchema>;
export type WasteReportResponse = SuccessResponse<WasteReport>;

// ============================================================================
// US-RPT-006: PURCHASE ORDER REPORT
// ============================================================================

/**
 * Purchase Order Report Query
 *
 * @see USER_STORIES.md - US-RPT-006: Purchase Order Report
 */
export const purchaseOrderReportQuerySchema = baseReportQuerySchema.extend({
  supplierId: z.string().uuid().optional().describe('Filter by supplier'),
  status: z
    .enum(['draft', 'pending', 'approved', 'sent', 'receiving', 'completed', 'cancelled'])
    .optional()
    .describe('Filter by PO status'),
});

export type PurchaseOrderReportQuery = z.infer<typeof purchaseOrderReportQuerySchema>;

/**
 * PO summary line
 */
export const poSummaryLineSchema = z.object({
  poNumber: z.string(),
  poDate: z.string().datetime(),
  supplierName: z.string(),
  status: z.enum(['draft', 'pending', 'approved', 'sent', 'receiving', 'completed', 'cancelled']),
  statusLabel: z.string(),

  totalAmount: z.number().nonnegative(),
  itemCount: z.number().int().nonnegative().describe('Number of line items'),

  expectedDeliveryDate: z.string().datetime().optional(),
  actualDeliveryDate: z.string().datetime().optional(),
  daysToDeliver: z.number().int().optional().describe('Actual days from PO to delivery'),
  isOnTime: z.boolean().optional().describe('Delivered on time'),

  receivedAmount: z.number().nonnegative().optional().describe('Amount received so far'),
  receivePercentage: z.number().min(0).max(100).optional().describe('% received'),
});

export type POSummaryLine = z.infer<typeof poSummaryLineSchema>;

/**
 * Supplier performance summary
 */
export const supplierPerformanceSchema = z.object({
  supplierId: z.string().uuid(),
  supplierName: z.string(),

  totalPOs: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
  completedPOs: z.number().int().nonnegative(),
  outstandingPOs: z.number().int().nonnegative(),

  onTimeDeliveryRate: z.number().min(0).max(100).describe('% of POs delivered on time'),
  averageLeadTimeDays: z.number().nonnegative().describe('Average lead time in days'),

  qualityIssues: z.number().int().nonnegative().optional().describe('Number of quality issues'),
});

export type SupplierPerformance = z.infer<typeof supplierPerformanceSchema>;

/**
 * Purchase Order Report Response
 *
 * @see USER_STORIES.md - US-RPT-006: Purchase Order Report
 */
export const purchaseOrderReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  locationId: z.string().uuid().optional(),

  // Summary
  totalPOs: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
  averagePOValue: z.number().nonnegative(),

  // By status
  byStatus: z.array(
    z.object({
      status: z.enum(['draft', 'pending', 'approved', 'sent', 'receiving', 'completed', 'cancelled']),
      statusLabel: z.string(),
      count: z.number().int().nonnegative(),
      totalValue: z.number().nonnegative(),
    }),
  ),

  // Outstanding POs
  outstandingPOs: z.number().int().nonnegative().describe('POs sent but not received'),
  outstandingValue: z.number().nonnegative(),

  // Delivery performance
  onTimeDeliveryRate: z.number().min(0).max(100).describe('% delivered on time'),
  averageLeadTimeDays: z.number().nonnegative(),

  // Supplier performance
  supplierPerformance: z.array(supplierPerformanceSchema),

  // Detail
  purchaseOrders: z.array(poSummaryLineSchema),
});

export type PurchaseOrderReport = z.infer<typeof purchaseOrderReportSchema>;
export type PurchaseOrderReportResponse = SuccessResponse<PurchaseOrderReport>;

// ============================================================================
// US-RPT-007: CASH RECONCILIATION REPORT
// ============================================================================

/**
 * Cash Reconciliation Report Query
 *
 * @see USER_STORIES.md - US-RPT-007: Cash Reconciliation Report
 */
export const cashReconciliationQuerySchema = baseReportQuerySchema.extend({
  userId: z.string().uuid().optional().describe('Filter by cashier'),
  deviceId: z.string().optional().describe('Filter by POS device'),
  shiftId: z.string().uuid().optional().describe('Specific shift ID'),
});

export type CashReconciliationQuery = z.infer<typeof cashReconciliationQuerySchema>;

/**
 * Shift reconciliation line
 */
export const shiftReconciliationLineSchema = z.object({
  shiftId: z.string().uuid(),
  shiftDate: z.string().datetime(),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().optional(),

  deviceId: z.string().optional(),
  cashierName: z.string(),

  openingFloat: z.number().nonnegative().describe('Starting cash'),
  cashSales: z.number().nonnegative().describe('Cash sales during shift'),
  cashIn: z.number().nonnegative().describe('Cash deposits'),
  cashOut: z.number().nonnegative().describe('Cash withdrawals'),

  expectedCash: z.number().nonnegative().describe('Expected cash = opening + sales + in - out'),
  actualCash: z.number().nonnegative().optional().describe('Actual counted cash'),
  variance: z.number().optional().describe('Variance = actual - expected'),
  variancePercent: z.number().optional().describe('Variance %'),

  isReconciled: z.boolean(),
  isFlagged: z.boolean().describe('Flagged for large variance'),

  notes: z.string().optional(),
});

export type ShiftReconciliationLine = z.infer<typeof shiftReconciliationLineSchema>;

/**
 * Cashier performance summary
 */
export const cashierPerformanceSchema = z.object({
  userId: z.string().uuid(),
  cashierName: z.string(),

  shiftsWorked: z.number().int().nonnegative(),
  totalSales: z.number().nonnegative(),
  averageSalesPerShift: z.number().nonnegative(),

  totalVariance: z.number().describe('Total variance (+ or -)'),
  averageVariance: z.number().describe('Average variance per shift'),
  varianceRate: z.number().describe('Variance as % of sales'),

  shiftsOverVariance: z.number().int().nonnegative().describe('Shifts exceeding variance threshold'),
});

export type CashierPerformance = z.infer<typeof cashierPerformanceSchema>;

/**
 * Cash Reconciliation Report Response
 *
 * @see USER_STORIES.md - US-RPT-007: Cash Reconciliation Report
 */
export const cashReconciliationReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  locationId: z.string().uuid().optional(),

  // Summary
  totalShifts: z.number().int().nonnegative(),
  reconciledShifts: z.number().int().nonnegative(),
  unreconciledShifts: z.number().int().nonnegative(),

  totalCashSales: z.number().nonnegative(),
  totalExpectedCash: z.number().nonnegative(),
  totalActualCash: z.number().nonnegative().optional(),
  totalVariance: z.number().optional(),
  overallVariancePercent: z.number().optional(),

  // Flagged shifts
  flaggedShifts: z.number().int().nonnegative().describe('Shifts with large variance'),
  flaggedValue: z.number().nonnegative().describe('Total variance in flagged shifts'),

  // Cashier performance
  cashierPerformance: z.array(cashierPerformanceSchema),

  // Detail
  shifts: z.array(shiftReconciliationLineSchema),

  // Daily cash position
  runningCashPosition: z
    .array(
      z.object({
        date: z.string().datetime(),
        totalCash: z.number().nonnegative(),
        deposited: z.number().nonnegative().optional(),
        remaining: z.number().nonnegative(),
      }),
    )
    .optional(),
});

export type CashReconciliationReport = z.infer<typeof cashReconciliationReportSchema>;
export type CashReconciliationReportResponse = SuccessResponse<CashReconciliationReport>;

// ============================================================================
// US-RPT-008: COGS (COST OF GOODS SOLD) REPORT
// ============================================================================

/**
 * COGS Report Query
 *
 * @see USER_STORIES.md - US-RPT-008: COGS Report
 */
export const cogsReportQuerySchema = baseReportQuerySchema.extend({
  categoryId: z.string().uuid().optional().describe('Filter by product category'),
});

export type COGSReportQuery = z.infer<typeof cogsReportQuerySchema>;

/**
 * COGS breakdown by category
 */
export const cogsByCategorySchema = z.object({
  categoryId: z.string().uuid(),
  categoryName: z.string(),

  openingInventory: z.number().nonnegative(),
  purchases: z.number().nonnegative(),
  closingInventory: z.number().nonnegative(),
  cogs: z.number().nonnegative().describe('Opening + Purchases - Closing'),

  revenue: z.number().nonnegative().optional(),
  grossProfit: z.number().optional().describe('Revenue - COGS'),
  grossMarginPercent: z.number().optional(),
});

export type COGSByCategory = z.infer<typeof cogsByCategorySchema>;

/**
 * COGS breakdown by location
 */
export const cogsByLocationSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string(),

  openingInventory: z.number().nonnegative(),
  purchases: z.number().nonnegative(),
  transfers: z.number().describe('Net transfers (in - out)'),
  closingInventory: z.number().nonnegative(),
  cogs: z.number().nonnegative(),

  revenue: z.number().nonnegative().optional(),
  grossProfit: z.number().optional(),
  grossMarginPercent: z.number().optional(),
});

export type COGSByLocation = z.infer<typeof cogsByLocationSchema>;

/**
 * COGS Report Response
 *
 * @see USER_STORIES.md - US-RPT-008: COGS Report
 */
export const cogsReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  locationId: z.string().uuid().optional(),

  // COGS Calculation
  openingInventoryValue: z.number().nonnegative().describe('Inventory value at start of period'),
  purchases: z.number().nonnegative().describe('Goods receipts during period'),
  productionAdded: z.number().nonnegative().optional().describe('Finished goods produced'),
  transfers: z.number().describe('Net transfers (in - out)'),
  adjustments: z.number().describe('Net adjustments'),
  closingInventoryValue: z.number().nonnegative().describe('Inventory value at end of period'),
  cogs: z
    .number()
    .nonnegative()
    .describe('Cost of Goods Sold = Opening + Purchases + Production + Transfers + Adj - Closing'),

  // Revenue and profitability
  totalRevenue: z.number().nonnegative().optional().describe('Sales revenue during period'),
  grossProfit: z.number().optional().describe('Gross Profit = Revenue - COGS'),
  grossMarginPercent: z.number().optional().describe('Gross Margin % = (Gross Profit / Revenue) × 100'),

  // Inventory turnover
  averageInventoryValue: z.number().nonnegative().describe('(Opening + Closing) / 2'),
  inventoryTurnoverRatio: z.number().nonnegative().optional().describe('COGS / Average Inventory'),
  daysInventoryOutstanding: z
    .number()
    .nonnegative()
    .optional()
    .describe('365 / Inventory Turnover Ratio'),

  // Breakdowns
  byCategory: z.array(cogsByCategorySchema),
  byLocation: z.array(cogsByLocationSchema).optional(),

  // Comparison
  previousPeriod: z
    .object({
      cogs: z.number().nonnegative(),
      grossProfit: z.number().optional(),
      grossMarginPercent: z.number().optional(),
      changePercent: z.number(),
    })
    .optional(),
});

export type COGSReport = z.infer<typeof cogsReportSchema>;
export type COGSReportResponse = SuccessResponse<COGSReport>;

// ============================================================================
// EXPORT ALL REPORT TYPES
// ============================================================================

/**
 * Union type of all report queries
 */
export type ReportQuery =
  | DailySalesReportQuery
  | InventoryValuationReportQuery
  | ProductPerformanceQuery
  | StockMovementReportQuery
  | WasteSpoilageReportQuery
  | PurchaseOrderReportQuery
  | CashReconciliationQuery
  | COGSReportQuery;

/**
 * Union type of all report responses
 */
export type ReportResponse =
  | DailySalesReport
  | InventoryValuationReport
  | ProductPerformanceReport
  | StockMovementReport
  | WasteReport
  | PurchaseOrderReport
  | CashReconciliationReport
  | COGSReport;

/**
 * Report type enum
 */
export const reportTypeSchema = z.enum([
  'daily_sales',
  'inventory_valuation',
  'product_performance',
  'stock_movement',
  'waste',
  'purchase_order',
  'cash_reconciliation',
  'cogs',
]);

export type ReportType = z.infer<typeof reportTypeSchema>;
