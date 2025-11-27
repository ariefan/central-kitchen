"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

interface Delivery {
  id: string;
  deliveryNumber: string;
  salesOrderId: string;
  deliveryDate: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed';
  driverName?: string;
}

const statusVariants = {
  pending: "secondary",
  assigned: "default",
  in_transit: "default",
  delivered: "outline",
  failed: "destructive",
} as const;

export default function DeliveriesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchDeliveries = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `/api/v1/deliveries?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setDeliveries(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const columns: Column<Delivery>[] = [
    {
      key: "deliveryNumber",
      label: "Delivery Number",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "deliveryDate",
      label: "Delivery Date",
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: "driverName",
      label: "Driver",
      render: (value) => value || <span className="text-muted-foreground">Not assigned</span>
    },
    {
      key: "status",
      label: "Status",
      render: (value: Delivery['status']) => (
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
            router.push(`/deliveries/${row.id}`);
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deliveries</CardTitle>
              <CardDescription>
                Track and manage order deliveries
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/deliveries/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Delivery
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={deliveries}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchDeliveries(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchDeliveries(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/deliveries/${row.id}`)}
            emptyMessage="No deliveries found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
