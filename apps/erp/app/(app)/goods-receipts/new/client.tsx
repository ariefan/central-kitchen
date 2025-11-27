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

interface GRItem {
  poItemId: string;
  productId: string;
  quantityReceived: string;
  uomId: string;
  lotNumber: string;
  manufactureDate: string;
  expiryDate: string;
}

export default function NewGoodsReceiptClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    purchaseOrderId: "",
    locationId: "",
    receivedDate: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [items, setItems] = useState<GRItem[]>([
    {
      poItemId: "",
      productId: "",
      quantityReceived: "",
      uomId: "",
      lotNumber: "",
      manufactureDate: "",
      expiryDate: "",
    }
  ]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [posRes, locationsRes, productsRes, uomsRes] = await Promise.all([
        fetch("/api/v1/purchase-orders?status=sent&limit=100", { credentials: "include" }),
        fetch("/api/v1/locations?limit=100", { credentials: "include" }),
        fetch("/api/v1/products?limit=100", { credentials: "include" }),
        fetch("/api/v1/uoms?limit=100", { credentials: "include" }),
      ]);

      if (posRes.ok) {
        const data = await posRes.json();
        setPurchaseOrders(data.data || []);
      }
      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data.data || []);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.data || []);
      }
      if (uomsRes.ok) {
        const data = await uomsRes.json();
        setUoms(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch master data:", error);
      toast.error("Failed to load form data");
    }
  };

  const addItem = () => {
    setItems([...items, {
      poItemId: "",
      productId: "",
      quantityReceived: "",
      uomId: "",
      lotNumber: "",
      manufactureDate: "",
      expiryDate: "",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof GRItem, value: string) => {
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
          poItemId: item.poItemId || undefined,
          productId: item.productId,
          quantityReceived: item.quantityReceived,
          uomId: item.uomId,
          lotNumber: item.lotNumber,
          manufactureDate: item.manufactureDate || undefined,
          expiryDate: item.expiryDate || undefined,
        })),
      };

      const response = await fetch("/api/v1/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Goods receipt created successfully");
        router.push("/goods-receipts");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create goods receipt");
      }
    } catch (error) {
      console.error("Failed to create goods receipt:", error);
      toast.error("Failed to create goods receipt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Goods Receipt</CardTitle>
          <CardDescription>Receive goods against a purchase order</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseOrderId">Purchase Order *</Label>
                <Select
                  value={formData.purchaseOrderId}
                  onValueChange={(value) => setFormData({ ...formData, purchaseOrderId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.poNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                <Label htmlFor="receivedDate">Received Date *</Label>
                <Input
                  id="receivedDate"
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
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

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Items Received</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="border p-4 rounded-lg space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-3">
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
                          <Label>Quantity Received *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantityReceived}
                            onChange={(e) => updateItem(index, "quantityReceived", e.target.value)}
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
                      </div>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Lot Number *</Label>
                        <Input
                          value={item.lotNumber}
                          onChange={(e) => updateItem(index, "lotNumber", e.target.value)}
                          placeholder="LOT-YYYYMMDD-###"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Manufacture Date</Label>
                        <Input
                          type="date"
                          value={item.manufactureDate}
                          onChange={(e) => updateItem(index, "manufactureDate", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateItem(index, "expiryDate", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/goods-receipts")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Goods Receipt"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
