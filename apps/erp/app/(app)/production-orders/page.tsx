"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

interface ProductionOrder {
  id: string;
  productionNumber: string;
  recipeId: string;
  locationId: string;
  plannedQuantity: string;
  plannedDate: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

const statusVariants = {
  draft: "secondary",
  scheduled: "default",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
} as const;

export default function ProductionOrdersPage() {
  const router = useRouter();
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchProductionOrders = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/production-orders?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setProductionOrders(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch production orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionOrders();
  }, []);

  const columns: Column<ProductionOrder>[] = [
    {
      key: "productionNumber",
      label: "Production Number",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "plannedDate",
      label: "Planned Date",
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: "plannedQuantity",
      label: "Quantity",
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (value: ProductionOrder['status']) => (
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
            router.push(`/production-orders/${row.id}`);
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
              <CardTitle>Production Orders</CardTitle>
              <CardDescription>
                Manage production scheduling and execution
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/production-orders/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Production Order
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={productionOrders}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchProductionOrders(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchProductionOrders(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/production-orders/${row.id}`)}
            emptyMessage="No production orders found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
