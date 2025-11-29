"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Shield, Save } from "lucide-react";
import Link from "next/link";

interface RoleDefinition {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    isSystemRole?: boolean;
}

export default function NewRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        isActive: true,
    });

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

    const [selectedRole, setSelectedRole] = useState<string>("");

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleRoleSelect = (roleId: string) => {
        setSelectedRole(roleId);
        const role = predefinedRoles.find(r => r.id === roleId);
        if (role) {
            setFormData({
                name: role.name,
                description: role.description,
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
            const response = await fetch("/api/v1/roles", {
                method: "POST",
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
                toast.success("Role created successfully");
                router.push("/roles");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to create role");
            }
        } catch (error) {
            console.error("Failed to create role:", error);
            toast.error("Failed to create role");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/roles">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Create New Role</h1>
                        <p className="text-muted-foreground">Define a new role with specific permissions</p>
                    </div>
                </div>

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
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="status"
                                            checked={formData.isActive}
                                            onCheckedChange={(checked) => handleInputChange("isActive", checked)}
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
                                {predefinedRoles.map((role) => (
                                    <div
                                        key={role.id}
                                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedRole === role.id
                                            ? "border-primary bg-primary/5"
                                            : "hover:bg-muted/50"
                                            }`}
                                        onClick={() => handleRoleSelect(role.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="radio"
                                                name="roleType"
                                                checked={selectedRole === role.id}
                                                onChange={() => handleRoleSelect(role.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <h3 className="font-medium">{role.name}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {role.description}
                                                </p>
                                                <div className="mt-2">
                                                    <Badge variant={role.isSystemRole ? "secondary" : "outline"}>
                                                        {role.permissions.length} permissions
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
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Create Role
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}