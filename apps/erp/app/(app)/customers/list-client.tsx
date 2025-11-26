"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus } from "lucide-react";

interface Customer {
  id: string;
  code: string;
  name: string;
  type: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  paymentTerms: number | null;
  creditLimit: string | null;
  isActive: boolean;
}

export default function CustomersListClient() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchCustomers = async (page: number = 1, pageSize: number = 20, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/v1/customers?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const columns: Column<Customer>[] = [
    { key: "code", label: "Code", render: (value) => <span className="font-mono text-sm">{value}</span> },
    { key: "name", label: "Customer Name" },
    {
      key: "type",
      label: "Type",
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ),
    },
    { key: "contactPerson", label: "Contact Person", render: (value) => value || "-" },
    { key: "email", label: "Email", render: (value) => value || "-" },
    { key: "phone", label: "Phone", render: (value) => value || "-" },
    { key: "city", label: "City", render: (value) => value || "-" },
    {
      key: "paymentTerms",
      label: "Payment Terms",
      render: (value) => (value ? `${value} days` : "-"),
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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Customers</CardTitle>
              <CardDescription>
                Manage your business customers and accounts
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/customers/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={customers}
            loading={loading}
            pagination={{
              ...pagination,
              onPageChange: (page: number) => fetchCustomers(page, pagination.pageSize),
              onPageSizeChange: (pageSize: number) => fetchCustomers(pagination.page, pageSize),
            }}
            onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
            onSearch={(search) => fetchCustomers(1, pagination.pageSize, search)}
            searchPlaceholder="Search by name, email, code..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
