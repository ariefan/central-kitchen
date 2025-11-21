# Integration Testing Guide

## Overview

The ERP API uses **real PostgreSQL database** for integration tests to ensure tests match production behavior. The test framework automatically handles database setup, seeding, and cleanup.

---

## Quick Answer to Your Questions

### Q: Does it use a real database?
**Yes**, integration tests use a **real PostgreSQL database**. This ensures:
- Tests match production behavior exactly
- Full validation of SQL queries, constraints, and migrations
- Real transaction handling and rollback testing

### Q: Is the database cleaned and seeded before testing?
**Yes**, the test framework automatically:
1. **Before all tests** (`beforeAll`):
   - Runs all Drizzle migrations
   - Seeds essential test data (tenant, user, location, UOMs)
2. **Before each test** (`beforeEach`):
   - Cleans all transactional data (orders, receipts, transfers, etc.)
   - Keeps master data (tenant, user, location, UOMs) intact
3. **After all tests** (`afterAll`):
   - Closes database connections
   - Shuts down Fastify app

This ensures **each test starts with a clean, predictable state**.

---

## Setup Options

You have **two options** for running integration tests:

### Option 1: Local PostgreSQL (Recommended for Development)

#### Step 1: Install PostgreSQL
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql

# Windows
# Download from: https://www.postgresql.org/download/windows/
```

#### Step 2: Create Test Database
```bash
# Create the test database
createdb erp-test

# Or using psql
psql -U postgres
CREATE DATABASE "erp-test";
\q
```

#### Step 3: Configure Environment
```bash
# Copy the test environment template
cp .env.test.example .env.test

# Edit .env.test with your database credentials
# Example content:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp-test"
JWT_SECRET="test-jwt-secret-min-32-chars-for-testing"
BETTER_AUTH_SECRET="test-better-auth-secret-min-32-chars"
NODE_ENV="test"
BYPASS_AUTH_FOR_TESTS="true"
```

#### Step 4: Setup Test Database
```bash
# This will run migrations and seed test data
pnpm test:setup
```

#### Step 5: Run Tests
```bash
# Run all integration tests
pnpm test:run

# Or run a specific test file
pnpm vitest run tests/integration/locations.test.ts

# Watch mode (re-run on file changes)
pnpm test:watch

# Interactive UI mode
pnpm test:ui
```

---

### Option 2: Neon PostgreSQL (Recommended for CI/CD)

[Neon](https://neon.tech) provides free PostgreSQL databases in the cloud.

#### Step 1: Create Neon Account
1. Go to https://neon.tech
2. Sign up for free account
3. Create a new project

#### Step 2: Create Test Database
1. In Neon console, create a new database called `erp-test`
2. Copy the connection string

#### Step 3: Configure Environment
```bash
# Copy the test environment template
cp .env.test.example .env.test

# Edit .env.test with your Neon connection string
DATABASE_URL="postgresql://user:password@ep-xyz-abc.region.aws.neon.tech/erp-test?sslmode=require"
JWT_SECRET="test-jwt-secret-min-32-chars-for-testing"
BETTER_AUTH_SECRET="test-better-auth-secret-min-32-chars"
NODE_ENV="test"
BYPASS_AUTH_FOR_TESTS="true"
```

#### Step 4: Run Tests
```bash
# Setup and run tests
pnpm test:reset

# Or setup once, then run tests multiple times
pnpm test:setup  # Only needed once
pnpm test:run    # Run as many times as needed
```

---

## How the Test Framework Works

### Test Lifecycle

```typescript
beforeAll(async () => {
  // 1. Connect to test database
  pool = new Pool({ connectionString: TEST_DB_URL });

  // 2. Run all Drizzle migrations (creates schema, tables, indexes)
  await migrate(db, { migrationsFolder: './drizzle' });

  // 3. Seed essential test data
  await seedTestData(); // Creates test tenant, user, location, UOMs

  // 4. Build and start Fastify app
  app = await build();
  await app.ready();
});

beforeEach(async () => {
  // Clean transactional data before EACH test
  // This ensures each test starts fresh
  await cleanTransactionalData();
});

afterAll(async () => {
  // Cleanup after all tests complete
  await app.close();
  await pool.end();
});
```

### What Gets Seeded (Once)

These are created **once** before all tests and **kept** between tests:

```typescript
// Test Tenant
{
  id: '00000000-0000-0000-0000-000000000001',
  orgId: 'test-org',
  name: 'Test Organization',
  slug: 'test-org'
}

// Test User
{
  id: '00000000-0000-0000-0000-000000000002',
  tenantId: testTenantId,
  email: 'test@example.com',
  role: 'admin'
}

// Test Location
{
  id: '00000000-0000-0000-0000-000000000003',
  tenantId: testTenantId,
  code: 'LOC-001',
  name: 'Test Location',
  type: 'central_kitchen'
}

// Base UOMs (Each, Kilogram, Liter)
```

### What Gets Cleaned (Before Each Test)

These are **deleted** before each test to ensure clean state:

- Orders & Order Items
- Purchase Orders & PO Items
- Goods Receipts & GR Items
- Stock Transfers & Transfer Items
- Requisitions & Requisition Items
- Stock Adjustments & Adjustment Items
- Stock Counts & Count Lines
- Production Orders
- Inventory Lots
- Stock Ledger entries
- Cost Layers & Consumptions
- Products (created during tests)
- Suppliers (created during tests)
- Locations (except the test location)

**Why this approach?**
- Master data (tenant, user, location) stays constant → faster tests
- Transactional data cleaned → isolated tests, no interference
- Real database → production-like behavior

---

## Running Tests

### All Integration Tests
```bash
# Run all tests once
pnpm test:run

