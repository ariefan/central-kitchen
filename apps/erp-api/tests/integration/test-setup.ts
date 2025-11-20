import { config as loadEnv } from 'dotenv';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';

// Load test environment variables with override FIRST
loadEnv({ path: '.env', override: false });
loadEnv({ path: '.env.test', override: true });

// Force test database URL for all tests
process.env.DATABASE_URL = 'postgresql://postgres@localhost:5432/erp_test'; // Use test database
// Use real authentication in tests - no bypass
process.env.BYPASS_AUTH_FOR_TESTS = 'false';

// Import app and database AFTER setting environment variables
let build;
let db;
let schema;
try {
  build = (await import('../../src/app')).build;
  db = (await import('../../src/config/database.js')).db;
  schema = await import('../../src/config/schema.js');
} catch (error) {
  // Fallback for different import patterns
  build = (await import('../../src/app.js')).build;
  db = (await import('../../src/config/database.js')).db;
  schema = await import('../../src/config/schema.js');
}

let app: any;
let testDataCreated = false;
let authCookies: string | null = null;

export async function getTestApp() {
  if (!app) {
    console.log('Building test app with DATABASE_URL:', process.env.DATABASE_URL);
    app = await build();
    await app.ready();
    await createTestData();
  }
  return app;
}

/**
 * Login and get authentication cookies for testing
 */
export async function loginTestUser(username: string = 'admin', password: string = 'admin123') {
  if (!app) {
    app = await getTestApp();
  }

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/username',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: {
      username,
      password
    }
  });

  if (response.statusCode !== 200) {
    throw new Error(`Login failed: ${response.statusCode} - ${response.body}`);
  }

  // Extract cookies from response
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const cookieStrings = cookies.map((c: string) => c.split(';')[0]);
    authCookies = cookieStrings.join('; ');
    return authCookies;
  }

  throw new Error('No authentication cookies received from login');
}

/**
 * Get cached auth cookies (login if not already done)
 */
export async function getAuthCookies() {
  if (!authCookies) {
    authCookies = await loginTestUser();
  }
  return authCookies;
}

/**
 * Clear cached auth cookies (force re-login)
 */
export function clearAuthCookies() {
  authCookies = null;
}

export async function createTestData() {
  if (testDataCreated) {
    return;
  }

  try {
    // Import bcryptjs for password hashing
    const bcrypt = await import('bcryptjs');

    // Check if test tenant exists
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.name, 'Test Tenant')
    });

    let tenant;
    if (existingTenant) {
      tenant = existingTenant;
    } else {
      // Create test tenant
      [tenant] = await db.insert(schema.tenants).values({
        id: randomUUID(),
        name: 'Test Tenant',
        slug: 'test-tenant',
        orgId: randomUUID(),
        isActive: true,
      }).returning();
    }

    // Check if test location exists
    const existingLocation = await db.query.locations.findFirst({
      where: eq(schema.locations.code, 'TEST-LOC')
    });

    let location;
    if (existingLocation) {
      location = existingLocation;
    } else {
      // Create test location
      [location] = await db.insert(schema.locations).values({
        id: randomUUID(),
        tenantId: tenant.id,
        code: 'TEST-LOC',
        name: 'Test Location',
        type: 'warehouse',
        isActive: true,
      }).returning();
    }

    // Check if admin user exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(schema.users.username, 'admin')
    });

    let adminUser;
    if (existingAdmin) {
      adminUser = existingAdmin;
    } else {
      // Create admin user
      const adminUserId = randomUUID();
      const adminPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      [adminUser] = await db.insert(schema.users).values({
        id: adminUserId,
        authUserId: adminUserId,
        tenantId: tenant.id,
        email: 'admin@test.com',
        username: 'admin',
        displayUsername: 'Admin',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        locationId: location.id,
        isActive: true,
        emailVerified: true,
      }).returning();

      // Create Better Auth account for admin
      await db.insert(schema.accounts).values({
        id: randomUUID(),
        userId: adminUser.id,
        accountId: adminUser.id,
        providerId: 'credential',
        password: hashedPassword,
      });
    }

    await ensureCoreFixtures(tenant.id);

    console.log('✅ Test data created: admin user with username="admin", password="admin123" plus domain fixtures');
    testDataCreated = true;
  } catch (error) {
    console.error('Failed to create test data:', error);
    throw error;
  }
}

