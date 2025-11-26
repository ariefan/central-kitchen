"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ProductVariant {
  id: string;
  variantName: string;
  priceDifferential: string;
  barcode?: string;
  sku?: string;
  isActive: boolean;
  displayOrder: number;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uoms, setUoms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>(null);

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantFormData, setVariantFormData] = useState({
    variantName: "",
    priceDifferential: "0",
    barcode: "",
    sku: "",
    isActive: true,
    displayOrder: 0,
  });

  useEffect(() => {
    fetchProduct();
    fetchUOMs();
    fetchCategories();
    fetchVariants();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(
        `/api/v1/products/${params.id}`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setFormData(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUOMs = async () => {
    try {
      const response = await fetch(
        `/api/v1/uoms?limit=100`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setUoms(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch UOMs:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `/api/v1/categories?limit=100`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchVariants = async () => {
    setLoadingVariants(true);
    try {
      const response = await fetch(
        `/api/v1/products/${params.id}/variants`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setVariants(Array.isArray(data.data?.items) ? data.data.items : []);
      }
    } catch (error) {
      console.error("Failed to fetch variants:", error);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        `/api/v1/products/${params.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        toast.success("Product updated successfully");
        router.push("/products");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update product");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const openVariantDialog = (variant?: ProductVariant) => {
    if (variant) {
      setEditingVariant(variant);
      setVariantFormData({
        variantName: variant.variantName,
        priceDifferential: variant.priceDifferential,
        barcode: variant.barcode || "",
        sku: variant.sku || "",
        isActive: variant.isActive,
        displayOrder: variant.displayOrder,
      });
    } else {
      setEditingVariant(null);
      setVariantFormData({
        variantName: "",
        priceDifferential: "0",
        barcode: "",
        sku: "",
        isActive: true,
        displayOrder: variants.length,
      });
    }
    setVariantDialogOpen(true);
  };

  const handleVariantSubmit = async () => {
    setSaving(true);
    try {
      const url = editingVariant
        ? `/api/v1/product-variants/${editingVariant.id}`
        : `/api/v1/products/${params.id}/variants`;

      const response = await fetch(url, {
        method: editingVariant ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(variantFormData),
      });

      if (response.ok) {
        toast.success(`Variant ${editingVariant ? "updated" : "created"} successfully`);
        setVariantDialogOpen(false);
        fetchVariants();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save variant");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Are you sure you want to delete this variant?")) return;

    try {
      const response = await fetch(
        `/api/v1/product-variants/${variantId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Variant deleted successfully");
        fetchVariants();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete variant");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Product not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Edit Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={formData.sku || ""} disabled className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Select
                  value={formData.kind}
                  onValueChange={(value) => setFormData({ ...formData, kind: value })}
                >
                  <SelectTrigger>
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
                <Label>Category</Label>
                <Select
                  value={formData.categoryId || ""}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex gap-4 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Variants Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Variants</CardTitle>
              <CardDescription>
                Manage size, flavor, or color variants with price differentials
              </CardDescription>
            </div>
            <Button onClick={() => openVariantDialog()} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Variant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingVariants ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : variants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No variants yet. Click "Add Variant" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <p className="font-medium">{variant.variantName}</p>
                      {variant.sku && (
                        <p className="text-sm text-muted-foreground font-mono">
                          SKU: {variant.sku}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price Differential</p>
                      <p className={`font-medium ${parseFloat(variant.priceDifferential) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {parseFloat(variant.priceDifferential) >= 0 ? "+" : ""}
                        ${parseFloat(variant.priceDifferential).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Barcode</p>
                      <p className="text-sm font-mono">
                        {variant.barcode || <span className="text-muted-foreground">-</span>}
                      </p>
                    </div>
                    <div>
                      <Badge variant={variant.isActive ? "default" : "secondary"}>
                        {variant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openVariantDialog(variant)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVariant(variant.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit" : "Add"} Variant</DialogTitle>
            <DialogDescription>
              {editingVariant ? "Update" : "Create a new"} product variant with price differential
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Variant Name *</Label>
              <Input
                value={variantFormData.variantName}
                onChange={(e) =>
                  setVariantFormData({ ...variantFormData, variantName: e.target.value })
                }
                placeholder="e.g., Large, Chocolate, Red"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Price Differential</Label>
              <Input
                type="number"
                step="0.01"
                value={variantFormData.priceDifferential}
                onChange={(e) =>
                  setVariantFormData({ ...variantFormData, priceDifferential: e.target.value })
                }
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Positive for upcharge, negative for discount
              </p>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={variantFormData.sku}
                onChange={(e) =>
                  setVariantFormData({ ...variantFormData, sku: e.target.value })
                }
                placeholder="Optional variant SKU"
              />
            </div>
            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input
                value={variantFormData.barcode}
                onChange={(e) =>
                  setVariantFormData({ ...variantFormData, barcode: e.target.value })
                }
                placeholder="Optional barcode"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={variantFormData.displayOrder}
                onChange={(e) =>
                  setVariantFormData({
                    ...variantFormData,
                    displayOrder: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={variantFormData.isActive}
                onCheckedChange={(checked) =>
                  setVariantFormData({ ...variantFormData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVariantSubmit} disabled={saving}>
              {saving ? "Saving..." : editingVariant ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
