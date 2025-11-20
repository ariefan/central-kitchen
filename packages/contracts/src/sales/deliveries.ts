/**
 * Delivery Management contracts for sales module
 *
 * Manages delivery logistics for online and phone orders.
 * Includes driver assignment, route optimization, and real-time tracking.
 *
 * CRITICAL: Delivery workflow:
 * - Order confirmed → Assign to driver → Out for delivery → Delivered/Failed
 * - Delivery confirmation requires signature or photo
 * - Failed deliveries trigger customer notification and retry scheduling
 *
 * Covers:
 * 1. Delivery assignment and scheduling (ORD-002)
 * 2. Route optimization
 * 3. Real-time delivery tracking
 * 4. Delivery confirmation with proof
 * 5. Failed delivery handling
 *
 * @module @contracts/erp/sales/deliveries
 * @see FEATURES.md ORD-002 - Delivery Management
 * @see USER_STORIES.md Epic 6 - Delivery tracking
 */

import { z } from 'zod';
import {
  baseQuerySchema,
  dateRangeFilterSchema,
  locationFilterSchema,
  successResponseSchema,
  paginatedResponseSchema,
  userRelationSchema,
  customerRelationSchema,
} from '../common.js';
import {
  uuidSchema,
  dateTimeInputSchema,
  latitudeSchema,
  longitudeSchema,
  phoneSchema,
} from '../primitives.js';
import {
  deliveryStatusSchema,
} from '../enums.js';

// ============================================================================
// DELIVERY CREATION SCHEMAS
// ============================================================================

/**
 * Create delivery from order
 *
 * Business Rules (from FEATURES.md ORD-002):
 * - Only for delivery-type orders
 * - Order must be confirmed
 * - Delivery address required
 * - Can specify scheduled delivery window
 * - Auto-calculates delivery fee based on distance
 *
 * @see FEATURES.md ORD-002 - "Delivery assignment to drivers"
 * @see FEATURES.md ORD-002 - "Scheduled delivery window"
 *
 * @example
 * ```typescript
 * {
 *   orderId: "uuid...",
 *   scheduledStartTime: "2025-01-20T10:00:00Z",
 *   scheduledEndTime: "2025-01-20T11:00:00Z",
 *   deliveryInstructions: "Ring doorbell twice",
 *   recipientPhone: "+1234567890"
 * }
 * ```
 */
export const deliveryCreateSchema = z.object({
  orderId: uuidSchema,
  scheduledStartTime: dateTimeInputSchema.optional(), // Delivery window start
  scheduledEndTime: dateTimeInputSchema.optional(),   // Delivery window end
  deliveryInstructions: z.string().max(1000).optional(),
  recipientName: z.string().max(100).optional(), // Override order customer name
  recipientPhone: phoneSchema.optional(),        // Override order customer phone
  priorityLevel: z.enum(['normal', 'high', 'urgent']).default('normal'),
});

/**
 * Assign delivery to driver
 *
 * Business Rules (from FEATURES.md ORD-002):
 * - Driver must be active and available
 * - Can reassign to different driver if not yet delivered
 * - Triggers notification to driver
 *
 * @see FEATURES.md ORD-002 - "Delivery assignment to drivers"
 * @see FEATURES.md ORD-002 - "Driver notification"
 */
export const deliveryAssignSchema = z.object({
  deliveryId: uuidSchema,
  driverId: uuidSchema,
  assignmentNotes: z.string().max(500).optional(),
  estimatedDuration: z.number().int().positive().optional(), // Minutes
});

/**
 * Update delivery status
 *
 * Business Rules (from FEATURES.md ORD-002):
 * - Status flow: pending → assigned → out_for_delivery → delivered/failed
 * - Cannot update after delivered/failed
 * - Location tracking on status updates
 *
 * @see FEATURES.md ORD-002 - "Delivery status updates"
 * @see FEATURES.md ORD-002 - "Real-time tracking"
 */
export const deliveryStatusUpdateSchema = z.object({
  deliveryId: uuidSchema,
  status: deliveryStatusSchema,
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  notes: z.string().max(500).optional(),
  updatedAt: dateTimeInputSchema.optional(),
});

