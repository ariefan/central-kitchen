/**
 * Lightweight API Client for TanStack Query
 * Works with @contracts/erp for type safety
 */

// Get API base URL - always use relative URLs in production for proxy
function getApiBaseUrl(): string {
  // If explicitly set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // In browser, use current origin (goes through Next.js proxy)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Server-side in development
  return 'http://localhost:8000';
}

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Build URL with query parameters
 * Calculates base URL at request time to handle SSR correctly
 */
function buildUrl(path: string, params?: Record<string, any>): string {
  // Get base URL at request time (not module load time)
  const baseUrl = getApiBaseUrl();
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Handle API response with error handling
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const error = await response.json();
      throw new ApiError(
        response.status,
        error.error || error.message || `HTTP ${response.status}`,
        error.code,
        error.details
      );
    }
    throw new ApiError(response.status, `HTTP Error ${response.status}`);
  }

  if (isJson) {
    return response.json();
  }

  return response.text() as T;
}

/**
 * GET request
 */
export async function get<T>(path: string, options?: FetchOptions): Promise<T> {
  const url = buildUrl(path, options?.params);

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  return handleResponse<T>(response);
}

/**
 * POST request
 */
export async function post<T>(path: string, data?: any, options?: FetchOptions): Promise<T> {
  const url = buildUrl(path, options?.params);

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
}

/**
 * PUT request
 */
export async function put<T>(path: string, data?: any, options?: FetchOptions): Promise<T> {
  const url = buildUrl(path, options?.params);

  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
}

/**
 * PATCH request
 */
export async function patch<T>(path: string, data?: any, options?: FetchOptions): Promise<T> {
  const url = buildUrl(path, options?.params);

  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
}

/**
 * DELETE request
 */
export async function del<T>(path: string, options?: FetchOptions): Promise<T> {
  const url = buildUrl(path, options?.params);

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  return handleResponse<T>(response);
}

/**
 * Upload file with FormData
 */
export async function upload<T>(path: string, formData: FormData, options?: FetchOptions): Promise<T> {
  const url = buildUrl(path, options?.params);

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    ...options,
    // Don't set Content-Type - browser sets it with boundary
  });

  return handleResponse<T>(response);
}

// Export API base URL
export { API_BASE_URL };

// Export as default object for convenience
export default {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
};
