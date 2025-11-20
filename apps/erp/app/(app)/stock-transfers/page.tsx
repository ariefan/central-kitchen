"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

interface StockTransfer {
  id: string;
  transferNumber: string;
  fromLocationId: string;
  toLocationId: string;
  transferDate: string;
  status: 'draft' | 'in_transit' | 'received' | 'cancelled';
  notes?: string;
}

const statusVariants = {
  draft: "secondary",
  in_transit: "default",
  received: "outline",
  cancelled: "destructive",
} as const;

export default function StockTransfersPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchTransfers = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/stock-transfers?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setTransfers(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stock transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const columns: Column<StockTransfer>[] = [
    {
      key: "transferNumber",
      label: "Transfer Number",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "transferDate",
      label: "Transfer Date",
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: "status",
      label: "Status",
      render: (value: StockTransfer['status']) => (
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
            router.push(`/stock-transfers/${row.id}`);
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
              <CardTitle>Stock Transfers</CardTitle>
              <CardDescription>
                Transfer inventory between locations
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/stock-transfers/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Transfer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={transfers}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchTransfers(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchTransfers(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/stock-transfers/${row.id}`)}
            emptyMessage="No stock transfers found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
