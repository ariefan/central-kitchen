/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Provides permission-based access control:
 * - Load user roles and permissions
 * - Check if user has specific permission
 * - Middleware to require permissions
 * - Helper functions for permission checks
 *
 * @module middleware/rbac
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "@/config/database.js";
import {
  roles,
  permissions,
  userRoles,
  rolePermissions,
} from "@/config/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import { getUserId } from "./auth.js";

// ============================================================================
// TYPES
// ============================================================================

export interface RoleData {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface PermissionData {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface UserPermissions {
  roles: RoleData[];
  permissions: PermissionData[];
  isSuperUser: boolean;
}

// Cache for user permissions (per request)
const permissionCache = new Map<string, UserPermissions>();

// ============================================================================
// PERMISSION LOADING
// ============================================================================

/**
 * Load all roles and permissions for a user
 * Results are cached per request
 */
export async function loadUserPermissions(
  userId: string
): Promise<UserPermissions> {
  // Check cache first
  const cached = permissionCache.get(userId);
  if (cached) {
    return cached;
  }

  // Get user's roles
  const userRoleRecords = await db
    .select({
      role: roles,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.isActive, true)));

  const roleData: RoleData[] = userRoleRecords.map((r) => ({
    id: r.role.id,
    tenantId: r.role.tenantId,
    name: r.role.name,
    slug: r.role.slug,
    description: r.role.description,
    isActive: r.role.isActive,
  }));

  // Check if user has admin role (only admin username is super_user)
  const isSuperUser = roleData.some((r) => r.slug === "admin");

  // Get permissions for these roles
  let permissionData: PermissionData[] = [];

  if (roleData.length > 0) {
    const roleIds = roleData.map((r) => r.id);

    const rolePermissionRecords = await db
      .select({
        permission: permissions,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds));

    permissionData = rolePermissionRecords.map((rp) => ({
      id: rp.permission.id,
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description,
    }));

    // Remove duplicates
    permissionData = Array.from(
      new Map(
        permissionData.map((p) => [`${p.resource}:${p.action}`, p])
      ).values()
    );
  }

  const result: UserPermissions = {
    roles: roleData,
    permissions: permissionData,
    isSuperUser,
  };

  // Cache result
  permissionCache.set(userId, result);

  return result;
}

/**
 * Clear permission cache for a user
 * Call this when user roles/permissions are modified
 */
export function clearUserPermissionCache(userId: string): void {
  permissionCache.delete(userId);
}

/**
 * Clear all permission caches
 */
export function clearAllPermissionCaches(): void {
  permissionCache.clear();
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Check if user has a specific permission
 * @param userId - User ID
 * @param resource - Resource name (e.g., 'product', 'purchase_order')
 * @param action - Action name (e.g., 'create', 'read', 'approve')
 * @returns true if user has permission
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const userPerms = await loadUserPermissions(userId);

  // Super users have all permissions
  if (userPerms.isSuperUser) {
    return true;
  }

  // Check if user has the specific permission
  return userPerms.permissions.some(
    (p) => p.resource === resource && p.action === action
  );
}

/**
 * Check if user has ANY of the specified permissions
 * @param userId - User ID
 * @param checks - Array of [resource, action] tuples
 * @returns true if user has at least one permission
 */
export async function hasAnyPermission(
  userId: string,
  checks: Array<[string, string]>
): Promise<boolean> {
  const userPerms = await loadUserPermissions(userId);

  // Super users have all permissions
  if (userPerms.isSuperUser) {
    return true;
  }

  // Check if user has any of the permissions
  return checks.some(([resource, action]) =>
    userPerms.permissions.some(
      (p) => p.resource === resource && p.action === action
    )
  );
}

/**
 * Check if user has ALL of the specified permissions
 * @param userId - User ID
 * @param checks - Array of [resource, action] tuples
 * @returns true if user has all permissions
 */
export async function hasAllPermissions(
  userId: string,
  checks: Array<[string, string]>
): Promise<boolean> {
  const userPerms = await loadUserPermissions(userId);

  // Super users have all permissions
  if (userPerms.isSuperUser) {
    return true;
  }

  // Check if user has all of the permissions
  return checks.every(([resource, action]) =>
    userPerms.permissions.some(
      (p) => p.resource === resource && p.action === action
    )
  );
}

/**
 * Check if user has a specific role
 * @param userId - User ID
 * @param roleSlug - Role slug (e.g., 'admin', 'manager', 'super_user')
 * @returns true if user has role
 */
export async function hasRole(
  userId: string,
  roleSlug: string
): Promise<boolean> {
  const userPerms = await loadUserPermissions(userId);
  return userPerms.roles.some((r) => r.slug === roleSlug);
}

/**
 * Check if user has ANY of the specified roles
 * @param userId - User ID
 * @param roleSlugs - Array of role slugs
 * @returns true if user has at least one role
 */
export async function hasAnyRole(
  userId: string,
  roleSlugs: string[]
): Promise<boolean> {
  const userPerms = await loadUserPermissions(userId);
  return userPerms.roles.some((r) => roleSlugs.includes(r.slug));
}

/**
 * Check if user has ALL of the specified roles
 * @param userId - User ID
 * @param roleSlugs - Array of role slugs
 * @returns true if user has all roles
 */
export async function hasAllRoles(
  userId: string,
  roleSlugs: string[]
): Promise<boolean> {
  const userPerms = await loadUserPermissions(userId);
  return roleSlugs.every((slug) =>
    userPerms.roles.some((r) => r.slug === slug)
  );
}

/**
 * Check if user is super user
 * @param userId - User ID
 * @returns true if user is super user
 */
export async function isSuperUser(userId: string): Promise<boolean> {
  const userPerms = await loadUserPermissions(userId);
  return userPerms.isSuperUser;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to require a specific permission
 * @param resource - Resource name
 * @param action - Action name
 * @returns Fastify middleware
 */
export function requirePermission(resource: string, action: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const allowed = await hasPermission(userId, resource, action);

      if (!allowed) {
        return reply.status(403).send({
          success: false,
          error: "Forbidden",
          message: `You don't have permission to ${action} ${resource}`,
          code: "PERMISSION_DENIED",
        });
      }
    } catch (error) {
      request.log.error({ err: error }, "Permission check error");
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Permission check failed",
        code: "PERMISSION_CHECK_FAILED",
      });
    }
  };
}

