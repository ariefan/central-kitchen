import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import OnHandTable from '@/components/inventory/OnHandTable'

import { useInventoryOnHand, useLocations, useInventoryCategories, useInventoryStats } from '@/hooks/useInventory'
import type { InventoryOnHand } from '@/types/inventory'

export const Route = createFileRoute('/inventory/onhand')({
  component: OnHand,
})

function OnHand() {
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const { data: inventoryData, isLoading, error } = useInventoryOnHand({
    locationId: selectedLocation || undefined,
    categoryId: selectedCategory || undefined,
  })
  const { data: locations } = useLocations()
  const { data: categories } = useInventoryCategories()
  const { data: stats } = useInventoryStats(selectedLocation || undefined)

  const inventory = inventoryData || []

  const handleViewDetails = (item: InventoryOnHand) => {
    // TODO: Implement detail view modal/drawer
    console.log('View details:', item)
  }

  const handleViewLots = (item: InventoryOnHand) => {
    // TODO: Navigate to lots view filtered by product and location
    console.log('View lots:', item)
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">On-Hand Inventory</h1>
          <p className="text-muted-foreground">
            Current stock levels by product and location
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Failed to load inventory data. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">On-Hand Inventory</h1>
          <p className="text-muted-foreground">
            Current stock levels by product and location ({inventory.length} items)
          </p>
        </div>
        <Button>
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.lowStockItems || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.outOfStockItems || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((stats.totalValue || 0)).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Overview</CardTitle>
          <CardDescription>
            View current inventory levels and stock status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No inventory data found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedLocation || selectedCategory
                  ? 'Try adjusting your filters or selecting different criteria.'
                  : 'No inventory records available.'}
              </p>
              {(selectedLocation || selectedCategory) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedLocation('')
                    setSelectedCategory('')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <OnHandTable
              data={inventory}
              loading={isLoading}
              locations={locations}
              categories={categories}
              selectedLocation={selectedLocation}
              selectedCategory={selectedCategory}
              onLocationChange={setSelectedLocation}
              onCategoryChange={setSelectedCategory}
              onView={handleViewDetails}
              onLots={handleViewLots}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}