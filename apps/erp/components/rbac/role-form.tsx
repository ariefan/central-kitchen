"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Role,
    Permission,
    RoleTemplate,
    RoleCreateRequest,
    RoleUpdateRequest,
    PERMISSION_RESOURCES,
    PERMISSION_ACTIONS
} from '@/types/rbac';
import { usePermissions } from '@/hooks/use-permissions';
import { ChevronDown, ChevronRight, Shield, Users, Settings, AlertCircle, Save, Trash2, Copy } from 'lucide-react';

// Form validation schema
const roleFormSchema = z.object({
    name: z.string().min(1, 'Role name is required').max(100, 'Role name must be less than 100 characters'),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    isActive: z.boolean(),
    parentRoles: z.array(z.string()).optional(),
    permissions: z.array(z.string()).default([]),
    metadata: z.record(z.string(), z.any()).optional(),
});


interface RoleFormProps {
    role?: Role | null;
    templates?: RoleTemplate[];
    parentRoles?: Role[];
    availablePermissions?: Permission[];
    onSubmit: (data: RoleCreateRequest | (RoleUpdateRequest & { id?: string })) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
    mode: 'create' | 'edit';
}

// Permission categories for better organization
const PERMISSION_CATEGORIES = {
    users: {
        label: 'User Management',
        icon: Users,
        permissions: [
            { resource: PERMISSION_RESOURCES.USER, action: PERMISSION_ACTIONS.CREATE },
            { resource: PERMISSION_RESOURCES.USER, action: PERMISSION_ACTIONS.READ },
            { resource: PERMISSION_RESOURCES.USER, action: PERMISSION_ACTIONS.UPDATE },
            { resource: PERMISSION_RESOURCES.USER, action: PERMISSION_ACTIONS.DELETE },
            { resource: PERMISSION_RESOURCES.USER, action: PERMISSION_ACTIONS.ASSIGN },
        ]
    },
    roles: {
        label: 'Role Management',
        icon: Shield,
        permissions: [
            { resource: PERMISSION_RESOURCES.ROLE, action: PERMISSION_ACTIONS.CREATE },
            { resource: PERMISSION_RESOURCES.ROLE, action: PERMISSION_ACTIONS.READ },
            { resource: PERMISSION_RESOURCES.ROLE, action: PERMISSION_ACTIONS.UPDATE },
            { resource: PERMISSION_RESOURCES.ROLE, action: PERMISSION_ACTIONS.DELETE },
            { resource: PERMISSION_RESOURCES.ROLE, action: PERMISSION_ACTIONS.MANAGE },
        ]
    },
    inventory: {
        label: 'Inventory',
        icon: Settings,
        permissions: [
            { resource: PERMISSION_RESOURCES.INVENTORY, action: PERMISSION_ACTIONS.CREATE },
            { resource: PERMISSION_RESOURCES.INVENTORY, action: PERMISSION_ACTIONS.READ },
            { resource: PERMISSION_RESOURCES.INVENTORY, action: PERMISSION_ACTIONS.UPDATE },
            { resource: PERMISSION_RESOURCES.INVENTORY, action: PERMISSION_ACTIONS.DELETE },
            { resource: PERMISSION_RESOURCES.INVENTORY, action: PERMISSION_ACTIONS.MANAGE },
        ]
    },
    reports: {
        label: 'Reports',
        icon: Settings,
        permissions: [
            { resource: PERMISSION_RESOURCES.REPORT, action: PERMISSION_ACTIONS.READ },
            { resource: PERMISSION_RESOURCES.REPORT, action: PERMISSION_ACTIONS.CREATE },
            { resource: PERMISSION_RESOURCES.REPORT, action: PERMISSION_ACTIONS.EXPORT },
            { resource: PERMISSION_RESOURCES.REPORT, action: PERMISSION_ACTIONS.VIEW },
        ]
    }
};

