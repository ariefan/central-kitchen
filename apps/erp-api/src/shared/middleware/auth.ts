import { FastifyRequest, FastifyReply } from 'fastify';
import { users, tenants, locations } from '../../config/schema.js';
import { db } from '../../config/database.js';
import { eq, and } from 'drizzle-orm';

// Interface for mock user data (matches database schema)
interface MockUser {
  id: string;
  authUserId: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: 'admin' | 'manager' | 'cashier' | 'staff';
  locationId: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for mock tenant data (matches database schema)
interface MockTenant {
  id: string;
  name: string;
  slug: string;
  orgId: string;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Mock auth middleware that uses real database data
export const mockAuthMiddleware = async (request: FastifyRequest, _reply: FastifyReply) => {
  try {
    // Get the first tenant from database
    const [tenant] = await db.select().from(tenants).where(eq(tenants.isActive, true)).limit(1);

    if (!tenant) {
      throw new Error('No active tenant found in database. Please run seed script first.');
    }

    // Get the first admin user for this tenant
    const [user] = await db.select().from(users)
      .where(and(
        eq(users.tenantId, tenant.id),
        eq(users.role, 'admin'),
        eq(users.isActive, true)
      ))
      .limit(1);

    if (!user) {
      throw new Error('No active admin user found in database. Please run seed script first.');
    }

    // Get user's location if assigned
    let location = null;
    if (user.locationId) {
      const [locationData] = await db.select().from(locations)
        .where(eq(locations.id, user.locationId))
        .limit(1);
      location = locationData ?? null;
    }

    // Attach data to request
    request.user = user as MockUser;
    request.tenant = tenant as MockTenant;
    request.location = location;

    // Set tenant context for database operations
    request.tenantId = tenant.id;
    request.userId = user.id;

  } catch (error) {
    console.error('Mock auth middleware error:', error);
    // For development, continue with fallback mock data
    const MOCK_USER = {
      id: '00000000-0000-0000-0000-000000000001',
      authUserId: 'mock_auth_001',
      tenantId: '00000000-0000-0000-0000-000000000001',
      email: 'admin@cafe.com',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+62812345678',
      role: 'admin' as const,
      locationId: null,
      isActive: true,
      lastLogin: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const MOCK_TENANT = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Mock Tenant',
      slug: 'mock-tenant',
      orgId: 'mock_org_001',
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    request.user = MOCK_USER;
    request.tenant = MOCK_TENANT;
    request.location = null;
    request.tenantId = MOCK_TENANT.id;
    request.userId = MOCK_USER.id;
  }
};

// Helper to get current user from request
export const getCurrentUser = (request: FastifyRequest): MockUser => {
  if (!request.user) {
    throw new Error('User not found in request context');
  }
  return request.user;
};

// Helper to get current tenant from request
export const getCurrentTenant = (request: FastifyRequest): MockTenant => {
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

// Type augmentation for Fastify request
declare module 'fastify' {
  export interface FastifyRequest {
    user?: MockUser;
    tenant?: MockTenant;
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