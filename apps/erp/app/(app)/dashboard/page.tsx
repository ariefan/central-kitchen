"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    FileText,
    ArrowRight,
    Package,
    Truck,
    Clock,
    CheckCircle,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DashboardStats {
    pendingRequisitions: number;
    approvedRequisitions: number;
    inTransitTransfers: number;
    completedTransfers: number;
}

interface RecentRequisition {
    id: string;
    reqNumber: string;
    fromLocationName: string;
    toLocationName: string;
    status: string;
    requestedDate: string;
}

interface RecentTransfer {
    id: string;
    transferNumber: string;
    fromLocationName: string;
    toLocationName: string;
    status: string;
    transferDate: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        pendingRequisitions: 0,
        approvedRequisitions: 0,
        inTransitTransfers: 0,
        completedTransfers: 0,
    });
    const [recentRequisitions, setRecentRequisitions] = useState<RecentRequisition[]>([]);
    const [recentTransfers, setRecentTransfers] = useState<RecentTransfer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch dashboard stats
            const statsResponse = await fetch('/api/v1/dashboard/stats', {
                credentials: "include",
            });
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData.data);
            }

            // Fetch recent requisitions
            const reqResponse = await fetch('/api/v1/requisitions?limit=5&status=pending_approval', {
                credentials: "include",
            });
            if (reqResponse.ok) {
                const reqData = await reqResponse.json();
                setRecentRequisitions(reqData.data || []);
            }

            // Fetch recent transfers
            const transferResponse = await fetch('/api/v1/stock-transfers?limit=5&status=in_transit', {
                credentials: "include",
            });
            if (transferResponse.ok) {
                const transferData = await transferResponse.json();
                setRecentTransfers(transferData.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_approval':
                return 'bg-yellow-100 text-yellow-800';
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'in_transit':
                return 'bg-blue-100 text-blue-800';
            case 'completed':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending_approval':
                return <Clock className="w-4 h-4" />;
            case 'approved':
                return <CheckCircle className="w-4 h-4" />;
            case 'in_transit':
                return <Truck className="w-4 h-4" />;
            case 'completed':
                return <CheckCircle className="w-4 h-4" />;
            default:
                return <AlertTriangle className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Loading dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your inventory movements</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requisitions</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingRequisitions}</div>
                        <p className="text-xs text-muted-foreground">
                            Awaiting approval
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved Requisitions</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.approvedRequisitions}</div>
                        <p className="text-xs text-muted-foreground">
                            Ready to issue
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In-Transit Transfers</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inTransitTransfers}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently moving
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed Transfers</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.completedTransfers}</div>
                        <p className="text-xs text-muted-foreground">
                            This month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Common tasks you might want to perform
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                        <Link href="/requisitions/new">
                            <Button>
                                <FileText className="w-4 h-4 mr-2" />
                                New Requisition
                            </Button>
                        </Link>
                        <Link href="/stock-transfers/new">
                            <Button variant="outline">
                                <Package className="w-4 h-4 mr-2" />
                                New Transfer
                            </Button>
                        </Link>
                        <Link href="/requisitions?status=pending_approval">
                            <Button variant="outline">
                                <Clock className="w-4 h-4 mr-2" />
                                Review Pending
                            </Button>
                        </Link>
                        <Link href="/stock-transfers?status=in_transit">
                            <Button variant="outline">
                                <Truck className="w-4 h-4 mr-2" />
                                Track Transfers
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Requisitions */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Recent Requisitions</CardTitle>
                            <Link href="/requisitions">
                                <Button variant="ghost" size="sm">
                                    View All
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentRequisitions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending requisitions</p>
                        ) : (
                            <div className="space-y-4">
                                {recentRequisitions.map((req) => (
                                    <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{req.reqNumber}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {req.fromLocationName} → {req.toLocationName}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={getStatusColor(req.status)}>
                                                {getStatusIcon(req.status)}
                                                <span className="ml-1">
                                                    {req.status.replace('_', ' ')}
                                                </span>
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/requisitions/${req.id}`)}
                                            >
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Transfers */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>In-Transit Transfers</CardTitle>
                            <Link href="/stock-transfers">
                                <Button variant="ghost" size="sm">
                                    View All
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentTransfers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No transfers in transit</p>
                        ) : (
                            <div className="space-y-4">
                                {recentTransfers.map((transfer) => (
                                    <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{transfer.transferNumber}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {transfer.fromLocationName} → {transfer.toLocationName}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={getStatusColor(transfer.status)}>
                                                {getStatusIcon(transfer.status)}
                                                <span className="ml-1">
                                                    {transfer.status.replace('_', ' ')}
                                                </span>
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/stock-transfers/${transfer.id}`)}
                                            >
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}