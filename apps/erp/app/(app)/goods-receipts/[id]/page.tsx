"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle } from "lucide-react";

interface GoodsReceipt {
  id: string;
  grNumber: string;
  purchaseOrderId: string;
  locationId: string;
  receivedDate: string;
  status: 'draft' | 'posted' | 'cancelled';
  notes?: string;
  items: GRItem[];
}

interface GRItem {
  id: string;
  productId: string;
  quantityReceived: string;
  uomId: string;
  lotNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
}

const statusVariants = {
  draft: "secondary",
  posted: "default",
  cancelled: "destructive",
} as const;

const statusLabels = {
  draft: "Draft",
  posted: "Posted",
  cancelled: "Cancelled",
};

export default function GoodsReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [gr, setGR] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchGR(params.id as string);
    }
  }, [params.id]);

  const fetchGR = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/goods-receipts/${id}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setGR(data.data);
      } else {
        toast.error("Failed to load goods receipt");
        router.push("/goods-receipts");
      }
    } catch (error) {
      console.error("Failed to fetch GR:", error);
      toast.error("Failed to load goods receipt");
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!gr) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/goods-receipts/${gr.id}/post`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ confirmed: true }),
        }
      );

      if (response.ok) {
        toast.success("Goods receipt posted successfully");
        fetchGR(gr.id);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to post goods receipt");
      }
    } catch (error) {
      console.error("Failed to post GR:", error);
      toast.error("Failed to post goods receipt");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!gr) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/goods-receipts")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{gr.grNumber}</h1>
          <p className="text-muted-foreground">Goods Receipt Details</p>
        </div>
        <Badge variant={statusVariants[gr.status]}>
          {statusLabels[gr.status]}
        </Badge>
      </div>

      {/* Actions */}
      {gr.status === 'draft' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handlePost} disabled={actionLoading}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Post to Inventory
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header Information */}
      <Card>
        <CardHeader>
          <CardTitle>Header Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">GR Number</p>
              <p className="font-mono font-semibold">{gr.grNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PO Reference</p>
              <p className="font-mono">{gr.purchaseOrderId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received Date</p>
              <p>{new Date(gr.receivedDate).toLocaleDateString()}</p>
            </div>
          </div>
          {gr.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <p className="text-sm">{gr.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items Received</CardTitle>
          <CardDescription>{gr.items.length} item(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gr.items.map((item) => (
              <div key={item.id} className="border p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <p className="font-semibold">Product ID: {item.productId}</p>
                  <p className="font-semibold">{item.quantityReceived} {item.uomId}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Lot:</span> {item.lotNumber}
                  </div>
                  {item.manufactureDate && (
                    <div>
                      <span className="font-medium">Mfg:</span> {new Date(item.manufactureDate).toLocaleDateString()}
                    </div>
                  )}
                  {item.expiryDate && (
                    <div>
                      <span className="font-medium">Exp:</span> {new Date(item.expiryDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
