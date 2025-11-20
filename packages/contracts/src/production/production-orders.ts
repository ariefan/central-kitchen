/**
 * Production Order contracts for production module
 *
 * Production orders schedule and track batch production of finished goods.
 * Consumes ingredients from inventory and produces finished goods.
 *
 * CRITICAL: Production posts dual ledger entries:
 * - Component consumption: prod_out (negative qty)
 * - Finished goods receipt: prod_in (positive qty)
 *
 * Covers:
 * 1. Production batch scheduling (PROD-002)
 * 2. Ingredient consumption with FEFO
 * 3. Finished goods receipt with lot creation
 * 4. Yield variance tracking
 * 5. Waste/spoilage recording
 *
 * @module @contracts/erp/production/production-orders
 * @see FEATURES.md PROD-002 - Production Orders
 * @see FEATURES.md PROD-003 - Production Waste Tracking
 * @see USER_STORIES.md Epic 5 - Production & Recipes
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  productRelationSchema,
  locationRelationSchema,
  lotRelationSchema,
} from '../common.js';
import {
  quantitySchema,
  quantityNonNegativeSchema,
  moneyAmountSchema,
  uuidSchema,
  dateInputSchema,
  dateTimeInputSchema,
  lotNumberSchema,
} from '../primitives.js';
import {
  productionStatusSchema,
} from '../enums.js';

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Create Production Order schema
 *
 * Business Rules (from FEATURES.md PROD-002):
 * - Production number auto-generated (PROD-YYYYMM-00001)
 * - Status starts as "scheduled"
 * - Recipe selection (active version used)
 * - Batch quantity specification
 * - Validates ingredient availability before start
 * - Scheduled date must be present or future
 *
 * @see FEATURES.md PROD-002 - Production Order Creation
 * @see USER_STORIES.md "As a production supervisor, I want to schedule production batches"
 */