export async function closeTestApp() {
  if (app) {
    await app.close();
    app = null;
  }
  testDataCreated = false;
  authCookies = null;
}

async function ensureCoreFixtures(tenantId: string) {
  const pcsUom = await ensureUom('PCS', 'Pieces', 'pc', 'count');
  const kgUom = await ensureUom('KG', 'Kilogram', 'kg', 'weight');

  await ensureProduct(tenantId, {
    sku: 'TEST-RM-001',
    name: 'Test Raw Material',
    kind: 'raw_material',
    baseUomId: kgUom.id,
    standardCost: '50000',
    defaultPrice: '60000',
  });

  await ensureProduct(tenantId, {
    sku: 'TEST-FG-001',
    name: 'Test Finished Good',
    kind: 'finished_good',
    baseUomId: pcsUom.id,
    standardCost: '75000',
    defaultPrice: '100000',
  });

  await ensureSupplier(tenantId);
  const customer = await ensureCustomer(tenantId);
  await ensureCustomerAddress(customer.id);
}

async function ensureUom(code: string, name: string, symbol: string, kind: string) {
  const existing = await db.query.uoms.findFirst({
    where: eq(schema.uoms.code, code),
  });
  if (existing) {
    return existing;
  }
  const [created] = await db.insert(schema.uoms).values({
    id: randomUUID(),
    code,
    name,
    symbol,
    kind,
  }).returning();
  return created;
}

type ProductSeedInput = {
  sku: string;
  name: string;
  kind: string;
  baseUomId: string;
  standardCost?: string;
  defaultPrice?: string;
};

async function ensureProduct(tenantId: string, input: ProductSeedInput) {
  const existing = await db.query.products.findFirst({
    where: and(
      eq(schema.products.tenantId, tenantId),
      eq(schema.products.sku, input.sku),
    ),
  });
  if (existing) {
    return existing;
  }
  const [product] = await db.insert(schema.products).values({
    id: randomUUID(),
    tenantId,
    sku: input.sku,
    name: input.name,
    kind: input.kind,
    baseUomId: input.baseUomId,
    taxCategory: 'GENERAL',
    standardCost: input.standardCost ?? '0',
    defaultPrice: input.defaultPrice ?? '0',
    isPerishable: false,
    isActive: true,
  }).returning();
  return product;
}

async function ensureSupplier(tenantId: string) {
  const existing = await db.query.suppliers.findFirst({
    where: and(
      eq(schema.suppliers.tenantId, tenantId),
      eq(schema.suppliers.code, 'SUP-TEST-001'),
    ),
  });
  if (existing) {
    return existing;
  }
  const [supplier] = await db.insert(schema.suppliers).values({
    id: randomUUID(),
    tenantId,
    code: 'SUP-TEST-001',
    name: 'Test Supplier',
    contactPerson: 'Test Contact',
    email: 'supplier@test.com',
    phone: '+62000000000',
    paymentTerms: 30,
    creditLimit: '10000000',
    isActive: true,
  }).returning();
  return supplier;
}

async function ensureCustomer(tenantId: string) {
  const existing = await db.query.customers.findFirst({
    where: and(
      eq(schema.customers.tenantId, tenantId),
      eq(schema.customers.code, 'CUST-TEST-001'),
    ),
  });
  if (existing) {
    return existing;
  }
  const [customer] = await db.insert(schema.customers).values({
    id: randomUUID(),
    tenantId,
    code: 'CUST-TEST-001',
    name: 'Test Customer',
    email: 'customer@test.com',
    phone: '+62000000001',
    city: 'Test City',
    type: 'external',
    isActive: true,
  }).returning();
  return customer;
}

async function ensureCustomerAddress(customerId: string) {
  const existing = await db.query.addresses.findFirst({
    where: eq(schema.addresses.customerId, customerId),
  });
  if (existing) {
    return existing;
  }
  const [address] = await db.insert(schema.addresses).values({
    id: randomUUID(),
    customerId,
    label: 'HQ',
    line1: '123 Test Street',
    city: 'Test City',
    postalCode: '12345',
    country: 'Testland',
    isDefault: true,
  }).returning();
  return address;
}
