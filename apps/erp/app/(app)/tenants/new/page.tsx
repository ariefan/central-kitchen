"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateTenant } from "@/hooks/use-tenants";
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
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function NewTenantPage() {
  const router = useRouter();
  const createTenant = useCreateTenant();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    orgId: "",
    isActive: true,
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

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

    if (!formData.orgId.trim()) {
      toast.error("Organization ID is required");
      return;
    }

    try {
      await createTenant.mutateAsync(formData);
      toast.success("Tenant created successfully");
      router.push("/tenants");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tenant");
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Tenant</h1>
          <p className="text-muted-foreground">
            Create a new organization in the system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Details</CardTitle>
          <CardDescription>
            Enter the details for the new tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Acme Corporation"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
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

            <div className="space-y-2">
              <Label htmlFor="orgId">Organization ID *</Label>
              <Input
                id="orgId"
                placeholder="e.g., org_123456789"
                value={formData.orgId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, orgId: e.target.value }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                External organization identifier from Better Auth
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
                disabled={createTenant.isPending}
                className="flex-1"
              >
                {createTenant.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Tenant
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