/**
 * Delivery confirmation
 *
 * Business Rules (from FEATURES.md ORD-002):
 * - Requires proof of delivery: signature OR photo
 * - Captures exact delivery time and location
 * - Triggers customer notification
 * - Updates order status to 'completed'
 *
 * @see FEATURES.md ORD-002 - "Delivery confirmation with signature/photo"
 * @see FEATURES.md ORD-002 - "Customer notification on delivery"
 *
 * @example
 * ```typescript
 * {
 *   deliveryId: "uuid...",
 *   signatureUrl: "https://...",
 *   photoUrls: ["https://..."],
 *   receiverName: "John Doe",
 *   deliveredAt: "2025-01-20T10:45:00Z",
 *   latitude: 1.234567,
 *   longitude: 103.123456,
 *   notes: "Left at front door as requested"
 * }
 * ```
 */
export const deliveryConfirmSchema = z.object({
  deliveryId: uuidSchema,
  signatureUrl: z.string().url().optional(), // Digital signature image
  photoUrls: z.array(z.string().url()).max(10).optional(), // Proof photos
  receiverName: z.string().max(100).optional(), // Who received the order
  deliveredAt: dateTimeInputSchema.optional(), // Defaults to now
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.signatureUrl || (data.photoUrls && data.photoUrls.length > 0),
  {
    message: 'Either signature or at least one photo is required for delivery confirmation',
  }
);

/**
 * Failed delivery handling
 *
 * Business Rules (from FEATURES.md ORD-002):
 * - Record failure reason
 * - Capture attempted delivery time and location
 * - Triggers customer notification
 * - Can schedule retry delivery
 *
 * @see FEATURES.md ORD-002 - "Failed delivery handling"
 * @see FEATURES.md ORD-002 - "Retry scheduling"
 *
 * @example
 * ```typescript
 * {
 *   deliveryId: "uuid...",
 *   failureReason: "customer_not_home",
 *   failureNotes: "No one answered the door",
 *   attemptedAt: "2025-01-20T10:30:00Z",
 *   scheduleRetry: true,
 *   retryScheduledStartTime: "2025-01-20T14:00:00Z"
 * }
 * ```
 */
export const deliveryFailSchema = z.object({
  deliveryId: uuidSchema,
  failureReason: z.enum([
    'customer_not_home',
    'wrong_address',
    'customer_refused',
    'access_issue',
    'weather_delay',
    'vehicle_issue',
    'other',
  ]),
  failureNotes: z.string().max(1000),
  attemptedAt: dateTimeInputSchema.optional(), // Defaults to now
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  photoUrls: z.array(z.string().url()).max(5).optional(), // Evidence photos
  scheduleRetry: z.boolean().default(false),
  retryScheduledStartTime: dateTimeInputSchema.optional(),
  retryScheduledEndTime: dateTimeInputSchema.optional(),
});

export type DeliveryCreate = z.infer<typeof deliveryCreateSchema>;
export type DeliveryAssign = z.infer<typeof deliveryAssignSchema>;
export type DeliveryStatusUpdate = z.infer<typeof deliveryStatusUpdateSchema>;
export type DeliveryConfirm = z.infer<typeof deliveryConfirmSchema>;
export type DeliveryFail = z.infer<typeof deliveryFailSchema>;

// ============================================================================
// ROUTE OPTIMIZATION SCHEMAS
// ============================================================================

/**
 * Optimize delivery routes
 *
 * Business Rules (from FEATURES.md ORD-002):
 * - Groups deliveries by proximity
 * - Considers delivery windows
 * - Minimizes total distance/time
 * - Assigns to available drivers
 *
 * @see FEATURES.md ORD-002 - "Route optimization"
 * @see FEATURES.md ORD-002 - "Batch delivery assignments"
 */
export const routeOptimizationSchema = z.object({
  locationId: uuidSchema, // Starting location
  deliveryIds: z.array(uuidSchema).min(2).max(50), // Deliveries to optimize
  driverIds: z.array(uuidSchema).min(1).max(20).optional(), // Available drivers
  optimizationGoal: z.enum(['shortest_distance', 'shortest_time', 'balanced']).default('balanced'),
  considerTraffic: z.boolean().default(true),
});

/**
 * Optimized route response
 */
export const optimizedRouteSchema = z.object({
  routeId: z.string(),
  driverId: uuidSchema,
  driverName: z.string(),
  totalDistance: z.number(), // Kilometers
  estimatedDuration: z.number().int(), // Minutes
  stops: z.array(z.object({
    deliveryId: uuidSchema,
    orderNumber: z.string(),
    customerName: z.string(),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    scheduledWindow: z.object({
      start: z.date(),
      end: z.date(),
    }).optional(),
    estimatedArrival: z.date(),
    sequenceOrder: z.number().int(),
    distanceFromPrevious: z.number(), // Kilometers
  })),
});

export type RouteOptimization = z.infer<typeof routeOptimizationSchema>;
export type OptimizedRoute = z.infer<typeof optimizedRouteSchema>;

// ============================================================================
// TRACKING SCHEMAS
// ============================================================================

/**
 * Update delivery location (real-time tracking)
 *
 * Business Rules (from FEATURES.md ORD-002):
 * - Driver app sends periodic location updates
 * - Used for real-time customer tracking
 * - Calculates ETA based on current location
 *
 * @see FEATURES.md ORD-002 - "Real-time tracking"
 * @see FEATURES.md ORD-002 - "ETA calculation"
 */
export const deliveryLocationUpdateSchema = z.object({
  deliveryId: uuidSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  heading: z.number().min(0).max(360).optional(), // Compass direction
  speed: z.number().nonnegative().optional(), // km/h
  accuracy: z.number().nonnegative().optional(), // meters
  timestamp: dateTimeInputSchema.optional(),
});

export type DeliveryLocationUpdate = z.infer<typeof deliveryLocationUpdateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Delivery query filters
 */
export const deliveryFiltersSchema = z
  .object({
    orderId: uuidSchema.optional(),
    driverId: uuidSchema.optional(),
    status: deliveryStatusSchema.optional(),
    priorityLevel: z.enum(['normal', 'high', 'urgent']).optional(),
    isOverdue: z.boolean().optional(), // Past scheduled end time
  })
  .merge(locationFilterSchema)
  .merge(dateRangeFilterSchema);

/**
 * Complete Delivery query schema
 */
export const deliveryQuerySchema = baseQuerySchema.merge(deliveryFiltersSchema);

export type DeliveryFilters = z.infer<typeof deliveryFiltersSchema>;
export type DeliveryQuery = z.infer<typeof deliveryQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Delivery detail schema
 *
 * @see FEATURES.md ORD-002 - Delivery structure
 */
export const deliveryDetailSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  deliveryNumber: z.string(), // Auto-generated: DEL-YYYYMMDD-00001
  orderId: uuidSchema,
  locationId: uuidSchema,
  status: deliveryStatusSchema,

  // Assignment
  driverId: uuidSchema.nullable(),
  assignedAt: z.date().nullable(),

  // Scheduling
  scheduledStartTime: z.date().nullable(),
  scheduledEndTime: z.date().nullable(),
  estimatedDuration: z.number().int().nullable(), // Minutes

  // Delivery details
  deliveryAddress: z.string(),
  deliveryLatitude: z.number().nullable(),
  deliveryLongitude: z.number().nullable(),
  deliveryInstructions: z.string().nullable(),
  recipientName: z.string().nullable(),
  recipientPhone: z.string().nullable(),
  priorityLevel: z.string(),

  // Timing
  startedAt: z.date().nullable(), // When driver started delivery
  deliveredAt: z.date().nullable(),
  attemptedAt: z.date().nullable(), // For failed deliveries

  // Proof of delivery
  signatureUrl: z.string().nullable(),
  photoUrls: z.array(z.string()).nullable(),
  receiverName: z.string().nullable(),

  // Failed delivery
  failureReason: z.string().nullable(),
  failureNotes: z.string().nullable(),
  retryDeliveryId: uuidSchema.nullable(), // If retry scheduled

  // Tracking
  currentLatitude: z.number().nullable(),
  currentLongitude: z.number().nullable(),
  lastLocationUpdate: z.date().nullable(),
  estimatedArrival: z.date().nullable(),

  // Flags
  isOverdue: z.boolean(),
  isRetry: z.boolean(),

  // System fields
  notes: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Relations
  order: z.object({
    id: uuidSchema,
    docNo: z.string(),
    orderType: z.string(),
    totalAmount: z.string(),
    paymentStatus: z.string(),
  }).nullable(),
  driver: userRelationSchema.nullable(),
  customer: customerRelationSchema.nullable(),
});

