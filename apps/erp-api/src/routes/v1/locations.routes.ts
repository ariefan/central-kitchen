/**
 * Location Management API Routes (ADM-004)
 *
 * Manages physical locations including central kitchens, outlets,
 * and warehouses. Locations are used for inventory segregation and
 * user access control.
 *
 * @see FEATURES.md Section 12.4 - Location Management (ADM-004)
 * @module routes/v1/locations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/config/database.js';
import { locations } from '@/config/schema.js';
import {
  locationCreateSchema,
  locationUpdateSchema,
  locationQuerySchema,
  locationResponseSchema,
  locationsResponseSchema,
  generateNextLocationCode,
  type LocationCreate,
  type LocationUpdate,
  type LocationQuery,
} from '@contracts';
import { getCurrentUser } from '@/shared/middleware/auth.js';
import {
  createSuccessResponse,
  
  createNotFoundError,
  createBadRequestError,
} from '@/shared/utils/responses.js';

/**
 * Register location routes
 *
 * API Endpoints (from FEATURES.md ADM-004):
 * - POST /api/v1/locations - Create location
 * - GET /api/v1/locations - List locations
 * - GET /api/v1/locations/:id - Get location details
 * - PATCH /api/v1/locations/:id - Update location
 * - DELETE /api/v1/locations/:id - Deactivate location
 */
