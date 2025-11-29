"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Shield, Save, Trash2 } from "lucide-react";
import Link from "next/link";

interface RoleDefinition {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    isSystemRole?: boolean;
}

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

export default function EditRolePage() {
    const router = useRouter();
    const params = useParams();
    const roleId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [fetchingRole, setFetchingRole] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        isActive: true,
    });
    const [selectedRole, setSelectedRole] = useState<string>("");
    const [role, setRole] = useState<Role | null>(null);

    // Predefined roles that match the user form
    const predefinedRoles: RoleDefinition[] = [
        {
            id: "admin",
            name: "Admin",
            description: "Full system access with all permissions",
            permissions: ["user:read", "user:create", "user:update", "user:delete", "role:read", "role:create", "role:update", "role:delete", "product:read", "product:create", "product:update", "product:delete", "inventory:read", "inventory:update", "supplier:read", "supplier:create", "supplier:update", "supplier:delete"],
            isSystemRole: true
        },
        {
            id: "manager",
            name: "Manager",
            description: "Can manage most business operations except user management",
            permissions: ["product:read", "product:create", "product:update", "inventory:read", "inventory:update", "supplier:read", "supplier:create", "supplier:update"],
            isSystemRole: true
        },
        {
            id: "cashier",
            name: "Cashier",
            description: "Can handle sales and basic inventory operations",
            permissions: ["product:read", "inventory:read", "inventory:update"],
            isSystemRole: true
        },
        {
            id: "staff",
            name: "Staff",
            description: "Basic read-only access to most modules",
            permissions: ["product:read", "inventory:read", "supplier:read"],
            isSystemRole: true
        }
    ];

    // Fetch role data
    useEffect(() => {
        const fetchRole = async () => {
            try {
                const roleResponse = await fetch(`/api/v1/roles/${roleId}`, {
                    credentials: "include",
                });

                if (roleResponse.ok) {
                    const roleData = await roleResponse.json();
                    setRole(roleData.data);
                    setFormData({
                        name: roleData.data.name,
                        description: roleData.data.description || "",
                        isActive: roleData.data.isActive,
                    });
                    setSelectedRole(roleData.data.slug || "");
                } else {
                    toast.error("Failed to fetch role details");
                    router.push("/roles");
                    return;
                }
            } catch (error) {
                console.error("Failed to fetch role:", error);
                toast.error("Failed to load role data");
            } finally {
                setFetchingRole(false);
            }
        };

        if (roleId) {
            fetchRole();
        }
    }, [roleId, router]);

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleRoleSelect = (roleId: string) => {
        setSelectedRole(roleId);
        const roleDef = predefinedRoles.find(r => r.id === roleId);
        if (roleDef) {
            setFormData({
                name: roleDef.name,
                description: roleDef.description,
                isActive: true,
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Role name is required");
            return;
        }

        if (!selectedRole) {
            toast.error("Please select a predefined role type");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/v1/roles/${roleId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    slug: selectedRole,
                    permissions: predefinedRoles.find(r => r.id === selectedRole)?.permissions || [],
                    isActive: formData.isActive,
                    isSystemRole: predefinedRoles.find(r => r.id === selectedRole)?.isSystemRole || false,
                }),
            });

            if (response.ok) {
                toast.success("Role updated successfully");
                router.push("/roles");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to update role");
            }
        } catch (error) {
            console.error("Failed to update role:", error);
            toast.error("Failed to update role");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this role? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await fetch(`/api/v1/roles/${roleId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                toast.success("Role deleted successfully");
                router.push("/roles");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to delete role");
            }
        } catch (error) {
            console.error("Failed to delete role:", error);
            toast.error("Failed to delete role");
        }
    };

    if (fetchingRole) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (!role) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="text-center py-8">
                    <p className="text-muted-foreground">Role not found</p>
                    <Link href="/roles">
                        <Button className="mt-4">Back to Roles</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const isSystemRole = role.isSystemRole || role.slug === 'super_user';

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/roles">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Edit Role</h1>
                            <p className="text-muted-foreground">Modify role permissions and settings</p>
                        </div>
                    </div>

                    {!isSystemRole && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Role
                        </Button>
                    )}
                </div>

                {isSystemRole && (
                    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                                <Shield className="w-5 h-5" />
                                <span className="font-medium">System Role</span>
                            </div>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                This is a system role with special privileges. Some modifications may be restricted.
                            </p>
                        </CardContent>
                    </Card>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Basic Information
                            </CardTitle>
                            <CardDescription>
                                Configure basic properties of role
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Role Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange("name", e.target.value)}
                                        placeholder="Enter role name"
                                        required
                                        disabled={isSystemRole}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="status"
                                            checked={formData.isActive}
                                            onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                                            disabled={isSystemRole}
                                        />
                                        <Label htmlFor="status">Active</Label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange("description", e.target.value)}
                                    placeholder="Describe the purpose and responsibilities of this role"
                                    rows={3}
                                    disabled={isSystemRole}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Role Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Role Type</CardTitle>
                            <CardDescription>
                                Select a predefined role type that matches the user form
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {predefinedRoles.map((roleDef) => (
                                    <div
                                        key={roleDef.id}
                                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedRole === roleDef.id
                                                ? "border-primary bg-primary/5"
                                                : "hover:bg-muted/50"
                                            }`}
                                        onClick={() => !isSystemRole && handleRoleSelect(roleDef.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="radio"
                                                name="roleType"
                                                checked={selectedRole === roleDef.id}
                                                onChange={() => !isSystemRole && handleRoleSelect(roleDef.id)}
                                                disabled={isSystemRole}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <h3 className="font-medium">{roleDef.name}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {roleDef.description}
                                                </p>
                                                <div className="mt-2">
                                                    <Badge variant={roleDef.isSystemRole ? "secondary" : "outline"}>
                                                        {roleDef.permissions.length} permissions
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedRole && (
                                <div className="mt-6 p-4 bg-muted rounded-lg">
                                    <p className="text-sm font-medium">
                                        Selected: {predefinedRoles.find(r => r.id === selectedRole)?.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This role will have {predefinedRoles.find(r => r.id === selectedRole)?.permissions.length} permissions
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link href="/roles">
                            <Button variant="outline" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={loading || isSystemRole}>
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Update Role
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}