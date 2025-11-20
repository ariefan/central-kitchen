"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  orderDate: string;
  deliveryDate?: string;
  status: 'draft' | 'confirmed' | 'in_delivery' | 'delivered' | 'cancelled';
  totalAmount: string;
}

const statusVariants = {
  draft: "secondary",
  confirmed: "default",
  in_delivery: "default",
  delivered: "outline",
  cancelled: "destructive",
} as const;

export default function SalesOrdersPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchSalesOrders = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sales-orders?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setSalesOrders(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const columns: Column<SalesOrder>[] = [
    {
      key: "orderNumber",
      label: "Order Number",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "orderDate",
      label: "Order Date",
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: "deliveryDate",
      label: "Delivery Date",
      render: (value) => value ? new Date(value).toLocaleDateString() : <span className="text-muted-foreground">-</span>
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (value) => <span className="font-semibold">${parseFloat(value).toFixed(2)}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (value: SalesOrder['status']) => (
        <Badge variant={statusVariants[value]} className="capitalize">
          {value.replace('_', ' ')}
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
            router.push(`/sales-orders/${row.id}`);
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
              <CardTitle>Sales Orders</CardTitle>
              <CardDescription>
                Manage customer orders and deliveries
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/sales-orders/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Sales Order
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={salesOrders}
            loading={loading}
            searchable
            searchPlaceholder="Search sales orders..."
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchSalesOrders(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchSalesOrders(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/sales-orders/${row.id}`)}
            emptyMessage="No sales orders found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