/**
 * Delivery list item schema
 */
export const deliveryListItemSchema = deliveryDetailSchema.omit({
  order: true,
  photoUrls: true,
});

/**
 * Delivery tracking response (for customer)
 *
 * Simplified view for customer tracking page.
 *
 * @see FEATURES.md ORD-002 - "Customer tracking page"
 */
export const deliveryTrackingSchema = successResponseSchema(
  z.object({
    deliveryNumber: z.string(),
    status: z.string(),
    orderNumber: z.string(),
    estimatedArrival: z.date().nullable(),
    deliveryAddress: z.string(),
    deliveryInstructions: z.string().nullable(),

    // Driver info (limited for privacy)
    driverName: z.string().nullable(),
    driverPhone: z.string().nullable(), // Masked or relay number

    // Current location (if out for delivery)
    currentLatitude: z.number().nullable(),
    currentLongitude: z.number().nullable(),
    lastLocationUpdate: z.date().nullable(),

    // Timeline
    timeline: z.array(z.object({
      status: z.string(),
      timestamp: z.date(),
      notes: z.string().nullable(),
    })),
  })
);

/**
 * Delivery detail response
 */
export const deliveryResponseSchema = successResponseSchema(deliveryDetailSchema);

/**
 * Deliveries paginated response
 */
