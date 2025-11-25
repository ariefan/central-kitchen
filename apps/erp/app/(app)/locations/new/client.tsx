"use client";

import { useRouter } from "next/navigation";
import { LocationForm } from "@/components/locations/location-form";
import { useCreateLocation } from "@/hooks/use-locations";
import type { LocationCreate } from "@contracts/erp";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function NewLocationClient() {
  const router = useRouter();
  const createLocation = useCreateLocation();

  const handleSubmit = async (data: LocationCreate) => {
    try {
      await createLocation.mutateAsync(data);
      toast.success("Location created successfully");
      router.push("/locations");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create location"
      );
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/locations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Location</h1>
          <p className="text-muted-foreground">
            Add a new central kitchen, outlet, or warehouse
          </p>
        </div>
      </div>

      <LocationForm
        onSubmit={handleSubmit}
        isLoading={createLocation.isPending}
        onCancel={() => router.push("/locations")}
      />
    </div>
  );
}
