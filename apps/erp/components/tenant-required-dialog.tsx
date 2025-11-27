"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";
import { useLookupTenant, useJoinTenant } from "@/hooks/use-tenants";
import { useDebounce } from "@/hooks/use-debounce";

interface TenantRequiredDialogProps {
  open: boolean;
}

export function TenantRequiredDialog({ open }: TenantRequiredDialogProps) {
  const [slug, setSlug] = useState("");
  const debouncedSlug = useDebounce(slug, 500);

  const {
    data: lookupResult,
    isLoading: isLookingUp,
    error: lookupError,
  } = useLookupTenant(debouncedSlug);

  const joinTenant = useJoinTenant();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupResult?.data) return;

    joinTenant.mutate(slug);
  };

  const tenantFound = lookupResult?.success && lookupResult?.data;
  const showError = debouncedSlug.length > 0 && !isLookingUp && lookupError;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Join a Tenant
          </DialogTitle>
          <DialogDescription>
            Your account is not associated with any tenant. Please enter a
            tenant slug to join an organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-slug">Tenant Slug</Label>
            <div className="relative">
              <Input
                id="tenant-slug"
                type="text"
                placeholder="e.g., dapoer-roema"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                className={showError ? "border-red-500 focus-visible:ring-red-500" : ""}
                disabled={joinTenant.isPending}
              />
              {isLookingUp && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {tenantFound && !isLookingUp && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>

            {showError && (
              <p className="text-sm text-red-500">
                {lookupError instanceof Error
                  ? lookupError.message
                  : "Tenant not found"}
              </p>
            )}

            {tenantFound && lookupResult?.data && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Found: <strong>{lookupResult.data.name}</strong>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!tenantFound || joinTenant.isPending}
            >
              {joinTenant.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Tenant"
              )}
            </Button>
          </div>

          {joinTenant.error && (
            <p className="text-sm text-red-500 text-center">
              {joinTenant.error.message}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
