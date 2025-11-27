"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  locationId: string;
  adjustmentDate: string;
  reason: string;
  status: 'draft' | 'approved' | 'posted' | 'cancelled';
}

const statusVariants = {
  draft: "secondary",
  approved: "default",
  posted: "outline",
  cancelled: "destructive",
} as const;

export default function StockAdjustmentsPage() {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchAdjustments = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `/api/v1/adjustments?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setAdjustments(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stock adjustments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const columns: Column<StockAdjustment>[] = [
    {
      key: "adjustmentNumber",
      label: "Adjustment Number",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "adjustmentDate",
      label: "Adjustment Date",
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: "reason",
      label: "Reason",
      render: (value) => <span className="capitalize">{value.replace('_', ' ')}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (value: StockAdjustment['status']) => (
        <Badge variant={statusVariants[value]} className="capitalize">
          {value}
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
            router.push(`/stock-adjustments/${row.id}`);
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
              <CardTitle>Stock Adjustments</CardTitle>
              <CardDescription>
                Adjust inventory for damages, losses, or discrepancies
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/stock-adjustments/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={adjustments}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchAdjustments(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchAdjustments(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/stock-adjustments/${row.id}`)}
            emptyMessage="No stock adjustments found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
