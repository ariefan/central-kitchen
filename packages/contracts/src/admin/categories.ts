/**
 * Category Management contracts for admin module
 *
 * Manages product categories for better organization, filtering,
 * and category-based promotions. Supports hierarchical categories.
 *
 * CRITICAL: Categories impact:
 * - Product organization
 * - Reporting and analytics
 * - Category-based promotions
 * - Product filtering
 *
 * Covers:
 * 1. Category creation and management
 * 2. Hierarchical category structure
 * 3. Product-category assignments
 *
 * @module @contracts/erp/admin/categories
 * @see FEATURES.md Section 12 - System Administration (Enhancement)
 * @see USER_STORIES.md Epic 12 - System Administration
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  successResponseSchema,
  paginatedResponseSchema,
} from '../common.js';
import {
  uuidSchema,
  entityCodeSchema,
} from '../primitives.js';

// ============================================================================
// CATEGORY CREATION SCHEMAS
// ============================================================================

/**
 * Category creation
 *
 * Business Rules:
 * - Category code is unique per tenant
 * - Categories can be nested (hierarchical)
 * - Inactive categories not shown in filters
 *
 * @example
 * ```typescript
 * {
 *   code: "CAT-DAIRY",
 *   name: "Dairy Products",
 *   parentId: null, // Top-level category
 *   description: "Milk, cheese, yogurt, etc."
 * }
 * ```
 */
export const categoryCreateSchema = z.object({
  code: entityCodeSchema.optional(), // Auto-generated if not provided
  name: z.string().min(1).max(100),
  parentId: uuidSchema.optional(), // null for top-level categories
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().nonnegative().default(0),
});

/**
 * Update category
 */
export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .omit({ code: true });

/**
 * Assign products to category
 */
export const categoryAssignProductsSchema = z.object({
  categoryId: uuidSchema,
  productIds: z.array(uuidSchema).min(1).max(100),
  replaceExisting: z.boolean().default(false), // true = replace, false = add
});

export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type CategoryAssignProducts = z.infer<typeof categoryAssignProductsSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Category query filters
 */
export const categoryFiltersSchema = z.object({
  name: z.string().optional(), // Search by name
  code: z.string().optional(), // Search by code
  parentId: uuidSchema.optional(), // Filter by parent
  isActive: z.boolean().optional(),
});

/**
 * Complete Category query schema
 */
export const categoryQuerySchema = baseQuerySchema.merge(categoryFiltersSchema);

export type CategoryFilters = z.infer<typeof categoryFiltersSchema>;
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Category detail schema
 */
export const categoryDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  code: z.string(), // Unique category code
  name: z.string(),
  parentId: uuidSchema.nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  displayOrder: z.number(),

  // Parent category (if exists)
  parent: z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
  }).nullable(),

  // Statistics
  totalProducts: z.number().int(),
  totalSubcategories: z.number().int(),

  // System fields
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Category with children (tree structure)
 */
export const categoryTreeSchema: z.ZodType<{
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  displayOrder: number;
  children: Array<any>;
}> = z.lazy(() =>
  z.object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
    parentId: uuidSchema.nullable(),
    isActive: z.boolean(),
    displayOrder: z.number(),
    children: z.array(categoryTreeSchema),
  })
);

/**
 * Category list item schema
 */
export const categoryListItemSchema = categoryDetailSchema.omit({
  description: true,
});

/**
 * Category response
 */
export const categoryResponseSchema = successResponseSchema(categoryDetailSchema);

/**
 * Categories paginated response
 */
export const categoriesResponseSchema = paginatedResponseSchema(categoryListItemSchema);

/**
 * Category tree response
 */
export const categoryTreeResponseSchema = successResponseSchema(
  z.object({
    categories: z.array(categoryTreeSchema),
  })
);

export type CategoryDetail = z.infer<typeof categoryDetailSchema>;
export type CategoryTree = z.infer<typeof categoryTreeSchema>;
export type CategoryListItem = z.infer<typeof categoryListItemSchema>;
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;
export type CategoryTreeResponse = z.infer<typeof categoryTreeResponseSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Generate category code
 *
 * Business Rule: Auto-generated format: CAT-{NAME}-{SEQ}
 *
 * @param name - Category name
 * @param lastSequence - Last used sequence number
 * @returns Next category code
 */
export function generateNextCategoryCode(
  name: string,
  lastSequence: number
): string {
  const namePrefix = name
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .substring(0, 10);
  const sequence = (lastSequence + 1).toString().padStart(3, '0');
  return `CAT-${namePrefix}-${sequence}`;
}

/**
 * Validate unique category code per tenant
 *
 * Business Rule: Category code is unique per tenant
 *
 * @param code - Category code
 * @param existingCodes - List of existing codes in tenant
 * @returns Validation result
 */
