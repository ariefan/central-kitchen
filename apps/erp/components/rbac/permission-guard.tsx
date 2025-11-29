"use client";

import React from 'react';
import { useEnhancedPermissions } from '@/hooks/use-enhanced-permissions';
import { PermissionGuardProps } from '@/types/rbac';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock } from 'lucide-react';

/**
 * PermissionGuard Component
 * 
 * A comprehensive permission guard that supports multiple rendering modes:
 * - hide: Completely hide the content if no permission
 * - disable: Render content but disable it
 * - readonly: Render content in readonly state
 */
export function PermissionGuard({
    permission,
    permissions,
    resource,
    action,
    mode = 'hide',
    fallback = null,
    loading = null,
    children,
    onAccessDenied,
}: PermissionGuardProps) {
    const {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        loading: permissionsLoading,
        checkPermission
    } = useEnhancedPermissions();

    // Handle loading state
    if (permissionsLoading) {
        return <>{loading}</>;
    }

    // Determine what to check
    let hasAccess = false;
    let permissionResult: { granted: boolean; source?: string; reason?: string } | null = null;

    if (permission) {
        // Single permission check
        const [res, act] = permission.split(':');
        hasAccess = hasPermission(res, act);
        permissionResult = checkPermission({ resource: res, action: act });
    } else if (permissions && permissions.length > 0) {
        // Multiple permissions check (ANY by default)
        const checks = permissions.map(p => {
            const [res, act] = p.split(':');
            return { resource: res, action: act };
        });
        hasAccess = hasAnyPermission(checks);
    } else if (resource && action) {
        // Resource/action check
        hasAccess = hasPermission(resource, action);
        permissionResult = checkPermission({ resource, action });
    }

    // Handle access denied
    if (!hasAccess) {
        onAccessDenied?.();

        switch (mode) {
            case 'hide':
                return <>{fallback}</>;

            case 'disable':
                return (
                    <div className="relative">
                        <div className="opacity-50 pointer-events-none">
                            {children}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-background/90 rounded-lg p-2 shadow-sm border">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                );

            case 'readonly':
                return (
                    <div className="opacity-75 pointer-events-none">
                        {children}
                    </div>
                );

            default:
                return <>{fallback}</>;
        }
    }

    // Has access - render children normally
    return <>{children}</>;
}

/**
 * PermissionButton Component
 * 
 * A button that automatically handles permission checking
 */
export function PermissionButton({
    permission,
    permissions,
    resource,
    action,
    mode = 'hide',
    fallback,
    onAccessDenied,
    ...buttonProps
}: PermissionGuardProps & Omit<React.ComponentProps<typeof Button>, 'children'> & {
    children: React.ReactNode;
}) {
    return (
        <PermissionGuard
            permission={permission}
            permissions={permissions}
            resource={resource}
            action={action}
            mode={mode}
            fallback={fallback || (
                <Button {...buttonProps} disabled>
                    <Lock className="h-4 w-4 mr-2" />
                    Access Restricted
                </Button>
            )}
            onAccessDenied={onAccessDenied}
        >
            <Button {...buttonProps}>
                {buttonProps.children}
            </Button>
        </PermissionGuard>
    );
}

/**
 * PermissionLink Component
 * 
 * A link that automatically handles permission checking
 */
export function PermissionLink({
    permission,
    permissions,
    resource,
    action,
    mode = 'hide',
    fallback,
    onAccessDenied,
    children,
    className,
    ...props
}: PermissionGuardProps & Omit<React.ComponentProps<'a'>, 'children'>) {
    return (
        <PermissionGuard
            permission={permission}
            permissions={permissions}
            resource={resource}
            action={action}
            mode={mode}
            fallback={fallback || (
                <span className={className} {...props}>
                    <Lock className="h-4 w-4 inline mr-1" />
                    Access Restricted
                </span>
            )}
            onAccessDenied={onAccessDenied}
        >
            <a className={className} {...props}>
                {children}
            </a>
        </PermissionGuard>
    );
}

/**
 * PermissionAlert Component
 * 
 * Shows an alert when user doesn't have permission
 */
export function PermissionAlert({
    permission,
    permissions,
    resource,
    action,
    title = "Access Restricted",
    message,
    className,
}: {
    permission?: string;
    permissions?: string[];
    resource?: string;
    action?: string;
    title?: string;
    message?: string;
    className?: string;
}) {
    const { hasPermission, hasAnyPermission } = useEnhancedPermissions();

    let hasAccess = false;

    if (permission) {
        const [res, act] = permission.split(':');
        hasAccess = hasPermission(res, act);
    } else if (permissions && permissions.length > 0) {
        const checks = permissions.map(p => {
            const [res, act] = p.split(':');
            return { resource: res, action: act };
        });
        hasAccess = hasAnyPermission(checks);
    } else if (resource && action) {
        hasAccess = hasPermission(resource, action);
    }

    if (hasAccess) {
        return null;
    }

    return (
        <div className={`flex items-center gap-2 p-4 border rounded-lg bg-yellow-50 border-yellow-200 ${className}`}>
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
                <h4 className="font-medium text-yellow-800">{title}</h4>
                <p className="text-sm text-yellow-700 mt-1">
                    {message || "You don't have permission to access this resource."}
                </p>
            </div>
        </div>
    );
}

/**
 * Higher-order component for permission-based route protection
 */
export function withPermissionGuard<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    permissionCheck: {
        permission?: string;
        permissions?: string[];
        resource?: string;
        action?: string;
        mode?: 'hide' | 'disable' | 'readonly';
        fallback?: React.ReactNode;
        onAccessDenied?: () => void;
    }
) {
    return function PermissionProtectedComponent(props: P) {
        return (
            <PermissionGuard {...permissionCheck}>
                <WrappedComponent {...props} />
            </PermissionGuard>
        );
    };
}

/**
 * Hook for creating permission-aware components
 */
export function usePermissionGuard() {
    const { checkPermission, hasPermission, hasAnyPermission } = useEnhancedPermissions();

    const createGuard = React.useCallback((
        check: { permission?: string; permissions?: string[]; resource?: string; action?: string },
        options?: { mode?: 'hide' | 'disable' | 'readonly' }
    ) => {
        const GuardComponent = (children: React.ReactNode, fallback?: React.ReactNode) => (
            <PermissionGuard
                permission={check.permission}
                permissions={check.permissions}
                resource={check.resource}
                action={check.action}
                mode={options?.mode || 'hide'}
                fallback={fallback}
            >
                {children}
            </PermissionGuard>
        );
    }, [checkPermission, hasPermission, hasAnyPermission]);

    const createButton = React.useCallback((
        check: { permission?: string; permissions?: string[]; resource?: string; action?: string },
        options?: { mode?: 'hide' | 'disable' | 'readonly' }
    ) => {
        const ButtonComponent = (props: React.ComponentProps<typeof Button>, children: React.ReactNode, fallback?: React.ReactNode) => (
            <PermissionButton
                permission={check.permission}
                permissions={check.permissions}
                resource={check.resource}
                action={check.action}
                mode={options?.mode || 'hide'}
                fallback={fallback}
                {...props}
            >
                {children}
            </PermissionButton>
        );
    }, [checkPermission, hasPermission, hasAnyPermission]);

    return {
        createGuard,
        createButton,
        checkPermission,
        hasPermission,
        hasAnyPermission,
    };
}

export default PermissionGuard;