# Testing Guide

## Overview

This ERP API uses **Vitest** for testing framework with **Supertest** for HTTP assertions. The testing setup is designed to work seamlessly with Fastify.

## Testing Stack

- **Vitest** - Modern testing framework with TypeScript support
- **Supertest** - HTTP assertions for testing REST APIs
- **PostgreSQL** - Test database isolation
- **Drizzle ORM** - Database testing utilities

## Test Structure

```
tests/
├── integration/
│   ├── api.test.ts          # Main API integration tests
│   └── helpers/
│       └── test-setup.ts    # Test utilities and setup
└── unit/                    # Unit tests (when needed)
```

## Configuration Files

### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
```

### `package.json` scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui"
  }
}
```

## Fastify + Supertest Integration

### The Challenge
Fastify requires special handling with Supertest because:

1. **Server Lifecycle**: Fastify apps need to be started and stopped properly
2. **Async Nature**: Fastify's `build()` function is async
3. **Graceful Shutdown**: Tests must clean up connections

### Solution: Test-Friendly App Configuration

#### `src/app.ts`
```typescript
export async function build() {
  const server = Fastify({
    logger: false, // Disable logging for tests
    // Force Fastify to work with supertest
  }).withTypeProvider<ZodTypeProvider>();

  // Register all plugins and routes
  await server.register(apiV1Routes, { prefix: '/api/v1' });

  // DON'T start server here - let tests handle that
  return server;
}
```

#### `tests/integration/api.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { build } from '../../src/app';

describe('ERP API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    // Build the Fastify app
    app = await build();
  });

  afterAll(async () => {
    // Clean up - close the Fastify instance
    if (app && app.close) {
      await app.close();
    }
  });

  it('should test API endpoints', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});
```

## Key Testing Patterns

### 1. Test Setup and Teardown
```typescript
let app: any;

beforeAll(async () => {
  app = await build();
});

afterAll(async () => {
  if (app && app.close) {
    await app.close();
  }
});
```

### 2. API Endpoint Testing
```typescript
it('should create a resource', async () => {
  const newResource = {
    name: 'Test Resource',
    // ... other fields
  };

  const response = await request(app)
    .post('/api/v1/resources')
    .send(newResource)
    .expect(201);

  expect(response.body).toHaveProperty('success', true);
  expect(response.body.data).toHaveProperty('id');
  expect(response.body.data.name).toBe(newResource.name);
});
```

### 3. Error Handling Tests
```typescript
it('should return 404 for non-existent resources', async () => {
  await request(app)
    .get('/api/v1/resources/invalid-id')
    .expect(404);
});
```

### 4. Authentication Testing
```typescript
it('should require authentication', async () => {
  await request(app)
    .get('/api/v1/protected')
    .expect(401);
});
```

## Running Tests

### Development Mode
```bash
# Watch mode - runs tests on file changes
npm run test:watch

# UI mode - visual test interface
npm run test:ui
```

### CI/CD Mode
```bash
# Single run - exits after completion
npm run test:run

# With coverage (when configured)
npm run test:run -- --coverage
```

## Database Testing

### Test Database
- Uses the same PostgreSQL database as development
- Tests are designed to be idempotent
- Each test cleans up after itself

### Seeded Data
Tests rely on the seed data from `src/scripts/seed.ts`:
- Mock tenant and user data
- Sample locations and products
- Test authentication context

### Best Practices
1. **Isolation**: Each test should be independent
2. **Cleanup**: Remove created resources in tests
3. **Idempotency**: Tests should pass regardless of execution order
4. **Realistic Data**: Use realistic test data structures

## Mock Authentication

The system uses mock authentication for testing:
- Pre-configured tenant and user contexts
- Consistent mock data across tests
- Easy to extend for different user roles

```typescript
// Mock auth provides:
// - tenantId: "01234567-89ab-cdef-0123-456789abcdef"
// - userId: "fedcba98-7654-3210-fedc-ba9876543210"
// - role: "admin"
```

## Troubleshooting

### Common Issues

1. **"app.address is not a function"**
   - Ensure `app = await build()` not just `app = build()`
   - Don't call `app.listen()` in tests

2. **Database connection issues**
   - Check database is running
   - Verify connection string in test environment
   - Run `npm run db:seed` to populate test data

3. **Timeout errors**
   - Increase `testTimeout` in vitest.config.ts
   - Check for hanging async operations

4. **Import errors**
   - Verify alias configuration in vitest.config.ts
   - Check TypeScript paths in tsconfig.json

### Debug Mode
```bash
# Run tests with debugging
npm run test:run -- --no-coverage --reporter=verbose
```

## Coverage Reports

When coverage is configured:
```bash
# Generate coverage report
npm run test:run -- --coverage

# View coverage in browser
open coverage/index.html
```

## Next Steps

1. **Add unit tests** for business logic
2. **Performance tests** for critical endpoints
3. **Load testing** with tools like Artillery
4. **Contract testing** for API contracts
5. **End-to-end tests** for complete user flows

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Fastify Testing Guide](https://fastify.dev/docs/latest/Guides/Testing/)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)

---

*Last updated: November 5, 2025*