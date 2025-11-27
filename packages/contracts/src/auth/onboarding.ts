/**
 * Onboarding contracts for auth module
 *
 * Handles user onboarding flows like joining a tenant.
 * These endpoints use session-only authentication (no tenant required).
 *
 * @module @contracts/erp/auth/onboarding
 */

import { z } from 'zod';
import { successResponseSchema } from '../common.js';
import { uuidSchema } from '../primitives.js';

// ============================================================================
// JOIN TENANT SCHEMAS
// ============================================================================

/**
 * Join tenant request
 */
export const joinTenantSchema = z.object({
  slug: z.string().min(1, 'Tenant slug is required'),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Tenant lookup response data
 */
export const tenantLookupDataSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
});

/**
 * Tenant lookup response
 */
export const tenantLookupResponseSchema = successResponseSchema(tenantLookupDataSchema);

/**
 * Join tenant response data
 */
export const joinTenantDataSchema = z.object({
  user: z.object({
    id: uuidSchema,
    email: z.string(),
    tenantId: uuidSchema,
  }),
  tenant: z.object({
    id: uuidSchema,
    name: z.string(),
    slug: z.string(),
  }),
});

/**
 * Join tenant response
 */
export const joinTenantResponseSchema = successResponseSchema(joinTenantDataSchema);

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type JoinTenantInput = z.infer<typeof joinTenantSchema>;
export type TenantLookupData = z.infer<typeof tenantLookupDataSchema>;
export type TenantLookupResponse = z.infer<typeof tenantLookupResponseSchema>;
export type JoinTenantData = z.infer<typeof joinTenantDataSchema>;
export type JoinTenantResponse = z.infer<typeof joinTenantResponseSchema>;
