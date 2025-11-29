"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/common/data-table";
import { Users as UsersIcon, Plus, Pencil, Trash2 } from "lucide-react";
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
import { PermissionGuard } from "@/components/rbac/permission-guard";
import { MultiRoleAssignment } from "@/components/rbac/multi-role-assignment";
import { User, Role, Permission } from "@/types/rbac";

interface EnhancedUser extends User {
  roles?: Role[];
  permissions?: Permission[];
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<EnhancedUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/users?limit=100&includeRoles=true`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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

  const columns: Column<EnhancedUser>[] = [
    {
      key: "email",
      label: "Email",
    },
    {
      key: "firstName",
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
            {row.roles.slice(0, 2).map((role) => (
              <Badge key={role.id} variant="outline" className="text-xs">
                {role.name}
              </Badge>
            ))}
            {row.roles.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{row.roles.length - 2}
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
              onClick={() => router.push(`/users/${row.id}`)}
              title="Edit user"
            >
              <Pencil className="w-4 h-4" />
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
            <div className="flex gap-2">
              <PermissionGuard permission="user:create">
                <Button onClick={() => router.push("/users/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New User
                </Button>
              </PermissionGuard>
              <PermissionGuard permission="user:update">
                <Button variant="outline" onClick={() => setShowRoleAssignment(!showRoleAssignment)}>
                  <UsersIcon className="w-4 h-4 mr-2" />
                  {showRoleAssignment ? "Hide" : "Show"} Role Assignment
                </Button>
              </PermissionGuard>
            </div>
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

      {/* Role Assignment Panel */}
      {showRoleAssignment && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Role Assignment</CardTitle>
            <CardDescription>
              Assign and manage user roles with context-aware permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MultiRoleAssignment />
          </CardContent>
        </Card>
      )}

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
