import { api } from '@/lib/api'

export interface ProductSummary {
  id: string
  name: string
  sku: string
  baseUomId: string
  baseUomName?: string
  isPerishable: boolean
}

type ProductListResponse = {
  items: Array<{
    id: string
    name: string
    sku: string
    baseUomId: string
    baseUomName?: string
    isPerishable?: boolean
  }>
  total: number
  limit: number
  offset: number
}

const mapProducts = (payload?: ProductListResponse | null): ProductSummary[] => {
  if (!payload) return []
  return payload.items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    baseUomId: item.baseUomId,
    baseUomName: item.baseUomName,
    isPerishable: Boolean(item.isPerishable),
  }))
}

export const productService = {
  async list(): Promise<ProductSummary[]> {
    const response = await api.get<ProductListResponse>('/api/v1/products')
    return mapProducts(response.data)
  },

  async search(search: string): Promise<ProductSummary[]> {
    const query = new URLSearchParams()
    if (search) {
      query.set('search', search)
    }
    const response = await api.get<ProductListResponse>(`/api/v1/products?${query.toString()}`)
    return mapProducts(response.data)
  },
}
