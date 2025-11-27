"use client";

import { useState } from "react";
import { useTenants, useDeleteTenant } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Loader2, Trash2, Pencil, Users, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function TenantsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const { data, isLoading, error } = useTenants({ limit: pageSize, offset });
  const deleteTenant = useDeleteTenant();

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to deactivate this tenant?")) {
      try {
        await deleteTenant.mutateAsync(id);
        toast.success("Tenant deactivated successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to deactivate tenant");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Tenants</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load tenants"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const tenants = data?.data?.items || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage organizations in the multi-tenant system
          </p>
        </div>
        <Link href="/tenants/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            {pagination?.total || tenants.length} tenant{(pagination?.total || tenants.length) !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Organization ID</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="w-12 h-12 opacity-20" />
                      <p>No tenants found</p>
                      <Link href="/tenants/new">
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add your first tenant
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="font-mono text-sm">{tenant.slug}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {tenant.orgId.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{tenant.totalUsers || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span>{tenant.totalLocations || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tenant.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tenant.id)}
                          disabled={deleteTenant.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