export const deliveriesResponseSchema = paginatedResponseSchema(deliveryListItemSchema);

/**
 * Optimized routes response
 */
export const optimizedRoutesResponseSchema = successResponseSchema(
  z.object({
    totalRoutes: z.number().int(),
    totalDeliveries: z.number().int(),
    totalDistance: z.number(),
    totalEstimatedTime: z.number().int(), // Minutes
    routes: z.array(optimizedRouteSchema),
    unassignedDeliveries: z.array(z.object({
      deliveryId: uuidSchema,
      reason: z.string(),
    })),
  })
);

export type DeliveryDetail = z.infer<typeof deliveryDetailSchema>;
export type DeliveryListItem = z.infer<typeof deliveryListItemSchema>;
export type DeliveryTracking = z.infer<typeof deliveryTrackingSchema>;
export type DeliveryResponse = z.infer<typeof deliveryResponseSchema>;
export type DeliveriesResponse = z.infer<typeof deliveriesResponseSchema>;
export type OptimizedRoutesResponse = z.infer<typeof optimizedRoutesResponseSchema>;

// ============================================================================
// PERFORMANCE METRICS SCHEMAS
// ============================================================================

/**
 * Delivery performance metrics
 *
 * Business Rules (from FEATURES.md ORD-002):
 * - Track on-time delivery rate
 * - Average delivery time
 * - Failed delivery rate
 * - Driver performance
 *
 * @see FEATURES.md ORD-002 - "Delivery performance metrics"
 */
export const deliveryMetricsSchema = successResponseSchema(
  z.object({
    period: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    totalDeliveries: z.number().int(),
    completedDeliveries: z.number().int(),
    failedDeliveries: z.number().int(),
    pendingDeliveries: z.number().int(),

    // Performance
    onTimeDeliveryRate: z.number(), // Percentage
    averageDeliveryTime: z.number(), // Minutes
    failedDeliveryRate: z.number(), // Percentage

    // By driver
    byDriver: z.array(z.object({
      driverId: uuidSchema,
      driverName: z.string(),
      totalDeliveries: z.number().int(),
      completedDeliveries: z.number().int(),
      failedDeliveries: z.number().int(),
      onTimeRate: z.number(),
      averageTime: z.number(),
    })),

    // By time of day
    byHour: z.array(z.object({
      hour: z.number().int().min(0).max(23),
      deliveries: z.number().int(),
      averageTime: z.number(),
    })),
  })
);

