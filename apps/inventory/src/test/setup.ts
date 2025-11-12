import '@testing-library/jest-dom'
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Global test configuration
beforeAll(() => {
  // Set up global test environment
  console.log('🧪 Starting integration tests against real API')
})

afterAll(() => {
  console.log('✅ Integration tests completed')
})

beforeEach(async () => {
  // Clean up any test-specific setup
})

afterEach(() => {
  // Clean up after each test
})

// Custom test utilities
export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000'

// Helper function to create test data with unique identifiers
export const createTestId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// Helper to wait for API responses
export const waitForApi = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))

// Test data factories
export const createTestProduct = (overrides: Partial<any> = {}) => ({
  name: createTestId('Test Product'),
  sku: createTestId('SKU'),
  description: 'Test product description',
  baseUomId: 'EA',
  standardCost: 10.99,
  isPerishable: false,
  isActive: true,
  kind: 'finished_good',
  ...overrides,
})

export const createTestLot = (overrides: Partial<any> = {}) => ({
  lotNumber: createTestId('LOT'),
  productId: 'test-product-id',
  locationId: 'test-location-id',
  qtyBase: 100,
  costPerUnit: 5.50,
  receivedDate: new Date().toISOString(),
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  status: 'active',
  ...overrides,
})

// API helper functions for cleanup
export const cleanupTestData = async (ids: { products?: string[], lots?: string[] }) => {
  const errors: string[] = []

  // Cleanup products
  if (ids.products?.length) {
    for (const productId of ids.products) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          errors.push(`Failed to delete product ${productId}: ${response.statusText}`)
        }
      } catch (error) {
        errors.push(`Error deleting product ${productId}: ${error}`)
      }
    }
  }

  // Cleanup lots
  if (ids.lots?.length) {
    for (const lotId of ids.lots) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/inventory/lots/${lotId}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          errors.push(`Failed to delete lot ${lotId}: ${response.statusText}`)
        }
      } catch (error) {
        errors.push(`Error deleting lot ${lotId}: ${error}`)
      }
    }
  }

  if (errors.length > 0) {
    console.warn('Cleanup warnings:', errors)
  }
}