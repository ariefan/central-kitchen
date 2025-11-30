"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "./use-auth";
import {
  Permission,
  Role,
  UserRole,
  PermissionCheck,
  PermissionResult,
  EffectivePermissions,
  RoleContext,
  PermissionString,
} from "@/types/rbac";

interface EnhancedPermissionsState {
  permissions: Permission[];
  roles: Role[];
  userRoles: UserRole[];
  effectivePermissions: EffectivePermissions | null;
  loading: boolean;
  error: string | null;
}

interface UsePermissionsReturn extends EnhancedPermissionsState {
  // Permission checking methods
  hasPermission: (
    resource: string,
    action: string,
    context?: RoleContext
  ) => boolean;
  hasAnyPermission: (
    checks: Array<{ resource: string; action: string }>,
    context?: RoleContext
  ) => boolean;
  hasAllPermissions: (
    checks: Array<{ resource: string; action: string }>,
    context?: RoleContext
  ) => boolean;
  hasRole: (roleSlug: string) => boolean;
  hasAnyRole: (roleSlugs: string[]) => boolean;
  hasAllRoles: (roleSlugs: string[]) => boolean;
  isSuperUser: () => boolean;

  // Advanced permission checking
  checkPermission: (check: PermissionCheck) => PermissionResult;
  getEffectivePermissions: (context?: RoleContext) => EffectivePermissions;

  // Utility methods
  refreshPermissions: () => Promise<void>;
  clearCache: () => void;
}