export type DeliveryMetrics = z.infer<typeof deliveryMetricsSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Calculate distance between two coordinates
 *
 * Uses Haversine formula for great-circle distance.
 *
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate delivery fee based on distance
 *
 * Business Rule: Delivery fee based on distance tiers
 *
 * @param distance - Distance in kilometers
 * @param baseFee - Base delivery fee (default $5)
 * @param perKmFee - Fee per km beyond base (default $1)
 * @param freeDeliveryThreshold - Order total for free delivery (default $50)
 * @param orderTotal - Order total amount
 * @returns Delivery fee
 */
export function calculateDeliveryFee(
  distance: number,
  baseFee: number = 5,
  perKmFee: number = 1,
  freeDeliveryThreshold: number = 50,
  orderTotal: number = 0
): number {
  // Free delivery if order exceeds threshold
  if (orderTotal >= freeDeliveryThreshold) {
    return 0;
  }

  // Base fee + per km charge
  const baseDistance = 3; // km included in base fee
  const extraDistance = Math.max(0, distance - baseDistance);
  return baseFee + extraDistance * perKmFee;
}

/**
 * Estimate delivery time
 *
 * Business Rule: Estimate based on distance and traffic
 *
 * @param distance - Distance in kilometers
 * @param averageSpeed - Average speed in km/h (default 30)
 * @param prepTime - Food preparation time in minutes (default 15)
 * @returns Estimated total time in minutes
 */
export function estimateDeliveryTime(
  distance: number,
  averageSpeed: number = 30,
  prepTime: number = 15
): number {
  const travelTime = (distance / averageSpeed) * 60; // Convert to minutes
  return Math.ceil(prepTime + travelTime);
}

/**
 * Check if delivery is overdue
 *
 * Business Rule: Overdue if past scheduled end time
 *
 * @param scheduledEndTime - Scheduled delivery window end
 * @param currentTime - Current time (defaults to now)
 * @returns True if overdue
 */
export function isDeliveryOverdue(
  scheduledEndTime: Date | null,
  currentTime: Date = new Date()
): boolean {
  if (!scheduledEndTime) return false;
  return currentTime > scheduledEndTime;
}

/**
 * Calculate on-time delivery rate
 *
 * Business Rule: Delivered within scheduled window
 *
 * @param deliveries - Array of delivery records
 * @returns On-time rate percentage
 */
export function calculateOnTimeRate(
  deliveries: Array<{
    deliveredAt: Date | null;
    scheduledEndTime: Date | null;
  }>
): number {
  if (deliveries.length === 0) return 0;

  const onTime = deliveries.filter(
    (d) =>
      d.deliveredAt &&
      d.scheduledEndTime &&
      d.deliveredAt <= d.scheduledEndTime
  ).length;

  return (onTime / deliveries.length) * 100;
}

/**
 * Validate delivery status transition
 *
 * Business Rule: Status flow validation
 *
 * @param currentStatus - Current delivery status
 * @param nextStatus - Proposed next status
 * @returns True if transition is valid
 */
export function isValidDeliveryStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const validTransitions: Record<string, readonly string[]> = {
    pending: ['assigned', 'cancelled'],
    assigned: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'failed'],
    delivered: [],
    failed: ['assigned'], // Can retry
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Check if delivery can be reassigned
 *
 * Business Rule: Can reassign if not delivered or failed
 *
 * @param status - Current delivery status
 * @returns True if can reassign
 */
export function canReassignDelivery(status: string): boolean {
  return ['pending', 'assigned', 'out_for_delivery'].includes(status);
}

/**
 * Mask phone number for customer display
 *
 * Privacy helper to partially hide driver phone number.
 *
 * @param phone - Full phone number
 * @returns Masked phone number
 */
export function maskPhoneNumber(phone: string): string {
  if (phone.length < 4) return phone;
  const last4 = phone.slice(-4);
  const masked = '*'.repeat(phone.length - 4);
  return masked + last4;
}
