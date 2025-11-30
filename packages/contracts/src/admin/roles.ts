/**
 * RBAC (Role-Based Access Control) contracts
 *
 * Manages roles and permissions in the multi-tenant ERP system.
 * Supports:
 * - System-level roles (super_user for app owner)
 * - Tenant-scoped roles (admin, manager, etc.)
 * - Multiple roles per user
 * - Dynamic permissions per role
 *
 * @module @contracts/erp/admin/roles
 */

import { z } from "zod";
import {
  baseQuerySchema,
  successResponseSchema,
  paginatedResponseSchema,
  deleteResponseSchema,
} from "../common.js";
import { uuidSchema, booleanQueryParamSchema } from "../primitives.js";

// ============================================================================
// PERMISSION SCHEMAS
// ============================================================================

/**
 * Permission data schema
 */
export const permissionDataSchema = z.object({
  id: uuidSchema,
  resource: z.string(),
  action: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
});

/**
 * Permission list query
 */
export const permissionQuerySchema = baseQuerySchema.extend({
  resource: z.string().optional(),
  action: z.string().optional(),
});

/**
 * Permission responses
 */
export const permissionResponseSchema =
  successResponseSchema(permissionDataSchema);
export const permissionsResponseSchema =
  paginatedResponseSchema(permissionDataSchema);

// ============================================================================
// ROLE SCHEMAS
// ============================================================================

/**
 * Role creation input
 */
export const roleCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug too long")
    .regex(
      /^[a-z0-9_]+$/,
      "Slug can only contain lowercase letters, numbers, and underscores"
    ),
  description: z.string().max(500, "Description too long").optional(),
  isActive: z.boolean().default(true),
});

/**
 * Role update input
 */
export const roleUpdateSchema = roleCreateSchema.partial();

/**
 * Role query parameters
 */
export const roleQuerySchema = baseQuerySchema.extend({
  name: z.string().optional(),
  slug: z.string().optional(),
  isActive: booleanQueryParamSchema.optional(),
});

/**
 * Role data in responses
 */
export const roleDataSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema.nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Optional stats
  userCount: z.number().optional(),
  permissionCount: z.number().optional(),
});

/**
 * Role with permissions
 */
export const roleWithPermissionsSchema = roleDataSchema.extend({
  permissions: z.array(permissionDataSchema),
});

/**
 * Role responses
 */
export const roleResponseSchema = successResponseSchema(roleDataSchema);
export const rolesResponseSchema = paginatedResponseSchema(roleDataSchema);
export const roleWithPermissionsResponseSchema = successResponseSchema(
  roleWithPermissionsSchema
);
export const roleDeleteResponseSchema = deleteResponseSchema;

// ============================================================================
// ROLE PERMISSION MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Assign permissions to role
 */
export const assignPermissionsSchema = z.object({
  permissionIds: z.array(uuidSchema).min(1, "At least one permission required"),
});

/**
 * Remove permissions from role
 */
export const removePermissionsSchema = z.object({
  permissionIds: z.array(uuidSchema).min(1, "At least one permission required"),
});

// ============================================================================
// USER ROLE MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Assign roles to user
 */
export const assignRolesToUserSchema = z.object({
  roleIds: z.array(uuidSchema).min(1, "At least one role required"),
});

/**
 * Remove roles from user
 */
export const removeRolesFromUserSchema = z.object({
  roleIds: z.array(uuidSchema).min(1, "At least one role required"),
});

/**
 * User with roles data
 */
export const userWithRolesDataSchema = z.object({
  id: uuidSchema,
  email: z.string(),
  name: z.string().nullable(),
  roles: z.array(roleDataSchema),
});

export const userWithRolesResponseSchema = successResponseSchema(
  userWithRolesDataSchema
);

// ============================================================================
// PERMISSION CHECK SCHEMAS
// ============================================================================

/**
 * Check if user has permission
 */
export const checkPermissionSchema = z.object({
  resource: z.string(),
  action: z.string(),
});

/**
 * Permission check result
 */
export const permissionCheckResultSchema = z.object({
  hasPermission: z.boolean(),
  roles: z.array(z.string()).optional(), // Role names that granted permission
});

export const permissionCheckResponseSchema = successResponseSchema(
  permissionCheckResultSchema
);

// ============================================================================
// CURRENT USER PERMISSIONS SCHEMA
// ============================================================================

/**
 * Current user's full permission set
 */
export const currentUserPermissionsSchema = z.object({
  userId: uuidSchema,
  roles: z.array(roleDataSchema),
  permissions: z.array(permissionDataSchema),
  isSuperUser: z.boolean(),
});

export const currentUserPermissionsResponseSchema = successResponseSchema(
  currentUserPermissionsSchema
);

// ============================================================================
// EXPORT TYPES
// ============================================================================

// Permission types
export type PermissionData = z.infer<typeof permissionDataSchema>;
export type PermissionQuery = z.infer<typeof permissionQuerySchema>;
export type PermissionResponse = z.infer<typeof permissionResponseSchema>;
export type PermissionsResponse = z.infer<typeof permissionsResponseSchema>;

// Role types
export type RoleCreate = z.infer<typeof roleCreateSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;
export type RoleQuery = z.infer<typeof roleQuerySchema>;
export type RoleData = z.infer<typeof roleDataSchema>;
export type RoleWithPermissions = z.infer<typeof roleWithPermissionsSchema>;
export type RoleResponse = z.infer<typeof roleResponseSchema>;
export type RolesResponse = z.infer<typeof rolesResponseSchema>;
export type RoleWithPermissionsResponse = z.infer<
  typeof roleWithPermissionsResponseSchema
>;
export type RoleDeleteResponse = z.infer<typeof roleDeleteResponseSchema>;

// Role permission management types
export type AssignPermissions = z.infer<typeof assignPermissionsSchema>;
export type RemovePermissions = z.infer<typeof removePermissionsSchema>;

// User role management types
export type AssignRolesToUser = z.infer<typeof assignRolesToUserSchema>;
export type RemoveRolesFromUser = z.infer<typeof removeRolesFromUserSchema>;
export type UserWithRolesData = z.infer<typeof userWithRolesDataSchema>;
export type UserWithRolesResponse = z.infer<typeof userWithRolesResponseSchema>;

// Permission check types
export type CheckPermission = z.infer<typeof checkPermissionSchema>;
export type PermissionCheckResult = z.infer<typeof permissionCheckResultSchema>;
export type PermissionCheckResponse = z.infer<
  typeof permissionCheckResponseSchema
>;

// Current user permissions types
export type CurrentUserPermissions = z.infer<
  typeof currentUserPermissionsSchema
>;
export type CurrentUserPermissionsResponse = z.infer<
  typeof currentUserPermissionsResponseSchema
>;