export const productionOrderCreateSchema = z
  .object({
    recipeId: uuidSchema, // Active version will be used
    locationId: uuidSchema, // Where production takes place
    plannedQty: quantitySchema, // How many units to produce
    scheduledDate: dateInputSchema, // When to produce
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      const scheduled = new Date(data.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return scheduled >= today;
    },
    {
      message: 'Scheduled date cannot be in the past',
      path: ['scheduledDate'],
    }
  );

/**
 * Update Production Order schema
 *
 * Business Rules:
 * - Only scheduled orders can be updated
 * - Cannot change recipe once created
 * - Cannot update after production started
 */
export const productionOrderUpdateSchema = productionOrderCreateSchema
  .omit({ recipeId: true })
  .partial();

export type ProductionOrderCreate = z.infer<typeof productionOrderCreateSchema>;
export type ProductionOrderUpdate = z.infer<typeof productionOrderUpdateSchema>;

// ============================================================================
// WORKFLOW ACTION SCHEMAS
// ============================================================================

/**
 * Start Production
 *
 * CRITICAL OPERATION (from FEATURES.md PROD-002):
 * - Validate ingredient availability
 * - Create ledger entries for ingredient consumption (prod_out, negative qty)
 * - Reserve ingredients from inventory (FEFO for perishables)
 * - Transitions status to 'in_progress'
 * - Records start timestamp
 * - Cannot start if ingredients insufficient
 *
 * @see FEATURES.md PROD-002 - "On start: validate ingredient availability"
 * @see FEATURES.md PROD-002 - "On start: create ledger entries for ingredient consumption"
 *
 * Business Rules:
 * 1. Check all ingredients available in location
 * 2. For perishables: select lots in FEFO order
 * 3. Create stock_ledger entries: type='prod_out', qty=-consumed
 * 4. Update production_order status to 'in_progress'
 * 5. Record started_at timestamp
 * 6. Lock recipe version (cannot change recipe after start)
 */
export const productionOrderStartSchema = z.object({
  startedAt: dateTimeInputSchema.optional(), // Defaults to now
  startNotes: z.string().max(1000).optional(),
});

/**
 * Complete Production
 *
 * CRITICAL OPERATION (from FEATURES.md PROD-002):
 * - Record actual quantity produced
 * - Record waste/spoilage
 * - Create ledger entry for FG receipt (prod_in, positive qty)
 * - Create lot for finished goods (with expiry if perishable)
 * - Calculate yield variance
 * - Cost allocation from consumed components to FG
 * - Transitions status to 'completed'
 * - Cannot complete without start
 *
 * @see FEATURES.md PROD-002 - "On complete: create ledger entry for FG receipt"
 * @see FEATURES.md PROD-002 - "On complete: create lot for finished goods"
 * @see FEATURES.md PROD-002 - "Cost of FG = sum of consumed component costs"
 *
 * Business Rules:
 * 1. Validate production is in 'in_progress' status
 * 2. Actual qty + waste qty should align with planned qty
 * 3. Create stock_ledger entry: type='prod_in', qty=+actual
 * 4. Create lot record for finished goods (if perishable)
 * 5. Allocate component costs to finished goods
 * 6. Calculate yield_variance_pct = (actual - planned) / planned × 100
 * 7. Record waste separately if significant
 * 8. Update status to 'completed'
 * 9. Record completed_at timestamp
 */
export const productionOrderCompleteSchema = z.object({
  actualQty: quantityNonNegativeSchema, // How many actually produced
  wasteQty: quantityNonNegativeSchema.default(0), // Spoilage/waste
  wasteReason: z.string().max(500).optional(), // Why waste occurred

  // Lot creation for finished goods (REQUIRED if product is perishable)
  lotNumber: lotNumberSchema.optional(),
  expiryDate: dateTimeInputSchema.optional(),
  manufactureDate: dateTimeInputSchema.optional(),

  completedAt: dateTimeInputSchema.optional(), // Defaults to now
  completionNotes: z.string().max(1000).optional(),
});

/**
 * Cancel Production Order
 *
 * Can cancel from scheduled or in_progress status.
 * If in_progress: must reverse ingredient consumption ledger entries.
 */
export const productionOrderCancelSchema = z.object({
  cancellationReason: z.string().min(1).max(500),
});

export type ProductionOrderStart = z.infer<typeof productionOrderStartSchema>;
export type ProductionOrderComplete = z.infer<typeof productionOrderCompleteSchema>;
export type ProductionOrderCancel = z.infer<typeof productionOrderCancelSchema>;

// ============================================================================
// INGREDIENT AVAILABILITY SCHEMAS
// ============================================================================

/**
 * Check ingredient availability request
 *
 * Validates whether all ingredients are available for production.
 *
 * @see FEATURES.md PROD-002 - "Ingredient availability validation"
 */
export const ingredientAvailabilityRequestSchema = z.object({
  productionOrderId: uuidSchema,
});

/**
 * Ingredient availability response
 *
 * Shows which ingredients are available and which are short.
 */
export const ingredientAvailabilityResponseSchema = successResponseSchema(
  z.object({
    productionOrderId: uuidSchema,
    recipeCode: z.string(),
    plannedQty: z.string(),
    canStart: z.boolean(), // True if all ingredients available
    ingredients: z.array(z.object({
      productId: uuidSchema,
      productName: z.string(),
      requiredQty: z.string(),
      availableQty: z.string(),
      shortageQty: z.string(), // required - available (0 if available)
      isAvailable: z.boolean(),
      uomCode: z.string(),
      // For perishables: show FEFO lots
      availableLots: z.array(z.object({
        lotId: uuidSchema,
        lotNumber: z.string(),
        expiryDate: z.date().nullable(),
        quantity: z.string(),
      })).optional(),
    })),
    shortageItems: z.array(z.object({
      productId: uuidSchema,
      productName: z.string(),
      shortageQty: z.string(),
    })),
  })
);

export type IngredientAvailabilityRequest = z.infer<typeof ingredientAvailabilityRequestSchema>;
export type IngredientAvailabilityResponse = z.infer<typeof ingredientAvailabilityResponseSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Production Order query filters
 *
 * Supports filtering by:
 * - Status
 * - Location
 * - Recipe
 * - Scheduled date range
 * - Created by user
 *
 * @see FEATURES.md PROD-002 - Production order list
 */
export const productionOrderFiltersSchema = z
  .object({
    status: productionStatusSchema.optional(),
    recipeId: uuidSchema.optional(),
    createdBy: uuidSchema.optional(),
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Production Order query schema
 */
export const productionOrderQuerySchema = baseQuerySchema.merge(
  productionOrderFiltersSchema
);

export type ProductionOrderFilters = z.infer<typeof productionOrderFiltersSchema>;
export type ProductionOrderQuery = z.infer<typeof productionOrderQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Production Order detail schema (complete document)
 *
 * Includes all production order fields from FEATURES.md PROD-002
 *
 * @see FEATURES.md PROD-002 - Production order structure
 */
export const productionOrderDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  docNo: z.string(), // Auto-generated: PROD-YYYYMM-00001
  recipeId: uuidSchema,
  locationId: uuidSchema,
  status: productionStatusSchema,

  // Quantities
  plannedQty: z.string(), // Numeric from DB
  actualQty: z.string().nullable(), // Set on completion
  wasteQty: z.string().nullable(), // Spoilage/waste
  yieldVariancePct: z.string().nullable(), // (actual - planned) / planned × 100

  // Dates
  scheduledDate: z.date(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),

  // Lot creation for finished goods
  lotNumber: z.string().nullable(),
  lotId: uuidSchema.nullable(), // Created on completion
  expiryDate: z.date().nullable(),
  manufactureDate: z.date().nullable(),

  // Cost allocation
  componentCost: moneyAmountSchema.nullable(), // Sum of consumed component costs
  costPerUnit: moneyAmountSchema.nullable(), // component_cost / actual_qty

  // Notes
  notes: z.string().nullable(),
  startNotes: z.string().nullable(),
  completionNotes: z.string().nullable(),
  wasteReason: z.string().nullable(),
  cancellationReason: z.string().nullable(),

  // System fields
  metadata: z.any().nullable(),
  createdBy: uuidSchema,
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  recipe: z.object({
    id: uuidSchema,
    recipeCode: z.string(),
    version: z.number().int(),
    yieldQty: z.string(),
    product: productRelationSchema.nullable(),
  }).nullable(),
  location: locationRelationSchema.nullable(),
  lot: lotRelationSchema.nullable(),
});

/**
 * Production Order list item schema (without relations)
 */
export const productionOrderListItemSchema = productionOrderDetailSchema.omit({
  recipe: true,
  lot: true,
});

/**
 * Production Order detail response
 */
export const productionOrderResponseSchema = successResponseSchema(
  productionOrderDetailSchema
);

/**
 * Production Orders paginated response
 */
export const productionOrdersResponseSchema = paginatedResponseSchema(
  productionOrderListItemSchema
);

export type ProductionOrderDetail = z.infer<typeof productionOrderDetailSchema>;
export type ProductionOrderListItem = z.infer<typeof productionOrderListItemSchema>;
export type ProductionOrderResponse = z.infer<typeof productionOrderResponseSchema>;
export type ProductionOrdersResponse = z.infer<typeof productionOrdersResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate production order status transition
 *
 * Business Rules (from FEATURES.md PROD-002):
 * - scheduled → in_progress → completed
 * - Can cancel from scheduled or in_progress
 *
 * @param currentStatus - Current production order status
 * @param nextStatus - Proposed next status
 * @returns True if transition is valid
 */
export function isValidProductionStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const validTransitions: Record<string, readonly string[]> = {
    scheduled: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Calculate yield variance percentage
 *
 * Business Rule (from FEATURES.md PROD-002):
 * Yield variance = (actual_qty - planned_qty) / planned_qty × 100
 *
 * @param actualQty - Actual produced quantity
 * @param plannedQty - Planned quantity
 * @returns Variance percentage (positive = over-produced, negative = under-produced)
 */
export function calculateYieldVariance(
  actualQty: number,
  plannedQty: number
): number {
  if (plannedQty === 0) return 0;
  return ((actualQty - plannedQty) / plannedQty) * 100;
}

/**
 * Calculate production waste percentage
 *
 * Business Rule (from FEATURES.md PROD-003):
 * Waste % = waste_qty / planned_qty × 100
 *
 * @param wasteQty - Waste quantity
 * @param plannedQty - Planned quantity
 * @returns Waste percentage
 */
export function calculateProductionWastePercentage(
  wasteQty: number,
  plannedQty: number
): number {
  if (plannedQty === 0) return 0;
  return (wasteQty / plannedQty) * 100;
}

/**
 * Check if waste percentage exceeds threshold
 *
 * Business Rule (from FEATURES.md PROD-003):
 * Alert if waste % > threshold (e.g., 10%)
 *
 * @param wastePercentage - Waste percentage
 * @param threshold - Alert threshold (default 10%)
 * @returns True if waste is excessive
 */
export function isExcessiveWaste(
  wastePercentage: number,
  threshold: number = 10
): boolean {
  return wastePercentage > threshold;
}

/**
 * Calculate production cost per unit for finished goods
 *
 * Business Rule (from FEATURES.md PROD-002):
 * Cost of FG = sum of consumed component costs
 * Cost per unit = total_component_cost / actual_qty
 *
 * @param componentCost - Total cost of consumed components
 * @param actualQty - Actual produced quantity
 * @returns Cost per unit
 */
export function calculateProductionCostPerUnit(
  componentCost: number,
  actualQty: number
): number {
  if (actualQty === 0) return 0;
  return componentCost / actualQty;
}

/**
 * Validate lot tracking requirement for perishables
 *
 * Business Rule: Lot number and expiry date REQUIRED if product is perishable
 *
 * @param isPerishable - Whether product is perishable
 * @param lotNumber - Lot number
 * @param expiryDate - Expiry date
 * @returns Validation result
 */
export function validateProductionLotTracking(
  isPerishable: boolean,
  lotNumber?: string,
  expiryDate?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (isPerishable) {
    if (!lotNumber) {
      errors.push('Lot number is required for perishable finished goods');
    }
    if (!expiryDate) {
      errors.push('Expiry date is required for perishable finished goods');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if ingredients are available for production
 *
 * Helper to validate availability before starting production.
 *
 * @param ingredients - Required ingredients with availability
 * @returns True if all ingredients available
 */
export function areIngredientsAvailable(
  ingredients: Array<{ requiredQty: number; availableQty: number }>
): boolean {
  return ingredients.every(ing => ing.availableQty >= ing.requiredQty);
}

/**
 * Calculate scaled ingredient quantities for batch
 *
 * Helper to scale recipe ingredients based on batch size.
 *
 * @param recipeYieldQty - Recipe yield quantity
 * @param plannedQty - Planned production quantity
 * @param ingredientQty - Ingredient quantity in recipe
 * @returns Scaled ingredient quantity needed
 */
export function scaleIngredientQuantity(
  recipeYieldQty: number,
  plannedQty: number,
  ingredientQty: number
): number {
  if (recipeYieldQty === 0) return 0;
  return (plannedQty / recipeYieldQty) * ingredientQty;
}

/**
 * Validate actual + waste aligns with planned
 *
 * Business Rule: actual_qty + waste_qty should approximately equal planned_qty
 * (with some tolerance for measurement variance)
 *
 * @param actualQty - Actual produced
 * @param wasteQty - Waste quantity
 * @param plannedQty - Planned quantity
 * @param tolerancePct - Acceptable variance percentage (default 5%)
 * @returns Validation result
 */
export function validateProductionYield(
  actualQty: number,
  wasteQty: number,
  plannedQty: number,
  tolerancePct: number = 5
): { valid: boolean; warning?: string } {
  const total = actualQty + wasteQty;
  const variance = Math.abs(total - plannedQty);
  const variancePct = (variance / plannedQty) * 100;

  if (variancePct > tolerancePct) {
    return {
      valid: true, // Allow but warn
      warning: `Production yield variance of ${variancePct.toFixed(1)}% exceeds tolerance. Actual (${actualQty}) + Waste (${wasteQty}) = ${total}, but Planned was ${plannedQty}`,
    };
  }

  return { valid: true };
}