// Cache for permission calculations
const permissionCache = new Map<string, PermissionResult>();
const effectivePermissionsCache = new Map<string, EffectivePermissions>();

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const [state, setState] = useState<EnhancedPermissionsState>({
    permissions: [],
    roles: [],
    userRoles: [],
    effectivePermissions: null,
    loading: true,
    error: null,
  });

  // Generate cache key for permission checks
  const generateCacheKey = useCallback((check: PermissionCheck): string => {
    const contextStr = check.context ? JSON.stringify(check.context) : "";
    return `${check.resource}:${check.action}:${contextStr}`;
  }, []);

  // Generate cache key for effective permissions
  const generateEffectivePermissionsKey = useCallback(
    (context?: RoleContext): string => {
      const contextStr = context ? JSON.stringify(context) : "";
      return `${user?.id || "anonymous"}:${contextStr}`;
    },
    [user?.id]
  );

  // Fetch permissions and roles from API
  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        permissions: [],
        roles: [],
        userRoles: [],
        effectivePermissions: null,
        loading: false,
        error: null,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/permissions/me`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch permissions: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const effectivePermissions: EffectivePermissions = {
          userId: user.id,
          permissions: data.data.permissions,
          roles: data.data.roles,
          inheritedPermissions: [],
          lastCalculated: new Date().toISOString(),
        };

        // Cache effective permissions
        const cacheKey = generateEffectivePermissionsKey();
        effectivePermissionsCache.set(cacheKey, effectivePermissions);

        setState((prev) => ({
          ...prev,
          permissions: data.data.permissions,
          roles: data.data.roles,
          userRoles: [],
          effectivePermissions,
          loading: false,
          error: null,
        }));
      } else {
        throw new Error(data.message || "Failed to load permissions");
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [user, generateEffectivePermissionsKey]);

  // Calculate effective permissions with context
  const getEffectivePermissions = useCallback(
    (context?: RoleContext): EffectivePermissions => {
      if (!user) {
        return {
          userId: "",
          permissions: [],
          roles: [],
          inheritedPermissions: [],
          lastCalculated: new Date().toISOString(),
        };
      }

      const cacheKey = generateEffectivePermissionsKey(context);

      if (effectivePermissionsCache.has(cacheKey)) {
        return effectivePermissionsCache.get(cacheKey)!;
      }

      // Filter permissions based on context
      let filteredPermissions = state.permissions;

      if (context && Object.keys(context).length > 0) {
        filteredPermissions = state.permissions.filter((permission) => {
          // Apply context-based filtering logic here
          // This is a simplified version - you might want to implement more sophisticated logic
          return true; // For now, return all permissions
        });
      }

      const effective: EffectivePermissions = {
        userId: user.id,
        permissions: filteredPermissions,
        roles: state.roles,
        inheritedPermissions:
          state.effectivePermissions?.inheritedPermissions || [],
        context,
        lastCalculated: new Date().toISOString(),
      };

      effectivePermissionsCache.set(cacheKey, effective);
      return effective;
    },
    [user, state, generateEffectivePermissionsKey]
  );

  // Check a single permission with detailed result
  const checkPermission = useCallback(
    (check: PermissionCheck): PermissionResult => {
      if (!user) {
        return { granted: false, reason: "User not authenticated" };
      }

      // Check cache first
      const cacheKey = generateCacheKey(check);
      if (permissionCache.has(cacheKey)) {
        return permissionCache.get(cacheKey)!;
      }

      const effective = getEffectivePermissions(check.context);

      // Super user has all permissions
      if (effective.roles.some((role) => role.slug === "super_user")) {
        const result = {
          granted: true,
          source: "role" as const,
          reason: "Super user",
        };
        permissionCache.set(cacheKey, result);
        return result;
      }

      // Check direct permissions
      const permissionString =
        `${check.resource}:${check.action}` as PermissionString;
      const directPermission = effective.permissions.find(
        (p) => `${p.resource}:${p.action}` === permissionString
      );

      if (directPermission) {
        const result = {
          granted: true,
          permission: directPermission,
          source: "direct" as const,
          conditions: check.conditions,
        };
        permissionCache.set(cacheKey, result);
        return result;
      }

      // Check inherited permissions
      const inheritedPermission = effective.inheritedPermissions.find(
        (p) => `${p.resource}:${p.action}` === permissionString
      );

      if (inheritedPermission) {
        const result = {
          granted: true,
          permission: inheritedPermission,
          source: "inherited" as const,
          conditions: check.conditions,
        };
        permissionCache.set(cacheKey, result);
        return result;
      }

      const result = { granted: false, reason: "Permission not found" };
      permissionCache.set(cacheKey, result);
      return result;
    },
    [user, getEffectivePermissions, generateCacheKey]
  );

  // Simple permission check (boolean)
  const hasPermission = useCallback(
    (resource: string, action: string, context?: RoleContext): boolean => {
      return checkPermission({ resource, action, conditions: {}, context })
        .granted;
    },
    [checkPermission]
  );

  // Check if user has ANY of the specified permissions
  const hasAnyPermission = useCallback(
    (
      checks: Array<{ resource: string; action: string }>,
      context?: RoleContext
    ): boolean => {
      return checks.some(({ resource, action }) =>
        hasPermission(resource, action, context)
      );
    },
    [hasPermission]
  );

  // Check if user has ALL of the specified permissions
  const hasAllPermissions = useCallback(
    (
      checks: Array<{ resource: string; action: string }>,
      context?: RoleContext
    ): boolean => {
      return checks.every(({ resource, action }) =>
        hasPermission(resource, action, context)
      );
    },
    [hasPermission]
  );

  // Check if user has a specific role
  const hasRole = useCallback(
    (roleSlug: string): boolean => {
      if (!user) return false;
      return state.roles.some(
        (role) => role.slug === roleSlug && role.isActive
      );
    },
    [user, state.roles]
  );

  // Check if user has ANY of the specified roles
  const hasAnyRole = useCallback(
    (roleSlugs: string[]): boolean => {
      if (!user) return false;
      return state.roles.some(
        (role) => roleSlugs.includes(role.slug) && role.isActive
      );
    },
    [user, state.roles]
  );

  // Check if user has ALL of the specified roles
  const hasAllRoles = useCallback(
    (roleSlugs: string[]): boolean => {
      if (!user) return false;
      return roleSlugs.every((slug) =>
        state.roles.some((role) => role.slug === slug && role.isActive)
      );
    },
    [user, state.roles]
  );

  // Check if user is super user
  const isSuperUser = useCallback((): boolean => {
    return hasRole("super_user");
  }, [hasRole]);

  // Clear all caches
  const clearCache = useCallback(() => {
    permissionCache.clear();
    effectivePermissionsCache.clear();
  }, []);

  // Refresh permissions from server
  const refreshPermissions = useCallback(async () => {
    clearCache();
    await fetchPermissions();
  }, [fetchPermissions, clearCache]);

  // Load permissions on mount and when user changes
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      // Don't clear cache on unmount to preserve it across component renders
    };
  }, []);

  return {
    ...state,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isSuperUser,
    checkPermission,
    getEffectivePermissions,
    refreshPermissions,
    clearCache,
  };
}

// Utility function to create permission strings
export const createPermissionString = (
  resource: string,
  action: string
): PermissionString => {
  return `${resource}:${action}` as PermissionString;
};

// Utility function to parse permission strings
export const parsePermissionString = (
  permission: PermissionString
): { resource: string; action: string } => {
  const [resource, action] = permission.split(":");
  return { resource, action };
};

// Hook for permission-based component visibility
export function usePermissionGuard(
  permission: string | Array<{ resource: string; action: string }>,
  options?: {
    mode?: "any" | "all";
    context?: RoleContext;
  }
): boolean {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  if (Array.isArray(permission)) {
    if (options?.mode === "all") {
      return hasAllPermissions(permission, options?.context);
    } else {
      return hasAnyPermission(permission, options?.context);
    }
  }

  const [resource, action] = permission.split(":");
  return hasPermission(resource, action, options?.context);
}

// Hook for role-based component visibility
export function useRoleGuard(
  roles: string | string[],
  options?: { mode?: "any" | "all" }
): boolean {
  const { hasRole, hasAnyRole, hasAllRoles } = usePermissions();

  if (Array.isArray(roles)) {
    if (options?.mode === "all") {
      return hasAllRoles(roles);
    } else {
      return hasAnyRole(roles);
    }
  }

  return hasRole(roles);
}
