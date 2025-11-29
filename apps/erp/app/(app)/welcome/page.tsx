"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";
import {
  Loader2,
  Package,
  MapPin,
  Users,
  ShoppingCart,
  TrendingUp,
  Settings,
  BarChart3,
  Warehouse,
  ChefHat,
  Truck,
  FileText,
  Building2
} from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [userData, setUserData] = useState<{
    tenant?: { name: string; slug: string };
    role?: string;
    location?: { name: string };
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!isPending && !session) {
      router.push("/auth");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    // Fetch user data from custom /api/v1/auth/me endpoint
    const fetchUserData = async () => {
      if (!session) return;

      setIsLoadingUser(true);
      try {
        // Use relative URL to go through Next.js proxy
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, [session]);

  if (!mounted || isPending || !session) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {session.user.name || session.user.email}!</h1>
            <p className="text-muted-foreground mt-2">{`Here's what's happening with your business today`}</p>
          </div>
          <div className="shrink-0">
            <Image
              src="/logo-light.jpeg"
              alt="Dapoer Roema"
              width={120}
              height={48}
              className="dark:hidden rounded-lg shadow-sm"
            />
            <Image
              src="/logo-dark.jpeg"
              alt="Dapoer Roema"
              width={120}
              height={48}
              className="hidden dark:block rounded-lg shadow-sm"
            />
          </div>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm">{session.user.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm truncate max-w-[150px]" title={session.user.email}>
                    {session.user.email}
                  </span>
                </div>
                {userData?.role && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Role:</span>
                    <Badge variant="secondary">{userData.role}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tenant Info Card */}
          {userData?.tenant && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tenant:</span>
                    <span className="text-sm font-semibold">{userData.tenant.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Slug:</span>
                    <Badge variant="outline">{userData.tenant.slug}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Info Card */}
          {userData?.location && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Current Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm font-semibold">{userData.location.name}</span>
                  </div>
                  <Badge variant="outline" className="w-full justify-center">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump to frequently used modules and features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                onClick={() => router.push("/products")}
              >
                <Package className="w-6 h-6" />
                <span className="font-medium">Products</span>
                <span className="text-xs text-muted-foreground">Catalog & variants</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                onClick={() => router.push("/inventory")}
              >
                <Warehouse className="w-6 h-6" />
                <span className="font-medium">Inventory</span>
                <span className="text-xs text-muted-foreground">Stock tracking</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                onClick={() => router.push("/suppliers")}
              >
                <Building2 className="w-6 h-6" />
                <span className="font-medium">Suppliers</span>
                <span className="text-xs text-muted-foreground">Vendor management</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                onClick={() => router.push("/sales-orders")}
              >
                <ShoppingCart className="w-6 h-6" />
                <span className="font-medium">Sales</span>
                <span className="text-xs text-muted-foreground">Orders & customers</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                onClick={() => router.push("/purchase-orders")}
              >
                <FileText className="w-6 h-6" />
                <span className="font-medium">Procurement</span>
                <span className="text-xs text-muted-foreground">Purchase orders</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                onClick={() => router.push("/production-orders")}
              >
                <ChefHat className="w-6 h-6" />
                <span className="font-medium">Production</span>
                <span className="text-xs text-muted-foreground">Manufacturing</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                onClick={() => router.push("/deliveries")}
              >
                <Truck className="w-6 h-6" />
                <span className="font-medium">Deliveries</span>
                <span className="text-xs text-muted-foreground">Logistics</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-primary/50 transition-colors"
                onClick={() => router.push("/reports")}
              >
                <BarChart3 className="w-6 h-6" />
                <span className="font-medium">Reports</span>
                <span className="text-xs text-muted-foreground">Analytics</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Status
              </CardTitle>
              <CardDescription>Current system information and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Authentication</span>
                <Badge variant="default" className="bg-green-500">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <Badge variant="default" className="bg-green-500">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Services</span>
                <Badge variant="default" className="bg-green-500">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Session</span>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Available Features
              </CardTitle>
              <CardDescription>Modules and capabilities in Phase 1</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Product Catalog</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Inventory Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Location Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Supplier Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>User Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Role-Based Access</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
