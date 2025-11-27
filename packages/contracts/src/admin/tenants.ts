/**
 * Tenant Management contracts for admin module
 *
 * Manages tenants (organizations) in the multi-tenant ERP system.
 * Only super-admins can manage tenants.
 *
 * CRITICAL: Tenants impact:
 * - Data isolation
 * - User assignments
 * - Location ownership
 * - All business data segregation
 *
 * @module @contracts/erp/admin/tenants
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  successResponseSchema,
  paginatedResponseSchema,
} from '../common.js';
import {
  uuidSchema,
  booleanQueryParamSchema,
} from '../primitives.js';

// ============================================================================
// TENANT CREATION SCHEMAS
// ============================================================================

/**
 * Tenant creation
 *
 * Business Rules:
 * - Tenant slug must be unique
 * - Organization ID (orgId) links to Better Auth organization
 * - Inactive tenants cannot access the system
 */
export const tenantCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  orgId: z.string().min(1, 'Organization ID is required').max(128),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update tenant
 */
export const tenantUpdateSchema = tenantCreateSchema.partial().omit({ orgId: true });

// ============================================================================
// TENANT QUERY SCHEMAS
// ============================================================================

/**
 * Tenant list query parameters
 */
export const tenantQuerySchema = baseQuerySchema.extend({
  name: z.string().optional(),
  slug: z.string().optional(),
  isActive: booleanQueryParamSchema.optional(),
});

// ============================================================================
// TENANT RESPONSE SCHEMAS
// ============================================================================

/**
 * Tenant data in responses
 */
export const tenantDataSchema = z.object({
  id: uuidSchema,
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.any()).nullable(),
  // Statistics
  totalUsers: z.number().optional(),
  totalLocations: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Single tenant response
 */
export const tenantResponseSchema = successResponseSchema(tenantDataSchema);

/**
 * Paginated tenants response
 */
export const tenantsResponseSchema = paginatedResponseSchema(tenantDataSchema);

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type TenantCreate = z.infer<typeof tenantCreateSchema>;
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>;
export type TenantQuery = z.infer<typeof tenantQuerySchema>;
export type TenantData = z.infer<typeof tenantDataSchema>;
export type TenantResponse = z.infer<typeof tenantResponseSchema>;
export type TenantsResponse = z.infer<typeof tenantsResponseSchema>;
