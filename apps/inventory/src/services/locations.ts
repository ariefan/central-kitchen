import { api } from '@/lib/api'
import type { Location } from '@/types/inventory'

export const locationService = {
  async list(): Promise<Location[]> {
    const response = await api.get<Location[]>('/api/v1/locations')
    return response.data ?? []
  },
}
