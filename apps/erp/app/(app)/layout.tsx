"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { LocationSwitcher } from "@/components/location-switcher";
import { TenantRequiredDialog } from "@/components/tenant-required-dialog";
import {
  MapPin,
  Package,
  Users,
  Ruler,
  Building2,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  Warehouse,
  UserCircle,
  Clock,
  ShoppingCart,
  FileText,
  Truck,
  ClipboardList,
  ArrowLeftRight,
  ChefHat,
  Factory,
  Thermometer,
  BarChart3,
  Store,
  Tags,
  PackageCheck,
  Minus,
  UserCheck,
  Shield,
  Key,
} from "lucide-react";
import { useState } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiresLocation?: boolean; // Hide if no location selected
  requiredPermissions?: Array<{ resource: string; action: string }>; // Hide if user lacks permissions
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Overview",
        href: "/welcome",
        icon: LayoutDashboard,
      },
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Sales",
    items: [
      {
        title: "POS",
        href: "/pos",
        icon: Store,
        requiresLocation: true,
      },
      {
        title: "Sales Orders",
        href: "/sales-orders",
        icon: ShoppingCart,
      },
      {
        title: "Customers",
        href: "/customers",
        icon: UserCheck,
      },
      {
        title: "Deliveries",
        href: "/deliveries",
        icon: Truck,
      },
    ],
  },
  {
    title: "Procurement",
    items: [
      {
        title: "Purchase Orders",
        href: "/purchase-orders",
        icon: FileText,
      },
      {
        title: "Goods Receipts",
        href: "/goods-receipts",
        icon: PackageCheck,
      },
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: Building2,
      },
    ],
  },
  {
    title: "Production",
    items: [
      {
        title: "Recipes",
        href: "/recipes",
        icon: ChefHat,
      },
      {
        title: "Production Orders",
        href: "/production-orders",
        icon: Factory,
        requiresLocation: true,
      },
      {
        title: "Requisitions",
        href: "/requisitions",
        icon: ClipboardList,
        requiresLocation: true,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        title: "Stock Overview",
        href: "/inventory",
        icon: Warehouse,
        requiresLocation: true,
      },
      {
        title: "FEFO Picking",
        href: "/inventory/fefo",
        icon: Clock,
        requiresLocation: true,
      },
      {
        title: "Stock Transfers",
        href: "/stock-transfers",
        icon: ArrowLeftRight,
        requiresLocation: true,
      },
      {
        title: "Stock Adjustments",
        href: "/stock-adjustments",
        icon: Minus,
        requiresLocation: true,
      },
      {
        title: "Temperature Logs",
        href: "/temperature-logs",
        icon: Thermometer,
        requiresLocation: true,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Locations",
        href: "/locations",
        icon: MapPin,
      },
      {
        title: "Products",
        href: "/products",
        icon: Package,
      },
      {
        title: "Categories",
        href: "/categories",
        icon: Tags,
      },
      {
        title: "Units of Measure",
        href: "/uoms",
        icon: Ruler,
      },
      {
        title: "Users",
        href: "/users",
        icon: Users,
        requiredPermissions: [{ resource: "user", action: "read" }],
      },
      {
        title: "Roles",
        href: "/roles",
        icon: Shield,
        requiredPermissions: [{ resource: "role", action: "read" }],
      },
      {
        title: "Permissions",
        href: "/permissions",
        icon: Key,
        requiredPermissions: [{ resource: "permission", action: "read" }],
      },
      {
        title: "Tenants",
        href: "/tenants",
        icon: Building2,
        requiredPermissions: [{ resource: "tenant", action: "manage" }],
      },
    ],
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, needsTenant } = useAuth();
  const { hasAnyPermission, loading: permissionsLoading } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    router.push("/auth");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Tenant Required Dialog - shown when user has no tenant */}
      <TenantRequiredDialog open={needsTenant ?? false} />
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 transform border-r transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          "bg-card dark:bg-zinc-900/95 dark:border-zinc-800",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Logo */}
          <div className="flex h-12 items-center justify-between px-3 border-b dark:border-zinc-800">
            <Link href="/" className="flex items-center gap-1.5">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-base font-bold truncate">{profile?.tenant?.name || "ERP"}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* User info */}
          {user && (
            <div className="px-3 py-2 border-b dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || user.email}
                  </p>
                </div>
              </div>
              {/* Location switcher */}
              <div className="mt-2">
                <LocationSwitcher />
              </div>
            </div>
          )}

          {/* Navigation - scrollable area */}
          <ScrollArea className="flex-1 min-h-0">
            <nav className="space-y-2 px-2 py-2">
              {navigation.map((section) => {
                // Filter items based on location requirement and permissions
                const visibleItems = section.items.filter((item) => {
                  // Check location requirement
                  if (item.requiresLocation && !profile?.location) return false;

                  // Check permission requirement (skip check while loading)
                  if (item.requiredPermissions && !permissionsLoading) {
                    return hasAnyPermission(item.requiredPermissions);
                  }

                  return true;
                });

                // Skip empty sections
                if (visibleItems.length === 0) return null;

                return (
                  <div key={section.title}>
                    <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-zinc-500">
                      {section.title}
                    </h3>
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <div
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                              )}
                            >
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span className="flex-1 truncate">{item.title}</span>
                              {item.badge && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Show message when location-scoped items are hidden */}
              {!profile?.location && (
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground dark:text-zinc-500 italic">
                    Select a location to access more features
                  </p>
                </div>
              )}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t dark:border-zinc-800 p-2 space-y-1">
            <Link href="/profile">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-sm"
                onClick={() => setSidebarOpen(false)}
              >
                <UserCircle className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </Link>
            <Link href="/settings">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-sm"
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start h-8 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b bg-card dark:bg-zinc-900/95 dark:border-zinc-800 px-6 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold truncate">{profile?.tenant?.name || "ERP"}</span>
          </Link>
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
