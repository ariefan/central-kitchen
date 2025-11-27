"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

interface GoodsReceipt {
  id: string;
  grNumber: string;
  purchaseOrderId: string;
  locationId: string;
  receivedDate: string;
  status: 'draft' | 'posted' | 'cancelled';
  notes?: string;
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

export default function GoodsReceiptsPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchReceipts = async (page: number = 1, pageSize: number = 20, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await fetch(
        `/api/v1/goods-receipts?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setReceipts(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch goods receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const columns: Column<GoodsReceipt>[] = [
    {
      key: "grNumber",
      label: "GR Number",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "purchaseOrderId",
      label: "PO Reference",
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    {
      key: "receivedDate",
      label: "Received Date",
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: "status",
      label: "Status",
      render: (value: GoodsReceipt['status']) => (
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
            router.push(`/goods-receipts/${row.id}`);
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
              <CardTitle>Goods Receipts</CardTitle>
              <CardDescription>
                Receive and post goods to inventory
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/goods-receipts/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create GR
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={receipts}
            loading={loading}
            searchable
            searchPlaceholder="Search goods receipts..."
            onSearch={(query) => fetchReceipts(1, pagination.pageSize, query)}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchReceipts(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchReceipts(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/goods-receipts/${row.id}`)}
            emptyMessage="No goods receipts found. Click 'Create GR' to receive goods."
          />
        </CardContent>
      </Card>
    </div>
  );
}
