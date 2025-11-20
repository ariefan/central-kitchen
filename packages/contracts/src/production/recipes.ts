/**
 * Recipe Management contracts for production module
 *
 * Recipes define Bill of Materials (BOM) for finished goods production.
 * Supports versioning with active version control.
 *
 * Covers:
 * 1. Recipe creation with multi-ingredient BOM (PROD-001)
 * 2. Recipe versioning and activation
 * 3. Cost calculation and breakdown
 * 4. Recipe search and filtering
 *
 * @module @contracts/erp/production/recipes
 * @see FEATURES.md PROD-001 - Recipe Management
 * @see USER_STORIES.md Epic 5 - Production & Recipes
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  successResponseSchema,
  paginatedResponseSchema,
  productRelationSchema,
  uomRelationSchema,
} from '../common.js';
import {
  quantitySchema,
  uuidSchema,
  entityCodeSchema,
  durationMinutesSchema,
} from '../primitives.js';

// ============================================================================
// RECIPE ITEM SCHEMAS
// ============================================================================

/**
 * Recipe ingredient/item for input
 *
 * Represents one ingredient in the BOM with quantity and UOM.
 *
 * @see FEATURES.md PROD-001 - "Multi-ingredient BOM (Bill of Materials)"
 *
 * @example
 * ```typescript
 * {
 *   productId: "uuid...", // Raw material or semi-finished
 *   quantity: 2.5,
 *   uomId: "uuid...",
 *   notes: "Chop finely",
 *   sortOrder: 1
 * }
 * ```
 */
export const recipeItemInputSchema = z.object({
  productId: uuidSchema, // Raw material or semi-finished
  quantity: quantitySchema,
  uomId: uuidSchema,
  notes: z.string().max(500).optional(),
  sortOrder: z.number().int().nonnegative().optional(), // Display order
});

/**
 * Recipe item response from database
 *
 * Includes cost information from product.
 */
const recipeItemResponseSchema = z.object({
  id: uuidSchema,
  recipeId: uuidSchema,
  productId: uuidSchema,
  quantity: z.string(), // Numeric from DB
  uomId: uuidSchema,
  notes: z.string().nullable(),
  sortOrder: z.number().int().nullable(),

  // Cost calculation
  unitCost: z.string().nullable(), // From product cost
  lineCost: z.string().nullable(), // quantity × unitCost

  // Relations
  product: productRelationSchema.extend({
    kind: z.string().nullable(),
    isPerishable: z.boolean(),
    currentCost: z.string().nullable(),
  }).nullable(),
  uom: uomRelationSchema.nullable(),
});

export type RecipeItemInput = z.infer<typeof recipeItemInputSchema>;
export type RecipeItemResponse = z.infer<typeof recipeItemResponseSchema>;

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Create Recipe schema
 *
 * Business Rules (from FEATURES.md PROD-001):
 * - Recipe code is unique per tenant
 * - Version starts at 1
 * - New recipe is automatically active (is_active = true)
 * - At least 1 ingredient required
 * - Yield quantity must be positive
 * - Instructions and timing optional but recommended
 *
 * @see FEATURES.md PROD-001 - Recipe Creation
 * @see USER_STORIES.md "As a production manager, I want to create recipes with multi-ingredient BOMs"
 */
export const recipeCreateSchema = z.object({
  recipeCode: entityCodeSchema, // e.g., "RC001"
  productId: uuidSchema, // Finished good being produced
  yieldQty: quantitySchema, // How much the recipe produces
  yieldUomId: uuidSchema,
  instructions: z.string().max(5000).optional(),
  prepTimeMinutes: durationMinutesSchema.optional(),
  cookTimeMinutes: durationMinutesSchema.optional(),
  items: z
    .array(recipeItemInputSchema)
    .min(1, 'At least one ingredient is required')
    .max(100, 'Maximum 100 ingredients per recipe'),
  notes: z.string().max(1000).optional(),
});

