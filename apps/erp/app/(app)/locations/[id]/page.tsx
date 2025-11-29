"use client";

import { useRouter, useParams } from "next/navigation";
import { LocationForm } from "@/components/locations/location-form";
import { useLocation, useUpdateLocation } from "@/hooks/use-locations";
import type { LocationCreate, LocationUpdate } from "@contracts/erp";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;

  const { data: locationData, isLoading, error } = useLocation(locationId);
  const updateLocation = useUpdateLocation(locationId);

  const handleSubmit = async (data: LocationCreate | LocationUpdate) => {
    try {
      await updateLocation.mutateAsync(data as LocationUpdate);
      toast.success("Location updated successfully");
      router.push("/locations");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update location"
      );
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
            <CardTitle>Error Loading Location</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load location"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/locations">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Locations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const location = locationData?.data;

  if (!location) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Location Not Found</CardTitle>
            <CardDescription>
              The location you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/locations">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Locations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/locations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Location</h1>
          <p className="text-muted-foreground">
            Update {location.name} ({location.code})
          </p>
        </div>
      </div>

      <LocationForm
        initialData={location as any}
        onSubmit={handleSubmit}
        isLoading={updateLocation.isPending}
        onCancel={() => router.push("/locations")}
      />
    </div>
  );
}
