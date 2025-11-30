"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Users as UsersIcon, Plus, Pencil, Trash2, Shield, Mail } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User, Role } from "@/types/rbac";

interface UserWithRoles extends User {
    roles?: Role[];
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserWithRoles[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [roleAssignmentDialogOpen, setRoleAssignmentDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/users?limit=100&includeRoles=true`, {
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(Array.isArray(data.data) ? data.data : []);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await fetch(`/api/v1/roles?limit=100`, {
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                setRoles(Array.isArray(data.data) ? data.data : []);
            }
        } catch (error) {
            console.error("Failed to fetch roles:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const handleDelete = async () => {
        if (!userToDelete) return;

        setDeleting(true);
        try {
            const response = await fetch(`/api/v1/users/${userToDelete.id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                toast.success("User deactivated successfully");
                fetchUsers();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to deactivate user");
            }
        } catch (error) {
            console.error("Failed to delete user:", error);
            toast.error("Failed to deactivate user");
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const handleRoleAssignment = async () => {
        if (!selectedUser) return;

        try {
            // First, remove all existing roles
            const removeResponse = await fetch(`/api/v1/users/${selectedUser.id}/roles`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ roleIds: [] }),
            });

            if (!removeResponse.ok) {
                const error = await removeResponse.json();
                toast.error(error.message || "Failed to remove existing roles");
                return;
            }

            // Then, assign new roles
            if (selectedRoles.length > 0) {
                const assignResponse = await fetch(`/api/v1/users/${selectedUser.id}/roles`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ roleIds: selectedRoles }),
                });

                if (!assignResponse.ok) {
                    const error = await assignResponse.json();
                    toast.error(error.message || "Failed to assign roles");
                    return;
                }
            }

            toast.success("Roles updated successfully");
            setRoleAssignmentDialogOpen(false);
            setSelectedUser(null);
            setSelectedRoles([]);
            fetchUsers();
        } catch (error) {
            console.error("Failed to update user roles:", error);
            toast.error("Failed to update user roles");
        }
    };

    const openRoleAssignment = (user: UserWithRoles) => {
        setSelectedUser(user);
        setSelectedRoles(user.roles?.map(role => role.id) || []);
        setRoleAssignmentDialogOpen(true);
    };

    const columns: Column<UserWithRoles>[] = [
        {
            key: "email",
            label: "Email",
            render: (value) => (
                <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{value}</span>
                </div>
            ),
        },
        {
            key: "name",
            label: "Name",
            render: (_, row) => {
                const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
                return name || <span className="text-muted-foreground">-</span>;
            },
        },
        {
            key: "roles",
            label: "Roles",
            render: (_, row) => {
                if (!row.roles || row.roles.length === 0) {
                    return <Badge variant="outline">No roles</Badge>;
                }
                return (
                    <div className="flex gap-1 flex-wrap">
                        {row.roles.slice(0, 3).map((role) => (
                            <Badge key={role.id} variant="outline" className="text-xs">
                                {role.name}
                            </Badge>
                        ))}
                        {row.roles.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                                +{row.roles.length - 3}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            key: "location.name",
            label: "Location",
            render: (value) => value || <span className="text-muted-foreground">-</span>,
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
                    <PermissionGuard permission="user:update">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRoleAssignment(row)}
                            title="Manage user roles"
                        >
                            <Shield className="w-4 h-4" />
                        </Button>
                    </PermissionGuard>
                    <PermissionGuard permission="user:delete">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setUserToDelete(row);
                                setDeleteDialogOpen(true);
                            }}
                            title="Deactivate user"
                            className="text-destructive hover:text-destructive"
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
                                <UsersIcon className="w-5 h-5" />
                                Users
                            </CardTitle>
                            <CardDescription>
                                Manage user accounts and role assignments
                            </CardDescription>
                        </div>
                        <PermissionGuard permission="user:create">
                            <Button onClick={() => {/* TODO: Navigate to user creation page */ }}>
                                <Plus className="w-4 h-4 mr-2" />
                                New User
                            </Button>
                        </PermissionGuard>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={users}
                        loading={loading}
                        emptyMessage="No users found"
                    />
                </CardContent>
            </Card>

            {/* Role Assignment Dialog */}
            <Dialog open={roleAssignmentDialogOpen} onOpenChange={setRoleAssignmentDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage User Roles</DialogTitle>
                        <DialogDescription>
                            Assign roles to {selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Select Roles</label>
                                <Select
                                    value={selectedRoles[0] || ""}
                                    onValueChange={(value) => {
                                        if (value && !selectedRoles.includes(value)) {
                                            setSelectedRoles([...selectedRoles, value]);
                                        } else if (value) {
                                            setSelectedRoles(selectedRoles.filter(r => r !== value));
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select roles to assign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setRoleAssignmentDialogOpen(false);
                                        setSelectedUser(null);
                                        setSelectedRoles([]);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleRoleAssignment}>
                                    Update Roles
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to deactivate {userToDelete?.email}?
                            This will prevent them from logging in. You can reactivate them later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? "Deactivating..." : "Deactivate"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}