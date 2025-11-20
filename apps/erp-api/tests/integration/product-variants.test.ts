/**
 * Product Variants Integration Tests (ADM-002)
 *
 * Tests for Product Variant CRUD operations
 *
 * @see FEATURES.md Section 12.2 - Product Variants (ADM-002)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getTestApp,
  closeTestApp,
  createTestData,
  loginTestUser,
} from './test-setup';
import { db } from '@/config/database';
import { productVariants, products, uoms } from '@/config/schema';
import { eq, and, like } from 'drizzle-orm';

describe('Product Variants (ADM-002)', () => {
  let app: any;
  let authToken: string;
  let testProductId: string;
  let createdVariantId: string;

  beforeAll(async () => {
    app = await getTestApp();
    await createTestData();
    authToken = await loginTestUser();

    // Get a real UOM ID from the database (use KG like products test does)
    const kgUom = await db.query.uoms.findFirst({
      where: eq(uoms.code, 'KG'),
    });

    if (!kgUom) {
      throw new Error('KG UOM not found in database. Seed data may be missing.');
    }

    const baseUomId = kgUom.id;

    // Create a test product for variants (with unique SKU)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { cookie: authToken },
      payload: {
        sku: `VARIANT-TEST-${Date.now()}`, // Unique SKU
        name: 'Test Product for Variants',
        productKind: 'finished_good',
        baseUomId: baseUomId,
        standardCost: '8.00',
        defaultPrice: '10.00',
        isActive: true,
      },
    });

    if (res.statusCode !== 201) {
      console.error('Product creation failed:', res.statusCode, res.json());
      throw new Error(`Failed to create test product: ${res.statusCode} - ${JSON.stringify(res.json())}`);
    }

    testProductId = res.json().data.id;

    // Clean up test variants from previous test runs
    try {
      await db.delete(productVariants).where(
        like(productVariants.variantName, 'Test %')
      );
    } catch (error) {
      // Ignore errors
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('POST /api/v1/products/:productId/variants - Create Variant', () => {
    it('should create a new variant with all fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Large',
          priceDifferential: '2.50',
          barcode: 'TESTLARGE123',
          sku: 'VARIANT-TEST-001-L',
          isActive: true,
          displayOrder: 1,
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.productId).toBe(testProductId);
      expect(data.data.variantName).toBe('Test Large');
      expect(data.data.priceDifferential).toBe('2.50');
      expect(data.data.barcode).toBe('TESTLARGE123');
      expect(data.data.sku).toBe('VARIANT-TEST-001-L');
      expect(data.data.isActive).toBe(true);
      expect(data.data.displayOrder).toBe(1);
      expect(data.data).toHaveProperty('createdAt');
      expect(data.data).toHaveProperty('updatedAt');

      createdVariantId = data.data.id;
    });

    it('should create variant with minimal fields (defaults applied)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Medium',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.data.variantName).toBe('Test Medium');
      expect(data.data.priceDifferential).toBe('0'); // Default value
      expect(data.data.isActive).toBe(true); // Default value
      expect(data.data.displayOrder).toBe(0); // Default value
      expect(data.data.barcode).toBe(null);
      expect(data.data.sku).toBe(null);
    });

    it('should reject negative price differential (schema limitation)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Small',
          priceDifferential: '-1.50', // Negative not allowed by moneyAmountSchema
        },
      });

      // NOTE: Business requirement mentions discounts, but moneyAmountSchema
      // doesn't support negative values. Future enhancement needed.
      expect(res.statusCode).toBe(400);
    });

    it('should fail to create variant with duplicate name for same product', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Large', // Duplicate
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('already exists');
    });

    it('should fail to create variant for non-existent product', async () => {
      const fakeProductId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${fakeProductId}/variants`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Extra Large',
        },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Product not found');
    });

    it('should reject invalid product ID format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products/invalid-uuid/variants',
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Extra Large',
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/products/:productId/variants - List Variants', () => {
    it('should list all variants for a product', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('items');
      expect(data.data).toHaveProperty('pagination');
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.items.length).toBeGreaterThanOrEqual(2); // Created 2 variants above (Large, Medium)
      expect(data.data.pagination).toHaveProperty('total');
      expect(data.data.pagination).toHaveProperty('limit');
      expect(data.data.pagination).toHaveProperty('offset');
    });

    it('should filter variants by active status', async () => {
      // First, create an inactive variant
      await app.inject({
        method: 'POST',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Inactive',
          isActive: false,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
        query: {
          isActive: 'true',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.items.every((v: any) => v.isActive === true)).toBe(true);
    });

    it('should return empty list for product with no variants', async () => {
      // Get a real UOM ID from the database
      const kgUom = await db.query.uoms.findFirst({
        where: eq(uoms.code, 'KG'),
      });
      const baseUomId = kgUom!.id;

      // Create a product without variants
      const productRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          sku: `NO-VARIANTS-${Date.now()}`,
          name: 'Product Without Variants',
          productKind: 'raw_material',
          baseUomId: baseUomId,
          standardCost: '5.00',
          defaultPrice: '7.00',
          isActive: true,
        },
      });

      const newProductId = productRes.json().data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${newProductId}/variants`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.items.length).toBe(0);
      expect(data.data.pagination.total).toBe(0);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeProductId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${fakeProductId}/variants`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/product-variants/:id - Get Variant by ID', () => {
    it('should get variant details by ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/product-variants/${createdVariantId}`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(createdVariantId);
      expect(data.data.variantName).toBe('Test Large');
      expect(data.data.priceDifferential).toBe('2.50');
    });

    it('should return 404 for non-existent variant ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/product-variants/${fakeId}`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(404);
      const data = res.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/product-variants/invalid-uuid',
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/product-variants/:id - Update Variant', () => {
    it('should update variant name', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/product-variants/${createdVariantId}`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Extra Large',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.variantName).toBe('Test Extra Large');
    });

    it('should update price differential', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/product-variants/${createdVariantId}`,
        headers: { cookie: authToken },
        payload: {
          priceDifferential: '3.00',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.priceDifferential).toBe('3.00');
    });

    it('should update multiple fields at once', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/product-variants/${createdVariantId}`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test XL Updated',
          priceDifferential: '4.50',
          barcode: 'UPDATEDXL456',
          sku: 'VARIANT-TEST-001-XL',
          displayOrder: 5,
          isActive: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data.variantName).toBe('Test XL Updated');
      expect(data.data.priceDifferential).toBe('4.50');
      expect(data.data.barcode).toBe('UPDATEDXL456');
      expect(data.data.sku).toBe('VARIANT-TEST-001-XL');
      expect(data.data.displayOrder).toBe(5);
      expect(data.data.isActive).toBe(false);
    });

    it('should fail to update variant name to duplicate', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/product-variants/${createdVariantId}`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Medium', // Duplicate
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('already exists');
    });

    it('should return 404 for updating non-existent variant', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/product-variants/${fakeId}`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Should Fail',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/product-variants/:id - Delete Variant', () => {
    let deleteTestVariantId: string;

    beforeAll(async () => {
      // Create a variant specifically for delete testing
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Delete Me',
        },
      });
      deleteTestVariantId = res.json().data.id;
    });

    it('should delete variant', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/product-variants/${deleteTestVariantId}`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);

      // Verify variant is actually deleted (not just soft delete)
      const checkRes = await app.inject({
        method: 'GET',
        url: `/api/v1/product-variants/${deleteTestVariantId}`,
        headers: { cookie: authToken },
      });
      expect(checkRes.statusCode).toBe(404);
    });

    it('should return 404 when deleting non-existent variant', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/product-variants/${fakeId}`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests to create variant', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${testProductId}/variants`,
        payload: {
          variantName: 'Unauthorized',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject unauthenticated requests to list variants', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${testProductId}/variants`,
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject unauthenticated requests to get variant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/product-variants/${createdVariantId}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return variants for products belonging to current tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      // All variants should belong to the test product
      const productIds = data.data.items.map((v: any) => v.productId);
      const uniqueProductIds = [...new Set(productIds)];
      expect(uniqueProductIds.length).toBe(1);
      expect(uniqueProductIds[0]).toBe(testProductId);
    });
  });

  describe('Business Logic Validation', () => {
    it('should allow same variant name for different products', async () => {
      // Get a real UOM ID from the database
      const kgUom = await db.query.uoms.findFirst({
        where: eq(uoms.code, 'KG'),
      });
      const baseUomId = kgUom!.id;

      // Create another product
      const productRes = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { cookie: authToken },
        payload: {
          sku: `VARIANT-TEST-2-${Date.now()}`,
          name: 'Another Test Product',
          productKind: 'finished_good',
          baseUomId: baseUomId,
          standardCost: '12.00',
          defaultPrice: '15.00',
          isActive: true,
        },
      });

      const anotherProductId = productRes.json().data.id;

      // Create variant with same name as existing variant for first product
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${anotherProductId}/variants`,
        headers: { cookie: authToken },
        payload: {
          variantName: 'Test Large', // Same name as variant for first product
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.variantName).toBe('Test Large');
    });

    it('should maintain display order sorting', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${testProductId}/variants`,
        headers: { cookie: authToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      // Variants should be ordered by displayOrder
      const displayOrders = data.data.items.map((v: any) => v.displayOrder);
      const sortedOrders = [...displayOrders].sort((a, b) => a - b);
      expect(displayOrders).toEqual(sortedOrders);
    });
  });
});
