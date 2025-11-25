"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function NewTemperatureLogClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    locationId: "",
    equipmentName: "",
    temperature: "",
    minThreshold: "",
    maxThreshold: "",
    notes: "",
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/locations?limit=100`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setLocations(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      toast.error("Failed to load locations");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        locationId: formData.locationId,
        equipmentName: formData.equipmentName,
        temperature: parseFloat(formData.temperature),
        minThreshold: formData.minThreshold ? parseFloat(formData.minThreshold) : undefined,
        maxThreshold: formData.maxThreshold ? parseFloat(formData.maxThreshold) : undefined,
        notes: formData.notes || undefined,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/temperature-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Temperature log created successfully");
        router.push("/temperature-logs");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create temperature log");
      }
    } catch (error) {
      console.error("Failed to create temperature log:", error);
      toast.error("Failed to create temperature log");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Log Temperature</CardTitle>
          <CardDescription>Record equipment temperature for food safety compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locationId">Location *</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipmentName">Equipment Name *</Label>
                <Input
                  id="equipmentName"
                  value={formData.equipmentName}
                  onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                  placeholder="e.g., Refrigerator #1, Freezer #2"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C) *</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minThreshold">Min Threshold (°C)</Label>
                <Input
                  id="minThreshold"
                  type="number"
                  step="0.1"
                  value={formData.minThreshold}
                  onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
                  placeholder="e.g., 0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxThreshold">Max Threshold (°C)</Label>
                <Input
                  id="maxThreshold"
                  type="number"
                  step="0.1"
                  value={formData.maxThreshold}
                  onChange={(e) => setFormData({ ...formData, maxThreshold: e.target.value })}
                  placeholder="e.g., 5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Any observations or corrective actions..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/temperature-logs")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Logging..." : "Log Temperature"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