/**
 * Update Recipe schema
 *
 * Business Rules:
 * - Cannot change recipeCode or productId after creation
 * - Can only update active version
 * - Cannot update items through this endpoint (create new version instead)
 * - Use new-version endpoint to create variations
 */
export const recipeUpdateSchema = recipeCreateSchema
  .omit({ recipeCode: true, productId: true, items: true })
  .partial();

export type RecipeCreate = z.infer<typeof recipeCreateSchema>;
export type RecipeUpdate = z.infer<typeof recipeUpdateSchema>;

// ============================================================================
// WORKFLOW ACTION SCHEMAS
// ============================================================================

/**
 * Create new recipe version
 *
 * CRITICAL (from FEATURES.md PROD-001):
 * - Copy existing recipe + items, increment version
 * - New version starts as inactive
 * - Previous version remains active until new version activated
 * - Only one active version per recipe_code
 *
 * @see FEATURES.md PROD-001 - "Recipe versioning with active version control"
 * @see FEATURES.md PROD-001 - "Creating new version: copy recipe + items, increment version"
 *
 * Business Rules:
 * 1. Copy all fields from existing recipe
 * 2. Increment version number (v2, v3, etc.)
 * 3. Set is_active = false (requires activation)
 * 4. Copy all recipe_items from source
 * 5. Allow modifications to new version items
 * 6. Generate new UUID for new recipe record
 */
export const recipeNewVersionSchema = z.object({
  sourceRecipeId: uuidSchema, // Recipe to copy from
  modifications: z.object({
    yieldQty: quantitySchema.optional(),
    yieldUomId: uuidSchema.optional(),
    instructions: z.string().max(5000).optional(),
    prepTimeMinutes: durationMinutesSchema.optional(),
    cookTimeMinutes: durationMinutesSchema.optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(recipeItemInputSchema).min(1).max(100).optional(),
  }).optional(),
  versionNotes: z.string().max(1000).optional(), // Why this version was created
});

/**
 * Activate recipe version
 *
 * CRITICAL (from FEATURES.md PROD-001):
 * - Set old version.is_active = false
 * - Set new version.is_active = true
 * - Only one active version per recipe_code
 * - Production orders will use the active version
 *
 * @see FEATURES.md PROD-001 - "Activating new version: set old version.is_active = false"
 *
 * Business Rules:
 * 1. Find all recipes with same recipe_code
 * 2. Set all is_active = false
 * 3. Set target recipe is_active = true
 * 4. Future production orders use this version
 * 5. Existing production orders continue using their assigned version
 */
export const recipeActivateSchema = z.object({
  activationNotes: z.string().max(1000).optional(),
});

export type RecipeNewVersion = z.infer<typeof recipeNewVersionSchema>;
export type RecipeActivate = z.infer<typeof recipeActivateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Recipe query filters
 *
 * Supports filtering by:
 * - Recipe code
 * - Product (finished good)
 * - Active version only
 * - Has missing costs (for alerts)
 *
 * @see FEATURES.md PROD-001 - "Recipe search and filtering"
 */
export const recipeFiltersSchema = z.object({
  recipeCode: entityCodeSchema.optional(),
  productId: uuidSchema.optional(),
  isActive: z.boolean().optional(), // Filter active versions only
  hasMissingCosts: z.boolean().optional(), // Alert for missing ingredient costs
  createdBy: uuidSchema.optional(),
});

/**
 * Complete Recipe query schema
 */
export const recipeQuerySchema = baseQuerySchema.merge(recipeFiltersSchema);

export type RecipeFilters = z.infer<typeof recipeFiltersSchema>;
export type RecipeQuery = z.infer<typeof recipeQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Recipe detail schema (complete document)
 *
 * Includes all recipe fields and calculated costs from FEATURES.md PROD-001
 *
 * @see FEATURES.md PROD-001 - Recipe structure
 */
