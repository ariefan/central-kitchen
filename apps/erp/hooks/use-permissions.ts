"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";

export interface UserPermissions {
  permissions: string[]; // Array of "resource:action" strings
  roles: Array<{
    id: string;
    name: string;
    isSystemRole: boolean;
  }>;
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    // Fetch user permissions from API
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/permissions/my-permissions`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch permissions");
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setPermissions(data.data);
        }
      })
      .catch((error) => {
        console.error("Error fetching permissions:", error);
        setPermissions({ permissions: [], roles: [] });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const hasPermission = (resource: string, action: string): boolean => {
    if (!permissions) return false;
    const permissionString = `${resource}:${action}`;
    return permissions.permissions.includes(permissionString);
  };

  const hasAnyPermission = (permissionPairs: Array<{ resource: string; action: string }>): boolean => {
    return permissionPairs.some(({ resource, action }) => hasPermission(resource, action));
  };

  const hasRole = (roleName: string): boolean => {
    if (!permissions) return false;
    return permissions.roles.some((role) => role.name === roleName);
  };

  const isSuperUser = (): boolean => {
    return hasRole("super_user");
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isSuperUser,
  };
}
