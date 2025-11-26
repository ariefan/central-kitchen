"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Pencil } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  productKind: string;
  baseUom: {
    code: string;
    name: string;
  };
  category?: {
    name: string;
  };
  isActive: boolean;
  createdAt: string;
}

export default function ProductsListClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchProducts = async (page: number = 1, pageSize: number = 20, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/v1/products?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        // API returns { success: true, data: { items: [...], pagination: {...} } }
        const data = result.data || {};
        setProducts(Array.isArray(data.items) ? data.items : []);
        setPagination({
          page: data.pagination?.currentPage || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const columns: Column<Product>[] = [
    {
      key: "sku",
      label: "SKU",
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: "name",
      label: "Product Name",
    },
    {
      key: "productKind",
      label: "Type",
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "category.name",
      label: "Category",
      render: (value) => value || <span className="text-muted-foreground">-</span>,
    },
    {
      key: "baseUom.code",
      label: "Base UOM",
      render: (value) => <span className="font-mono text-sm">{value}</span>,
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
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/products/${row.id}`);
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
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
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Manage your product catalog including raw materials, semi-finished goods, and finished products
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/products/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={products}
            loading={loading}
            searchable
            searchPlaceholder="Search products by name or SKU..."
            onSearch={(query) => fetchProducts(1, pagination.pageSize, query)}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchProducts(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchProducts(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/products/${row.id}`)}
            emptyMessage="No products found. Click 'Add Product' to create your first product."
          />
        </CardContent>
      </Card>
    </div>
  );
}
