"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Package } from "lucide-react";
import Link from "next/link";

interface Recipe {
    id: string;
    code: string;
    name: string;
    version: number;
    outputQuantity: string;
    status: 'draft' | 'active' | 'inactive';
}

export default function NewProductionOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        recipeId: "",
        locationId: "",
        plannedQuantity: "",
        plannedDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        notes: "",
    });
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Fetch recipes and locations
    useState(() => {
        const fetchData = async () => {
            try {
                // Fetch recipes
                const recipesResponse = await fetch("/api/v1/recipes?limit=100", {
                    credentials: "include",
                });
                if (recipesResponse.ok) {
                    const recipesData = await recipesResponse.json();
                    setRecipes(Array.isArray(recipesData.data) ? recipesData.data : []);
                }

                // Fetch locations
                const locationsResponse = await fetch("/api/v1/locations?limit=100", {
                    credentials: "include",
                });
                if (locationsResponse.ok) {
                    const locationsData = await locationsResponse.json();
                    const items = locationsData.data?.items || locationsData.data || [];
                    setLocations(Array.isArray(items) ? items : []);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.recipeId) {
            toast.error("Please select a recipe");
            return;
        }

        if (!formData.locationId) {
            toast.error("Please select a location");
            return;
        }

        if (!formData.plannedQuantity || parseFloat(formData.plannedQuantity) <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/v1/production-orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    ...formData,
                    plannedQuantity: parseFloat(formData.plannedQuantity),
                    status: "draft",
                }),
            });

            if (response.ok) {
                toast.success("Production order created successfully");
                router.push("/production-orders");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to create production order");
            }
        } catch (error) {
            console.error("Failed to create production order:", error);
            toast.error("Failed to create production order");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/production-orders">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Create Production Order</h1>
                        <p className="text-muted-foreground">Schedule a new production run</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Production Details
                            </CardTitle>
                            <CardDescription>
                                Configure the basic production parameters
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="recipe">Recipe *</Label>
                                    <Select
                                        value={formData.recipeId}
                                        onValueChange={(value) => handleInputChange("recipeId", value)}
                                        disabled={loadingData}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select recipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {recipes.map((recipe) => (
                                                <SelectItem key={recipe.id} value={recipe.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{recipe.name}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            v{recipe.version}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Production Location *</Label>
                                    <Select
                                        value={formData.locationId}
                                        onValueChange={(value) => handleInputChange("locationId", value)}
                                        disabled={loadingData}
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
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Planned Quantity *</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={formData.plannedQuantity}
                                        onChange={(e) => handleInputChange("plannedQuantity", e.target.value)}
                                        placeholder="Enter quantity"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date">Planned Date *</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.plannedDate}
                                        onChange={(e) => handleInputChange("plannedDate", e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange("notes", e.target.value)}
                                    placeholder="Additional notes or instructions..."
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link href="/production-orders">
                            <Button variant="outline" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={loading || loadingData}>
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Create Production Order
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}