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

interface Ingredient {
  productId: string;
  quantity: string;
  uomId: string;
}

export default function NewRecipeClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    outputProductId: "",
    outputQuantity: "",
    outputUomId: "",
    instructions: "",
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { productId: "", quantity: "", uomId: "" }
  ]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [productsRes, uomsRes] = await Promise.all([
        fetch("/api/v1/products?limit=100", { credentials: "include" }),
        fetch("/api/v1/uoms?limit=100", { credentials: "include" }),
      ]);

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

  const addIngredient = () => {
    setIngredients([...ingredients, { productId: "", quantity: "", uomId: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        ingredients: ingredients.map(ing => ({
          productId: ing.productId,
          quantity: ing.quantity,
          uomId: ing.uomId,
        })),
      };

      const response = await fetch("/api/v1/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Recipe created successfully");
        router.push("/recipes");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create recipe");
      }
    } catch (error) {
      console.error("Failed to create recipe:", error);
      toast.error("Failed to create recipe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Recipe (BOM)</CardTitle>
          <CardDescription>Define a new production recipe</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Recipe Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="RCP-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Recipe Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputProductId">Output Product *</Label>
                <Select
                  value={formData.outputProductId}
                  onValueChange={(value) => setFormData({ ...formData, outputProductId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select output product" />
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
                <Label htmlFor="outputQuantity">Output Quantity *</Label>
                <Input
                  id="outputQuantity"
                  type="number"
                  step="0.01"
                  value={formData.outputQuantity}
                  onChange={(e) => setFormData({ ...formData, outputQuantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputUomId">Output UOM *</Label>
                <Select
                  value={formData.outputUomId}
                  onValueChange={(value) => setFormData({ ...formData, outputUomId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select UOM" />
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

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Ingredients</Label>
                <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>

              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-3 items-start border p-4 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Product *</Label>
                        <Select
                          value={ingredient.productId}
                          onValueChange={(value) => updateIngredient(index, "productId", value)}
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
                          value={ingredient.quantity}
                          onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>UOM *</Label>
                        <Select
                          value={ingredient.uomId}
                          onValueChange={(value) => updateIngredient(index, "uomId", value)}
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

                    {ingredients.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(index)}
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
                onClick={() => router.push("/recipes")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Recipe"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
