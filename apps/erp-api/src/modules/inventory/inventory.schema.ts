import { z } from 'zod';
import { successResponseSchema } from '../../shared/utils/responses.js';

export const lotCreateSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  lotNo: z.string().max(100).optional(),
  expiryDate: z.string().datetime().optional(),
  manufactureDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const inventoryValuationSchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  costMethod: z.enum(['fifo', 'average']).default('fifo'),
});

export const stockMovementSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  quantity: z.number(),
  unitCost: z.number().optional(),
  refType: z.enum(['PO', 'GR', 'REQ', 'XFER', 'PROD', 'ADJ', 'ORDER', 'RET', 'COUNT']),
  refId: z.string().uuid(),
  note: z.string().optional(),
});

export const lotQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  lotNo: z.string().optional(),
  includeExpired: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  lowStock: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  expiringSoon: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
});

export const ledgerQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  type: z.enum(['rcv', 'iss', 'prod_in', 'prod_out', 'adj', 'cust_ret', 'sup_ret', 'waste']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  refType: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// FEFO Picking Schemas (INV-002)
// ============================================================================

/**
 * Query schema for FEFO pick recommendations
 * Returns lots ordered by expiry date (FEFO) for perishable inventory picking
 */
export const fefoPickQuerySchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantityNeeded: z.number().positive().optional(),
  excludeExpired: z.enum(['true', 'false']).default('true').transform(val => val === 'true'),
});

/**
 * Input schema for lot allocation requests
 * Allocates inventory from lots based on FEFO prioritization
 */
export const lotAllocationSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantityNeeded: z.number().positive(),
  refType: z.enum(['ORDER', 'XFER', 'PROD', 'REQ']),
  refId: z.string().uuid(),
  allowPartial: z.boolean().default(true),
  reserveOnly: z.boolean().default(false), // If true, don't consume stock yet
});

/**
 * Response schema for FEFO pick recommendations
 */
export const fefoPickResponseSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  locationId: z.string().uuid(),
  locationCode: z.string(),
  locationName: z.string(),
  recommendations: z.array(z.object({
    lotId: z.string().uuid(),
    lotNo: z.string().nullable(),
    quantityAvailable: z.number(),
    expiryDate: z.string().nullable(),
    daysToExpiry: z.number().nullable(),
    expiryStatus: z.enum(['no_expiry', 'expired', 'expiring_soon', 'expiring_this_month', 'good']),
    pickPriority: z.number(),
    unitCost: z.string().nullable(),
  })),
  totalAvailable: z.number(),
});

/**
 * Response schema for lot allocation
 */
export const lotAllocationResponseSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantityRequested: z.number(),
  quantityAllocated: z.number(),
  fullyAllocated: z.boolean(),
  allocations: z.array(z.object({
    lotId: z.string().uuid(),
    lotNo: z.string().nullable(),
    quantityAllocated: z.number(),
    expiryDate: z.string().nullable(),
    unitCost: z.string().nullable(),
  })),
  refType: z.string(),
  refId: z.string().uuid(),
});

export const inventoryResponseSchema = successResponseSchema(z.any());
export const inventoryListResponseSchema = successResponseSchema(z.array(z.any()));
