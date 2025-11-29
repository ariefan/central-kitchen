"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/common/data-table";
import { Shield as ShieldIcon, Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/use-permissions";

interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    userCount?: number;
    isActive: boolean;
    isSystemRole?: boolean;
    tenantId?: string | null;
    slug?: string;
}

export default function RolesPage() {
    const router = useRouter();
    const { isSuperUser } = usePermissions();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/v1/roles?limit=100`,
                { credentials: "include" }
            );

            if (response.ok) {
                const data = await response.json();
                const allRoles = Array.isArray(data.data) ? data.data : [];
                // Filter out super user role for non-super users
                const filteredRoles = isSuperUser()
                    ? allRoles
                    : allRoles.filter((role: Role) => role.slug !== 'super_user');
                setRoles(filteredRoles);
            }
        } catch (error) {
            console.error("Failed to fetch roles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleDelete = async () => {
        if (!roleToDelete) return;

        setDeleting(true);
        try {
            const response = await fetch(`/api/v1/roles/${roleToDelete.id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                toast.success("Role deleted successfully");
                fetchRoles();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to delete role");
            }
        } catch (error) {
            console.error("Failed to delete role:", error);
            toast.error("Failed to delete role");
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
            setRoleToDelete(null);
        }
    };

    const columns: Column<Role>[] = [
        {
            key: "name",
            label: "Name",
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <ShieldIcon className={`w-4 h-4 ${row.slug === 'super_user' ? 'text-orange-500' : 'text-primary'}`} />
                    <span className="font-medium">{value}</span>
                    {row.isSystemRole && (
                        <Badge variant={row.slug === 'super_user' ? 'destructive' : 'secondary'} className="text-xs">
                            {row.slug === 'super_user' ? 'Super User' : 'System'}
                        </Badge>
                    )}
                    {row.tenantId === null && row.slug !== 'super_user' && (
                        <Badge variant="outline" className="text-xs">
                            Global
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: "description",
            label: "Description",
            render: (value) => value || <span className="text-muted-foreground">-</span>,
        },
        {
            key: "permissions",
            label: "Permissions",
            render: (value, row) => (
                <Badge variant={row.slug === 'super_user' ? 'destructive' : 'outline'} className="text-xs">
                    {row.slug === 'super_user' ? 'Full System Access' : `${value?.length || 0} permissions`}
                </Badge>
            ),
        },
        {
            key: "userCount",
            label: "Users",
            render: (value) => (
                <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{value || 0}</span>
                </div>
            ),
        },
        {
            key: "isActive",
            label: "Status",
            render: (value) => (
                <Badge variant={value ? "default" : "secondary"}>
                    {value ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            key: "id",
            label: "Actions",
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/roles/${row.id}`)}
                        title="Edit role"
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setRoleToDelete(row);
                            setDeleteDialogOpen(true);
                        }}
                        title="Delete role"
                        className="text-destructive hover:text-destructive"
                        disabled={row.isSystemRole || row.slug === 'super_user' || !isSuperUser()}
                    >
                        <Trash2 className="w-4 h-4" />
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
                                <ShieldIcon className="w-5 h-5" />
                                Roles
                            </CardTitle>
                            <CardDescription>
                                Manage user roles and their permissions
                            </CardDescription>
                        </div>
                        <Button onClick={() => router.push("/roles/new")}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Role
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={roles}
                        loading={loading}
                        emptyMessage="No roles found"
                    />
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Role</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the role {roleToDelete?.name}?
                            {roleToDelete?.slug === 'super_user' && (
                                <span className="text-destructive font-medium block mt-2">
                                    WARNING: This is the Super User role with full system access. Deleting it may break the application.
                                </span>
                            )}
                            {roleToDelete?.userCount && roleToDelete.userCount > 0 && (
                                <span className="text-destructive font-medium block mt-2">
                                    This role is assigned to {roleToDelete.userCount} user(s). They will lose these permissions.
                                </span>
                            )}
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}