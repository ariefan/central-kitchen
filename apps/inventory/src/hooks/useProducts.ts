import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, invalidateQueries } from '@/lib/api'
import type { Product, ProductFilters, Category, UnitOfMeasure, Pack } from '@/types/inventory'

// Products query
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: () => api.get<{ success: boolean; data: { items: Product[]; total: number; limit: number; offset: number }; message: string }>('/api/v1/products', { params: filters }),
    staleTime: 1000 * 60 * 10, // 10 minutes for reference data
    select: (response) => response.data,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => api.get<Product>(`/api/v1/products/${id}`),
    staleTime: 1000 * 60 * 10,
    select: (response) => response.data,
    enabled: !!id,
  })
}

// Create product mutation
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>) =>
      api.post<Product>('/api/v1/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      invalidateQueries.inventory()
    },
  })
}

// Update product mutation
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      api.patch<Product>(`/api/v1/products/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', id] })
      invalidateQueries.inventory()
    },
  })
}

// Delete product mutation
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      invalidateQueries.inventory()
    },
  })
}

// Categories query
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories'),
    staleTime: 1000 * 60 * 60, // 1 hour for categories
    select: (response) => response.data,
  })
}

// Units of Measure query
export function useUnitsOfMeasure() {
  return useQuery({
    queryKey: ['uom'],
    queryFn: () => api.get<UnitOfMeasure[]>('/api/v1/products/uom'),
    staleTime: 1000 * 60 * 60, // 1 hour for UoM
    select: (response) => response.data,
  })
}

// Product packs query
export function useProductPacks(productId: string) {
  return useQuery({
    queryKey: ['product-packs', productId],
    queryFn: () => api.get<Pack[]>(`/api/v1/products/${productId}/packs`),
    staleTime: 1000 * 60 * 10,
    select: (response) => response.data,
    enabled: !!productId,
  })
}

// Create pack mutation
export function useCreatePack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Pack, 'id'>) => api.post<Pack>('/api/v1/packs', data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-packs', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// Update pack mutation
export function useUpdatePack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pack> }) =>
      api.patch<Pack>(`/api/v1/packs/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['product-packs'] })
      queryClient.invalidateQueries({ queryKey: ['packs', id] })
    },
  })
}

// Delete pack mutation
export function useDeletePack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/packs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-packs'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}