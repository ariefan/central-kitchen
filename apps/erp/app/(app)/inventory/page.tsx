"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";

interface InventoryItem {
  productId: string;
  productName: string;
  productSku: string;
  locationName: string;
  onHandQty: number;
  allocatedQty: number;
  availableQty: number;
  uomCode: string;
}

interface Lot {
  id: string;
  lotNumber: string;
  productName: string;
  locationName: string;
  quantity: number;
  uomCode: string;
  expiryDate?: string;
  status: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingLots, setLoadingLots] = useState(true);
  const [inventoryPagination, setInventoryPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [lotsPagination, setLotsPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchInventory = async (page: number = 1, pageSize: number = 20) => {
    setLoadingInventory(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `/api/v1/inventory/onhand?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        // Ensure data.data is an array
        setInventory(Array.isArray(data.data) ? data.data : []);
        setInventoryPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchLots = async (page: number = 1, pageSize: number = 20) => {
    setLoadingLots(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `/api/v1/inventory/lots?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        // Ensure data.data is an array
        setLots(Array.isArray(data.data) ? data.data : []);
        setLotsPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch lots:", error);
    } finally {
      setLoadingLots(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchLots();
  }, []);

  const inventoryColumns: Column<InventoryItem>[] = [
    { key: "productSku", label: "SKU", render: (value) => <span className="font-mono text-sm">{value}</span> },
    { key: "productName", label: "Product" },
    { key: "locationName", label: "Location" },
    {
      key: "onHandQty",
      label: "On Hand",
      render: (value, row) => `${value} ${row.uomCode}`,
    },
    {
      key: "allocatedQty",
      label: "Allocated",
      render: (value, row) => `${value} ${row.uomCode}`,
    },
    {
      key: "availableQty",
      label: "Available",
      render: (value, row) => (
        <span className="font-semibold">
          {value} {row.uomCode}
        </span>
      ),
    },
  ];

  const lotsColumns: Column<Lot>[] = [
    { key: "lotNumber", label: "Lot Number", render: (value) => <span className="font-mono text-sm">{value}</span> },
    { key: "productName", label: "Product" },
    { key: "locationName", label: "Location" },
    {
      key: "quantity",
      label: "Quantity",
      render: (value, row) => `${value} ${row.uomCode}`,
    },
    {
      key: "expiryDate",
      label: "Expiry Date",
      render: (value) => (value ? new Date(value).toLocaleDateString() : <span className="text-muted-foreground">-</span>),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={value === "active" ? "default" : "secondary"} className="capitalize">
          {value}
        </Badge>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Tabs defaultValue="onhand" className="space-y-4">
        <TabsList>
          <TabsTrigger value="onhand">On Hand</TabsTrigger>
          <TabsTrigger value="lots">Lots</TabsTrigger>
        </TabsList>

        <TabsContent value="onhand">
          <Card>
            <CardHeader>
              <CardTitle>On-Hand Inventory</CardTitle>
              <CardDescription>
                Real-time view of product quantities by location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={inventoryColumns}
                data={inventory}
                loading={loadingInventory}
                pagination={{
                  page: inventoryPagination.page,
                  pageSize: inventoryPagination.pageSize,
                  total: inventoryPagination.total,
                  onPageChange: (page) => fetchInventory(page, inventoryPagination.pageSize),
                  onPageSizeChange: (pageSize) => fetchInventory(1, pageSize),
                }}
                emptyMessage="No inventory data available"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lots">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Lots</CardTitle>
              <CardDescription>
                Track lot numbers, expiry dates, and lot-specific inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={lotsColumns}
                data={lots}
                loading={loadingLots}
                pagination={{
                  page: lotsPagination.page,
                  pageSize: lotsPagination.pageSize,
                  total: lotsPagination.total,
                  onPageChange: (page) => fetchLots(page, lotsPagination.pageSize),
                  onPageSizeChange: (pageSize) => fetchLots(1, pageSize),
                }}
                emptyMessage="No lots found"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