export function locationRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // CREATE LOCATION
  // ============================================================================

  /**
   * POST /api/v1/locations
   *
   * Create a new location
   *
   * Business Rules (from FEATURES.md ADM-004):
   * - Location code is unique per tenant
   * - Auto-generate code if not provided
   * - Inactive locations not available for transactions
   *
   * @see FEATURES.md ADM-004 - "Location setup with code and name"
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new location',
        tags: ['Locations', 'Admin'],
        body: locationCreateSchema,
        response: {
          201: locationResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: LocationCreate }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const createData = request.body;

      // Generate location code if not provided
      let locationCode = createData.code;
      if (!locationCode) {
        // Get last sequence for this location type
        // Only look at codes that follow our format: LOC-{PREFIX}-{SEQ}
        const lastLocation = await db
          .select({ code: locations.code })
          .from(locations)
          .where(
            and(
              eq(locations.tenantId, currentUser.tenantId),
              eq(locations.type, createData.locationType),
              ilike(locations.code, 'LOC-%')
            )
          )
          .orderBy(desc(locations.code))
          .limit(1);

        let lastSequence = 0;
        if (lastLocation.length > 0) {
          const parts = lastLocation[0].code.split('-');
          const seqStr = parts[parts.length - 1] || '0';
          const parsed = parseInt(seqStr, 10);
          if (!isNaN(parsed)) {
            lastSequence = parsed;
          }
        }

        locationCode = generateNextLocationCode(createData.locationType, lastSequence);
      }

      // Check if code already exists
      const existingLocation = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.tenantId, currentUser.tenantId),
            eq(locations.code, locationCode.toUpperCase())
          )
        )
        .limit(1);

      if (existingLocation.length > 0) {
        return createBadRequestError('Location code already exists', reply);
      }

      // Create location
      const newLocations = await db
        .insert(locations)
        .values({
          tenantId: currentUser.tenantId,
          code: locationCode.toUpperCase(),
          name: createData.name,
          type: createData.locationType,
          address: createData.address || null,
          city: createData.city || null,
          postalCode: createData.postalCode || null,
          country: createData.country || 'Singapore',
          phone: createData.phone || null,
          email: createData.email || null,
          isActive: createData.isActive ?? true,
          metadata: {
            latitude: createData.latitude,
            longitude: createData.longitude,
            managerName: createData.managerName,
            operatingHours: createData.operatingHours,
            notes: createData.notes,
          },
        })
        .returning();

      const location = newLocations[0];

      const responseData = {
        id: location.id,
        tenantId: location.tenantId,
        code: location.code,
        name: location.name,
        locationType: location.type,
        address: location.address,
        city: location.city,
        postalCode: location.postalCode,
        country: location.country || null,
        latitude: (location.metadata as any)?.latitude || null,
        longitude: (location.metadata as any)?.longitude || null,
        phone: location.phone,
        email: location.email,
        managerName: (location.metadata as any)?.managerName || null,
        operatingHours: (location.metadata as any)?.operatingHours || null,
        isActive: location.isActive,
        notes: (location.metadata as any)?.notes || null,
        totalUsers: 0,
        totalOnHandValue: '0.00',
        totalProducts: 0,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };

      return reply.status(201).send(createSuccessResponse(responseData, 'Location created successfully'));
    }
  );

  // ============================================================================
  // GET LOCATIONS LIST
  // ============================================================================

  /**
   * GET /api/v1/locations
   *
   * Get paginated list of locations with filters
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50)
   * - name: Filter by name (partial match)
   * - code: Filter by code (partial match)
   * - locationType: Filter by location type
   * - isActive: Filter by active status
   * - city: Filter by city
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get paginated list of locations',
        tags: ['Locations', 'Admin'],
        querystring: locationQuerySchema,
        response: {
          200: locationsResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: LocationQuery }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const query = request.query;

      const limit = query.limit || 50;
      const offset = query.offset || 0;

      // Build where conditions
      const conditions = [eq(locations.tenantId, currentUser.tenantId)];

      if (query.name) {
        conditions.push(ilike(locations.name, `%${query.name}%`));
      }

      if (query.code) {
        conditions.push(ilike(locations.code, `%${query.code}%`));
      }

      if (query.locationType) {
        conditions.push(eq(locations.type, query.locationType));
      }

      if (query.isActive !== undefined) {
        conditions.push(eq(locations.isActive, query.isActive));
      }

      if (query.city) {
        conditions.push(ilike(locations.city, `%${query.city}%`));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(locations)
        .where(and(...conditions));
      const count = countResult[0]?.count || 0;

      // Get locations
      const locationsList = await db
        .select()
        .from(locations)
        .where(and(...conditions))
        .orderBy(desc(locations.createdAt))
        .limit(limit)
        .offset(offset);

      const items = locationsList.map((location) => ({
        id: location.id,
        tenantId: location.tenantId,
        code: location.code,
        name: location.name,
        locationType: location.type,
        address: location.address,
        city: location.city,
        postalCode: location.postalCode,
        country: location.country || null,
        latitude: (location.metadata as any)?.latitude || null,
        longitude: (location.metadata as any)?.longitude || null,
        phone: location.phone,
        email: location.email,
        managerName: (location.metadata as any)?.managerName || null,
        isActive: location.isActive,
        totalUsers: 0,
        totalOnHandValue: '0.00',
        totalProducts: 0,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      }));

      return reply.send(
        createSuccessResponse({
          items,
          pagination: {
            total: count,
            limit,
            offset,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            hasNext: page < Math.ceil(count / limit),
            hasPrev: page > 1,
          },
        })
      );
    }
  );

  // ============================================================================
  // GET LOCATION DETAILS
  // ============================================================================

  /**
   * GET /api/v1/locations/:id
   *
   * Get detailed information about a specific location
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get location details',
        tags: ['Locations', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: locationResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params;

      const location = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!location.length) {
        return createNotFoundError('Location not found', reply);
      }

      const locationData = location[0];

      const responseData = {
        id: locationData.id,
        tenantId: locationData.tenantId,
        code: locationData.code,
        name: locationData.name,
        locationType: locationData.type,
        address: locationData.address,
        city: locationData.city,
        postalCode: locationData.postalCode,
        country: locationData.country || null,
        latitude: (locationData.metadata as any)?.latitude || null,
        longitude: (locationData.metadata as any)?.longitude || null,
        phone: locationData.phone,
        email: locationData.email,
        managerName: (locationData.metadata as any)?.managerName || null,
        operatingHours: (locationData.metadata as any)?.operatingHours || null,
        isActive: locationData.isActive,
        notes: (locationData.metadata as any)?.notes || null,
        totalUsers: 0,
        totalOnHandValue: '0.00',
        totalProducts: 0,
        createdAt: locationData.createdAt,
        updatedAt: locationData.updatedAt,
      };

      return reply.send(createSuccessResponse(responseData));
    }
  );

  // ============================================================================
  // UPDATE LOCATION
  // ============================================================================

  /**
   * PATCH /api/v1/locations/:id
   *
   * Update location information
   *
   * Business Rules:
   * - Cannot change location code once created
   * - All fields are optional (partial update)
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update location',
        tags: ['Locations', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: locationUpdateSchema,
        response: {
          200: locationResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: LocationUpdate;
      }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params;
      const updateData = request.body;

      // Check if location exists
      const existingLocation = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!existingLocation.length) {
        return createNotFoundError('Location not found', reply);
      }

      const currentLocation = existingLocation[0];
      const currentMetadata = (currentLocation.metadata as any) || {};

      // Prepare update object
      const updates: any = {};

      if (updateData.name !== undefined) {
        updates.name = updateData.name;
      }

      if (updateData.locationType !== undefined) {
        updates.type = updateData.locationType;
      }

      if (updateData.address !== undefined) {
        updates.address = updateData.address;
      }

      if (updateData.city !== undefined) {
        updates.city = updateData.city;
      }

      if (updateData.postalCode !== undefined) {
        updates.postalCode = updateData.postalCode;
      }

      if (updateData.country !== undefined) {
        updates.country = updateData.country;
      }

      if (updateData.phone !== undefined) {
        updates.phone = updateData.phone;
      }

      if (updateData.email !== undefined) {
        updates.email = updateData.email;
      }

      if (updateData.isActive !== undefined) {
        updates.isActive = updateData.isActive;
      }

      // Update metadata fields
      const newMetadata = { ...currentMetadata };
      if (updateData.latitude !== undefined) {
        newMetadata.latitude = updateData.latitude;
      }
      if (updateData.longitude !== undefined) {
        newMetadata.longitude = updateData.longitude;
      }
      if (updateData.managerName !== undefined) {
        newMetadata.managerName = updateData.managerName;
      }
      if (updateData.operatingHours !== undefined) {
        newMetadata.operatingHours = updateData.operatingHours;
      }
      if (updateData.notes !== undefined) {
        newMetadata.notes = updateData.notes;
      }

      if (Object.keys(updates).length > 0 || JSON.stringify(newMetadata) !== JSON.stringify(currentMetadata)) {
        updates.metadata = newMetadata;
        updates.updatedAt = new Date();
      }

      // Update location
      const updatedLocations = await db
        .update(locations)
        .set(updates)
        .where(eq(locations.id, id))
        .returning();

      const updatedLocation = updatedLocations[0];

      const responseData = {
        id: updatedLocation.id,
        tenantId: updatedLocation.tenantId,
        code: updatedLocation.code,
        name: updatedLocation.name,
        locationType: updatedLocation.type,
        address: updatedLocation.address,
        city: updatedLocation.city,
        postalCode: updatedLocation.postalCode,
        country: updatedLocation.country || null,
        latitude: (updatedLocation.metadata as any)?.latitude || null,
        longitude: (updatedLocation.metadata as any)?.longitude || null,
        phone: updatedLocation.phone,
        email: updatedLocation.email,
        managerName: (updatedLocation.metadata as any)?.managerName || null,
        operatingHours: (updatedLocation.metadata as any)?.operatingHours || null,
        isActive: updatedLocation.isActive,
        notes: (updatedLocation.metadata as any)?.notes || null,
        totalUsers: 0,
        totalOnHandValue: '0.00',
        totalProducts: 0,
        createdAt: updatedLocation.createdAt,
        updatedAt: updatedLocation.updatedAt,
      };

      return reply.send(createSuccessResponse(responseData, 'Location updated successfully'));
    }
  );

  // ============================================================================
  // DEACTIVATE LOCATION
  // ============================================================================

  /**
   * DELETE /api/v1/locations/:id
   *
   * Deactivate a location (soft delete)
   *
   * Business Rules (from FEATURES.md ADM-004):
   * - Inactive locations not available for transactions
   * - Location is not physically deleted
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Deactivate location',
        tags: ['Locations', 'Admin'],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            message: z.string(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const currentUser = getCurrentUser(request);
      const { id } = request.params;

      // Check if location exists
      const existingLocation = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.tenantId, currentUser.tenantId)
          )
        )
        .limit(1);

      if (!existingLocation.length) {
        return createNotFoundError('Location not found', reply);
      }

      // Deactivate location
      await db
        .update(locations)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(locations.id, id));

      return reply.send({
        success: true,
        message: 'Location deactivated successfully',
      });
    }
  );
}
