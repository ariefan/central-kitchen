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
import { Plus, Trash2 } from "lucide-react";

interface TransferItem {
  productId: string;
  quantity: string;
  uomId: string;
  lotNumber: string;
}

export default function NewStockTransferClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fromLocationId: "",
    toLocationId: "",
    transferDate: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [items, setItems] = useState<TransferItem[]>([
    { productId: "", quantity: "", uomId: "", lotNumber: "" }
  ]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [locationsRes, productsRes, uomsRes] = await Promise.all([
        fetch("/api/v1/locations?limit=100", { credentials: "include" }),
        fetch("/api/v1/products?limit=100", { credentials: "include" }),
        fetch("/api/v1/uoms?limit=100", { credentials: "include" }),
      ]);

      if (locationsRes.ok) {
        const data = await locationsRes.json();
        const items = data.data?.items || data.data || [];
        setLocations(Array.isArray(items) ? items : []);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        const items = data.data?.items || data.data || [];
        setProducts(Array.isArray(items) ? items : []);
      }
      if (uomsRes.ok) {
        const data = await uomsRes.json();
        const items = data.data?.items || data.data || [];
        setUoms(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error("Failed to fetch master data:", error);
      toast.error("Failed to load form data");
    }
  };

  const addItem = () => {
    setItems([...items, { productId: "", quantity: "", uomId: "", lotNumber: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransferItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          uomId: item.uomId,
          lotNumber: item.lotNumber || undefined,
        })),
      };

      const response = await fetch("/api/v1/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Stock transfer created successfully");
        router.push("/stock-transfers");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create stock transfer");
      }
    } catch (error) {
      console.error("Failed to create stock transfer:", error);
      toast.error("Failed to create stock transfer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Stock Transfer</CardTitle>
          <CardDescription>Transfer inventory between locations</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromLocationId">From Location *</Label>
                <Select
                  value={formData.fromLocationId}
                  onValueChange={(value) => setFormData({ ...formData, fromLocationId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source location" />
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
                <Label htmlFor="toLocationId">To Location *</Label>
                <Select
                  value={formData.toLocationId}
                  onValueChange={(value) => setFormData({ ...formData, toLocationId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination location" />
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
                <Label htmlFor="transferDate">Transfer Date *</Label>
                <Input
                  id="transferDate"
                  type="date"
                  value={formData.transferDate}
                  onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Items to Transfer</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start border p-4 rounded-lg">
                    <div className="flex-1 grid grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label>Product *</Label>
                        <Select
                          value={item.productId}
                          onValueChange={(value) => updateItem(index, "productId", value)}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>UOM *</Label>
                        <Select
                          value={item.uomId}
                          onValueChange={(value) => updateItem(index, "uomId", value)}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="UOM" />
                          </SelectTrigger>
                          <SelectContent>
                            {uoms.map((uom) => (
                              <SelectItem key={uom.id} value={uom.id}>
                                {uom.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Lot Number</Label>
                        <Input
                          value={item.lotNumber}
                          onChange={(e) => updateItem(index, "lotNumber", e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="mt-8"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/stock-transfers")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Stock Transfer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
