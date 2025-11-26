"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Check, Send, XCircle } from "lucide-react";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  locationId: string;
  orderDate: string;
  expectedDate?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'completed' | 'cancelled';
  totalAmount: string;
  notes?: string;
  items: POItem[];
}

interface POItem {
  id: string;
  productId: string;
  quantity: string;
  uomId: string;
  unitPrice: string;
  totalPrice: string;
}

const statusVariants = {
  draft: "secondary",
  pending_approval: "default",
  approved: "default",
  sent: "default",
  completed: "outline",
  cancelled: "destructive",
} as const;

const statusLabels = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  sent: "Sent",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPO(params.id as string);
    }
  }, [params.id]);

  const fetchPO = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/purchase-orders/${id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setPO(data.data);
      } else {
        toast.error("Failed to load purchase order");
        router.push("/purchase-orders");
      }
    } catch (error) {
      console.error("Failed to fetch PO:", error);
      toast.error("Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'submit' | 'approve' | 'send' | 'cancel') => {
    if (!po) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/v1/purchase-orders/${po.id}/${action}`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast.success(`Purchase order ${action}ed successfully`);
        fetchPO(po.id);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${action} purchase order`);
      }
    } catch (error) {
      console.error(`Failed to ${action} PO:`, error);
      toast.error(`Failed to ${action} purchase order`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!po) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/purchase-orders")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{po.poNumber}</h1>
          <p className="text-muted-foreground">Purchase Order Details</p>
        </div>
        <Badge variant={statusVariants[po.status]}>
          {statusLabels[po.status]}
        </Badge>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {po.status === 'draft' && (
              <Button onClick={() => handleAction('submit')} disabled={actionLoading}>
                <Send className="w-4 h-4 mr-2" />
                Submit for Approval
              </Button>
            )}
            {po.status === 'pending_approval' && (
              <Button onClick={() => handleAction('approve')} disabled={actionLoading}>
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            {po.status === 'approved' && (
              <Button onClick={() => handleAction('send')} disabled={actionLoading}>
                <Send className="w-4 h-4 mr-2" />
                Send to Supplier
              </Button>
            )}
            {(po.status === 'draft' || po.status === 'pending_approval') && (
              <Button
                variant="destructive"
                onClick={() => handleAction('cancel')}
                disabled={actionLoading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Header Information */}
      <Card>
        <CardHeader>
          <CardTitle>Header Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">PO Number</p>
              <p className="font-mono font-semibold">{po.poNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p>{new Date(po.orderDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expected Date</p>
              <p>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">${parseFloat(po.totalAmount).toFixed(2)}</p>
            </div>
          </div>
          {po.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm">{po.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <CardDescription>{po.items.length} item(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {po.items.map((item, index) => (
              <div key={item.id} className="flex justify-between items-center border p-4 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold">Product ID: {item.productId}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {item.quantity} | Unit Price: ${parseFloat(item.unitPrice).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-semibold">${parseFloat(item.totalPrice).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
