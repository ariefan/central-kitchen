/**
 * Authentication hooks using TanStack Query + Better Auth
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authClient, useSession } from '@/lib/auth-client';
import { get } from '@/lib/api-client';
import type { UserProfileResponse } from '@contracts/erp';

/**
 * Get current user session from Better Auth
 */
export function useAuthSession() {
  return useSession();
}

/**
 * Get full user profile with tenant and location details
 */
export function useUserProfile() {
  const { data: session, isPending: isSessionPending } = useSession();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => get<UserProfileResponse>('/api/v1/auth/me'),
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Sign out mutation
 */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
      // Redirect to auth page
      router.push('/auth');
      router.refresh();
    },
  });
}

/**
 * Combined auth state hook
 * Returns session, profile, and loading states
 */
export function useAuth() {
  const { data: session, isPending: isSessionLoading, error: sessionError } = useSession();
  const { data: profile, isPending: isProfileLoading, error: profileError } = useUserProfile();
  const signOut = useSignOut();

  const isAuthenticated = !!session?.user;
  const isLoading = isSessionLoading || (isAuthenticated && isProfileLoading);

  return {
    // Session data from Better Auth
    session,
    user: session?.user,

    // Full profile data from API
    profile: profile?.data,
    tenant: profile?.data?.tenant,
    location: profile?.data?.location,

    // Loading states
    isLoading,
    isSessionLoading,
    isProfileLoading,

    // Auth state
    isAuthenticated,

    // Errors
    sessionError,
    profileError,

    // Actions
    signOut: signOut.mutate,
    isSigningOut: signOut.isPending,
  };
}

/**
 * Require authentication - redirect if not authenticated
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    router.push('/auth');
  }

  return { isAuthenticated, isLoading };
}