export const recipeDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  recipeCode: z.string(), // e.g., "RC001"
  version: z.number().int().positive(), // 1, 2, 3...
  productId: uuidSchema, // Finished good
  yieldQty: z.string(), // Numeric from DB
  yieldUomId: uuidSchema,

  // Instructions and timing
  instructions: z.string().nullable(),
  prepTimeMinutes: z.number().int().nullable(),
  cookTimeMinutes: z.number().int().nullable(),

  // Version control
  isActive: z.boolean(), // Only one active version per recipe_code
  versionNotes: z.string().nullable(),

  // Cost calculations (from FEATURES.md PROD-001)
  recipeCost: z.string().nullable(), // SUM(item_quantity × item_unit_cost)
  costPerUnit: z.string().nullable(), // recipe_cost / yield_qty
  hasMissingCosts: z.boolean(), // Alert if any ingredient has NULL cost

  // System fields
  notes: z.string().nullable(),
  metadata: z.any().nullable(),
  createdBy: uuidSchema,
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  product: productRelationSchema.extend({
    kind: z.string().nullable(),
  }).nullable(),
  yieldUom: uomRelationSchema.nullable(),
  items: z.array(recipeItemResponseSchema),
});

/**
 * Recipe list item schema (without nested items for list views)
 */
export const recipeListItemSchema = recipeDetailSchema.omit({
  items: true,
});

/**
 * Recipe detail response
 */
export const recipeResponseSchema = successResponseSchema(
  recipeDetailSchema
);

/**
 * Recipes paginated response
 */
export const recipesResponseSchema = paginatedResponseSchema(
  recipeListItemSchema
);

export type RecipeDetail = z.infer<typeof recipeDetailSchema>;
export type RecipeListItem = z.infer<typeof recipeListItemSchema>;
export type RecipeResponse = z.infer<typeof recipeResponseSchema>;
export type RecipesResponse = z.infer<typeof recipesResponseSchema>;

// ============================================================================
// COST BREAKDOWN SCHEMAS
// ============================================================================

/**
 * Recipe cost breakdown response
 *
 * Shows detailed cost by ingredient for analysis.
 *
 * @see FEATURES.md PROD-001 - "Recipe cost calculation"
 * @see FEATURES.md PROD-001 - "Cost breakdown by ingredient"
 */
export const recipeCostBreakdownSchema = successResponseSchema(
  z.object({
    recipeId: uuidSchema,
    recipeCode: z.string(),
    version: z.number().int(),
    yieldQty: z.string(),
    totalCost: z.string(),
    costPerUnit: z.string(),
    breakdown: z.array(z.object({
      itemId: uuidSchema,
      productId: uuidSchema,
      productName: z.string(),
      quantity: z.string(),
      uomCode: z.string(),
      unitCost: z.string().nullable(),
      lineCost: z.string().nullable(),
      costPercentage: z.number().nullable(), // % of total cost
      hasMissingCost: z.boolean(),
    })),
    missingCostItems: z.array(z.object({
      productId: uuidSchema,
      productName: z.string(),
    })),
    hasMissingCosts: z.boolean(),
  })
);

export type RecipeCostBreakdown = z.infer<typeof recipeCostBreakdownSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Calculate recipe cost
 *
 * Business Rule (from FEATURES.md PROD-001):
 * Recipe cost = SUM(item_quantity × item_unit_cost)
 *
 * @param items - Recipe ingredients with costs
 * @returns Total recipe cost
 */
export function calculateRecipeCost(
  items: Array<{ quantity: number; unitCost: number | null }>
): number | null {
  let hasMissingCost = false;
  let totalCost = 0;

  for (const item of items) {
    if (item.unitCost === null) {
      hasMissingCost = true;
      continue;
    }
    totalCost += item.quantity * item.unitCost;
  }

  // Return null if any costs are missing (alert user)
  if (hasMissingCost) return null;

  return totalCost;
}

