"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Shield as ShieldIcon, Plus, Pencil, Trash2, Users, Settings } from "lucide-react";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/rbac/permission-guard";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { RoleFormSimple } from "@/components/rbac/role-form-simple";
import { Role, Permission, RoleCreateRequest, RoleUpdateRequest } from "@/types/rbac";

interface RoleWithPermissions extends Role {
    permissions?: Permission[];
    userCount?: number;
}

export default function RolesPage() {
    const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<RoleWithPermissions | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/roles?limit=100`, {
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                const rolesData = Array.isArray(data.data) ? data.data : [];

                // Fetch permissions for each role
                const rolesWithPermissions = await Promise.all(
                    rolesData.map(async (role: Role) => {
                        try {
                            const permResponse = await fetch(`/api/v1/roles/${role.id}/permissions`, {
                                credentials: "include",
                            });
                            if (permResponse.ok) {
                                const permData = await permResponse.json();
                                return {
                                    ...role,
                                    permissions: permData.data.permissions || [],
                                };
                            }
                            return { ...role, permissions: [] };
                        } catch (error) {
                            console.error(`Failed to fetch permissions for role ${role.id}:`, error);
                            return { ...role, permissions: [] };
                        }
                    })
                );

                setRoles(rolesWithPermissions);
            }
        } catch (error) {
            console.error("Failed to fetch roles:", error);
            toast.error("Failed to fetch roles");
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const response = await fetch(`/api/v1/permissions?limit=200`, {
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                setPermissions(Array.isArray(data.data) ? data.data : []);
            }
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
        }
    };

    useEffect(() => {
        fetchRoles();
        fetchPermissions();
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

    const handleCreateRole = async (data: RoleCreateRequest | (RoleUpdateRequest & { id?: string })) => {
        try {
            const response = await fetch(`/api/v1/roles`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    name: data.name,
                    slug: data.name?.toLowerCase().replace(/\s+/g, '_') || '',
                    description: data.description,
                    isActive: true, // Default to true for new roles
                }),
            });

            if (response.ok) {
                const result = await response.json();
                const newRole = result.data;

                // Assign permissions if provided
                if (data.permissions && data.permissions.length > 0) {
                    await assignPermissionsToRole(newRole.id, data.permissions);
                }

                toast.success("Role created successfully");
                setCreateDialogOpen(false);
                fetchRoles();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to create role");
            }
        } catch (error) {
            console.error("Failed to create role:", error);
            toast.error("Failed to create role");
        }
    };

    const handleUpdateRole = async (data: RoleCreateRequest | (RoleUpdateRequest & { id?: string })) => {
        if (!editingRole) return;

        try {
            const response = await fetch(`/api/v1/roles/${editingRole.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    name: data.name,
                    description: data.description,
                    isActive: 'isActive' in data ? data.isActive : true,
                }),
            });

            if (response.ok) {
                toast.success("Role updated successfully");
                setEditDialogOpen(false);
                setEditingRole(null);
                fetchRoles();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to update role");
            }
        } catch (error) {
            console.error("Failed to update role:", error);
            toast.error("Failed to update role");
        }
    };

    const assignPermissionsToRole = async (roleId: string, permissionStrings: string[]) => {
        // Convert permission strings to permission IDs
        const permissionIds = permissionStrings.map(permString => {
            const [resource, action] = permString.split(':');
            const permission = permissions.find(p => p.resource === resource && p.action === action);
            return permission?.id;
        }).filter(Boolean);

        if (permissionIds.length === 0) return;

        try {
            const response = await fetch(`/api/v1/roles/${roleId}/permissions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ permissionIds }),
            });

            if (!response.ok) {
                const error = await response.json();
                toast.error(error.message || "Failed to assign permissions");
            }
        } catch (error) {
            console.error("Failed to assign permissions:", error);
            toast.error("Failed to assign permissions");
        }
    };

    const handleEditRole = (role: RoleWithPermissions) => {
        setEditingRole(role);
        setEditDialogOpen(true);
    };

    const columns: Column<RoleWithPermissions>[] = [
        {
            key: "name",
            label: "Role Name",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <ShieldIcon className="w-4 h-4" />
                    <div>
                        <span className="font-medium">{row.name}</span>
                        <div className="text-sm text-muted-foreground">{row.slug}</div>
                    </div>
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
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>{row.permissions?.length || 0} permissions</span>
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
            key: "isSystemRole",
            label: "Type",
            render: (value) => (
                <Badge variant={value ? "destructive" : "outline"}>
                    {value ? "System" : "Custom"}
                </Badge>
            ),
        },
        {
            key: "id",
            label: "Actions",
            render: (_, row) => (
                <div className="flex gap-2">
                    <PermissionGuard permission="role:update">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRole(row)}
                            title="Edit role"
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                    </PermissionGuard>
                    <PermissionGuard permission="role:delete">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setRoleToDelete(row);
                                setDeleteDialogOpen(true);
                            }}
                            title="Delete role"
                            className="text-destructive hover:text-destructive"
                            disabled={row.isSystemRole}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </PermissionGuard>
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
                                Manage roles and their associated permissions
                            </CardDescription>
                        </div>
                        <PermissionGuard permission="role:create">
                            <Button onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                New Role
                            </Button>
                        </PermissionGuard>
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

            {/* Create Role Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                        <DialogDescription>
                            Define a new role with specific permissions and access levels
                        </DialogDescription>
                    </DialogHeader>
                    <RoleFormSimple
                        mode="create"
                        onSubmit={handleCreateRole}
                        onCancel={() => setCreateDialogOpen(false)}
                        availablePermissions={permissions}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Role</DialogTitle>
                        <DialogDescription>
                            Modify role configuration and permissions
                        </DialogDescription>
                    </DialogHeader>
                    {editingRole && (
                        <RoleFormSimple
                            mode="edit"
                            role={editingRole}
                            onSubmit={handleUpdateRole}
                            onCancel={() => {
                                setEditDialogOpen(false);
                                setEditingRole(null);
                            }}
                            availablePermissions={permissions}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Role</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the role "{roleToDelete?.name}"?
                            This action cannot be undone and will remove all permissions associated with this role.
                            {roleToDelete?.isSystemRole && (
                                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                                    <strong>Warning:</strong> This is a system role and cannot be deleted.
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting || roleToDelete?.isSystemRole}
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