/**
 * Middleware to require ANY of the specified permissions
 * @param checks - Array of [resource, action] tuples
 * @returns Fastify middleware
 */
export function requireAnyPermission(checks: Array<[string, string]>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const allowed = await hasAnyPermission(userId, checks);

      if (!allowed) {
        return reply.status(403).send({
          success: false,
          error: "Forbidden",
          message: "You don't have the required permissions",
          code: "PERMISSION_DENIED",
        });
      }
    } catch (error) {
      request.log.error({ err: error }, "Permission check error");
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Permission check failed",
        code: "PERMISSION_CHECK_FAILED",
      });
    }
  };
}

/**
 * Middleware to require ALL of the specified permissions
 * @param checks - Array of [resource, action] tuples
 * @returns Fastify middleware
 */
export function requireAllPermissions(checks: Array<[string, string]>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const allowed = await hasAllPermissions(userId, checks);

      if (!allowed) {
        return reply.status(403).send({
          success: false,
          error: "Forbidden",
          message: "You don't have all required permissions",
          code: "PERMISSION_DENIED",
        });
      }
    } catch (error) {
      request.log.error({ err: error }, "Permission check error");
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Permission check failed",
        code: "PERMISSION_CHECK_FAILED",
      });
    }
  };
}

/**
 * Middleware to require a specific role
 * @param roleSlug - Role slug
 * @returns Fastify middleware
 */
export function requireRole(roleSlug: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const allowed = await hasRole(userId, roleSlug);

      if (!allowed) {
        return reply.status(403).send({
          success: false,
          error: "Forbidden",
          message: `You need the '${roleSlug}' role to access this resource`,
          code: "ROLE_REQUIRED",
        });
      }
    } catch (error) {
      request.log.error({ err: error }, "Role check error");
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Role check failed",
        code: "ROLE_CHECK_FAILED",
      });
    }
  };
}

/**
 * Middleware to require ANY of the specified roles
 * @param roleSlugs - Array of role slugs
 * @returns Fastify middleware
 */
export function requireAnyRole(roleSlugs: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const allowed = await hasAnyRole(userId, roleSlugs);

      if (!allowed) {
        return reply.status(403).send({
          success: false,
          error: "Forbidden",
          message: `You need one of these roles: ${roleSlugs.join(", ")}`,
          code: "ROLE_REQUIRED",
        });
      }
    } catch (error) {
      request.log.error({ err: error }, "Role check error");
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Role check failed",
        code: "ROLE_CHECK_FAILED",
      });
    }
  };
}

/**
 * Middleware to require super user role
 * @returns Fastify middleware
 */
export function requireSuperUser() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const allowed = await isSuperUser(userId);

      if (!allowed) {
        return reply.status(403).send({
          success: false,
          error: "Forbidden",
          message: "Super user access required",
          code: "SUPER_USER_REQUIRED",
        });
      }
    } catch (error) {
      request.log.error({ err: error }, "Super user check error");
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Super user check failed",
        code: "SUPER_USER_CHECK_FAILED",
      });
    }
  };
}

// ============================================================================
// REQUEST HELPERS
// ============================================================================

/**
 * Get user permissions from request
 * This loads and caches the user's roles and permissions
 */
export async function getUserPermissions(
  request: FastifyRequest
): Promise<UserPermissions> {
  const userId = getUserId(request);
  return loadUserPermissions(userId);
}

/**
 * Attach user permissions to request
 * Call this in routes that need frequent permission checks
 */
export async function attachUserPermissions(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const userId = getUserId(request);
  const perms = await loadUserPermissions(userId);

  // Attach to request for easy access
  (request as any).userPermissions = perms;
}

// Type augmentation for Fastify request
declare module "fastify" {
  export interface FastifyRequest {
    userPermissions?: UserPermissions;
  }
}
