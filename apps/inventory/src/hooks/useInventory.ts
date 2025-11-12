import { useQuery } from '@tanstack/react-query'
import { api, queryKeys } from '@/lib/api'
import type { InventoryOnHand, InventoryFilters, Location, Category } from '@/types/inventory'

// On-Hand inventory query
export function useInventoryOnHand(filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.onhand(filters),
    queryFn: () => api.get<{ data: any[]; total: number; page: number; limit: number }>('/api/v1/inventory/onhand', { params: filters }),
    staleTime: 1000 * 30, // 30 seconds for volatile data
    select: (response) => {
      // Transform API response to match expected InventoryOnHand interface
      return response.data.map((item: any) => ({
        productId: item.productId,
        product: {
          id: item.productId,
          sku: item.productSku,
          name: item.productName,
          description: '',
          kind: 'raw_material' as const,
          baseUom: 'EA',
          baseUomName: 'EA',
          perishable: false,
          stdCost: 0,
          active: true,
          categoryId: '',
          categoryName: '',
          minStockLevel: 0,
          maxStockLevel: 0,
          stock: 0,
          status: 'in-stock' as const,
          lastUpdated: '',
          createdAt: '',
        },
        locationId: item.locationId,
        locationName: item.locationName,
        locationType: item.locationType,
        qtyBase: item.qtyBase,
        qtyDefaultSellUom: item.qtyDefaultSellUom,
        minStock: item.minStock,
        maxStock: item.maxStock,
        lastMovementAt: item.lastMovementAt,
      }))
    },
  })
}

// Locations query
export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<Location[]>('/api/v1/locations'),
    staleTime: 1000 * 60 * 60, // 1 hour for locations
    select: (response) => response.data,
  })
}

// Categories query (reuse from products but add here for convenience)
export function useInventoryCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 60, // 1 hour for categories
    select: (response) => response.data,
  })
}

// Inventory stats query
export function useInventoryStats(locationId?: string) {
  return useQuery({
    queryKey: ['inventory-stats', locationId],
    queryFn: () => api.get<any>('/api/v1/inventory/stats', { params: { locationId } }),
    staleTime: 1000 * 60, // 1 minute for stats
    select: (response) => response.data,
  })
}