"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Plus,
    Edit,
    Trash2,
    Users,
    Shield,
    Copy,
    Search,
    Eye
} from 'lucide-react';
import { useEnhancedPermissions } from '@/hooks/use-enhanced-permissions';
import { PermissionGuard } from './permission-guard';
import {
    Role,
    Permission,
    RoleCreateRequest,
    RoleUpdateRequest,
    RoleTemplate
} from '@/types/rbac';

interface RoleManagementProps {
    tenantId?: string;
    onRoleSelect?: (role: Role) => void;
    className?: string;
}

export function RoleManagement({ tenantId, onRoleSelect, className }: RoleManagementProps) {
    const { hasPermission } = useEnhancedPermissions();
    const queryClient = useQueryClient();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('roles');
    const [showInactive, setShowInactive] = useState(false);

    // Fetch roles
    const { data: roles = [] } = useQuery({
        queryKey: ['roles', tenantId, showInactive],
        queryFn: async () => {
            const response = await fetch(`/api/v1/roles${tenantId ? `?tenantId=${tenantId}` : ''}`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch roles');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Fetch permissions
    const { data: permissions = [] } = useQuery({
        queryKey: ['permissions'],
        queryFn: async () => {
            const response = await fetch('/api/v1/permissions', {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch permissions');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Fetch role templates
    const { data: templates = [] } = useQuery({
        queryKey: ['role-templates'],
        queryFn: async () => {
            const response = await fetch('/api/v1/role-templates', {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch templates');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Create role mutation
    const createRoleMutation = useMutation({
        mutationFn: async (roleData: RoleCreateRequest) => {
            const response = await fetch('/api/v1/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(roleData),
            });
            if (!response.ok) throw new Error('Failed to create role');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setIsCreateDialogOpen(false);
        },
    });

    // Update role mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, ...data }: RoleUpdateRequest & { id: string }) => {
            const response = await fetch(`/api/v1/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to update role');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setIsEditDialogOpen(false);
            setSelectedRole(null);
        },
    });

    // Delete role mutation
    const deleteRoleMutation = useMutation({
        mutationFn: async (roleId: string) => {
            const response = await fetch(`/api/v1/roles/${roleId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to delete role');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setSelectedRole(null);
        },
    });

    // Filter roles based on search and active status
    const filteredRoles = roles.filter((role: Role) => {
        const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesActive = showInactive || role.isActive;
        return matchesSearch && matchesActive;
    });

    const handleCreateRole = (roleData: RoleCreateRequest) => {
        createRoleMutation.mutate(roleData);
    };

    const handleUpdateRole = (roleData: RoleUpdateRequest) => {
        if (!selectedRole) return;
        updateRoleMutation.mutate({ id: selectedRole.id, ...roleData });
    };

    const handleDeleteRole = (roleId: string) => {
        if (confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
            deleteRoleMutation.mutate(roleId);
        }
    };

    const handleDuplicateRole = (role: Role) => {
        const duplicatedRole: RoleCreateRequest = {
            name: `${role.name} (Copy)`,
            slug: `${role.slug}-copy`,
            description: role.description,
            permissions: role.permissions?.map(p => `${p.resource}:${p.action}`) || [],
            metadata: role.metadata,
        };
        handleCreateRole(duplicatedRole);
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Role Management</h1>
                    <p className="text-muted-foreground">
                        Manage roles and their associated permissions
                    </p>
                </div>

                <PermissionGuard permission="role:create">
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Role
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New Role</DialogTitle>
                                <DialogDescription>
                                    Create a new role with specific permissions
                                </DialogDescription>
                            </DialogHeader>
                            <RoleForm
                                onSubmit={(data: RoleCreateRequest | RoleUpdateRequest) => {
                                    if (isCreateDialogOpen) {
                                        handleCreateRole(data as RoleCreateRequest);
                                    } else {
                                        handleUpdateRole(data as RoleUpdateRequest);
                                    }
                                }}
                                onCancel={() => setIsCreateDialogOpen(false)}
                                permissions={permissions}
                                templates={templates}
                                mode="create"
                            />
                        </DialogContent>
                    </Dialog>
                </PermissionGuard>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="roles">Roles</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
                </TabsList>

                {/* Roles Tab */}
                <TabsContent value="roles" className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search roles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="show-inactive"
                                checked={showInactive}
                                onCheckedChange={(checked: boolean) => setShowInactive(checked)}
                            />
                            <Label htmlFor="show-inactive">Show Inactive</Label>
                        </div>
                    </div>

                    {/* Roles Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRoles.map((role: Role) => (
                            <Card key={role.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-5 w-5" />
                                            <CardTitle className="text-lg">{role.name}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={role.isActive ? 'default' : 'secondary'}>
                                                {role.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                            {role.isSystemRole && (
                                                <Badge variant="outline">System</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <CardDescription>{role.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {/* Permissions Count */}
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="h-4 w-4" />
                                            {role.permissions?.length || 0} permissions
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedRole(role);
                                                    onRoleSelect?.(role);
                                                }}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>

                                            <PermissionGuard permission="role:update">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRole(role);
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                            </PermissionGuard>

                                            <PermissionGuard permission="role:create">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDuplicateRole(role)}
                                                >
                                                    <Copy className="h-4 w-4 mr-1" />
                                                    Copy
                                                </Button>
                                            </PermissionGuard>

                                            <PermissionGuard permission="role:delete">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteRole(role.id)}
                                                    disabled={role.isSystemRole}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Delete
                                                </Button>
                                            </PermissionGuard>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredRoles.length === 0 && (
                        <div className="text-center py-8">
                            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No roles found</h3>
                            <p className="text-muted-foreground">
                                {searchTerm ? 'Try adjusting your search terms' : 'Create your first role to get started'}
                            </p>
                        </div>
                    )}
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template: RoleTemplate) => (
                            <Card key={template.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <CardTitle className="text-lg">{template.name}</CardTitle>
                                    <CardDescription>{template.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <Badge variant="outline">{template.category}</Badge>
                                        <div className="text-sm text-muted-foreground">
                                            {template.permissions.length} permissions
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => {
                                                // Create role from template
                                                const roleFromTemplate: RoleCreateRequest = {
                                                    name: template.name,
                                                    description: template.description,
                                                    permissions: template.permissions,
                                                    templateId: template.id,
                                                };
                                                handleCreateRole(roleFromTemplate);
                                            }}
                                        >
                                            Use Template
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Hierarchy Tab */}
                <TabsContent value="hierarchy" className="space-y-4">
                    <RoleHierarchyView
                        roles={roles}
                        onRoleSelect={onRoleSelect}
                        editable={hasPermission('role', 'update')}
                    />
                </TabsContent>
            </Tabs>

            {/* Edit Role Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Role</DialogTitle>
                        <DialogDescription>
                            Update role permissions and settings
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRole && (
                        <RoleForm
                            role={selectedRole}
                            onSubmit={handleUpdateRole}
                            onCancel={() => setIsEditDialogOpen(false)}
                            permissions={permissions}
                            templates={templates}
                            mode="edit"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Role Form Component
interface RoleFormProps {
    role?: Role;
    onSubmit: (data: RoleCreateRequest | RoleUpdateRequest) => void;
    onCancel: () => void;
    permissions: Permission[];
    templates: RoleTemplate[];
    mode: 'create' | 'edit';
}

function RoleForm({ role, onSubmit, onCancel, permissions, templates, mode }: RoleFormProps) {
    // Group permissions by resource for the form
    const permissionsByResource = permissions.reduce((acc: Record<string, Permission[]>, permission: Permission) => {
        if (!acc[permission.resource]) {
            acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    const [formData, setFormData] = useState({
        name: role?.name || '',
        description: role?.description || '',
        permissions: role?.permissions?.map(p => `${p.resource}:${p.action}`) || [],
        templateId: '',
        templateVariables: {} as Record<string, unknown>,
    });

    const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(template);
            setFormData(prev => ({
                ...prev,
                templateId,
                permissions: template.permissions,
                templateVariables: template.variables?.reduce((acc, variable) => ({
                    ...acc,
                    [variable.name]: variable.defaultValue,
                }), {}) || {},
            }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name">Role Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                    />
                </div>
            </div>

            {/* Template Selection */}
            {mode === 'create' && (
                <div>
                    <Label>Start from Template (Optional)</Label>
                    <Select value={formData.templateId} onValueChange={handleTemplateSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                    {template.name} - {template.description}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Template Variables */}
            {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
                <div className="space-y-4">
                    <Label>Template Variables</Label>
                    {selectedTemplate.variables.map((variable) => (
                        <div key={variable.name}>
                            <Label htmlFor={variable.name}>
                                {variable.label}
                                {variable.required && <span className="text-red-500">*</span>}
                            </Label>
                            {variable.type === 'select' ? (
                                <Select
                                    value={formData.templateVariables[variable.name] as string || ''}
                                    onValueChange={(value) => setFormData(prev => ({
                                        ...prev,
                                        templateVariables: { ...prev.templateVariables, [variable.name]: value }
                                    }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {variable.options?.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : variable.type === 'boolean' ? (
                                <Checkbox
                                    checked={formData.templateVariables[variable.name] as boolean || false}
                                    onCheckedChange={(checked) => setFormData(prev => ({
                                        ...prev,
                                        templateVariables: { ...prev.templateVariables, [variable.name]: checked }
                                    }))}
                                />
                            ) : (
                                <Input
                                    type={variable.type === 'number' ? 'number' : 'text'}
                                    value={formData.templateVariables[variable.name] as string || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        templateVariables: { ...prev.templateVariables, [variable.name]: e.target.value }
                                    }))}
                                    required={variable.required}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Permissions */}
            <div>
                <Label>Permissions</Label>
                <ScrollArea className="h-64 border rounded-md p-4">
                    <div className="space-y-4">
                        {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
                            <div key={resource}>
                                <h4 className="font-medium mb-2 capitalize">{resource}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(resourcePermissions as Permission[]).map((permission: Permission) => (
                                        <div key={permission.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={permission.id}
                                                checked={formData.permissions.includes(`${permission.resource}:${permission.action}`)}
                                                onCheckedChange={(checked) => {
                                                    const permissionString = `${permission.resource}:${permission.action}`;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        permissions: checked
                                                            ? [...prev.permissions, permissionString]
                                                            : prev.permissions.filter((p: string) => p !== permissionString)
                                                    }));
                                                }}
                                            />
                                            <Label htmlFor={permission.id} className="text-sm">
                                                {permission.action}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">
                    {mode === 'create' ? 'Create Role' : 'Update Role'}
                </Button>
            </div>
        </form>
    );
}

// Role Hierarchy View Component
interface RoleHierarchyViewProps {
    roles: Role[];
    onRoleSelect?: (role: Role) => void;
    editable?: boolean;
}

function RoleHierarchyView({ roles }: RoleHierarchyViewProps) {
    // This is a simplified hierarchy view
    // In a real implementation, you'd have a more sophisticated tree structure

    const systemRoles = roles.filter(r => r.isSystemRole);
    const tenantRoles = roles.filter(r => !r.isSystemRole);

    return (
        <div className="space-y-6">
            {/* System Roles */}
            <div>
                <h3 className="text-lg font-semibold mb-4">System Roles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemRoles.map((role) => (
                        <Card key={role.id} className="p-4">
                            <div className="flex items-center gap-3">
                                <Shield className="h-8 w-8 text-blue-500" />
                                <div>
                                    <h4 className="font-medium">{role.name}</h4>
                                    <p className="text-sm text-muted-foreground">{role.description}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Tenant Roles */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Tenant Roles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tenantRoles.map((role) => (
                        <Card key={role.id} className="p-4">
                            <div className="flex items-center gap-3">
                                <Shield className="h-8 w-8 text-green-500" />
                                <div>
                                    <h4 className="font-medium">{role.name}</h4>
                                    <p className="text-sm text-muted-foreground">{role.description}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default RoleManagement;