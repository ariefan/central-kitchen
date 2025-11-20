"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

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

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchPurchaseOrders = async (page: number = 1, pageSize: number = 20, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase-orders?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "poNumber",
      label: "PO Number",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "orderDate",
      label: "Order Date",
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: "expectedDate",
      label: "Expected Date",
      render: (value) => value ? new Date(value).toLocaleDateString() : <span className="text-muted-foreground">-</span>
    },
    {
      key: "totalAmount",
      label: "Total Amount",
      render: (value) => <span className="font-semibold">${parseFloat(value).toFixed(2)}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (value: PurchaseOrder['status']) => (
        <Badge variant={statusVariants[value]}>
          {statusLabels[value]}
        </Badge>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/purchase-orders/${row.id}`);
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                Manage purchase orders and track procurement workflow
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/purchase-orders/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={purchaseOrders}
            loading={loading}
            searchable
            searchPlaceholder="Search purchase orders..."
            onSearch={(query) => fetchPurchaseOrders(1, pagination.pageSize, query)}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchPurchaseOrders(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchPurchaseOrders(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
            emptyMessage="No purchase orders found. Click 'Create PO' to create your first purchase order."
          />
        </CardContent>
      </Card>
    </div>
  );
}
