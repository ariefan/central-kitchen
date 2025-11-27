"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Pencil } from "lucide-react";

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchSuppliers = async (page: number = 1, pageSize: number = 20, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await fetch(
        `/api/v1/suppliers?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        // Ensure data.data is an array
        setSuppliers(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const columns: Column<Supplier>[] = [
    { key: "code", label: "Code", render: (value) => <span className="font-mono text-sm">{value}</span> },
    { key: "name", label: "Supplier Name" },
    { key: "contactPerson", label: "Contact Person", render: (value) => value || <span className="text-muted-foreground">-</span> },
    { key: "email", label: "Email", render: (value) => value || <span className="text-muted-foreground">-</span> },
    { key: "phone", label: "Phone", render: (value) => value || <span className="text-muted-foreground">-</span> },
    {
      key: "isActive",
      label: "Status",
      render: (value) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
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
            router.push(`/suppliers/${row.id}`);
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
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
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>
                Manage your supplier relationships and contact information
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/suppliers/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={suppliers}
            loading={loading}
            searchable
            searchPlaceholder="Search suppliers by name or code..."
            onSearch={(query) => fetchSuppliers(1, pagination.pageSize, query)}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchSuppliers(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchSuppliers(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/suppliers/${row.id}`)}
            emptyMessage="No suppliers found. Click 'Add Supplier' to create your first supplier."
          />
        </CardContent>
      </Card>
    </div>
  );
}
