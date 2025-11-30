"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export default function RbacPage() {
  const [activeTab, setActiveTab] = useState("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/roles?limit=100`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRoles(data.data);
      }
    } catch {
      toast.error("Failed to fetch roles");
    }
  }, [apiUrl]);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/permissions?limit=200`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPermissions(data.data);
      }
    } catch {
      toast.error("Failed to fetch permissions");
    }
  }, [apiUrl]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/users?limit=100`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch {
      toast.error("Failed to fetch users");
    }
  }, [apiUrl]);

  // Fetch data
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    fetchUsers();
  }, [fetchRoles, fetchPermissions, fetchUsers]);

  const createRole = () => {
    setEditingRole({
      id: "",
      name: "",
      slug: "",
      description: "",
      isSystemRole: false,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const editRole = (role: Role) => {
    setEditingRole(role);
    setIsDialogOpen(true);
  };

  const saveRole = async () => {
    if (!editingRole) return;

    try {
      const isNew = !editingRole.id;
      const url = isNew
        ? `${apiUrl}/api/v1/roles`
        : `${apiUrl}/api/v1/roles/${editingRole.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editingRole.name,
          slug: editingRole.slug,
          description: editingRole.description,
          isActive: editingRole.isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Role ${isNew ? "created" : "updated"} successfully`);
        setIsDialogOpen(false);
        setEditingRole(null);
        fetchRoles();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save role");
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/v1/roles/${roleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Role deleted successfully");
        fetchRoles();
      }
    } catch {
      toast.error("Failed to delete role");
    }
  };

  // Group permissions by resource
  const groupedPermissions = Array.isArray(permissions)
    ? permissions.reduce((acc, perm) => {
        if (!acc[perm.resource]) acc[perm.resource] = [];
        acc[perm.resource].push(perm);
        return acc;
      }, {} as Record<string, Permission[]>)
    : {};

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Access Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage roles, permissions, and user access
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>
                  Create and manage roles with specific permissions
                </CardDescription>
              </div>
              <Button onClick={createRole}>
                <Plus className="w-4 h-4 mr-2" />
                New Role
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {role.slug}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isSystemRole ? "default" : "secondary"}>
                          {role.isSystemRole ? "System" : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isActive ? "default" : "outline"}>
                          {role.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editRole(role)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {!role.isSystemRole && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRole(role.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UserRoleAssignments users={users} roles={roles} apiUrl={apiUrl || ""} />
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole?.id ? "Edit Role" : "Create New Role"}
            </DialogTitle>
            <DialogDescription>
              Configure role details and assign permissions
            </DialogDescription>
          </DialogHeader>

          {editingRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingRole.name}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, name: e.target.value })
                    }
                    placeholder="Administrator"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={editingRole.slug}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, slug: e.target.value })
                    }
                    placeholder="admin"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingRole.description || ""}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, description: e.target.value })
                  }
                  placeholder="Role description..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={editingRole.isActive}
                  onCheckedChange={(checked) =>
                    setEditingRole({ ...editingRole, isActive: !!checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              {editingRole.id && (
                <RolePermissions
                  roleId={editingRole.id}
                  permissions={permissions}
                  groupedPermissions={groupedPermissions}
                  apiUrl={apiUrl || ""}
                />
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRole}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for managing role permissions
function RolePermissions({
  roleId,
  permissions,
  groupedPermissions,
  apiUrl,
}: {
  roleId: string;
  permissions: Permission[];
  groupedPermissions: Record<string, Permission[]>;
  apiUrl: string;
}) {
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchRolePermissions = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/roles/${roleId}/permissions`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        const permIds = new Set<string>(data.data.permissions.map((p: Permission) => p.id));
        setRolePermissions(permIds);
      }
    } catch {
      console.error("Error fetching role permissions");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, roleId]);

  useEffect(() => {
    fetchRolePermissions();
  }, [fetchRolePermissions]);

  const togglePermission = async (permissionId: string, checked: boolean) => {
    try {
      const url = `${apiUrl}/api/v1/roles/${roleId}/permissions`;
      const method = checked ? "POST" : "DELETE";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ permissionIds: [permissionId] }),
      });

      const data = await res.json();
      if (data.success) {
        setRolePermissions((prev) => {
          const next = new Set(prev);
          if (checked) {
            next.add(permissionId);
          } else {
            next.delete(permissionId);
          }
          return next;
        });
        toast.success(`Permission ${checked ? "added" : "removed"}`);
      }
    } catch {
      toast.error("Failed to update permission");
    }
  };

  if (loading) return <div>Loading permissions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Permissions</Label>
        <p className="text-sm text-muted-foreground">
          {rolePermissions.size} / {permissions.length} selected
        </p>
      </div>

      <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(groupedPermissions).map(([resource, perms]) => (
          <div key={resource} className="space-y-2">
            <h4 className="font-medium text-sm capitalize border-b pb-2">
              {resource.replace(/_/g, " ")}
            </h4>
            <div className="grid grid-cols-2 gap-2 pl-4">
              {perms.map((perm) => (
                <div key={perm.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={perm.id}
                    checked={rolePermissions.has(perm.id)}
                    onCheckedChange={(checked) =>
                      togglePermission(perm.id, !!checked)
                    }
                  />
                  <Label htmlFor={perm.id} className="text-sm font-normal cursor-pointer">
                    {perm.action}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component for assigning roles to users
function UserRoleAssignments({
  users,
  roles,
  apiUrl,
}: {
  users: User[];
  roles: Role[];
  apiUrl: string;
}) {
  const [userRoles, setUserRoles] = useState<Record<string, Set<string>>>({});

  const fetchUserRoles = useCallback(
    async (userId: string) => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/roles/users/${userId}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.success) {
          setUserRoles((prev) => ({
            ...prev,
            [userId]: new Set(data.data.roles.map((r: Role) => r.id)),
          }));
        }
      } catch {
        console.error("Error fetching user roles");
      }
    },
    [apiUrl]
  );

  useEffect(() => {
    if (users.length > 0) {
      users.forEach((user) => fetchUserRoles(user.id));
    }
  }, [users, fetchUserRoles]);

  const toggleUserRole = async (userId: string, roleId: string, checked: boolean) => {
    try {
      const url = `${apiUrl}/api/v1/roles/users/${userId}/roles`;
      const method = checked ? "POST" : "DELETE";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roleIds: [roleId] }),
      });

      const data = await res.json();
      if (data.success) {
        setUserRoles((prev) => {
          const next = { ...prev };
          const userRoleSet = new Set(next[userId] || []);
          if (checked) {
            userRoleSet.add(roleId);
          } else {
            userRoleSet.delete(roleId);
          }
          next[userId] = userRoleSet;
          return next;
        });
        toast.success(`Role ${checked ? "assigned" : "removed"}`);
      }
    } catch {
      toast.error("Failed to update user roles");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Assignments</CardTitle>
        <CardDescription>Assign roles to users quickly</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              {roles.map((role) => (
                <TableHead key={role.id} className="text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{role.name}</span>
                    <code className="text-xs text-muted-foreground">{role.slug}</code>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </TableCell>
                {roles.map((role) => (
                  <TableCell key={role.id} className="text-center">
                    <Checkbox
                      checked={userRoles[user.id]?.has(role.id) || false}
                      onCheckedChange={(checked) =>
                        toggleUserRole(user.id, role.id, !!checked)
                      }
                      className="mx-auto"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
