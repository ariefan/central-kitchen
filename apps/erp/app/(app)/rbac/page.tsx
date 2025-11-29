"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, History } from "lucide-react";
import { useEnhancedPermissions } from "@/hooks/use-enhanced-permissions";
import { PermissionGuard } from "@/components/rbac/permission-guard";
import { RbacDashboard } from "@/components/rbac/rbac-dashboard";
import { RoleManagement } from "@/components/rbac/role-management";
import { MultiRoleAssignment } from "@/components/rbac/multi-role-assignment";
import AuditLogViewer from "@/components/rbac/audit-log";

export default function RbacPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const { hasPermission } = useEnhancedPermissions();

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                RBAC Management
                            </CardTitle>
                            <CardDescription>
                                Comprehensive role-based access control system
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <PermissionGuard permission="role:read">
                                <Button
                                    variant={activeTab === 'overview' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('overview')}
                                >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Overview
                                </Button>
                            </PermissionGuard>
                            <PermissionGuard permission="role:read">
                                <Button
                                    variant={activeTab === 'roles' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('roles')}
                                >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Roles
                                </Button>
                            </PermissionGuard>
                            <PermissionGuard permission="user:update">
                                <Button
                                    variant={activeTab === 'assignments' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('assignments')}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Assignments
                                </Button>
                            </PermissionGuard>
                            <PermissionGuard permission="audit_log:read">
                                <Button
                                    variant={activeTab === 'audit' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('audit')}
                                >
                                    <History className="w-4 h-4 mr-2" />
                                    Audit Log
                                </Button>
                            </PermissionGuard>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {activeTab === 'overview' && (
                            <RbacDashboard />
                        )}

                        {activeTab === 'roles' && (
                            <RoleManagement />
                        )}

                        {activeTab === 'assignments' && hasPermission('user', 'update') && (
                            <MultiRoleAssignment />
                        )}

                        {activeTab === 'audit' && hasPermission('audit_log', 'read') && (
                            <AuditLogViewer />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}