/**
 * Calculate recipe cost per unit
 *
 * Business Rule (from FEATURES.md PROD-001):
 * Cost per unit = recipe_cost / yield_qty
 *
 * @param recipeCost - Total recipe cost
 * @param yieldQty - Recipe yield quantity
 * @returns Cost per unit
 */
export function calculateRecipeCostPerUnit(
  recipeCost: number | null,
  yieldQty: number
): number | null {
  if (recipeCost === null || yieldQty === 0) return null;
  return recipeCost / yieldQty;
}

/**
 * Check if recipe has missing ingredient costs
 *
 * Business Rule (from FEATURES.md PROD-001):
 * Missing cost alert if any ingredient has NULL cost
 *
 * @param items - Recipe ingredients
 * @returns True if any costs are missing
 */
export function hasMissingCosts(
  items: Array<{ unitCost: number | null }>
): boolean {
  return items.some(item => item.unitCost === null);
}

/**
 * Validate recipe code is unique per tenant
 *
 * Business Rule: Recipe code must be unique per tenant
 * Multiple versions can exist with same code (differentiated by version number)
 *
 * @param recipeCode - Recipe code to validate
 * @returns Validation result
 */
export function validateRecipeCodeUniqueness(
  recipeCode: string,
  existingCodes: string[]
): { valid: boolean; error?: string } {
  if (existingCodes.includes(recipeCode.toUpperCase())) {
    return {
      valid: false,
      error: `Recipe code ${recipeCode} already exists`,
    };
  }

  return { valid: true };
}

/**
 * Check if can activate recipe version
 *
 * Business Rule: Can activate any version (will deactivate others)
 * Active version is used for new production orders
 *
 * @param recipeId - Recipe to activate
 * @param isCurrentlyActive - Whether already active
 * @returns True if activation allowed
 */
export function canActivateRecipe(
  recipeId: string,
  isCurrentlyActive: boolean
): boolean {
  // Can always activate (system will handle deactivating others)
  return true;
}

/**
 * Get all versions for a recipe code
 *
 * Helper to find all versions of a recipe for version management.
 */
export const recipeVersionsQuerySchema = z.object({
  recipeCode: entityCodeSchema,
});

export const recipeVersionsResponseSchema = successResponseSchema(
  z.object({
    recipeCode: z.string(),
    totalVersions: z.number().int(),
    activeVersion: z.number().int().nullable(),
    versions: z.array(z.object({
      id: uuidSchema,
      version: z.number().int(),
      isActive: z.boolean(),
      createdAt: z.date(),
      createdBy: uuidSchema,
      versionNotes: z.string().nullable(),
      recipeCost: z.string().nullable(),
      costPerUnit: z.string().nullable(),
    })),
  })
);

export type RecipeVersionsQuery = z.infer<typeof recipeVersionsQuerySchema>;
export type RecipeVersionsResponse = z.infer<typeof recipeVersionsResponseSchema>;

/**
 * Calculate total prep and cook time
 *
 * @param prepTimeMinutes - Prep time
 * @param cookTimeMinutes - Cook time
 * @returns Total time in minutes
 */
export function calculateTotalTime(
  prepTimeMinutes: number | null,
  cookTimeMinutes: number | null
): number {
  return (prepTimeMinutes || 0) + (cookTimeMinutes || 0);
}

/**
 * Generate recipe code suggestion
 *
 * Helper to suggest next available recipe code.
 *
 * @param lastCode - Last used recipe code (e.g., "RC001")
 * @returns Suggested next code (e.g., "RC002")
 */
export function suggestNextRecipeCode(lastCode: string): string {
  const match = lastCode.match(/^([A-Z]+)(\d+)$/);
  if (!match || !match[1] || !match[2]) return 'RC001';

  const prefix = match[1];
  const number = parseInt(match[2], 10);
  const nextNumber = (number + 1).toString().padStart(match[2].length, '0');

  return `${prefix}${nextNumber}`;
}
