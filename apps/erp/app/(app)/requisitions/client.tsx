"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

interface Requisition {
  id: string;
  requisitionNumber: string;
  fromLocationId: string;
  toLocationId: string;
  requestDate: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'issued' | 'cancelled';
}

const statusVariants = {
  draft: "secondary",
  pending_approval: "default",
  approved: "default",
  issued: "outline",
  cancelled: "destructive",
} as const;

export default function RequisitionsClient() {
  const router = useRouter();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchRequisitions = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(`/api/v1/requisitions?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setRequisitions(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch requisitions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const columns: Column<Requisition>[] = [
    {
      key: "requisitionNumber",
      label: "Requisition Number",
      render: (value) => <span className="font-mono text-sm font-semibold">{value}</span>
    },
    {
      key: "requestDate",
      label: "Request Date",
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: "status",
      label: "Status",
      render: (value: Requisition['status']) => (
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
            router.push(`/requisitions/${row.id}`);
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
              <CardTitle>Requisitions</CardTitle>
              <CardDescription>
                Request inventory items from warehouse
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/requisitions/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Requisition
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={requisitions}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchRequisitions(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchRequisitions(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/requisitions/${row.id}`)}
            emptyMessage="No requisitions found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
