# Test Database Setup Guide

This document explains how the test environment is configured and how to run tests using the isolated test database.

## Overview

The test suite now uses a dedicated PostgreSQL database `erp-test` to ensure complete isolation from development and production data. This follows testing best practices by:

- ✅ **Isolation**: Tests run in a separate database
- ✅ **Clean State**: Fresh database state for test runs
- ✅ **Safety**: No risk of corrupting development data
- ✅ **Realism**: Uses actual database operations with constraints

## Configuration

### Environment Files

- `.env` - Development environment
- `.env.test` - Test environment (auto-loaded by tests)

### Test Database

- **Database Name**: `erp-test`
- **Connection**: Same credentials as `.env` but different database
- **Port**: 3001 (different from development port 3000)

## Scripts

### Available Test Scripts

```bash
# Setup test database
pnpm run test:setup

# Run all tests (automatically uses test database)
pnpm test:run

# Run tests in watch mode
pnpm test:watch

# Reset and run tests (fresh database + all tests)
pnpm test:reset

# Run UI for interactive testing
pnpm test:ui
```

### Database Scripts

```bash
# Run migrations on test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp-test" pnpm run db:migrate

# Seed test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp-test" pnpm run db:seed
```

## How It Works

### 1. Environment Loading

Tests automatically load `.env.test` before running:
```typescript
// tests/integration/test-setup.ts
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.test' });
```

### 2. Database Setup

The test setup script (`scripts/setup-test-db.ts`) handles:
- Creating `erp-test` database if it doesn't exist
- Running migrations on test database
- Seeding test data for realistic testing

### 3. Test Isolation

- Tests use port 3001 vs development port 3000
- All database operations use `erp-test` database
- Mock authentication provides consistent test context

## Running Tests

### First Time Setup

```bash
# 1. Ensure PostgreSQL is running
# 2. Setup test database
pnpm run test:setup

# 3. Run tests
pnpm test:run
```

### Daily Workflow

```bash
# Quick test run (uses existing test database)
pnpm test:run

# Full reset (fresh database + tests)
pnpm test:reset

# Development with watch mode
pnpm test:watch
```

## Test Data

The test database is seeded with realistic data including:
- Multiple tenants
- Sample products (raw materials, semi-finished, finished goods)
- Locations (central kitchen, outlets, warehouses)
- Suppliers and customers
- UOMs and price books

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Manually create test database
createdb erp-test

# Reset test database
dropdb erp-test && pnpm run test:setup
```

### Test Failures

```bash
# Completely reset test environment
pnpm test:reset

# Check test database contents
psql erp-test -c "\dt"

# View test logs
pnpm test:run --reporter=verbose
```

## Configuration Files

- `tests/integration/test-setup.ts` - Test environment setup
- `scripts/setup-test-db.ts` - Database initialization script
- `vitest.config.ts` - Test runner configuration
- `.env.test` - Test environment variables

## Best Practices

1. **Always use test database** - Never run tests against development database
2. **Reset regularly** - Use `pnpm test:reset` for clean test runs
3. **Check isolation** - Verify tests don't affect development data
4. **Use mock data** - Tests should create their own test data
5. **Clean teardown** - Tests should clean up after themselves

## Integration with CI/CD

For CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Setup Test Database
  run: |
    pnpm run test:setup
    pnpm test:run

# Or with reset
- name: Run Tests
  run: pnpm test:reset
```