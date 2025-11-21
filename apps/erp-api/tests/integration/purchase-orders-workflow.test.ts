import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getApp, getTestContext } from './test-setup';

describe('Purchase Order Workflow (PROC-002)', () => {
  let app: ReturnType<typeof getApp>;
  const ctx = getTestContext();
  let supplierId: string;
  let productId: string;
  let uomId: string;

  beforeAll(async () => {
    app = getApp();
    uomId = '10000000-0000-4000-8000-000000000011'; // KG
  });

  beforeEach(async () => {
    // Create supplier for each test (since cleanTransactionalData deletes suppliers)
    // Use timestamp to ensure unique codes
    const timestamp = Date.now();
    const supplierResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      headers: {
        'x-tenant-id': ctx.tenantId,
        'x-user-id': ctx.userId,
      },
      payload: {
        code: `PO-SUP-${timestamp}`,
        name: 'PO Test Supplier',
        email: `po-supplier-${timestamp}@test.com`,
        paymentTerms: 30,
      },
    });

    const supplierBody = JSON.parse(supplierResponse.body);
    if (!supplierBody.success || !supplierBody.data) {
      throw new Error(`Failed to create supplier: ${supplierResponse.body}`);
    }
    supplierId = supplierBody.data.id;

    // Create product for each test
    const productResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: {
        'x-tenant-id': ctx.tenantId,
        'x-user-id': ctx.userId,
      },
      payload: {
        sku: `PO-PROD-${timestamp}`,
        name: 'PO Test Product',
        productKind: 'raw_material',
        baseUomId: uomId,
        standardCost: '10.00',
        isPerishable: false,
      },
    });

    const productBody = JSON.parse(productResponse.body);
    if (!productBody.success || !productBody.data) {
      throw new Error(`Failed to create product: ${productResponse.body}`);
    }
    productId = productBody.data.id;
  });

  describe('Complete PO Workflow: Draft → Approved → Sent → Received', () => {
    it('should complete full PO workflow', async () => {
      // STEP 1: Create PO (Draft)
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          supplierId,
          locationId: ctx.locationId,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          paymentTerms: 30,
          notes: 'Test PO for workflow',
          items: [
            {
              productId,
              quantity: 100,
              uomId,
              unitPrice: 10.50,
              discount: 0,
              taxRate: 8,
            },
          ],
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const createdPO = JSON.parse(createResponse.body).data;
      expect(createdPO.status).toBe('draft');
      expect(createdPO.orderNumber).toMatch(/^PO-/);
      expect(createdPO.subtotal).toBe('1050.00'); // 100 * 10.50
      expect(createdPO.taxAmount).toBe('84.00'); // 1050 * 0.08
      expect(createdPO.totalAmount).toBe('1134.00'); // 1050 + 84

      const poId = createdPO.id;

      // STEP 2: Submit for Approval
      const submitResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/submit`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          submissionNotes: 'Please approve',
        },
      });

      expect(submitResponse.statusCode).toBe(200);
      const submittedPO = JSON.parse(submitResponse.body).data;
      expect(submittedPO.status).toBe('pending_approval');

      // STEP 3: Approve PO
      const approveResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/approve`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          approvedBy: ctx.userId,
          approvalNotes: 'Approved for purchase',
        },
      });

      expect(approveResponse.statusCode).toBe(200);
      const approvedPO = JSON.parse(approveResponse.body).data;
      expect(approvedPO.status).toBe('approved');
      expect(approvedPO.approvedBy).toBe(ctx.userId);
      expect(approvedPO.approvedAt).toBeTruthy();

      // STEP 4: Send to Supplier
      const sendResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/send`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          emailTo: 'supplier@example.com',
          emailSubject: 'Purchase Order PO-001',
          emailMessage: 'Please find attached purchase order',
        },
      });

      expect(sendResponse.statusCode).toBe(200);
      const sentPO = JSON.parse(sendResponse.body).data;
      expect(sentPO.status).toBe('sent');
      expect(sentPO.metadata).toHaveProperty('sent');
      expect(sentPO.metadata.sent.at).toBeTruthy();

      // STEP 5: Create Goods Receipt
      const grResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/goods-receipts',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          purchaseOrderId: poId,
          locationId: ctx.locationId,
          receiptDate: new Date().toISOString(),
          receivedBy: ctx.userId,
          notes: 'Received complete order',
          items: [
            {
              purchaseOrderItemId: createdPO.items[0].id,
              productId,
              quantityOrdered: 100,
              quantityReceived: 100, // Full receipt
              uomId,
              unitCost: 10.50,
              lotNumber: 'LOT-2025-001',
              notes: 'All items in good condition',
            },
          ],
        },
      });

      expect(grResponse.statusCode).toBe(201);
      const gr = JSON.parse(grResponse.body).data;
      expect(gr.receiptNumber).toMatch(/^GR-/);
      expect(gr.status).toBe('draft');

      const grId = gr.id;

      // STEP 6: Post GR to Inventory (creates stock ledger entries)
      const postResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/goods-receipts/${grId}/post`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          confirmed: true,
          postingNotes: 'Posted to inventory',
        },
      });

      expect(postResponse.statusCode).toBe(200);
      const postedGR = JSON.parse(postResponse.body).data;
      expect(postedGR.status).toBe('posted');
      expect(postedGR.postedAt).toBeTruthy();

      // STEP 7: Verify Stock Ledger Entry
      const inventoryResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/onhand?productId=${productId}&locationId=${ctx.locationId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(inventoryResponse.statusCode).toBe(200);
      const inventory = JSON.parse(inventoryResponse.body).data;
      expect(inventory.length).toBeGreaterThan(0);
      const productInventory = inventory.find((inv: any) => inv.productId === productId);
      expect(productInventory).toBeTruthy();
      expect(productInventory.quantityOnHand).toBe('100.00'); // Received quantity

      // STEP 8: Verify PO Status Updated to Completed
      const finalPOResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/purchase-orders/${poId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      const finalPO = JSON.parse(finalPOResponse.body).data;
      expect(['completed', 'partial_receipt']).toContain(finalPO.status);
    });
  });

  describe('PO Rejection Workflow', () => {
    it('should reject PO and prevent further processing', async () => {
      // Create PO
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          supplierId,
          locationId: ctx.locationId,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              productId,
              quantity: 50,
              uomId,
              unitPrice: 10.00,
            },
          ],
        },
      });

      const poId = JSON.parse(createResponse.body).data.id;

      // Submit for approval
      await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/submit`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      // Reject PO
      const rejectResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/reject`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          reason: 'Price too high',
        },
      });

      expect(rejectResponse.statusCode).toBe(200);
      const rejectedPO = JSON.parse(rejectResponse.body).data;
      expect(rejectedPO.status).toBe('rejected');

      // Attempt to send rejected PO (should fail)
      const sendResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/send`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      expect(sendResponse.statusCode).toBe(400);
      const body = JSON.parse(sendResponse.body);
      expect(body.message).toContain('rejected');
    });
  });

  describe('Partial Goods Receipt', () => {
    it('should handle partial receipt and update PO status', async () => {
      // Create PO
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          supplierId,
          locationId: ctx.locationId,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              productId,
              quantity: 100,
              uomId,
              unitPrice: 10.00,
            },
          ],
        },
      });

      const po = JSON.parse(createResponse.body).data;
      const poId = po.id;

      // Approve and send PO
      await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/submit`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/approve`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          approvedBy: ctx.userId,
        },
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/send`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      // Create partial GR (only 60 out of 100)
      const grResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/goods-receipts',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          purchaseOrderId: poId,
          locationId: ctx.locationId,
          receiptDate: new Date().toISOString(),
          items: [
            {
              purchaseOrderItemId: po.items[0].id,
              productId,
              quantityOrdered: 100,
              quantityReceived: 60, // Partial receipt
              uomId,
              unitCost: 10.00,
              varianceNotes: 'Supplier short delivery',
            },
          ],
        },
      });

      const grId = JSON.parse(grResponse.body).data.id;

      // Post partial GR
      await app.inject({
        method: 'POST',
        url: `/api/v1/goods-receipts/${grId}/post`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          confirmed: true,
        },
      });

      // Check PO status
      const poResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/purchase-orders/${poId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      const updatedPO = JSON.parse(poResponse.body).data;
      expect(updatedPO.status).toBe('partial_receipt');

      // Verify inventory shows only 60 units
      const inventoryResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/inventory/onhand?productId=${productId}&locationId=${ctx.locationId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      const inventory = JSON.parse(inventoryResponse.body).data;
      const productInventory = inventory.find((inv: any) => inv.productId === productId);
      expect(parseFloat(productInventory.quantityOnHand)).toBeGreaterThanOrEqual(60);
    });
  });

  describe('PO Cancellation', () => {
    it('should cancel PO before goods receipt', async () => {
      // Create and approve PO
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          supplierId,
          locationId: ctx.locationId,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              productId,
              quantity: 25,
              uomId,
              unitPrice: 10.00,
            },
          ],
        },
      });

      const poId = JSON.parse(createResponse.body).data.id;

      await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/submit`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/approve`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          approvedBy: ctx.userId,
        },
      });

      // Cancel PO
      const cancelResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/cancel`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          reason: 'Supplier cannot fulfill order',
        },
      });

      expect(cancelResponse.statusCode).toBe(200);
      const cancelledPO = JSON.parse(cancelResponse.body).data;
      expect(cancelledPO.status).toBe('cancelled');

      // Attempt to create GR for cancelled PO (should fail)
      const grResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/goods-receipts',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          purchaseOrderId: poId,
          locationId: ctx.locationId,
          items: [],
        },
      });

      expect(grResponse.statusCode).toBe(400);
    });
  });

  describe('PO Validation Rules', () => {
    it('should prevent updating approved PO', async () => {
      // Create and approve PO
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          supplierId,
          locationId: ctx.locationId,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              productId,
              quantity: 10,
              uomId,
              unitPrice: 10.00,
            },
          ],
        },
      });

      const poId = JSON.parse(createResponse.body).data.id;

      await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/submit`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/purchase-orders/${poId}/approve`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          approvedBy: ctx.userId,
        },
      });

      // Attempt to update approved PO
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/purchase-orders/${poId}`,
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          notes: 'Trying to update approved PO',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = JSON.parse(updateResponse.body);
      expect(body.message).toContain('approved');
    });

    it('should require future delivery date', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          supplierId,
          locationId: ctx.locationId,
          expectedDeliveryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past date
          items: [
            {
              productId,
              quantity: 10,
              uomId,
              unitPrice: 10.00,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('future');
    });

    it('should require at least one item', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/purchase-orders',
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-user-id': ctx.userId,
        },
        payload: {
          supplierId,
          locationId: ctx.locationId,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: [], // Empty items
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('item');
    });
  });
});
