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
  const { data: userLocationsData, isLoading: isLoadingLocations } = useUserLocations(profile?.id);
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

  // If only one location or no locations, just show the current location
  if (!hasMultipleLocations) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span className="truncate">{currentLocation?.name || "No location"}</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto py-1.5 px-2 text-xs"
          disabled={switchLocation.isPending}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {currentLocation?.name || "Select location"}
            </span>
          </div>
          {switchLocation.isPending ? (
            <Loader2 className="ml-1 h-3 w-3 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search location..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup>
              {isLoadingLocations ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                locations.map((loc) => (
                  <CommandItem
                    key={loc.id}
                    value={loc.name}
                    onSelect={() => handleSwitchLocation(loc.id)}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        currentLocation?.id === loc.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{loc.name}</span>
                      <span className="text-[10px] text-muted-foreground">
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
