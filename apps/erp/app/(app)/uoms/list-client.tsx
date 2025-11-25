"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus } from "lucide-react";

interface UOM {
  id: string;
  code: string;
  name: string;
  symbol: string;
  kind: string;
  isActive: boolean;
}

export default function UOMsListClient() {
  const router = useRouter();
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchUOMs = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/uoms?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const result = await response.json();
        // API returns { success: true, data: { items: [...], pagination: {...} } }
        const data = result.data || {};
        setUoms(Array.isArray(data.items) ? data.items : []);
        setPagination({
          page: data.pagination?.currentPage || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch UOMs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUOMs();
  }, []);

  const columns: Column<UOM>[] = [
    { key: "code", label: "Code", render: (value) => <span className="font-mono font-semibold">{value}</span> },
    { key: "name", label: "Name" },
    { key: "symbol", label: "Symbol" },
    {
      key: "kind",
      label: "Type",
      render: (value) => <Badge variant="outline" className="capitalize">{value}</Badge>,
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Units of Measure (UOM)</CardTitle>
              <CardDescription>
                Manage measurement units for inventory and transactions
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/uoms/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add UOM
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={uoms}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchUOMs(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchUOMs(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/uoms/${row.id}`)}
            emptyMessage="No UOMs found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
