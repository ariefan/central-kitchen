"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Package, TrendingUp, Users, DollarSign, FileText } from "lucide-react";

const reports = [
  {
    id: "daily-sales",
    title: "Daily Sales Report",
    description: "View daily sales performance and trends",
    icon: DollarSign,
    category: "Sales",
  },
  {
    id: "inventory-valuation",
    title: "Inventory Valuation",
    description: "Current inventory value by product and location",
    icon: Package,
    category: "Inventory",
  },
  {
    id: "product-performance",
    title: "Product Performance",
    description: "Analyze product sales and profitability",
    icon: TrendingUp,
    category: "Sales",
  },
  {
    id: "stock-movement",
    title: "Stock Movement Report",
    description: "Track inventory movements and transactions",
    icon: BarChart3,
    category: "Inventory",
  },
  {
    id: "purchase-summary",
    title: "Purchase Summary",
    description: "Summarize purchase orders and spending",
    icon: FileText,
    category: "Procurement",
  },
  {
    id: "customer-analysis",
    title: "Customer Analysis",
    description: "Analyze customer behavior and trends",
    icon: Users,
    category: "Sales",
  },
];

export default function ReportsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">Access business intelligence and reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/reports/${report.id}`)}
                >
                  View Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
