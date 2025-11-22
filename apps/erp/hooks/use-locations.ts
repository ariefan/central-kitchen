/**
 * Location management hooks using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api-client';
import type {
  LocationsResponse,
  LocationResponse,
  LocationCreate,
  LocationUpdate,
  LocationQuery,
  DeleteResponse,
  LocationType,
} from '@contracts/erp';

/**
 * Query keys for locations
 */
export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (filters?: LocationQuery) => [...locationKeys.lists(), filters] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
};

/**
 * Fetch all locations
 */
export function useLocations(params?: LocationQuery) {
  return useQuery({
    queryKey: locationKeys.list(params),
    queryFn: () => get<LocationsResponse>('/api/v1/locations', { params }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single location by ID
 */
export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => get<LocationResponse>(`/api/v1/locations/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create new location
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LocationCreate) =>
      post<LocationResponse>('/api/v1/locations', data),
    onSuccess: () => {
      // Invalidate and refetch locations list
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

/**
 * Update existing location
 */
export function useUpdateLocation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LocationUpdate) =>
      patch<LocationResponse>(`/api/v1/locations/${id}`, data),
    onSuccess: () => {
      // Invalidate both the detail and list queries
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

/**
 * Delete location
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      del<DeleteResponse>(`/api/v1/locations/${id}`),
    onSuccess: () => {
      // Invalidate locations list
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

/**
 * Get active locations only (for dropdowns)
 */
export function useActiveLocations() {
  return useLocations({
    isActive: true,
    limit: 100,
    offset: 0,
    sortOrder: 'asc'
  });
}

/**
 * Get locations by type
 */
export function useLocationsByType(locationType: LocationType) {
  return useLocations({
    locationType,
    limit: 100,
    offset: 0,
    sortOrder: 'asc'
  });
}