# Watch mode (re-runs on file changes)
pnpm test:watch

# Interactive UI
pnpm test:ui
```

### Specific Test File
```bash
# Run locations tests
pnpm vitest run tests/integration/locations.test.ts

# With environment variables inline
DATABASE_URL="postgresql://localhost/erp-test" \
JWT_SECRET="test-jwt-secret-min-32-chars-for-testing" \
BETTER_AUTH_SECRET="test-better-auth-secret-min-32-chars" \
NODE_ENV="test" \
BYPASS_AUTH_FOR_TESTS="true" \
pnpm vitest run tests/integration/locations.test.ts
```

### Reset and Re-run
```bash
# Drop database, recreate, migrate, seed, and run tests
pnpm test:reset
```

---

## Test Output

Tests generate markdown reports in `docs/`:

```bash
docs/
├── test-report.md              # Latest test results
├── test-report-detailed.json   # JSON format for CI/CD
└── test-report-*.md           # Timestamped reports (gitignored)
```

---

## Common Issues & Solutions

### Issue: "connect ECONNREFUSED 127.0.0.1:5432"
**Solution**: PostgreSQL is not running or wrong connection string
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux
```

### Issue: "database erp-test does not exist"
**Solution**: Create the test database
```bash
createdb erp-test
# Or run setup script
pnpm test:setup
```

### Issue: "JWT secret must be at least 32 characters"
**Solution**: Update `.env.test` with longer secrets
```bash
JWT_SECRET="test-jwt-secret-min-32-chars-for-testing"
BETTER_AUTH_SECRET="test-better-auth-secret-min-32-chars"
```

### Issue: Tests fail with "relation does not exist"
**Solution**: Run migrations
```bash
pnpm test:setup  # Runs migrations automatically
# Or manually
pnpm db:migrate
```

### Issue: Tests interfere with each other
**Solution**: This shouldn't happen! Each test should start clean.
- Check that `beforeEach` cleanup is running
- Verify test is using the test tenant ID
- Make sure you're not running tests in parallel without isolation

---

## Best Practices

### 1. Use Test Helpers
```typescript
import { getApp, createTestRequest, testTenantId } from './test-setup';

const app = getApp();
const response = await app.inject(createTestRequest('POST', '/api/v1/locations', {
  code: 'WH-001',
  name: 'Warehouse 1',
  type: 'warehouse'
}));
```

### 2. Clean Up Test Data
Tests automatically clean up, but if you create non-standard data:
```typescript
afterEach(async () => {
  // Clean up custom test data if needed
  await pool.query('DELETE FROM custom_table WHERE ...');
});
```

### 3. Use Fixed UUIDs for Assertions
```typescript
import { testTenantId, testUserId, testLocationId } from './test-setup';

expect(body.data.tenantId).toBe(testTenantId);
```

### 4. Test Isolation
Each test should be independent:
```typescript
// ✅ Good - creates its own data
test('should create location', async () => {
  const response = await app.inject(createTestRequest('POST', '/api/v1/locations', {
    code: 'NEW-LOC',
    name: 'New Location'
  }));
  expect(response.statusCode).toBe(201);
});

// ❌ Bad - depends on data from another test
let sharedLocationId;
test('create location', async () => {
  const response = await app.inject(...);
  sharedLocationId = response.body.data.id; // Don't do this!
});
test('update location', async () => {
  await app.inject(`/api/v1/locations/${sharedLocationId}`, ...); // Fragile!
});
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp-test
      JWT_SECRET: test-jwt-secret-min-32-chars-for-testing-ci-cd
      BETTER_AUTH_SECRET: test-better-auth-secret-min-32-chars-ci-cd
      NODE_ENV: test
      BYPASS_AUTH_FOR_TESTS: true

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Setup test database
        run: pnpm test:setup
        working-directory: apps/erp-api

      - name: Run integration tests
        run: pnpm test:run
        working-directory: apps/erp-api

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: apps/erp-api/docs/test-report*.md
```

---

## Writing New Integration Tests

### Example: Testing a New Feature

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { getApp, createTestRequest, testTenantId } from '../test-setup';

describe('Products API', () => {
  const app = getApp();

  // Data is automatically cleaned before each test by test-setup.ts

  test('should create a new product', async () => {
    const response = await app.inject(createTestRequest('POST', '/api/v1/products', {
      name: 'Test Product',
      sku: 'TEST-001',
      kind: 'raw_material',
      baseUomId: '00000000-0000-0000-0000-000000000010' // 'Each' UOM
    }));

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Test Product');
    expect(body.data.tenantId).toBe(testTenantId);
  });

  test('should list products', async () => {
    // Create test data
    await app.inject(createTestRequest('POST', '/api/v1/products', {
      name: 'Product 1',
      sku: 'TEST-001',
      kind: 'raw_material'
    }));

    // Test listing
    const response = await app.inject(createTestRequest('GET', '/api/v1/products'));

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
```

---

## Summary

✅ **Real PostgreSQL database** used for integration tests
✅ **Automatic migration** runs before tests
✅ **Automatic seeding** of tenant, user, location, UOMs
✅ **Automatic cleanup** before each test
✅ **Isolated tests** - each test starts fresh
✅ **Production-like** testing environment

**To get started:**
```bash
# 1. Create test database
createdb erp-test

# 2. Copy environment config
cp .env.test.example .env.test

# 3. Setup and run tests
pnpm test:reset
```

Happy testing! 🚀
