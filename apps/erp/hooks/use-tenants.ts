import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Tenant {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  isActive: boolean;
  metadata: Record<string, any> | null;
  totalUsers?: number;
  totalLocations?: number;
  createdAt: string;
  updatedAt: string;
}

interface TenantsResponse {
  success: boolean;
  data: {
    items: Tenant[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      currentPage: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message?: string;
}

interface TenantResponse {
  success: boolean;
  data: Tenant;
  message?: string;
}

interface TenantCreate {
  name: string;
  slug: string;
  orgId: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

interface TenantUpdate {
  name?: string;
  slug?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

interface TenantQueryParams {
  limit?: number;
  offset?: number;
  name?: string;
  slug?: string;
  isActive?: boolean;
}

export function useTenants(params?: TenantQueryParams) {
  return useQuery<TenantsResponse>({
    queryKey: ['tenants', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.name) searchParams.set('name', params.name);
      if (params?.slug) searchParams.set('slug', params.slug);
      if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());

      const response = await fetch(`/api/v1/tenants?${searchParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tenants');
      }

      return response.json();
    },
  });
}

export function useTenant(id: string | undefined) {
  return useQuery<TenantResponse>({
    queryKey: ['tenants', id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/tenants/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tenant');
      }

      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TenantCreate) => {
      const response = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tenant');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TenantUpdate }) => {
      const response = await fetch(`/api/v1/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update tenant');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', variables.id] });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/tenants/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete tenant');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

// ============================================================================
// Onboarding - Join Tenant
// ============================================================================

interface TenantLookupResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
  message?: string;
}

interface JoinTenantResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      tenantId: string;
    };
    tenant: {
      id: string;
      name: string;
      slug: string;
    };
  };
  error?: string;
  message?: string;
}

export function useLookupTenant(slug: string | undefined) {
  return useQuery<TenantLookupResponse>({
    queryKey: ['tenant-lookup', slug],
    queryFn: async () => {
      const response = await fetch(`/api/v1/onboarding/tenant/${slug}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Tenant not found');
      }

      return data;
    },
    enabled: !!slug && slug.length > 0,
    retry: false,
  });
}

export function useJoinTenant() {
  const queryClient = useQueryClient();

  return useMutation<JoinTenantResponse, Error, string>({
    mutationFn: async (slug: string) => {
      const response = await fetch('/api/v1/onboarding/join-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug: slug.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join tenant');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate auth profile to refresh user data with new tenant
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      // Also invalidate tenants list
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

// ============================================================================
// Tenant Switching (for super users)
// ============================================================================

export function useAllTenants() {
  return useQuery<TenantsResponse>({
    queryKey: ['tenants', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/v1/tenants?limit=100', {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tenants');
      }

      return response.json();
    },
  });
}

export function useSwitchTenant() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: async (tenantId: string) => {
      const response = await fetch('/api/v1/auth/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch tenant');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate auth profile to refresh user data with new tenant
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
