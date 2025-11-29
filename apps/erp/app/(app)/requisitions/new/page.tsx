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
import { ArrowLeft, Save, Package, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

interface Product {
    id: string;
    code: string;
    name: string;
    currentStock: number;
    unitOfMeasure: string;
}

interface Location {
    id: string;
    name: string;
    code: string;
}

export default function NewRequisitionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fromLocationId: "",
        toLocationId: "",
        requestDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        notes: "",
    });
    const [requisitionItems, setRequisitionItems] = useState<Array<{
        productId: string;
        requestedQuantity: string;
        notes: string;
    }>>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Fetch products and locations
    useState(() => {
        const fetchData = async () => {
            try {
                // Fetch products
                const productsResponse = await fetch("/api/v1/products?limit=100", {
                    credentials: "include",
                });
                if (productsResponse.ok) {
                    const productsData = await productsResponse.json();
                    const items = productsData.data?.items || productsData.data || [];
                    setProducts(Array.isArray(items) ? items : []);
                }

                // Fetch locations
                const locationsResponse = await fetch("/api/v1/locations?limit=100", {
                    credentials: "include",
                });
                if (locationsResponse.ok) {
                    const locationsData = await locationsResponse.json();
                    const locationItems = locationsData.data?.items || locationsData.data || [];
                    setLocations(Array.isArray(locationItems) ? locationItems : []);
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

    const handleAddItem = () => {
        setRequisitionItems(prev => [
            ...prev,
            { productId: "", requestedQuantity: "", notes: "" }
        ]);
    };

    const handleItemChange = (index: number, field: string, value: string) => {
        setRequisitionItems(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        );
    };

    const handleRemoveItem = (index: number) => {
        setRequisitionItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.fromLocationId || !formData.toLocationId) {
            toast.error("Please select both from and to locations");
            return;
        }

        if (requisitionItems.length === 0) {
            toast.error("Please add at least one item");
            return;
        }

        const validItems = requisitionItems.filter(item =>
            item.productId && item.requestedQuantity && parseFloat(item.requestedQuantity) > 0
        );

        if (validItems.length === 0) {
            toast.error("Please ensure all items have valid product and quantity");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/v1/requisitions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    ...formData,
                    items: validItems.map(item => ({
                        productId: item.productId,
                        requestedQuantity: parseFloat(item.requestedQuantity),
                        notes: item.notes,
                    })),
                    status: "draft",
                }),
            });

            if (response.ok) {
                toast.success("Requisition created successfully");
                router.push("/requisitions");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to create requisition");
            }
        } catch (error) {
            console.error("Failed to create requisition:", error);
            toast.error("Failed to create requisition");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/requisitions">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Create Requisition</h1>
                        <p className="text-muted-foreground">Request inventory transfer between locations</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Requisition Details
                            </CardTitle>
                            <CardDescription>
                                Configure transfer information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fromLocation">From Location *</Label>
                                    <Select
                                        value={formData.fromLocationId}
                                        onValueChange={(value) => handleInputChange("fromLocationId", value)}
                                        disabled={loadingData}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select source location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((location) => (
                                                <SelectItem key={location.id} value={location.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{location.name}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {location.code}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="toLocation">To Location *</Label>
                                    <Select
                                        value={formData.toLocationId}
                                        onValueChange={(value) => handleInputChange("toLocationId", value)}
                                        disabled={loadingData}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select destination location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((location) => (
                                                <SelectItem key={location.id} value={location.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{location.name}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {location.code}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="requestDate">Request Date *</Label>
                                    <Input
                                        id="requestDate"
                                        type="date"
                                        value={formData.requestDate}
                                        onChange={(e) => handleInputChange("requestDate", e.target.value)}
                                        required
                                    />
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
                            </div>
                        </CardContent>
                    </Card>

                    {/* Requisition Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Requisition Items</CardTitle>
                            <CardDescription>
                                Add products to be transferred
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {requisitionItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                                    <div className="space-y-2">
                                        <Label htmlFor={`product-${index}`}>Product *</Label>
                                        <Select
                                            value={item.productId}
                                            onValueChange={(value) => handleItemChange(index, "productId", value)}
                                            disabled={loadingData}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((product) => (
                                                    <SelectItem key={product.id} value={product.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{product.name}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {product.currentStock} {product.unitOfMeasure}
                                                            </Badge>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`quantity-${index}`}>Requested Quantity *</Label>
                                        <Input
                                            id={`quantity-${index}`}
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={item.requestedQuantity}
                                            onChange={(e) => handleItemChange(index, "requestedQuantity", e.target.value)}
                                            placeholder="Enter quantity"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`notes-${index}`}>Item Notes</Label>
                                        <Textarea
                                            id={`notes-${index}`}
                                            value={item.notes}
                                            onChange={(e) => handleItemChange(index, "notes", e.target.value)}
                                            placeholder="Item-specific notes..."
                                            rows={2}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveItem(index)}
                                            disabled={requisitionItems.length <= 1}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddItem}
                                className="w-full"
                            >
                                Add Item
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link href="/requisitions">
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
                                    Create Requisition
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}