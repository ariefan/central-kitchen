"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/common/data-table";
import { Key as KeyIcon, Plus, Pencil, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";

interface Permission {
    id: string;
    name: string;
    resource: string;
    action: string;
    description?: string;
    roles: Array<{
        id: string;
        name: string;
        slug?: string;
    }>;
    isSystem?: boolean;
}

export default function PermissionsPage() {
    const router = useRouter();
    const { isSuperUser } = usePermissions();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/v1/permissions?limit=100`,
                { credentials: "include" }
            );

            if (response.ok) {
                const data = await response.json();
                const allPermissions = Array.isArray(data.data) ? data.data : [];
                // Filter out tenant-level permissions for non-super users
                const filteredPermissions = isSuperUser()
                    ? allPermissions
                    : allPermissions.filter((permission: Permission) => permission.resource !== 'tenant');
                setPermissions(filteredPermissions);
            }
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();
    }, []);

    const columns: Column<Permission>[] = [
        {
            key: "name",
            label: "Name",
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <KeyIcon className={`w-4 h-4 ${row.resource === 'tenant' ? 'text-orange-500' : 'text-primary'}`} />
                    <div>
                        <span className="font-medium">{value}</span>
                        {row.resource === 'tenant' && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                                Super User
                            </Badge>
                        )}
                        {row.isSystem && row.resource !== 'tenant' && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                                System
                            </Badge>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: "resource",
            label: "Resource",
            render: (value) => (
                <Badge variant={value === 'tenant' ? 'destructive' : 'outline'} className="capitalize">
                    {value}
                </Badge>
            ),
        },
        {
            key: "action",
            label: "Action",
            render: (value) => (
                <Badge variant="secondary" className="capitalize">
                    {value}
                </Badge>
            ),
        },
        {
            key: "description",
            label: "Description",
            render: (value) => value || <span className="text-muted-foreground">-</span>,
        },
        {
            key: "roles",
            label: "Assigned to Roles",
            render: (value) => {
                const hasSuperUser = value?.some((role: { slug?: string }) => role.slug === 'super_user');
                return (
                    <div className="flex items-center gap-1">
                        <Shield className={`w-4 h-4 ${hasSuperUser ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        <span>{value?.length || 0} roles</span>
                        {hasSuperUser && (
                            <Badge variant="destructive" className="text-xs ml-1">
                                Super User
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            key: "id",
            label: "Actions",
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/permissions/${row.id}`)}
                        title="Edit permission"
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <KeyIcon className="w-5 h-5" />
                                Permissions
                            </CardTitle>
                            <CardDescription>
                                Manage system permissions and access controls
                            </CardDescription>
                        </div>
                        <Button onClick={() => router.push("/permissions/new")}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Permission
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={permissions}
                        loading={loading}
                        emptyMessage="No permissions found"
                    />
                </CardContent>
            </Card>
        </div>
    );
}