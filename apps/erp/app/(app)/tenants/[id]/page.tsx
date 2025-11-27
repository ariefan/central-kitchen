"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTenant, useUpdateTenant } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;

  const { data: tenantData, isLoading: isLoadingTenant } = useTenant(tenantId);
  const updateTenant = useUpdateTenant();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    isActive: true,
  });

  useEffect(() => {
    if (tenantData?.data) {
      setFormData({
        name: tenantData.data.name,
        slug: tenantData.data.slug,
        isActive: tenantData.data.isActive,
      });
    }
  }, [tenantData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    try {
      await updateTenant.mutateAsync({
        id: tenantId,
        data: formData,
      });
      toast.success("Tenant updated successfully");
      router.push("/tenants");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tenant");
    }
  };

  if (isLoadingTenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tenant = tenantData?.data;

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Tenant</h1>
          <p className="text-muted-foreground">
            Update tenant information
          </p>
        </div>
      </div>

      {tenant && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Users</span>
              </div>
              <p className="text-2xl font-bold mt-1">{tenant.totalUsers || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Locations</span>
              </div>
              <p className="text-2xl font-bold mt-1">{tenant.totalLocations || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tenant Details</CardTitle>
          <CardDescription>
            Update the tenant information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="orgId">Organization ID</Label>
              <Input
                id="orgId"
                value={tenant?.orgId || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Organization ID cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Acme Corporation"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                placeholder="e.g., acme-corp"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive tenants cannot access the system
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={updateTenant.isPending}
                className="flex-1"
              >
                {updateTenant.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Link href="/tenants" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
