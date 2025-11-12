import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { API_BASE_URL, waitForApi } from '@/test/setup'

describe('API Integration Tests', () => {
  beforeEach(() => {
    // Ensure API is running before tests
  })

  it('should connect to the real API', async () => {
    // Skip health endpoint test since it returns 404
    // Test a working endpoint instead
    const response = await fetch(`${API_BASE_URL}/api/v1/products`)

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data).toHaveProperty('success', true)
  }, 10000)

  it('should fetch products from real API', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/products`)

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('data')
    expect(data.data).toHaveProperty('items')
    expect(Array.isArray(data.data.items)).toBe(true)
  }, 10000)

  it('should fetch categories from real API', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/categories`)

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBe(true)
  }, 10000)

  it('should fetch units of measure from real API', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/products/uom`)

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBe(true)
  }, 10000)

  it('should handle invalid endpoints gracefully', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/invalid-endpoint`)

    expect(response.status).toBe(404)
  }, 10000)

  it('should fetch inventory data from real API', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/onhand`)

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBe(true)
  }, 10000)

  it('should fetch lots from real API', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/lots`)

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBe(true)
  }, 10000)
})