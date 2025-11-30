"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Role,
    RoleTemplate,
    Permission,
    User,
    AuditLog,
    RoleCreateRequest,
    RoleUpdateRequest
} from '@/types/rbac';
import { RoleManagement } from './role-management';
import { RoleFormSimple } from './role-form-simple';
import { MultiRoleAssignment } from './multi-role-assignment';
import AuditLogViewer from './audit-log';
import { PermissionGuard } from './permission-guard';
import {
    Shield,
    Users,
    Settings,
    FileText,
    History,
    Plus
} from 'lucide-react';

interface RbacDashboardProps {
    roles?: Role[];
    templates?: RoleTemplate[];
    permissions?: Permission[];
    users?: User[];
    auditLogs?: AuditLog[];
    onRoleCreate?: (data: RoleCreateRequest) => Promise<void>;
    onRoleUpdate?: (data: RoleUpdateRequest & { id: string }) => Promise<void>;
    onRoleDelete?: (roleId: string) => Promise<void>;
    onUserAssignRoles?: (userId: string, roleIds: string[]) => Promise<void>;
    isLoading?: boolean;
}

export function RbacDashboard({
    roles = [],
    templates = [],
    permissions = [],
    users = [],
    auditLogs = [],
    onRoleCreate,
    onRoleUpdate,
    onRoleDelete,
    onUserAssignRoles,
    isLoading = false
}: RbacDashboardProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isCreatingRole, setIsCreatingRole] = useState(false);

    // Calculate statistics
    const stats = {
        totalRoles: roles.length,
        activeRoles: roles.filter(r => r.isActive).length,
        totalUsers: users.length,
        usersWithRoles: users.filter(u => u.roles && u.roles.length > 0).length,
        totalPermissions: permissions.length,
        recentChanges: auditLogs.filter(log => {
            const logDate = new Date(log.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return logDate > weekAgo;
        }).length,
    };

    const handleRoleCreate = () => {
        setIsCreatingRole(true);
        setSelectedRole(null);
    };

    const handleRoleEdit = (role: Role) => {
        setSelectedRole(role);
        setIsCreatingRole(false);
    };

    const handleRoleFormSubmit = async (data: RoleCreateRequest | (RoleUpdateRequest & { id?: string })) => {
        try {
            if (isCreatingRole && onRoleCreate) {
                await onRoleCreate(data as RoleCreateRequest);
                setIsCreatingRole(false);
                setSelectedRole(null);
            } else if (!isCreatingRole && selectedRole && onRoleUpdate) {
                await onRoleUpdate({ ...data, id: selectedRole.id });
                setSelectedRole(null);
            }
        } catch (error) {
            console.error('Failed to save role:', error);
        }
    };


    const handleUserRoleAssignment = async (userId: string, roleIds: string[]) => {
        if (onUserAssignRoles) {
            try {
                await onUserAssignRoles(userId, roleIds);
            } catch (error) {
                console.error('Failed to assign roles:', error);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
                    <p className="text-muted-foreground">
                        Manage roles, permissions, and user assignments
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <PermissionGuard resource="roles" action="create">
                        <Button onClick={handleRoleCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Role
                        </Button>
                    </PermissionGuard>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRoles}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.activeRoles} active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.usersWithRoles} with assigned roles
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPermissions}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all resources
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Changes</CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.recentChanges}</div>
                        <p className="text-xs text-muted-foreground">
                            Last 7 days
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            {(isCreatingRole || selectedRole) ? (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {isCreatingRole ? 'Create New Role' : `Edit Role: ${selectedRole?.name}`}
                        </CardTitle>
                        <CardDescription>
                            {isCreatingRole
                                ? 'Configure a new role with specific permissions and access levels.'
                                : 'Modify the role configuration and permissions.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RoleFormSimple
                            role={selectedRole}
                            templates={templates}
                            parentRoles={roles.filter(r => r.id !== selectedRole?.id)}
                            mode={isCreatingRole ? 'create' : 'edit'}
                            onSubmit={handleRoleFormSubmit}
                            onCancel={() => {
                                setIsCreatingRole(false);
                                setSelectedRole(null);
                            }}
                            isLoading={isLoading}
                        />
                    </CardContent>
                </Card>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="assignments">Assignments</TabsTrigger>
                        <TabsTrigger value="audit">Audit Log</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Roles */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        Recent Roles
                                    </CardTitle>
                                    <CardDescription>
                                        Latest role modifications
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {roles.slice(0, 5).map((role) => (
                                            <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{role.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Role
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={role.isActive ? 'default' : 'secondary'}>
                                                        {role.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRoleEdit(role)}
                                                    >
                                                        Edit
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {roles.length === 0 && (
                                            <p className="text-center text-muted-foreground py-4">
                                                No roles found. Create your first role to get started.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Settings className="h-5 w-5" />
                                        Quick Actions
                                    </CardTitle>
                                    <CardDescription>
                                        Common administrative tasks
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <PermissionGuard resource="roles" action="create">
                                            <Button className="w-full justify-start" onClick={handleRoleCreate}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create New Role
                                            </Button>
                                        </PermissionGuard>

                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={() => setActiveTab('assignments')}
                                        >
                                            <Users className="h-4 w-4 mr-2" />
                                            Manage User Assignments
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={() => setActiveTab('audit')}
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            View Audit Log
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* System Health */}
                        <Card>
                            <CardHeader>
                                <CardTitle>System Health</CardTitle>
                                <CardDescription>
                                    RBAC system status and recommendations
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <span>Role Configuration</span>
                                        <Badge variant="default">Healthy</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <span>Permission Coverage</span>
                                        <Badge variant="default">Complete</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <span>User Assignment Status</span>
                                        <Badge variant={stats.usersWithRoles === stats.totalUsers ? 'default' : 'secondary'}>
                                            {stats.usersWithRoles === stats.totalUsers ? 'Complete' : 'Incomplete'}
                                        </Badge>
                                    </div>

                                    {stats.usersWithRoles < stats.totalUsers && (
                                        <Alert>
                                            <AlertDescription>
                                                {stats.totalUsers - stats.usersWithRoles} users don&apos;t have assigned roles.
                                                Consider assigning appropriate roles to ensure proper access control.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="roles">
                        <RoleManagement
                            tenantId={undefined}
                            onRoleSelect={handleRoleEdit}
                            className=""
                        />
                    </TabsContent>

                    <TabsContent value="assignments">
                        <MultiRoleAssignment
                            onRoleAssignmentChange={handleUserRoleAssignment}
                            className=""
                        />
                    </TabsContent>

                    <TabsContent value="audit">
                        <AuditLogViewer
                            className=""
                            autoRefresh={false}
                        />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}