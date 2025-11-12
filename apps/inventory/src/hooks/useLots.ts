import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, invalidateQueries } from '@/lib/api'
import type { Lot, LotFilters, StockMovement } from '@/types/inventory'

// Lots query
export function useLots(filters: LotFilters = {}) {
  return useQuery({
    queryKey: queryKeys.lots(filters.productId, filters.locationId),
    queryFn: () => api.get<{ data: Lot[]; total: number; page: number; limit: number }>('/api/v1/inventory/lots', { params: filters }),
    staleTime: 1000 * 60 * 2, // 2 minutes for lot data
    select: (response) => {
      // Transform the API response to match the Lot interface
      return response.data.map((item: any) => {
        const lot = item.lot || item
        const product = item.product || {}
        const location = item.location || {}

        return {
          id: lot.id,
          productId: lot.productId,
          product: {
            id: product.id || lot.productId,
            name: product.name || 'Unknown Product',
            sku: product.sku || '',
            description: product.description || '',
            kind: product.kind || 'raw_material',
            baseUomId: product.baseUomId || 'EA',
            baseUomName: product.baseUomName || 'Each',
            stdCost: product.stdCost || 0,
            categoryId: product.categoryId || '',
            categoryName: product.categoryName || '',
            perishable: product.perishable || false,
            active: product.active !== false,
            minStockLevel: product.minStockLevel,
            maxStockLevel: product.maxStockLevel,
            stock: 0,
            status: 'in-stock',
            createdAt: product.createdAt || lot.createdAt,
            lastUpdated: product.lastUpdated || lot.updatedAt,
          },
          locationId: lot.locationId,
          locationName: location.name || 'Unknown Location',
          locationType: location.type || 'warehouse',
          lotNumber: lot.lotNo || lot.lotNumber || '',
          expiryDate: lot.expiryDate,
          receivedDate: lot.receivedDate || lot.createdAt,
          qtyBase: item.stockQuantity || lot.qtyBase || 0,
          costPerUnit: lot.costPerUnit || 0,
          status: lot.status || 'active',
          supplierId: lot.supplierId,
          supplierName: lot.supplierName || 'Unknown Supplier',
          createdAt: lot.createdAt,
          lastUpdated: lot.updatedAt || lot.createdAt,
        }
      })
    },
  })
}

export function useLot(id: string) {
  return useQuery({
    queryKey: ['lots', id],
    queryFn: () => api.get<Lot>(`/api/v1/inventory/lots/${id}`),
    staleTime: 1000 * 60 * 2,
    select: (response) => response.data,
    enabled: !!id,
  })
}

// Lot movements query
export function useLotMovements(lotId: string) {
  return useQuery({
    queryKey: ['lot-movements', lotId],
    queryFn: () => api.get<StockMovement[]>(`/api/v1/lots/${lotId}/movements`),
    staleTime: 1000 * 60 * 5, // 5 minutes for movements
    select: (response) => response.data,
    enabled: !!lotId,
  })
}

// Create lot mutation
export function useCreateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Lot, 'id'>) => api.post<Lot>('/api/v1/inventory/lots', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      invalidateQueries.inventory()
    },
  })
}

// Update lot mutation
export function useUpdateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lot> }) =>
      api.patch<Lot>(`/api/v1/inventory/lots/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['lots', id] })
      invalidateQueries.inventory()
    },
  })
}

// Merge lots mutation
export function useMergeLots() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sourceLotIds, targetLotId }: { sourceLotIds: string[]; targetLotId: string }) =>
      api.post<Lot>(`/api/v1/lots/${targetLotId}/merge`, { sourceLotIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      invalidateQueries.inventory()
    },
  })
}

// Expiring lots query
export function useExpiringLots(days: number = 30) {
  return useQuery({
    queryKey: ['expiring-lots', days],
    queryFn: async () => {
      try {
        const response = await api.get<Lot[]>(`/api/v1/lots/expiring`, { params: { days } })
        return response.data
      } catch (error) {
        // If endpoint doesn't exist, return empty array
        console.warn('Expiring lots endpoint not available, using fallback logic')
        return []
      }
    },
    staleTime: 1000 * 60 * 15, // 15 minutes for expiring lots
    retry: false, // Don't retry if endpoint doesn't exist
  })
}

// Helper function to check if a lot is expiring soon
export function isLotExpiring(lot: Lot, warningDays: number = 14, dangerDays: number = 7) {
  if (!lot.expiryDate) return { status: 'none', color: '', daysToExpiry: null }

  const expiryDate = new Date(lot.expiryDate)
  const today = new Date()
  const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysToExpiry < 0) {
    return { status: 'expired', color: 'bg-red-100 text-red-800', daysToExpiry }
  } else if (daysToExpiry <= dangerDays) {
    return { status: 'danger', color: 'bg-red-100 text-red-800', daysToExpiry }
  } else if (daysToExpiry <= warningDays) {
    return { status: 'warning', color: 'bg-yellow-100 text-yellow-800', daysToExpiry }
  } else {
    return { status: 'safe', color: 'bg-green-100 text-green-800', daysToExpiry }
  }
}

// Helper function to get FEFO lots for a product
export function getFefoLots(lots: Lot[]): Lot[] {
  return lots
    .filter(lot => lot.status === 'active' && lot.qtyBase > 0)
    .sort((a, b) => {
      // First sort by expiry date (earliest first), nulls last
      if (!a.expiryDate && !b.expiryDate) return 0
      if (!a.expiryDate) return 1
      if (!b.expiryDate) return -1

      const aExpiry = new Date(a.expiryDate).getTime()
      const bExpiry = new Date(b.expiryDate).getTime()

      return aExpiry - bExpiry
    })
}