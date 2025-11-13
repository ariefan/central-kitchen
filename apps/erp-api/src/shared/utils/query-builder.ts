import { SQL, sql, and, or, asc, desc, ilike } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Type for table or column record - accepts Drizzle tables or column objects
 * Using indexed type to allow dynamic property access
 */
export type TableOrColumns = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * Sort options
 */
export interface SortOptions {
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Search options
 */
export interface SearchOptions {
  search?: string;
  searchFields: string[];
}

/**
 * Query builder result
 */
export interface QueryBuilderResult {
  where?: SQL;
  orderBy?: SQL[];
  limit: number;
  offset: number;
}

/**
 * Build WHERE conditions for filtering
 * @param filters - Object containing filter key-value pairs
 * @param table - Drizzle table reference or column record
 * @returns SQL WHERE clause
 */
export function buildWhereConditions(
  filters: Record<string, unknown>,
  table: TableOrColumns
): SQL | undefined {
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && table[key]) {
      // Handle boolean values
      if (typeof value === 'boolean') {
        conditions.push(sql`${table[key]} = ${value}`);
      }
      // Handle array values (IN clause)
      else if (Array.isArray(value) && value.length > 0) {
        conditions.push(sql`${table[key]} = ANY(${value})`);
      }
      // Handle string/number values
      else {
        conditions.push(sql`${table[key]} = ${value}`);
      }
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Build ORDER BY clause for sorting
 * @param sortOptions - Sort configuration
 * @param table - Drizzle table reference or column record
 * @param allowedFields - Whitelist of sortable field names
 * @returns SQL ORDER BY clause or undefined if invalid
 */
export function buildOrderBy(
  sortOptions: SortOptions,
  table: TableOrColumns,
  allowedFields: string[]
): SQL[] | undefined {
  const { sortBy, sortOrder } = sortOptions;

  // If no sortBy specified, return undefined
  if (!sortBy) {
    return undefined;
  }

  // Validate sortBy is in allowed fields
  if (!allowedFields.includes(sortBy)) {
    console.warn(`Invalid sort field: ${sortBy}. Allowed: ${allowedFields.join(', ')}`);
    return undefined;
  }

  // Validate field exists in table
  if (!table[sortBy]) {
    console.warn(`Sort field not found in table: ${sortBy}`);
    return undefined;
  }

  // Build ORDER BY clause
  const column = table[sortBy] as PgColumn;
  return sortOrder === 'desc' ? [desc(column)] : [asc(column)];
}

/**
 * Build search condition for multi-field search
 * @param searchOptions - Search configuration
 * @param table - Drizzle table reference or column record
 * @returns SQL search condition using ILIKE
 */
export function buildSearchCondition(
  searchOptions: SearchOptions,
  table: TableOrColumns
): SQL | undefined {
  const { search, searchFields } = searchOptions;

  // If no search term, return undefined
  if (!search || search.trim() === '') {
    return undefined;
  }

  // Build ILIKE conditions for each search field
  const searchConditions: SQL[] = [];
  const searchPattern = `%${search.trim()}%`;

  for (const field of searchFields) {
    if (table[field]) {
      // Cast to text for search on non-text fields
      searchConditions.push(
        ilike(sql`CAST(${table[field]} AS TEXT)`, searchPattern)
      );
    }
  }

  // Combine with OR (match any field)
  return searchConditions.length > 0 ? or(...searchConditions) : undefined;
}

/**
 * Apply pagination to query
 * @param query - Drizzle query builder
 * @param pagination - Pagination options
 * @returns Query with limit and offset applied
 */
export function applyPagination<T>(
  query: T,
  pagination: PaginationOptions
): T {
  // Type assertion required: Generic T represents a Drizzle query builder,
  // but TypeScript cannot infer that it has limit() and offset() methods.
  // Using 'as any' is necessary here to call these chainable methods.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  return (query as any).limit(pagination.limit).offset(pagination.offset);
}

/**
 * Build complete query conditions
 * Combines filters, search, and sorting into a single query builder result
 * @param options - All query options
 * @returns Complete query builder result
 */
export function buildQueryConditions(options: {
  filters?: Record<string, unknown>;
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit: number;
  offset: number;
  table: TableOrColumns;
  allowedSortFields: string[];
}): QueryBuilderResult {
  const {
    filters = {},
    search,
    searchFields = [],
    sortBy,
    sortOrder = 'asc',
    limit,
    offset,
    table,
    allowedSortFields,
  } = options;

  // Build WHERE conditions
  const whereConditions: SQL[] = [];

  // Add filter conditions
  const filterCondition = buildWhereConditions(filters, table);
  if (filterCondition) {
    whereConditions.push(filterCondition);
  }

  // Add search condition
  if (search && searchFields.length > 0) {
    const searchCondition = buildSearchCondition(
      { search, searchFields },
      table
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }
  }

  // Combine all WHERE conditions
  const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Build ORDER BY
  const orderBy = buildOrderBy({ sortBy, sortOrder }, table, allowedSortFields);

  return {
    where,
    orderBy,
    limit,
    offset,
  };
}

/**
 * Calculate total pages from total count and limit
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Calculate current page from offset and limit
 */
export function calculateCurrentPage(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}
