"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, Eye } from "lucide-react";

interface Recipe {
  id: string;
  code: string;
  name: string;
  version: number;
  outputQuantity: string;
  status: 'draft' | 'active' | 'inactive';
  isActive: boolean;
}

export default function RecipesListClient() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchRecipes = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(`/api/v1/recipes?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setRecipes(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const columns: Column<Recipe>[] = [
    {
      key: "code",
      label: "Code",
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    { key: "name", label: "Recipe Name" },
    {
      key: "version",
      label: "Version",
      render: (value) => <span className="text-sm">v{value}</span>
    },
    {
      key: "outputQuantity",
      label: "Output Qty",
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (value: Recipe['status']) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'} className="capitalize">
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
            router.push(`/recipes/${row.id}`);
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
              <CardTitle>Recipes (BOMs)</CardTitle>
              <CardDescription>
                Manage production recipes and bill of materials
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/recipes/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Recipe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={recipes}
            loading={loading}
            searchable
            searchPlaceholder="Search recipes..."
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchRecipes(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchRecipes(1, pageSize),
            }}
            onRowClick={(row) => router.push(`/recipes/${row.id}`)}
            emptyMessage="No recipes found. Create your first recipe."
          />
        </CardContent>
      </Card>
    </div>
  );
}
