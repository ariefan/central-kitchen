import { QueryClient } from '@tanstack/react-query'

// API client configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface ApiResponse<T = any> {
  data: T
  message?: string
  error?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Generic API fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP error! status: ${response.status}`,
        response.status,
        data
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error'
    )
  }
}

// Typed API methods
export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint),
  post: <T>(endpoint: string, data: any) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  put: <T>(endpoint: string, data: any) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  patch: <T>(endpoint: string, data: any) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: <T>(endpoint: string) =>
    apiFetch<T>(endpoint, {
      method: 'DELETE',
    }),
}

// Create and export QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 404) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

// Query keys factory
export const queryKeys = {
  // Reference data (10 min cache)
  products: (filters?: Record<string, any>) => ['products', filters] as const,
  product: (id: string) => ['products', id] as const,
  suppliers: ['suppliers'] as const,
  uom: ['uom'] as const,
  locations: ['locations'] as const,

  // Inventory data (15-30s cache)
  onhand: (filters?: Record<string, any>) => ['onhand', filters] as const,
  lots: (productId?: string, locationId?: string) => ['lots', { productId, locationId }] as const,
  ledger: (filters?: Record<string, any>) => ['ledger', filters] as const,

  // Documents (5 min cache)
  goodsReceipts: (filters?: Record<string, any>) => ['goods-receipts', filters] as const,
  goodsReceipt: (id: string) => ['goods-receipts', id] as const,
  transfers: (filters?: Record<string, any>) => ['transfers', filters] as const,
  transfer: (id: string) => ['transfers', id] as const,
  productionOrders: (filters?: Record<string, any>) => ['production-orders', filters] as const,
  productionOrder: (id: string) => ['production-orders', id] as const,
  stockCounts: (filters?: Record<string, any>) => ['stock-counts', filters] as const,
  stockCount: (id: string) => ['stock-counts', id] as const,
  adjustments: (filters?: Record<string, any>) => ['adjustments', filters] as const,
  adjustment: (id: string) => ['adjustments', id] as const,

  // Alerts and monitoring
  alerts: (filters?: Record<string, any>) => ['alerts', filters] as const,
  temperatureLogs: (filters?: Record<string, any>) => ['temperature-logs', filters] as const,
} as const

// Query invalidation helpers
export const invalidateQueries = {
  // Invalidate inventory data after mutations
  inventory: () => {
    queryClient.invalidateQueries({ queryKey: ['onhand'] })
    queryClient.invalidateQueries({ queryKey: ['lots'] })
    queryClient.invalidateQueries({ queryKey: ['ledger'] })
  },

  // Invalidate specific document types
  goodsReceipts: (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['goods-receipts'] })
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts', id] })
    }
    invalidateQueries.inventory()
  },

  transfers: (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['transfers'] })
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['transfers', id] })
    }
    invalidateQueries.inventory()
  },

  productionOrders: (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['production-orders'] })
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['production-orders', id] })
    }
    invalidateQueries.inventory()
  },

  stockCounts: (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['stock-counts'] })
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['stock-counts', id] })
    }
    invalidateQueries.inventory()
  },

  adjustments: (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['adjustments'] })
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['adjustments', id] })
    }
    invalidateQueries.inventory()
  },
} as const