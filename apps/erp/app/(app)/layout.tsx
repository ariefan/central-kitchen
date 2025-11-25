"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
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
      },
      {
        title: "Requisitions",
        href: "/requisitions",
        icon: ClipboardList,
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
      },
      {
        title: "FEFO Picking",
        href: "/inventory/fefo",
        icon: Clock,
      },
      {
        title: "Stock Transfers",
        href: "/stock-transfers",
        icon: ArrowLeftRight,
      },
      {
        title: "Stock Adjustments",
        href: "/stock-adjustments",
        icon: Minus,
      },
      {
        title: "Temperature Logs",
        href: "/temperature-logs",
        icon: Thermometer,
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
      },
    ],
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    router.push("/auth");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          "bg-card dark:bg-zinc-900/95 dark:border-zinc-800",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b dark:border-zinc-800">
            <Link href="/" className="flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold">Central Kitchen</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* User info */}
          {user && (
            <div className="px-6 py-4 border-b dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || user.email}
                  </p>
                  {profile?.location && (
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.location.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-6">
              {navigation.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-zinc-400">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            )}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            {item.badge && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t dark:border-zinc-800 p-4 space-y-2">
            <Link href="/profile">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setSidebarOpen(false)}
              >
                <UserCircle className="w-4 h-4 mr-3" />
                Profile
              </Button>
            </Link>
            <Link href="/settings">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="flex-1 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-3" />
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
            <span className="text-lg font-bold">Central Kitchen</span>
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
