"use client"

import * as React from "react"
import {
  Sun,
  Moon,
  Plus,
  Bell,
  Search,
  Settings,
  Users,
  FileText,
  Package,
  ShoppingCart,
  Building,
  ChefHat,
  Tag,
  Shield,
  BarChart3,
  Home,
  TrendingUp,
  Truck,
  AlertCircle,
  Clock,
  Calculator,
  CreditCard,
  Box,
  Warehouse,
  RefreshCw,
  Hash,
  Activity,
  HelpCircle,
  Database,
  Smartphone,
} from "lucide-react"
import { Link } from "@tanstack/react-router"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  implemented?: boolean
  isNew?: boolean
}

type NavGroup = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  url?: string
  isActive?: boolean
}

const createStyledTitle = (title: string, implemented: boolean = true, isNew: boolean = false) => {
  return title
}

const navigationData: NavGroup[] = [
  {
    title: "Sales & Operations",
    icon: TrendingUp,
    items: [
      { title: "Orders Management", url: "/orders", icon: ShoppingCart, implemented: true },
      { title: "POS Operations", url: "/pos", icon: Calculator, implemented: true },
      { title: "Customer Management", url: "/customers", icon: Users, implemented: true },
      { title: "Menu Management", url: "/menus", icon: FileText, implemented: true },
      { title: "Price Books", url: "/pricebooks", icon: Tag, implemented: true },
      { title: "Deliveries", url: "/deliveries", icon: Truck, implemented: true },
    ]
  },
  {
    title: "Master Data",
    icon: Database,
    url: "#",
    isActive: true,
    items: [
      { title: "Products", url: "/products", icon: Package, implemented: true },
      { title: "Suppliers", url: "/suppliers", icon: Truck, implemented: true },
      { title: "Locations", url: "/locations", icon: Building, implemented: true },
      { title: "Categories", url: "/categories", icon: Tag, implemented: true },
      { title: "UOM Conversions", url: "/uom-conversions", icon: Hash, implemented: true },
      { title: "Users & Roles", url: "/users", icon: Users, implemented: true },
    ]
  },
  {
    title: "Procurement",
    icon: ShoppingCart,
    items: [
      { title: "Purchase Orders", url: "/purchase-orders", icon: FileText, implemented: true },
      { title: "Goods Receipt", url: "/purchasing/gr", icon: Package, implemented: true },
      { title: "Requisitions", url: "/requisitions", icon: FileText, implemented: true },
      { title: "Supplier Returns", url: "/supplier-returns", icon: RefreshCw, implemented: true },
    ]
  },
  {
    title: "Inventory",
    icon: Warehouse,
    items: [
      { title: "Stock on Hand", url: "/inventory/onhand", icon: Box, implemented: true },
      { title: "Stock Lots", url: "/inventory/lots", icon: Package, implemented: true },
      { title: "Stock Transfers", url: "/transfers", icon: Truck, implemented: true },
      { title: "Stock Count", url: "/stock-count", icon: Calculator, implemented: true },
      { title: "Mobile Counting", url: "/stock-count/mobile", icon: Smartphone, implemented: true },
      { title: "Inventory Adjustments", url: "/adjustments", icon: RefreshCw, implemented: true },
      { title: "Waste Management", url: "/waste", icon: AlertCircle, implemented: true },
    ]
  },
  {
    title: "Production",
    icon: ChefHat,
    items: [
      { title: "Recipe Management", url: "/recipes", icon: FileText, implemented: true },
      { title: "Production Orders", url: "/production", icon: Package, implemented: true },
      { title: "Quality Control", url: "/quality", icon: Shield, implemented: true },
      { title: createStyledTitle("Kitchen Display"), url: "/kitchen-display", icon: ChefHat, implemented: false },
    ]
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    items: [
      { title: "Business Reports", url: "/reports", icon: BarChart3, implemented: false },
      { title: createStyledTitle("Sales Analytics"), url: "/reports/sales", icon: TrendingUp, implemented: false },
      { title: createStyledTitle("Inventory Analytics"), url: "/reports/inventory", icon: Package, implemented: false },
      { title: createStyledTitle("Production Analytics"), url: "/reports/production", icon: ChefHat, implemented: false },
    ]
  },
  {
    title: "System Administration",
    icon: Settings,
    items: [
      { title: "System Admin", url: "/admin", icon: Settings, implemented: true },
      { title: "Authentication", url: "/auth", icon: Shield, implemented: true },
      { title: createStyledTitle("Help Center"), url: "/help", icon: HelpCircle, implemented: false },
    ]
  }
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export default function AppSidebar({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
                <Link
                  to="/"
                  className="flex items-center gap-2"
                  activeProps={{
                    className: "bg-sidebar-accent text-sidebar-accent-foreground",
                  }}
                >
                  <Building className="h-5 w-5" />
                  <span className="text-base font-semibold">Central Kitchen ERP</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          {/* Main Dashboard */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/"
                      className="flex items-center gap-3"
                      activeProps={{
                        className: "bg-sidebar-accent text-sidebar-accent-foreground",
                      }}
                    >
                      <Home className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Navigation Sections */}
          {navigationData.map((section) => {
            const hasImplementedItems = section.items?.some(item => item.implemented)

            return (
              <SidebarGroup key={section.title}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      {hasImplementedItems ? (
                        <SidebarMenuButton asChild isActive={section.isActive}>
                          <Link
                            to={section.url || "#"}
                            className="flex items-center gap-3"
                            activeProps={{
                              className: "bg-sidebar-accent text-sidebar-accent-foreground",
                            }}
                          >
                            <section.icon className="h-4 w-4" />
                            <span className="font-medium">{section.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <div className="flex items-center gap-3 px-2 py-1 opacity-60 cursor-not-allowed">
                          <section.icon className="h-4 w-4" />
                          <span className="font-medium">{section.title}</span>
                        </div>
                      )}
                      {section.items?.length ? (
                        <SidebarMenuSub>
                          {section.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              {subItem.implemented ? (
                                <SidebarMenuSubButton asChild>
                                  <Link
                                    to={subItem.url}
                                    className="flex items-center gap-3"
                                    activeProps={{
                                      className: "text-sidebar-accent-foreground",
                                    }}
                                  >
                                    <subItem.icon className="h-3 w-3" />
                                    <span>{subItem.title}</span>
                                    {subItem.isNew && (
                                      <span className="ml-2 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                                        NEW
                                      </span>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              ) : (
                                <div className="flex items-center gap-3 px-2 py-1 opacity-60 cursor-not-allowed">
                                  <subItem.icon className="h-3 w-3" />
                                  <span className="text-red-500 font-medium">{subItem.title}</span>
                                  {subItem.isNew && (
                                    <span className="ml-2 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                                      NEW
                                    </span>
                                  )}
                                </div>
                              )}
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      ) : null}
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
        </SidebarContent>

        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Users className="h-4 w-4" />
                <span className="text-sm">Inventory Manager</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search anything..."
                className="w-full pl-8 pr-4 py-2 text-sm bg-muted/50 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Quick Actions</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              IM
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}