"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Package } from "lucide-react";

interface Category {
  id: string;
  code: string;
  name: string;
}

export default function CategoriesListClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/categories?limit=100", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
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
      key: "code",
      label: "Code",
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    { key: "name", label: "Name" },
    { key: "id", label: "Type ID" },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Kinds</CardTitle>
              <CardDescription>
                View available product types/kinds
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={categories}
            loading={loading}
            searchable
            searchPlaceholder="Search categories..."
            emptyMessage="No categories found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
