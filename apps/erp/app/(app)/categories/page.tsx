"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Package } from "lucide-react";

interface Category {
  value: string;
  label: string;
  description: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/categories`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        // The API returns product kinds enum
        setCategories(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const columns: Column<Category>[] = [
    {
      key: "value",
      label: "Category Code",
      render: (value) => <span className="font-mono text-sm uppercase">{value}</span>
    },
    {
      key: "label",
      label: "Category Name",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: "description",
      label: "Description",
      render: (value) => <span className="text-muted-foreground">{value}</span>
    },
    {
      key: "value",
      label: "Status",
      render: () => (
        <Badge variant="default">System</Badge>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Categories</CardTitle>
              <CardDescription>
                System-defined product categories and types
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> These are system-defined product categories (kinds) used for product classification.
              They help organize products into: Raw Materials, Semi-Finished Goods, Finished Goods, Packaging, and Consumables.
            </p>
          </div>

          <DataTable
            columns={columns}
            data={categories}
            loading={loading}
            searchable
            searchPlaceholder="Search categories..."
            onSearch={(query) => {
              const filtered = categories.filter(
                (cat) =>
                  cat.label.toLowerCase().includes(query.toLowerCase()) ||
                  cat.value.toLowerCase().includes(query.toLowerCase())
              );
              setCategories(filtered);
            }}
            emptyMessage="No categories found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
