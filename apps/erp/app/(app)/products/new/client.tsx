"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface UOM {
  id: string;
  code: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function NewProductClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productKind: "raw_material",
    sku: "",
    baseUomId: "",
    categoryId: "",
    isActive: true,
    trackLots: false,
    lotNumberPrefix: "",
    trackExpiry: false,
    defaultExpiryDays: "",
    minStock: "",
    maxStock: "",
    reorderPoint: "",
  });

  useEffect(() => {
    fetchUOMs();
    fetchCategories();
  }, []);

  const fetchUOMs = async () => {
    try {
      const response = await fetch("/api/v1/uoms?limit=100", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUoms(Array.isArray(data.data?.items) ? data.data.items : Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch UOMs:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/v1/categories?limit=100", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data.data?.items) ? data.data.items : Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        sku: formData.sku || undefined, // Don't send empty string
        defaultExpiryDays: formData.defaultExpiryDays ? parseInt(formData.defaultExpiryDays) : undefined,
        minStock: formData.minStock ? parseFloat(formData.minStock) : undefined,
        maxStock: formData.maxStock ? parseFloat(formData.maxStock) : undefined,
        reorderPoint: formData.reorderPoint ? parseFloat(formData.reorderPoint) : undefined,
        categoryId: formData.categoryId || undefined,
      };

      const response = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Product created successfully");
        router.push("/products");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create product");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>New Product</CardTitle>
            <CardDescription>
              Add a new product to your catalog
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productKind">Product Type *</Label>
                  <Select
                    value={formData.productKind}
                    onValueChange={(value) =>
                      setFormData({ ...formData, productKind: value })
                    }
                  >
                    <SelectTrigger id="productKind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw_material">Raw Material</SelectItem>
                      <SelectItem value="semi_finished">Semi-Finished</SelectItem>
                      <SelectItem value="finished_good">Finished Good</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="consumable">Consumable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseUomId">Base UOM *</Label>
                  <Select
                    value={formData.baseUomId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, baseUomId: value })
                    }
                  >
                    <SelectTrigger id="baseUomId">
                      <SelectValue placeholder="Select UOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {uoms.map((uom) => (
                        <SelectItem key={uom.id} value={uom.id}>
                          {uom.code} - {uom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                  >
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Lot Tracking */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Lot Tracking</h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="trackLots">Enable Lot Tracking</Label>
                <Switch
                  id="trackLots"
                  checked={formData.trackLots}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, trackLots: checked })
                  }
                />
              </div>

              {formData.trackLots && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="lotNumberPrefix">Lot Number Prefix</Label>
                    <Input
                      id="lotNumberPrefix"
                      value={formData.lotNumberPrefix}
                      onChange={(e) =>
                        setFormData({ ...formData, lotNumberPrefix: e.target.value })
                      }
                      placeholder="e.g., LOT"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="trackExpiry">Track Expiry Dates</Label>
                    <Switch
                      id="trackExpiry"
                      checked={formData.trackExpiry}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, trackExpiry: checked })
                      }
                    />
                  </div>

                  {formData.trackExpiry && (
                    <div className="space-y-2">
                      <Label htmlFor="defaultExpiryDays">Default Expiry Days</Label>
                      <Input
                        id="defaultExpiryDays"
                        type="number"
                        value={formData.defaultExpiryDays}
                        onChange={(e) =>
                          setFormData({ ...formData, defaultExpiryDays: e.target.value })
                        }
                        placeholder="90"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Inventory Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Inventory Settings</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minStock">Min Stock</Label>
                  <Input
                    id="minStock"
                    type="number"
                    step="0.01"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStock">Max Stock</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    step="0.01"
                    value={formData.maxStock}
                    onChange={(e) =>
                      setFormData({ ...formData, maxStock: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    step="0.01"
                    value={formData.reorderPoint}
                    onChange={(e) =>
                      setFormData({ ...formData, reorderPoint: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Creating..." : "Create Product"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
