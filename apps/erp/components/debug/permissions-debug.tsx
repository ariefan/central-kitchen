"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";

export function PermissionsDebug() {
    const { user, profile } = useAuth();
    const {
        hasPermission,
        hasRole,
        isSuperUser,
        permissions,
        roles,
        loading
    } = usePermissions();

    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    return (
        <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto z-50 bg-yellow-50 border-yellow-200">
            <CardHeader>
                <CardTitle className="text-sm">Debug: Permissions</CardTitle>
                <CardDescription>
                    Current user permissions and roles
                </CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
                <div>
                    <strong>User:</strong> {user?.email} ({user?.id})
                </div>
                <div>
                    <strong>Profile:</strong> {profile?.tenant?.name} ({profile?.tenant?.id})
                </div>
                <div>
                    <strong>Is Super User:</strong> {isSuperUser() ? 'YES' : 'NO'}
                </div>
                <div>
                    <strong>Loading:</strong> {loading ? 'YES' : 'NO'}
                </div>

                <div>
                    <strong>Roles:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {roles.map((role) => (
                            <Badge key={role.id} variant="outline" className="text-xs">
                                {role.name} ({role.slug})
                            </Badge>
                        ))}
                    </div>
                </div>

                <div>
                    <strong>Permissions:</strong>
                    <div className="max-h-32 overflow-y-auto">
                        {permissions.map((permission) => (
                            <div key={`${permission.resource}:${permission.action}`} className="text-xs">
                                {permission.resource}:{permission.action}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <strong>Key Permission Checks:</strong>
                    <div className="space-y-1 mt-1">
                        <div className="flex justify-between">
                            <span>user:create:</span>
                            <Badge variant={hasPermission("user", "create") ? "default" : "destructive"}>
                                {hasPermission("user", "create") ? "GRANTED" : "DENIED"}
                            </Badge>
                        </div>
                        <div className="flex justify-between">
                            <span>user:update:</span>
                            <Badge variant={hasPermission("user", "update") ? "default" : "destructive"}>
                                {hasPermission("user", "update") ? "GRANTED" : "DENIED"}
                            </Badge>
                        </div>
                        <div className="flex justify-between">
                            <span>user:delete:</span>
                            <Badge variant={hasPermission("user", "delete") ? "default" : "destructive"}>
                                {hasPermission("user", "delete") ? "GRANTED" : "DENIED"}
                            </Badge>
                        </div>
                        <div className="flex justify-between">
                            <span>tenant:manage:</span>
                            <Badge variant={hasPermission("tenant", "manage") ? "default" : "destructive"}>
                                {hasPermission("tenant", "manage") ? "GRANTED" : "DENIED"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}