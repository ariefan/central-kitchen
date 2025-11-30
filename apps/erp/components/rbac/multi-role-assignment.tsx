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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Shield,
    Search,
    UserPlus,
    UserMinus,
    Settings,
    AlertTriangle
} from 'lucide-react';
import { PermissionGuard } from './permission-guard';
import {
    Role,
    UserRoleAssignment,
    RoleContext,
    User
} from '@/types/rbac';

interface MultiRoleAssignmentProps {
    userId?: string;
    onRoleAssignmentChange?: (userId: string, roleIds: string[]) => void;
    className?: string;
}

export function MultiRoleAssignment({ onRoleAssignmentChange, className }: MultiRoleAssignmentProps) {
    const queryClient = useQueryClient();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [assignmentContext, setAssignmentContext] = useState<RoleContext>({});
    const [activeTab, setActiveTab] = useState('individual');

    // Fetch users
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await fetch('/api/v1/users', {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Fetch roles
    const { data: roles = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const response = await fetch('/api/v1/roles', {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch roles');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Fetch user roles for a specific user
    const { data: userRoles = [], refetch: refetchUserRoles } = useQuery({
        queryKey: ['user-roles', selectedUser?.id],
        queryFn: async () => {
            if (!selectedUser?.id) return [];
            const response = await fetch(`/api/v1/users/${selectedUser.id}/roles`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch user roles');
            const data = await response.json();
            return data.data || [];
        },
        enabled: !!selectedUser?.id,
    });

    // Assign roles mutation
    const assignRolesMutation = useMutation({
        mutationFn: async ({ userId, roleIds, context }: { userId: string; roleIds: string[]; context?: RoleContext }) => {
            const response = await fetch(`/api/v1/users/${userId}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ roleIds, context }),
            });
            if (!response.ok) throw new Error('Failed to assign roles');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-roles'] });
            setIsAssignDialogOpen(false);
            setSelectedRoleIds([]);
            setAssignmentContext({});
            onRoleAssignmentChange?.(selectedUser!.id, selectedRoleIds);
        },
    });

    // Remove role mutation
    const removeRoleMutation = useMutation({
        mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
            const response = await fetch(`/api/v1/users/${userId}/roles/${roleId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to remove role');
            return response.json();
        },
        onSuccess: () => {
            refetchUserRoles();
            onRoleAssignmentChange?.(selectedUser!.id, userRoles.filter((ur: UserRoleAssignment) => ur.roleId !== selectedRoleIds[0]).map((ur: UserRoleAssignment) => ur.roleId));
        },
    });

    // Filter users based on search
    const filteredUsers = users.filter((user: User) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter roles based on active status
    const activeRoles = roles.filter((role: Role) => role.isActive);

    // Get user's current role IDs
    const currentUserRoleIds = userRoles.map((ur: UserRoleAssignment) => ur.roleId);

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setSelectedRoleIds([]);
    };

    const handleRoleAssignment = () => {
        if (!selectedUser || selectedRoleIds.length === 0) return;

        assignRolesMutation.mutate({
            userId: selectedUser.id,
            roleIds: selectedRoleIds,
            context: assignmentContext,
        });
    };

    const handleRoleRemoval = (roleId: string) => {
        if (!selectedUser) return;
        removeRoleMutation.mutate({ userId: selectedUser.id, roleId });
    };

    const toggleRoleSelection = (roleId: string) => {
        setSelectedRoleIds(prev =>
            prev.includes(roleId)
                ? prev.filter(id => id !== roleId)
                : [...prev, roleId]
        );
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Multi-Role Assignment</h1>
                    <p className="text-muted-foreground">
                        Assign multiple roles to users with context-aware permissions
                    </p>
                </div>

                <PermissionGuard permission="user:update">
                    <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Settings className="h-4 w-4 mr-2" />
                                Bulk Operations
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Bulk Role Assignment</DialogTitle>
                                <DialogDescription>
                                    Assign roles to multiple users at once
                                </DialogDescription>
                            </DialogHeader>
                            <BulkRoleAssignment
                                users={users}
                                roles={activeRoles}
                                onComplete={() => setIsBulkDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </PermissionGuard>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="individual">Individual Assignment</TabsTrigger>
                    <TabsTrigger value="overview">Role Overview</TabsTrigger>
                </TabsList>

                {/* Individual Assignment Tab */}
                <TabsContent value="individual" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Users List */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Users</h3>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Users */}
                            <ScrollArea className="h-96 border rounded-md p-4">
                                <div className="space-y-2">
                                    {filteredUsers.map((user: User) => (
                                        <div
                                            key={user.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${selectedUser?.id === user.id ? 'bg-primary/10 border-primary' : ''
                                                }`}
                                            onClick={() => handleUserSelect(user)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <span className="text-sm font-medium">
                                                            {user.name?.charAt(0) || user.email.charAt(0)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{user.name || user.email}</p>
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline">
                                                    {userRoles.filter((ur: UserRoleAssignment) => ur.userId === user.id).length} roles
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Role Assignment */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                    {selectedUser ? `Roles for ${selectedUser.name || selectedUser.email}` : 'Select a User'}
                                </h3>

                                {selectedUser && (
                                    <PermissionGuard permission="user:update">
                                        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button>
                                                    <UserPlus className="h-4 w-4 mr-2" />
                                                    Assign Roles
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl">
                                                <DialogHeader>
                                                    <DialogTitle>Assign Roles to {selectedUser.name || selectedUser.email}</DialogTitle>
                                                    <DialogDescription>
                                                        Select roles to assign to this user
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-6">
                                                    {/* Role Selection */}
                                                    <div>
                                                        <Label>Select Roles</Label>
                                                        <ScrollArea className="h-64 border rounded-md p-4">
                                                            <div className="space-y-3">
                                                                {activeRoles.map((role: Role) => (
                                                                    <div key={role.id} className="flex items-center space-x-3">
                                                                        <Checkbox
                                                                            id={role.id}
                                                                            checked={selectedRoleIds.includes(role.id)}
                                                                            onCheckedChange={() => toggleRoleSelection(role.id)}
                                                                        />
                                                                        <div className="flex-1">
                                                                            <Label htmlFor={role.id} className="font-medium">
                                                                                {role.name}
                                                                            </Label>
                                                                            <p className="text-sm text-muted-foreground">{role.description}</p>
                                                                        </div>
                                                                        <Badge variant={currentUserRoleIds.includes(role.id) ? 'default' : 'outline'}>
                                                                            {currentUserRoleIds.includes(role.id) ? 'Assigned' : 'Available'}
                                                                        </Badge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    </div>

                                                    {/* Context Selection */}
                                                    <div>
                                                        <Label>Assignment Context (Optional)</Label>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="locationId">Location</Label>
                                                                <Select value={assignmentContext.locationId || ''} onValueChange={(value) =>
                                                                    setAssignmentContext(prev => ({ ...prev, locationId: value || undefined }))
                                                                }>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select location" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="">No location restriction</SelectItem>
                                                                        {/* Add location options here */}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="departmentId">Department</Label>
                                                                <Select value={assignmentContext.departmentId || ''} onValueChange={(value) =>
                                                                    setAssignmentContext(prev => ({ ...prev, departmentId: value || undefined }))
                                                                }>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select department" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="">No department restriction</SelectItem>
                                                                        {/* Add department options here */}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex justify-end gap-2">
                                                        <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={handleRoleAssignment}
                                                            disabled={selectedRoleIds.length === 0}
                                                        >
                                                            Assign Selected Roles ({selectedRoleIds.length})
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </PermissionGuard>
                                )}
                            </div>

                            {/* Current Roles */}
                            {selectedUser && (
                                <div className="space-y-3">
                                    <Label>Current Roles</Label>
                                    <div className="space-y-2">
                                        {userRoles
                                            .filter((ur: UserRoleAssignment) => ur.userId === selectedUser.id)
                                            .map((userRole: UserRoleAssignment) => {
                                                const role = roles.find((r: Role) => r.id === userRole.roleId);
                                                if (!role) return null;

                                                return (
                                                    <div key={userRole.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <Shield className="h-5 w-5 text-primary" />
                                                            <div>
                                                                <p className="font-medium">{role.name}</p>
                                                                <p className="text-sm text-muted-foreground">{role.description}</p>
                                                            </div>
                                                        </div>

                                                        <PermissionGuard permission="user:update">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleRoleRemoval(role.id)}
                                                                disabled={role.isSystemRole}
                                                            >
                                                                <UserMinus className="h-4 w-4 mr-1" />
                                                                Remove
                                                            </Button>
                                                        </PermissionGuard>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    {userRoles.filter((ur: UserRoleAssignment) => ur.userId === selectedUser.id).length === 0 && (
                                        <Alert>
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>
                                                This user has no roles assigned. Assign roles to grant permissions.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* Role Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeRoles.map((role: Role) => (
                            <Card key={role.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        {role.name}
                                    </CardTitle>
                                    {role.isSystemRole && (
                                        <Badge variant="outline">System</Badge>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>{role.description}</CardDescription>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Users with this role:</span>
                                            <Badge variant="secondary">
                                                {userRoles.filter((ur: UserRoleAssignment) => ur.roleId === role.id).length}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Bulk Role Assignment Component
interface BulkRoleAssignmentProps {
    users: User[];
    roles: Role[];
    onComplete: () => void;
}

function BulkRoleAssignment({ users, roles, onComplete }: BulkRoleAssignmentProps) {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [replaceExisting, setReplaceExisting] = useState(false);

    const handleBulkAssign = async () => {
        if (selectedUsers.length === 0 || selectedRoles.length === 0) return;

        try {
            const response = await fetch('/api/v1/users/bulk-assign-roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userIds: selectedUsers,
                    roleIds: selectedRoles,
                    replaceExisting,
                }),
            });

            if (!response.ok) throw new Error('Failed to assign roles');

            onComplete();
        } catch (error) {
            console.error('Bulk assignment failed:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* User Selection */}
            <div>
                <Label>Select Users</Label>
                <ScrollArea className="h-48 border rounded-md p-4">
                    <div className="space-y-2">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center space-x-3">
                                <Checkbox
                                    id={`user-${user.id}`}
                                    checked={selectedUsers.includes(user.id)}
                                    onCheckedChange={(checked) =>
                                        setSelectedUsers(prev =>
                                            checked
                                                ? [...prev, user.id]
                                                : prev.filter(id => id !== user.id)
                                        )
                                    }
                                />
                                <Label htmlFor={`user-${user.id}`} className="flex-1">
                                    {user.name || user.email}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Role Selection */}
            <div>
                <Label>Select Roles</Label>
                <ScrollArea className="h-48 border rounded-md p-4">
                    <div className="space-y-2">
                        {roles.map((role) => (
                            <div key={role.id} className="flex items-center space-x-3">
                                <Checkbox
                                    id={`role-${role.id}`}
                                    checked={selectedRoles.includes(role.id)}
                                    onCheckedChange={(checked) =>
                                        setSelectedRoles(prev =>
                                            checked
                                                ? [...prev, role.id]
                                                : prev.filter(id => id !== role.id)
                                        )
                                    }
                                />
                                <Label htmlFor={`role-${role.id}`} className="flex-1">
                                    {role.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Options */}
            <div>
                <Checkbox
                    id="replace-existing"
                    checked={replaceExisting}
                    onCheckedChange={(checked: boolean) => setReplaceExisting(checked)}
                />
                <Label htmlFor="replace-existing">
                    Replace existing roles (unchecked = add to existing)
                </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onComplete}>
                    Cancel
                </Button>
                <Button
                    onClick={handleBulkAssign}
                    disabled={selectedUsers.length === 0 || selectedRoles.length === 0}
                >
                    Assign Roles to {selectedUsers.length} Users
                </Button>
            </div>
        </div>
    );
}

export default MultiRoleAssignment;