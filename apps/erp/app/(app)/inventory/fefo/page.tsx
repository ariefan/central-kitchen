"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

interface FEFORecommendation {
  lotId: string;
  lotNo: string;
  quantityAvailable: number;
  expiryDate: string | null;
  daysToExpiry: number | null;
  expiryStatus: string;
  pickPriority: number;
  unitCost: string;
}

interface FEFOResponse {
  productId: string;
  productSku: string;
  productName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  recommendations: FEFORecommendation[];
  totalAvailable: number;
  quantityNeeded?: number;
  sufficientStock?: boolean;
  lotsRequired?: number;
}

export default function FEFOPickingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [quantityNeeded, setQuantityNeeded] = useState("");
  const [excludeExpired, setExcludeExpired] = useState(true);

  const [fefoData, setFefoData] = useState<FEFOResponse | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchLocations();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products?limit=100`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/locations?limit=100`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setLocations(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (!selectedProductId || !selectedLocationId) {
      toast.error("Please select both product and location");
      return;
    }

    setLoadingRecommendations(true);
    try {
      const params = new URLSearchParams({
        productId: selectedProductId,
        locationId: selectedLocationId,
        excludeExpired: excludeExpired.toString(),
      });

      if (quantityNeeded) {
        params.append("quantityNeeded", quantityNeeded);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/inventory/fefo/recommendations?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setFefoData(data.data);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to fetch recommendations");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const getExpiryStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      expired: { variant: "destructive", icon: AlertTriangle },
      expiring_soon: { variant: "destructive", icon: Clock },
      approaching_expiry: { variant: "outline", icon: Clock },
      fresh: { variant: "default", icon: CheckCircle2 },
    };

    const config = statusConfig[status] || { variant: "secondary" as const, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>FEFO Picking Recommendations</CardTitle>
          <CardDescription>
            First Expiry, First Out (FEFO) recommendations for optimal lot picking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {loadingProducts ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {loadingLocations ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.code} - {location.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity Needed (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(e.target.value)}
                placeholder="e.g., 100"
              />
            </div>

            <div className="space-y-2 flex items-end">
              <div className="flex items-center space-x-2 w-full">
                <Switch
                  id="exclude-expired"
                  checked={excludeExpired}
                  onCheckedChange={setExcludeExpired}
                />
                <Label htmlFor="exclude-expired" className="cursor-pointer">
                  Exclude expired lots
                </Label>
              </div>
            </div>

            <div className="md:col-span-2">
              <Button
                onClick={handleGetRecommendations}
                disabled={loadingRecommendations}
                className="w-full"
              >
                {loadingRecommendations ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Get Recommendations
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          {fefoData && (
            <div className="space-y-4">
              {/* Summary */}
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <p>
                      <strong>Product:</strong> {fefoData.productSku} - {fefoData.productName}
                    </p>
                    <p>
                      <strong>Location:</strong> {fefoData.locationCode} - {fefoData.locationName}
                    </p>
                    <p>
                      <strong>Total Available:</strong> {fefoData.totalAvailable}
                    </p>
                    {fefoData.quantityNeeded !== undefined && (
                      <>
                        <p>
                          <strong>Quantity Needed:</strong> {fefoData.quantityNeeded}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          {fefoData.sufficientStock ? (
                            <Badge variant="default" className="ml-1">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Sufficient Stock
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="ml-1">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Insufficient Stock
                            </Badge>
                          )}
                        </p>
                        {fefoData.lotsRequired !== undefined && (
                          <p>
                            <strong>Lots Required:</strong> {fefoData.lotsRequired}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Recommendations Table */}
              {fefoData.recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No lots available for this product and location
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Priority</th>
                        <th className="text-left p-3 font-medium">Lot Number</th>
                        <th className="text-left p-3 font-medium">Quantity</th>
                        <th className="text-left p-3 font-medium">Expiry Date</th>
                        <th className="text-left p-3 font-medium">Days to Expiry</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fefoData.recommendations.map((rec, index) => (
                        <tr
                          key={rec.lotId}
                          className={`border-t hover:bg-muted/50 ${
                            index === 0 ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          <td className="p-3">
                            <Badge variant={index === 0 ? "default" : "outline"}>
                              #{rec.pickPriority}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-sm">{rec.lotNo}</td>
                          <td className="p-3">{rec.quantityAvailable}</td>
                          <td className="p-3">
                            {rec.expiryDate ? (
                              new Date(rec.expiryDate).toLocaleDateString()
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            {rec.daysToExpiry !== null ? (
                              <span className={rec.daysToExpiry < 7 ? "text-red-600 font-semibold" : ""}>
                                {rec.daysToExpiry} days
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3">{getExpiryStatusBadge(rec.expiryStatus)}</td>
                          <td className="p-3 text-right font-mono">${parseFloat(rec.unitCost).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
