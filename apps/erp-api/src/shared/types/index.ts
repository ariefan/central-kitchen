// Re-export all types from schema
export * from '../../config/schema.js';

// Common API types
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Enhanced pagination with metadata (for inventory ledger style)
export interface PaginatedResponseWithMetadata<T> {
  entries: T[];
  summary: {
    totalEntries: number;
    totalPages: number;
    currentPage: number;
    filters?: Record<string, unknown>;
    period?: {
      from?: string | null;
      to?: string | null;
    };
  };
}

// Common request/response types
export interface IdParams {
  id: number;
}

export interface StatusUpdateBody {
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

// Environment variables type
export type Environment = 'development' | 'production' | 'test';
