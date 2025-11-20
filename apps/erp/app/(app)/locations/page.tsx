"use client";

import { useState } from "react";
import { useLocations, useDeleteLocation } from "@/hooks/use-locations";
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
import { Plus, MapPin, Loader2, Trash2, Pencil } from "lucide-react";

export default function LocationsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useLocations();
  const deleteLocation = useDeleteLocation();

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this location?")) {
      deleteLocation.mutate(id);
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
            <CardTitle>Error Loading Locations</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load locations"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Ensure locations is always an array - handle different response structures
  const locations = Array.isArray(data?.data?.items)
    ? data.data.items
    : Array.isArray(data?.data)
    ? data.data
    : [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage your central kitchens, outlets, and warehouses
          </p>
        </div>
        <Link href="/locations/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>
            {locations.length} location{locations.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <MapPin className="w-12 h-12 opacity-20" />
                      <p>No locations found</p>
                      <Link href="/locations/new">
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add your first location
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-mono text-sm">
                      {location.code}
                    </TableCell>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {location.locationType?.replace("_", " ") || location.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{location.city || "-"}</TableCell>
                    <TableCell>{location.country || "-"}</TableCell>
                    <TableCell>
                      {location.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/locations/${location.id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(location.id)}
                          disabled={deleteLocation.isPending}
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
        </CardContent>
      </Card>
    </div>
  );
}
