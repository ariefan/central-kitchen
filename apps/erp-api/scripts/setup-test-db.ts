#!/usr/bin/env tsx

/**
 * Test Database Setup Script
 *
 * This script creates and sets up the test database for running integration tests.
 * It creates the 'erp-test' database and runs migrations and seeds.
 */

import { config as loadEnv } from 'dotenv';
import { execSync } from 'child_process';

// Load test environment variables
loadEnv({ path: '.env.test' });

async function setupTestDatabase() {
  try {
    console.log('🔧 Setting up test database...');

    const { DATABASE_URL } = process.env;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    // Parse DATABASE_URL to get connection details
    const dbUrl = new URL(DATABASE_URL);
    const dbName = dbUrl.pathname.substring(1); // Remove leading slash

    if (dbName !== 'erp-test') {
      throw new Error(`Expected database 'erp-test' but got '${dbName}'. Please check .env.test file.`);
    }

    // Connect to postgres database to create test database
    const postgresUrl = `${dbUrl.protocol}//${dbUrl.username}:${dbUrl.password}@${dbUrl.host}/postgres`;

    // Create database if it doesn't exist
    try {
      execSync(`psql "${postgresUrl}" -c "CREATE DATABASE \"erp-test\";"`, { stdio: 'pipe' });
      console.log('✅ Created erp-test database');
    } catch (error: any) {
      // Database might already exist, which is fine
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Database erp-test already exists');
      } else {
        console.error('❌ Failed to create test database:', error.message);
        throw error;
      }
    }

    // Run migrations on test database
    console.log('🔄 Running migrations on test database...');
    try {
      execSync('pnpm run db:migrate', {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL, NODE_ENV: 'test' }
      });
      console.log('✅ Migrations completed');
    } catch (error: any) {
      console.log('ℹ️ Migrations may already be up to date or failed:', error.message);
    }

    // Run seeds on test database
    console.log('🌱 Seeding test database...');
    try {
      execSync('pnpm run db:seed', {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL, NODE_ENV: 'test' }
      });
      console.log('✅ Test database seeded successfully');
    } catch (error: any) {
      console.error('❌ Failed to seed test database:', error.message);
      throw error;
    }

    console.log('✅ Test database setup complete');

  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupTestDatabase();
}

export { setupTestDatabase };