export function RoleForm({
    role,
    templates = [],
    parentRoles = [],
    onSubmit,
    onCancel,
    isLoading = false,
    mode
}: RoleFormProps) {
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [isTemplateApplied, setIsTemplateApplied] = useState(false);

    const { hasPermission } = usePermissions();

    const form = useForm({
        resolver: zodResolver(roleFormSchema),
        defaultValues: {
            name: role?.name || '',
            description: role?.description || '',
            isActive: role?.isActive ?? true,
            parentRoles: role?.parentRoles || [],
            permissions: role?.permissions?.map(p => `${p.resource}:${p.action}`) || [],
            metadata: role?.metadata || {},
        },
    });

    useEffect(() => {
        if (role?.permissions) {
            const permissionKeys = role.permissions.map(p => `${p.resource}:${p.action}`);
            // Use timeout to avoid setState warning
            const timeoutId = setTimeout(() => {
                setSelectedPermissions(permissionKeys);
                form.setValue('permissions', permissionKeys);
            }, 0);

            return () => clearTimeout(timeoutId);
        }
    }, [role, form]);

    // Handle template selection
    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplate(templateId);
        const template = templates.find(t => t.id === templateId);

        if (template && !isTemplateApplied) {
            // Pre-fill form with template data
            form.setValue('name', template.name.replace(' Template', ''));
            form.setValue('description', template.description);

            if (template.variables) {
                // Apply template variables to form fields
                Object.entries(template.variables).forEach(([key, value]) => {
                    if (key === 'priority' && typeof value === 'number') {
                        // Handle priority if needed
                    }
                });
            }
        }
    };

    // Apply template permissions
    const applyTemplate = () => {
        const template = templates.find(t => t.id === selectedTemplate);
        if (template) {
            const templatePermissions = template.permissions.map(p => p); // Template permissions are already strings
            setSelectedPermissions(templatePermissions);
            form.setValue('permissions', templatePermissions);
            setIsTemplateApplied(true);
        }
    };

    // Toggle category expansion
    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    // Handle permission toggle
    const handlePermissionToggle = (permissionKey: string, checked: boolean) => {
        let newPermissions: string[];

        if (checked) {
            newPermissions = [...selectedPermissions, permissionKey];
        } else {
            newPermissions = selectedPermissions.filter(p => p !== permissionKey);
        }

        setSelectedPermissions(newPermissions);
        form.setValue('permissions', newPermissions);
    };

    // Handle bulk permission actions
    const handleCategoryToggle = (category: string, checked: boolean) => {
        const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]?.permissions || [];
        const permissionKeys = categoryPermissions.map(p => `${p.resource}:${p.action}`);

        let newPermissions: string[];

        if (checked) {
            // Add all category permissions
            newPermissions = [...new Set([...selectedPermissions, ...permissionKeys])];
        } else {
            // Remove all category permissions
            newPermissions = selectedPermissions.filter(p => !permissionKeys.includes(p));
        }

        setSelectedPermissions(newPermissions);
        form.setValue('permissions', newPermissions);
    };

    // Check if all permissions in a category are selected
    const isCategoryFullySelected = (category: string) => {
        const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]?.permissions || [];
        const permissionKeys = categoryPermissions.map(p => `${p.resource}:${p.action}`);
        return permissionKeys.every(p => selectedPermissions.includes(p));
    };

    // Check if some permissions in a category are selected
    const isCategoryPartiallySelected = (category: string) => {
        const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]?.permissions || [];
        const permissionKeys = categoryPermissions.map(p => `${p.resource}:${p.action}`);
        const selectedCount = permissionKeys.filter(p => selectedPermissions.includes(p)).length;
        return selectedCount > 0 && selectedCount < permissionKeys.length;
    };

    // Form submission
    const handleSubmit = async (data: z.infer<typeof roleFormSchema>) => {
        try {
            const permissionStrings = selectedPermissions.map(key => {
                const [resource, action] = key.split(':');
                return `${resource}:${action}`;
            });

            const submitData = {
                ...data,
                permissions: permissionStrings,
            };

            if (mode === 'create') {
                await onSubmit(submitData as RoleCreateRequest);
            } else {
                await onSubmit({ ...submitData, id: role!.id } as RoleUpdateRequest);
            }
        } catch (error) {
            console.error('Failed to submit role:', error);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {mode === 'create' ? 'Create New Role' : 'Edit Role'}
                    </CardTitle>
                    <CardDescription>
                        {mode === 'create'
                            ? 'Define a new role with specific permissions and access levels.'
                            : 'Modify the role configuration and permissions.'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter role name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe the role's purpose and responsibilities"
                                                className="min-h-20"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Role Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="parentRoles"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Parent Roles</FormLabel>
                                            <Select onValueChange={(value) => field.onChange([value])} value={field.value?.[0]}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select parent role" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="">None</SelectItem>
                                                    {parentRoles.map((parentRole) => (
                                                        <SelectItem key={parentRole.id} value={parentRole.id}>
                                                            {parentRole.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Active</FormLabel>
                                                <FormDescription>
                                                    Enable or disable this role
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Template Selection */}
                            {templates.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Role Template</CardTitle>
                                        <CardDescription>
                                            Start with a predefined role template to speed up configuration
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="template">Select Template</Label>
                                                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choose a template" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="">None</SelectItem>
                                                        {templates.map((template) => (
                                                            <SelectItem key={template.id} value={template.id}>
                                                                {template.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={applyTemplate}
                                                    disabled={!selectedTemplate || isTemplateApplied}
                                                    className="w-full"
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    {isTemplateApplied ? 'Template Applied' : 'Apply Template'}
                                                </Button>
                                            </div>
                                        </div>

                                        {selectedTemplate && (
                                            <Alert>
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    Template permissions will be applied. You can modify them after applying.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Permissions Configuration */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Permissions</CardTitle>
                                    <CardDescription>
                                        Configure the permissions this role will have access to
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px] pr-4">
                                        <div className="space-y-4">
                                            {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
                                                const Icon = category.icon;
                                                const isExpanded = expandedCategories[categoryKey];
                                                const isFullySelected = isCategoryFullySelected(categoryKey);
                                                const isPartiallySelected = isCategoryPartiallySelected(categoryKey);

                                                return (
                                                    <Collapsible
                                                        key={categoryKey}
                                                        open={isExpanded}
                                                        onOpenChange={() => toggleCategory(categoryKey)}
                                                    >
                                                        <CollapsibleTrigger asChild>
                                                            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                                                <div className="flex items-center gap-3">
                                                                    <Icon className="h-5 w-5" />
                                                                    <span className="font-medium">{category.label}</span>
                                                                    <Badge variant="secondary">
                                                                        {category.permissions.length} permissions
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={isFullySelected}
                                                                        ref={(el) => {
                                                                            if (el instanceof HTMLInputElement) {
                                                                                el.indeterminate = isPartiallySelected;
                                                                            }
                                                                        }}
                                                                        onCheckedChange={(checked) =>
                                                                            handleCategoryToggle(categoryKey, checked as boolean)
                                                                        }
                                                                    />
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="space-y-2 mt-2">
                                                            <div className="pl-8 space-y-2">
                                                                {category.permissions.map((permission) => {
                                                                    const permissionKey = `${permission.resource}:${permission.action}`;
                                                                    const isSelected = selectedPermissions.includes(permissionKey);

                                                                    return (
                                                                        <div
                                                                            key={permissionKey}
                                                                            className="flex items-center justify-between p-2 border rounded-md"
                                                                        >
                                                                            <div>
                                                                                <span className="font-medium capitalize">
                                                                                    {permission.action}
                                                                                </span>
                                                                                <span className="text-muted-foreground ml-2">
                                                                                    {permission.resource}
                                                                                </span>
                                                                            </div>
                                                                            <Checkbox
                                                                                checked={isSelected}
                                                                                onCheckedChange={(checked) =>
                                                                                    handlePermissionToggle(permissionKey, checked as boolean)
                                                                                }
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>

                                    <div className="mt-4 p-3 bg-muted rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                Total Permissions Selected:
                                            </span>
                                            <Badge variant="outline">
                                                {selectedPermissions.length}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Form Actions */}
                            <Separator />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" onClick={onCancel}>
                                        Cancel
                                    </Button>
                                    {mode === 'edit' && role && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            disabled={!hasPermission(PERMISSION_RESOURCES.ROLE, PERMISSION_ACTIONS.DELETE)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Role
                                        </Button>
                                    )}
                                </div>
                                <Button type="submit" disabled={isLoading}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Role' : 'Update Role')}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}