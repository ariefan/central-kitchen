"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [userData, setUserData] = useState<any>(null);
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
      {/* Header with Logo */}
      <div className="flex justify-end mb-6">
        <Image
          src="/logo-light.jpeg"
          alt="Dapoer Roema"
          width={120}
          height={50}
          className="dark:hidden rounded"
        />
        <Image
          src="/logo-dark.jpeg"
          alt="Dapoer Roema"
          width={120}
          height={50}
          className="hidden dark:block rounded"
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to ERP System</CardTitle>
            <CardDescription>You are successfully logged in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Session Information</h3>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">User ID:</span>
                      <span className="text-sm text-muted-foreground">{session.user.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm text-muted-foreground">{session.user.email}</span>
                    </div>
                    {session.user.name && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Name:</span>
                        <span className="text-sm text-muted-foreground">{session.user.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isLoadingUser && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {userData && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">User Details</h3>
                  <div className="mt-2 p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                      {userData.tenant && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Tenant:</span>
                            <span className="text-sm text-muted-foreground">{userData.tenant.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Tenant Slug:</span>
                            <span className="text-sm text-muted-foreground">{userData.tenant.slug}</span>
                          </div>
                        </>
                      )}
                      {userData.role && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Role:</span>
                          <span className="text-sm text-muted-foreground">{userData.role}</span>
                        </div>
                      )}
                      {userData.location && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Location:</span>
                          <span className="text-sm text-muted-foreground">{userData.location.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Navigate to different modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start"
                onClick={() => router.push("/locations")}
              >
                <span className="font-semibold">Locations</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Manage warehouses and stores
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start"
                onClick={() => router.push("/products")}
              >
                <span className="font-semibold">Products</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Product catalog & variants
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start"
                onClick={() => router.push("/inventory")}
              >
                <span className="font-semibold">Inventory</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Stock levels & tracking
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start"
                onClick={() => router.push("/suppliers")}
              >
                <span className="font-semibold">Suppliers</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Supplier management
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase 1 Features</CardTitle>
            <CardDescription>Available modules in the current release</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Product Catalog Management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Product Variants</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Unit of Measure (UoM) Management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Location Management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Inventory Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Supplier Management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>User Profile Management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Authentication & Authorization</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
