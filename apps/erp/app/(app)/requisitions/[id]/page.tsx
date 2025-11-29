"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Package, Calendar, User, MapPin, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface RequisitionItem {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    uomId: string;
    uomName: string;
    qtyRequested: string;
    qtyIssued: string;
    notes: string | null;
}

interface RequisitionDetail {
    id: string;
    reqNumber: string;
    fromLocationId: string;
    toLocationId: string;
    fromLocation: {
        id: string;
        name: string;
        code: string;
    };
    toLocation: {
        id: string;
        name: string;
        code: string;
    };
    status: string;
    requestedDate: string;
    requiredDate: string | null;
    issuedDate: string | null;
    deliveredDate: string | null;
    requestedBy: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
    transferId: string | null;
    issueStatus: string;
    notes: string | null;
    items: RequisitionItem[];
}

interface TransferDetail {
    id: string;
    transferNumber: string;
    status: string;
    transferDate: string;
    expectedDeliveryDate: string | null;
    actualDeliveryDate: string | null;
}

interface IssueResponse {
    requisition: RequisitionDetail;
    transfer: TransferDetail;
}

const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    issued: "bg-blue-100 text-blue-800",
    completed: "bg-purple-100 text-purple-800",
    cancelled: "bg-gray-100 text-gray-800",
};

const issueStatusColors = {
    pending: "bg-gray-100 text-gray-800",
    partial: "bg-yellow-100 text-yellow-800",
    fully_issued: "bg-green-100 text-green-800",
};

export default function RequisitionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [requisition, setRequisition] = useState<RequisitionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState(false);

    useEffect(() => {
        if (params.id && typeof params.id === 'string') {
            fetchRequisition(params.id);
        }
    }, [params.id]);

    const fetchRequisition = async (id: string) => {
        try {
            const response = await fetch(`/api/v1/requisitions/${id}`, {
                credentials: "include",
            });

            if (response.ok) {
                const data = await response.json();
                setRequisition(data.data);
            } else {
                toast.error("Failed to fetch requisition details");
            }
        } catch (error) {
            console.error("Failed to fetch requisition:", error);
            toast.error("Failed to fetch requisition details");
        } finally {
            setLoading(false);
        }
    };

    const handleIssueRequisition = async () => {
        if (!requisition || !params.id || typeof params.id !== 'string') return;

        setIssuing(true);
        try {
            const response = await fetch(`/api/v1/requisitions/${params.id}/issue`, {
                method: "POST",
                credentials: "include",
            });

            if (response.ok) {
                const data: IssueResponse = await response.json();
                toast.success("Requisition issued successfully");

                // Update local state with transfer info
                setRequisition({
                    ...requisition,
                    transferId: data.transfer.id,
                    issueStatus: "fully_issued",
                    issuedDate: new Date().toISOString(),
                });
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to issue requisition");
            }
        } catch (error) {
            console.error("Failed to issue requisition:", error);
            toast.error("Failed to issue requisition");
        } finally {
            setIssuing(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-6 max-w-7xl">
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Loading...</div>
                </div>
            </div>
        );
    }

    if (!requisition) {
        return (
            <div className="container mx-auto py-6 max-w-7xl">
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Requisition not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 max-w-7xl space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/requisitions">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Requisition Details</h1>
                    <p className="text-muted-foreground">Requisition #{requisition.reqNumber}</p>
                </div>
            </div>

            {/* Status and Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Status & Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="font-medium">Status:</span>
                        <Badge className={statusColors[requisition.status as keyof typeof statusColors]}>
                            {requisition.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <span className="font-medium">Issue Status:</span>
                        <Badge className={issueStatusColors[requisition.issueStatus as keyof typeof issueStatusColors]}>
                            {requisition.issueStatus.replace("_", " ").toUpperCase()}
                        </Badge>
                    </div>

                    {requisition.status === "approved" && !requisition.transferId && (
                        <Button
                            onClick={handleIssueRequisition}
                            disabled={issuing}
                            className="w-full sm:w-auto"
                        >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            {issuing ? "Issuing..." : "Issue Requisition"}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">From:</span>
                            <span>{requisition.fromLocation?.name} ({requisition.fromLocation?.code})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">To:</span>
                            <span>{requisition.toLocation?.name} ({requisition.toLocation?.code})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Requested Date:</span>
                            <span>{new Date(requisition.requestedDate).toLocaleDateString()}</span>
                        </div>
                        {requisition.requiredDate && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium">Required Date:</span>
                                <span>{new Date(requisition.requiredDate).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        {requisition.requestedBy && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span className="font-medium">Requested By:</span>
                                <span>{requisition.requestedBy}</span>
                            </div>
                        )}
                        {requisition.approvedBy && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span className="font-medium">Approved By:</span>
                                <span>{requisition.approvedBy}</span>
                            </div>
                        )}
                        {requisition.issuedDate && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium">Issued Date:</span>
                                <span>{new Date(requisition.issuedDate).toLocaleDateString()}</span>
                            </div>
                        )}
                        {requisition.deliveredDate && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium">Delivered Date:</span>
                                <span>{new Date(requisition.deliveredDate).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Related Transfer */}
            {requisition.transferId && (
                <Card>
                    <CardHeader>
                        <CardTitle>Related Transfer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    A transfer has been created for this requisition
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/stock-transfers/${requisition.transferId}`)}
                                    className="mt-2"
                                >
                                    <Package className="w-4 h-4 mr-2" />
                                    View Transfer Details
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Notes */}
            {requisition.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 mt-0.5" />
                            <p className="text-sm">{requisition.notes}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Items */}
            <Card>
                <CardHeader>
                    <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {requisition.items.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="font-medium">{item.productName}</p>
                                        <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm">
                                            <span className="font-medium">Requested:</span> {item.qtyRequested} {item.uomName}
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-medium">Issued:</span> {item.qtyIssued} {item.uomName}
                                        </p>
                                    </div>
                                    <div>
                                        {item.notes && (
                                            <p className="text-sm text-muted-foreground">Notes: {item.notes}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}