"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, MapPin, Loader2 } from "lucide-react";
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
import { useAuth, useUserLocations, useSwitchLocation } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Location {
  id: string;
  code: string;
  name: string;
  locationType: string;
  isActive: boolean;
}

export function LocationSwitcher() {
  const [open, setOpen] = useState(false);
  const { user, location: currentLocation, profile } = useAuth();
  // Use profile.id (users table ID) for fetching locations
  const userId = profile?.id;
  const { data: userLocationsData, isLoading: isLoadingLocations, error } = useUserLocations(userId);
  const switchLocation = useSwitchLocation();

  const locations: Location[] = userLocationsData?.data?.locations || [];
  const hasMultipleLocations = locations.length > 1;

  const handleSwitchLocation = async (locationId: string) => {
    if (locationId === currentLocation?.id) {
      setOpen(false);
      return;
    }

    try {
      await switchLocation.mutateAsync(locationId);
      toast.success("Location switched successfully");
      setOpen(false);
      // Refresh page to update context
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch location");
    }
  };

  // Always show as a clickable button - users can see available locations
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto py-1.5 px-2 text-sm border-dashed"
          disabled={switchLocation.isPending || isLoadingLocations}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">
              {isLoadingLocations
                ? "Loading..."
                : currentLocation?.name || "Select location"}
            </span>
          </div>
          {switchLocation.isPending || isLoadingLocations ? (
            <Loader2 className="ml-1 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search location..." className="h-9 text-sm" />
          <CommandList>
            <CommandEmpty>
              {error ? "Failed to load locations" : "No locations available"}
            </CommandEmpty>
            <CommandGroup>
              {isLoadingLocations ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : locations.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No locations assigned
                </div>
              ) : (
                locations.map((loc) => (
                  <CommandItem
                    key={loc.id}
                    value={loc.name}
                    onSelect={() => handleSwitchLocation(loc.id)}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentLocation?.id === loc.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{loc.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {loc.code} - {loc.locationType?.replace("_", " ")}
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