export function validateUniqueCategoryCode(
  code: string,
  existingCodes: string[]
): { valid: boolean; error?: string } {
  if (existingCodes.includes(code.toUpperCase())) {
    return {
      valid: false,
      error: 'Category code already exists',
    };
  }
  return { valid: true };
}

/**
 * Validate no circular parent reference
 *
 * Business Rule: Category cannot be its own ancestor
 *
 * @param categoryId - Category ID
 * @param parentId - Parent category ID
 * @param allCategories - All categories
 * @returns Validation result
 */
export function validateNoCyclicReference(
  categoryId: string,
  parentId: string | null,
  allCategories: Array<{ id: string; parentId: string | null }>
): { valid: boolean; error?: string } {
  if (!parentId) return { valid: true };

  let currentParentId: string | null = parentId;
  const visited = new Set<string>();

  while (currentParentId) {
    if (currentParentId === categoryId) {
      return {
        valid: false,
        error: 'Category cannot be its own ancestor',
      };
    }

    if (visited.has(currentParentId)) {
      return {
        valid: false,
        error: 'Circular reference detected in category hierarchy',
      };
    }

    visited.add(currentParentId);

    const parent = allCategories.find((c) => c.id === currentParentId);
    currentParentId = parent?.parentId || null;
  }

  return { valid: true };
}

/**
 * Build category tree from flat list
 *
 * Helper for hierarchical display.
 *
 * @param categories - Flat list of categories
 * @returns Hierarchical tree structure
 */
export function buildCategoryTree<
  T extends { id: string; parentId: string | null }
>(categories: T[]): Array<T & { children: Array<any> }> {
  const categoryMap = new Map<string, T & { children: Array<any> }>();
  const rootCategories: Array<T & { children: Array<any> }> = [];

  // Create map with children array
  categories.forEach((category) => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // Build tree
  categories.forEach((category) => {
    const node = categoryMap.get(category.id)!;
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        rootCategories.push(node); // Parent not found, treat as root
      }
    } else {
      rootCategories.push(node);
    }
  });

  return rootCategories;
}

/**
 * Get category path (breadcrumb)
 *
 * Helper for UI breadcrumb display.
 *
 * @param categoryId - Category ID
 * @param allCategories - All categories
 * @returns Array of categories from root to current
 */
export function getCategoryPath(
  categoryId: string,
  allCategories: Array<{ id: string; parentId: string | null; name: string }>
): Array<{ id: string; name: string }> {
  const path: Array<{ id: string; name: string }> = [];
  let currentId: string | null = categoryId;

  while (currentId) {
    const category = allCategories.find((c) => c.id === currentId);
    if (!category) break;

    path.unshift({ id: category.id, name: category.name });
    currentId = category.parentId;
  }

  return path;
}

/**
 * Get all subcategory IDs (recursive)
 *
 * Helper for filtering products by category and subcategories.
 *
 * @param categoryId - Category ID
 * @param allCategories - All categories
 * @returns Array of category ID and all subcategory IDs
 */
export function getAllSubcategoryIds(
  categoryId: string,
  allCategories: Array<{ id: string; parentId: string | null }>
): string[] {
  const subcategoryIds = [categoryId];
  const directChildren = allCategories.filter((c) => c.parentId === categoryId);

  directChildren.forEach((child) => {
    subcategoryIds.push(...getAllSubcategoryIds(child.id, allCategories));
  });

  return subcategoryIds;
}

/**
 * Sort categories by display order
 *
 * Helper for consistent ordering.
 *
 * @param categories - Categories to sort
 * @returns Sorted categories
 */
export function sortCategoriesByDisplayOrder<
  T extends { displayOrder: number; name: string }
>(categories: T[]): T[] {
  return [...categories].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Format category display name with path
 *
 * Helper for UI display.
 *
 * @param categoryPath - Category path from getCategoryPath
 * @returns Formatted display name (e.g., "Food > Dairy > Milk")
 */
export function formatCategoryPathDisplay(
  categoryPath: Array<{ name: string }>
): string {
  return categoryPath.map((c) => c.name).join(' > ');
}

/**
 * Get category level (depth in tree)
 *
 * Helper for indentation in UI.
 *
 * @param categoryId - Category ID
 * @param allCategories - All categories
 * @returns Level (0 for root, 1 for first level, etc.)
 */
export function getCategoryLevel(
  categoryId: string,
  allCategories: Array<{ id: string; parentId: string | null }>
): number {
  let level = 0;
  let currentId: string | null = categoryId;

  while (currentId) {
    const category = allCategories.find((c) => c.id === currentId);
    if (!category || !category.parentId) break;
    level++;
    currentId = category.parentId;
  }

  return level;
}
