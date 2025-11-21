import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { users, tenants, locations } from '../../config/schema.js';
import { db } from '../../config/database.js';
import { eq } from 'drizzle-orm';
import { auth } from '../../lib/auth.js';

// Interface for user data (matches database schema)
interface User {
  id: string;
  authUserId: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: 'admin' | 'manager' | 'cashier' | 'staff' | null;
  locationId: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  username: string | null;
  displayUsername: string | null;
  emailVerified: boolean;
  image: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for tenant data (matches database schema)
interface Tenant {
  id: string;
  name: string;
  slug: string;
  orgId: string;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

type LocationRecord = typeof locations.$inferSelect | null;

type AuthBypassContext = {
  user: User;
  tenant: Tenant;
  location: LocationRecord;
};

let cachedBypassContext: AuthBypassContext | null = null;

const shouldBypassAuth = () => process.env.BYPASS_AUTH_FOR_TESTS === 'true';

const loadBypassContext = async (): Promise<AuthBypassContext> => {
  if (cachedBypassContext) {
    return cachedBypassContext;
  }

  const preferredUsername = process.env.TEST_USER_USERNAME;
  let userData:
    | (typeof users.$inferSelect)
    | undefined;

  if (preferredUsername) {
    [userData] = await db
      .select()
      .from(users)
      .where(eq(users.username, preferredUsername))
      .limit(1);
  } else {
    [userData] = await db.select().from(users).limit(1);
  }

  if (!userData) {
    const tenantId = randomUUID();
    const tenantResult = await db.insert(tenants).values({
      id: tenantId,
      orgId: randomUUID(),
      name: 'Test Tenant',
      slug: 'test-tenant',
      isActive: true,
    }).returning();

    const tenantInsert = tenantResult[0];
    if (!tenantInsert) {
      throw new Error('Failed to create test tenant');
    }

    const locationResult = await db.insert(locations).values({
      id: randomUUID(),
      tenantId: tenantInsert.id,
      code: 'TEST-LOC',
      name: 'Test Location',
      type: 'warehouse',
      country: 'Testland',
      isActive: true,
    }).returning();

    const userId = randomUUID();
    const userResult = await db.insert(users).values({
      id: userId,
      authUserId: userId,
      tenantId: tenantInsert.id,
      email: 'test@example.com',
      username: 'test-user',
      displayUsername: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      locationId: locationResult[0]?.id ?? null,
      isActive: true,
      emailVerified: true,
    }).returning();

    const newUser = userResult[0];
    if (!newUser) {
      throw new Error('Failed to create test user');
    }

    userData = newUser;
  }

  // At this point userData is guaranteed to be defined
  const tenantResult = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, userData.tenantId))
    .limit(1);

  const tenantData = tenantResult[0];
  if (!tenantData) {
    throw new Error('Auth bypass enabled but tenant for test user was not found.');
  }

  let locationData: LocationRecord = null;
  if (userData.locationId) {
    const locationResult = await db
      .select()
      .from(locations)
      .where(eq(locations.id, userData.locationId))
      .limit(1);
    locationData = locationResult[0] ?? null;
  }

  cachedBypassContext = {
    user: userData as User,
    tenant: tenantData as Tenant,
    location: locationData,
  };

  return cachedBypassContext;
};

const applyRequestContext = (request: FastifyRequest, context: AuthBypassContext) => {
  request.user = context.user;
  request.tenant = context.tenant;
  request.location = context.location;
  request.tenantId = context.tenant.id;
  request.userId = context.user.id;
};

/**
 * Better Auth middleware for Fastify
 * Verifies session and attaches user, tenant, and location to request
 */
export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (shouldBypassAuth()) {
    const context = await loadBypassContext();
    applyRequestContext(request, context);
    return;
  }

  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: request.headers as Record<string, string>,
    });

    if (!session?.session || !session?.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    // Fetch full user data from database with tenant and location
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userData) {
      return reply.status(401).send({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Fetch tenant
    const [tenantData] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, userData.tenantId))
      .limit(1);

    if (!tenantData) {
      return reply.status(403).send({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND',
      });
    }

    // Fetch location if assigned
    let locationData = null;
    if (userData.locationId) {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, userData.locationId))
        .limit(1);
      locationData = loc ?? null;
    }

    // Attach data to request
    request.user = userData as User;
    request.tenant = tenantData as Tenant;
    request.location = locationData;

    // Set tenant context for database operations
    request.tenantId = tenantData.id;
    request.userId = userData.id;

  } catch (error) {
    request.log.error({ err: error }, 'Auth middleware error');
    return reply.status(401).send({
      success: false,
      error: 'Invalid session',
      code: 'INVALID_SESSION',
    });
  }
};

/**
 * Optional middleware for public routes
 * Attaches user if authenticated, but doesn't block if not
 */
export const optionalAuthMiddleware = async (
  request: FastifyRequest,
  _reply: FastifyReply
) => {
  if (shouldBypassAuth()) {
    const context = await loadBypassContext();
    applyRequestContext(request, context);
    return;
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers as Record<string, string>,
    });

    if (session?.user) {
      // Fetch full user data
      const [userData] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (userData) {
        // Fetch tenant
        const [tenantData] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, userData.tenantId))
          .limit(1);

        // Fetch location if assigned
        let locationData = null;
        if (userData.locationId) {
          const [loc] = await db
            .select()
            .from(locations)
            .where(eq(locations.id, userData.locationId))
            .limit(1);
          locationData = loc ?? null;
        }

        request.user = userData as User;
        request.tenant = tenantData as Tenant;
        request.location = locationData;
        request.tenantId = tenantData?.id;
        request.userId = userData.id;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    request.log.debug({ err: error }, 'Optional auth failed');
  }
};

// Helper to get current user from request
export const getCurrentUser = (request: FastifyRequest): User => {
  if (!request.user) {
    throw new Error('User not found in request context');
  }
  return request.user;
};

// Helper to get current tenant from request
export const getCurrentTenant = (request: FastifyRequest): Tenant => {
  if (!request.tenant) {
    throw new Error('Tenant not found in request context');
  }
  return request.tenant;
};

// Helper to get tenant ID from request
export const getTenantId = (request: FastifyRequest): string => {
  if (!request.tenantId) {
    throw new Error('Tenant ID not found in request context');
  }
  return request.tenantId;
};

// Helper to get user ID from request
export const getUserId = (request: FastifyRequest): string => {
  if (!request.userId) {
    throw new Error('User ID not found in request context');
  }
  return request.userId;
};

export const buildRequestContext = (request: FastifyRequest): RequestContext => {
  if (!request.user || !request.tenant || !request.tenantId || !request.userId) {
    throw new Error('Request context is missing authentication data');
  }

  return {
    tenantId: request.tenantId,
    userId: request.userId,
    user: request.user,
    tenant: request.tenant,
    location: request.location,
  };
};

// Type augmentation for Fastify request
declare module 'fastify' {
  export interface FastifyRequest {
    user?: User;
    tenant?: Tenant;
    location?: {
      id: string;
      tenantId: string;
      code: string;
      name: string;
      type: string;
      address: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
      phone: string | null;
      email: string | null;
      isActive: boolean;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    tenantId?: string;
    userId?: string;
  }
}
export interface RequestContext {
  tenantId: string;
  userId: string;
  user: User;
  tenant: Tenant;
  location: FastifyRequest['location'] | null | undefined;
}
