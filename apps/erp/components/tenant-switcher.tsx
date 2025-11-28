"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useAllTenants, useSwitchTenant } from "@/hooks/use-tenants";
import { toast } from "sonner";

export function TenantSwitcher() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();
  const { data: tenantsData, isLoading: isLoadingTenants } = useAllTenants();
  const switchTenant = useSwitchTenant();

  // Only show for users with tenant:manage permission (super users)
  const canManageTenants = hasPermission("tenant", "manage");

  if (!canManageTenants) {
    return null;
  }

  const tenants = tenantsData?.data?.items || [];
  const currentTenant = profile?.tenant;

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === currentTenant?.id) {
      setOpen(false);
      return;
    }

    try {
      await switchTenant.mutateAsync(tenantId);
      toast.success("Tenant switched successfully");
      setOpen(false);
      // Refresh page to update context
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch tenant");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto py-1.5 px-2 text-sm border-dashed"
          disabled={switchTenant.isPending || isLoadingTenants}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">
              {isLoadingTenants
                ? "Loading..."
                : currentTenant?.name || "Select tenant"}
            </span>
          </div>
          {switchTenant.isPending || isLoadingTenants ? (
            <Loader2 className="ml-1 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tenant..." className="h-9 text-sm" />
          <CommandList>
            <CommandEmpty>No tenants found</CommandEmpty>
            <CommandGroup>
              {isLoadingTenants ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : tenants.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No tenants available
                </div>
              ) : (
                tenants.map((tenant) => (
                  <CommandItem
                    key={tenant.id}
                    value={tenant.name}
                    onSelect={() => handleSwitchTenant(tenant.id)}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentTenant?.id === tenant.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{tenant.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {tenant.slug}
                      </span>
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
