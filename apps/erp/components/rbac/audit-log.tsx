"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Search,
    RefreshCw,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Shield,
    Settings,
    Download,
    Filter
} from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionGuard } from './permission-guard';
import {
    AuditLog,
    AuditLogFilters
} from '@/types/rbac';
import { format } from 'date-fns';

interface AuditLogProps {
    className?: string;
    autoRefresh?: boolean;
}

export function AuditLogViewer({ className, autoRefresh = false }: AuditLogProps) {
    const { hasPermission } = usePermissions();
    const queryClient = useQueryClient();

    // State
    const [filters, setFilters] = useState<AuditLogFilters>({
        dateFrom: undefined,
        dateTo: undefined,
        action: undefined,
        entityType: undefined,
        userId: undefined,
        limit: 50,
        offset: 0,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

    // Fetch audit logs
    const { data: auditLogs = [], isLoading, error, refetch } = useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: async () => {
            const params = new URLSearchParams();

            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.action) params.append('action', filters.action);
            if (filters.entityType) params.append('entityType', filters.entityType);
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.limit) params.append('limit', filters.limit.toString());
            if (filters.offset) params.append('offset', filters.offset.toString());

            const response = await fetch(`/api/v1/audit-logs?${params.toString()}`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch audit logs');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Auto-refresh effect
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            refetch();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, refetch]);

    // Get action icon based on action type
    const getActionIcon = (action: string) => {
        switch (action) {
            case 'role_created':
            case 'role_updated':
            case 'role_deleted':
                return <Shield className="h-4 w-4" />;
            case 'role_assigned':
            case 'role_removed':
                return <User className="h-4 w-4" />;
            case 'permission_granted':
            case 'permission_revoked':
                return <Settings className="h-4 w-4" />;
            case 'login':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'logout':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    // Get action badge color
    const getActionBadgeVariant = (action: string) => {
        switch (action) {
            case 'login':
                return 'default';
            case 'logout':
                return 'secondary';
            case 'role_created':
            case 'role_updated':
            case 'permission_granted':
                return 'default';
            case 'role_deleted':
            case 'role_removed':
            case 'permission_revoked':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    // Handle filter changes
    const handleFilterChange = (key: keyof AuditLogFilters, value: unknown) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Handle search
    const handleSearch = () => {
        if (searchTerm.trim()) {
            // Add search term to filters or implement separate search logic
            refetch();
        }
    };

    // Export audit logs
    const handleExport = async () => {
        try {
            const params = new URLSearchParams();

            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.action) params.append('action', filters.action);
            if (filters.entityType) params.append('entityType', filters.entityType);
            if (filters.userId) params.append('userId', filters.userId);

            const response = await fetch(`/api/v1/audit-logs/export?${params.toString()}`, {
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to export audit logs');

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    // View log details
    const handleViewDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setIsDetailDialogOpen(true);
    };

    // Get status icon for log entry
    const getStatusIcon = (log: AuditLog) => {
        // This would depend on your specific log structure
        // For now, return a generic icon
        return <Eye className="h-4 w-4" />;
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        Track all system changes and user activities
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <PermissionGuard permission="audit_log:read">
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </PermissionGuard>

                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>
                        Filter audit logs by date, action, entity type, or user
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Date Range */}
                        <div>
                            <Label>Date From</Label>
                            <Input
                                type="date"
                                value={filters.dateFrom || ''}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Date To</Label>
                            <Input
                                type="date"
                                value={filters.dateTo || ''}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            />
                        </div>

                        {/* Action Filter */}
                        <div>
                            <Label>Action</Label>
                            <Select value={filters.action || ''} onValueChange={(value) => handleFilterChange('action', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All actions</SelectItem>
                                    <SelectItem value="role_created">Role Created</SelectItem>
                                    <SelectItem value="role_updated">Role Updated</SelectItem>
                                    <SelectItem value="role_deleted">Role Deleted</SelectItem>
                                    <SelectItem value="role_assigned">Role Assigned</SelectItem>
                                    <SelectItem value="role_removed">Role Removed</SelectItem>
                                    <SelectItem value="permission_granted">Permission Granted</SelectItem>
                                    <SelectItem value="permission_revoked">Permission Revoked</SelectItem>
                                    <SelectItem value="user_created">User Created</SelectItem>
                                    <SelectItem value="user_updated">User Updated</SelectItem>
                                    <SelectItem value="user_deleted">User Deleted</SelectItem>
                                    <SelectItem value="login">Login</SelectItem>
                                    <SelectItem value="logout">Logout</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Entity Type Filter */}
                        <div>
                            <Label>Entity Type</Label>
                            <Select value={filters.entityType || ''} onValueChange={(value) => handleFilterChange('entityType', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All entities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All entities</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="role">Role</SelectItem>
                                    <SelectItem value="permission">Permission</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex gap-2 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search audit logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10"
                            />
                        </div>
                        <Button onClick={handleSearch}>
                            <Filter className="h-4 w-4 mr-2" />
                            Apply Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Audit Log Entries</CardTitle>
                    <CardDescription>
                        {auditLogs.length} entries found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {auditLogs.map((log: AuditLog) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <div className="text-sm">
                                                {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{log.userId}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action)}
                                                <Badge variant={getActionBadgeVariant(log.action)}>
                                                    {log.action.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{log.entityType}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-xs truncate">
                                                {log.newValue ? (
                                                    <span className="text-sm">
                                                        {typeof log.newValue === 'object'
                                                            ? JSON.stringify(log.newValue, null, 2)
                                                            : String(log.newValue)
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {log.ipAddress || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewDetails(log)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Date & Time</Label>
                                    <p className="text-sm font-medium">
                                        {format(new Date(selectedLog.createdAt), 'PPPpp')}
                                    </p>
                                </div>
                                <div>
                                    <Label>Action</Label>
                                    <div className="flex items-center gap-2">
                                        {getActionIcon(selectedLog.action)}
                                        <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                                            {selectedLog.action.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>User ID</Label>
                                    <p className="text-sm font-medium">{selectedLog.userId}</p>
                                </div>
                                <div>
                                    <Label>Entity Type</Label>
                                    <Badge variant="outline">{selectedLog.entityType}</Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Entity ID</Label>
                                    <p className="text-sm font-medium">{selectedLog.entityId}</p>
                                </div>
                                <div>
                                    <Label>IP Address</Label>
                                    <p className="text-sm font-medium">{selectedLog.ipAddress || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Old Value */}
                            {selectedLog.oldValue != null && (
                                <div>
                                    <Label>Previous Value</Label>
                                    <div className="p-3 bg-muted rounded-md">
                                        <pre className="text-xs overflow-auto">
                                            {typeof selectedLog.oldValue === 'object' && selectedLog.oldValue !== null
                                                ? JSON.stringify(selectedLog.oldValue, null, 2)
                                                : String(selectedLog.oldValue)
                                            }
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* New Value */}
                            {selectedLog.newValue != null && (
                                <div>
                                    <Label>New Value</Label>
                                    <div className="p-3 bg-muted rounded-md">
                                        <pre className="text-xs overflow-auto">
                                            {typeof selectedLog.newValue === 'object' && selectedLog.newValue !== null
                                                ? JSON.stringify(selectedLog.newValue, null, 2)
                                                : String(selectedLog.newValue || '')
                                            }
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Metadata */}
                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <Label>Additional Information</Label>
                                    <div className="p-3 bg-muted rounded-md">
                                        <pre className="text-xs overflow-auto">
                                            {JSON.stringify(selectedLog.metadata, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* User Agent */}
                            {selectedLog.userAgent && (
                                <div>
                                    <Label>User Agent</Label>
                                    <p className="text-xs text-muted-foreground break-all">
                                        {selectedLog.userAgent}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Audit Log Summary Component
interface AuditLogSummaryProps {
    timeRange?: 'today' | 'week' | 'month' | 'year';
    className?: string;
}

export function AuditLogSummary({ timeRange = 'today', className }: AuditLogSummaryProps) {
    const { hasPermission } = usePermissions();

    // Fetch summary data
    const { data: summary = [], isLoading } = useQuery({
        queryKey: ['audit-summary', timeRange],
        queryFn: async () => {
            const response = await fetch(`/api/v1/audit-logs/summary?range=${timeRange}`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch audit summary');
            const data = await response.json();
            return data.data || [];
        },
    });

    if (isLoading) {
        return (
            <Card className={className}>
                <CardContent className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Audit Summary</CardTitle>
                <CardDescription>
                    Activity overview for the {timeRange}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {summary.map((item: { label: string; value: string | number; type?: string; count?: number }) => (
                        <div key={item.label} className="text-center">
                            <div className="text-2xl font-bold">{item.value}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                                {item.label.replace(/_/g, ' ')}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default AuditLogViewer;