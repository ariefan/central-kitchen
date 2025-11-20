/**
 * MSW Handlers - Mock API responses for all ERP endpoints
 */
import { http, HttpResponse } from 'msw';
import {
  mockUOMs, mockLocations, mockCategories, mockProducts,
  mockSuppliers, mockCustomers, mockPurchaseOrders, mockGoodsReceipts,
  mockInventoryOnHand, mockInventoryLots, mockStockTransfers,
  mockRecipes, mockProductionOrders, mockSalesOrders, mockTemperatureLogs,
  generatePaginatedResponse, generateSuccessResponse, generateErrorResponse,
} from '../data/mock-data';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const handlers = [
  // ==================== UOMs ====================
  http.get(`${API_BASE}/api/v1/uoms`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockUOMs, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/uoms/:id`, ({ params }) => {
    const uom = mockUOMs.find(u => u.id === params.id);
    return uom
      ? HttpResponse.json(generateSuccessResponse(uom))
      : HttpResponse.json(generateErrorResponse('UOM not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/uoms`, async ({ request }) => {
    const body = await request.json() as any;
    const newUOM = { id: `uom-${Date.now()}`, ...body, isActive: true };
    mockUOMs.push(newUOM);
    return HttpResponse.json(generateSuccessResponse(newUOM), { status: 201 });
  }),

  // ==================== Locations ====================
  http.get(`${API_BASE}/api/v1/locations`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const type = url.searchParams.get('type');

    let filtered = type ? mockLocations.filter(l => l.type === type) : mockLocations;
    return HttpResponse.json(generatePaginatedResponse(filtered, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/locations/:id`, ({ params }) => {
    const location = mockLocations.find(l => l.id === params.id);
    return location
      ? HttpResponse.json(generateSuccessResponse(location))
      : HttpResponse.json(generateErrorResponse('Location not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/locations`, async ({ request }) => {
    const body = await request.json() as any;
    const newLocation = { id: `loc-${Date.now()}`, ...body, isActive: true };
    mockLocations.push(newLocation);
    return HttpResponse.json(generateSuccessResponse(newLocation), { status: 201 });
  }),

  // ==================== Products ====================
  http.get(`${API_BASE}/api/v1/products`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockProducts, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/products/:id`, ({ params }) => {
    const product = mockProducts.find(p => p.id === params.id);
    return product
      ? HttpResponse.json(generateSuccessResponse(product))
      : HttpResponse.json(generateErrorResponse('Product not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/products`, async ({ request }) => {
    const body = await request.json() as any;
    const newProduct = { id: `prod-${Date.now()}`, ...body, isActive: true };
    mockProducts.push(newProduct);
    return HttpResponse.json(generateSuccessResponse(newProduct), { status: 201 });
  }),

  // ==================== Categories ====================
  http.get(`${API_BASE}/api/v1/categories`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockCategories, page, limit));
  }),

  http.post(`${API_BASE}/api/v1/categories`, async ({ request }) => {
    const body = await request.json() as any;
    const newCategory = { id: `cat-${Date.now()}`, ...body };
    mockCategories.push(newCategory);
    return HttpResponse.json(generateSuccessResponse(newCategory), { status: 201 });
  }),

  // ==================== Suppliers ====================
  http.get(`${API_BASE}/api/v1/suppliers`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockSuppliers, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/suppliers/:id`, ({ params }) => {
    const supplier = mockSuppliers.find(s => s.id === params.id);
    return supplier
      ? HttpResponse.json(generateSuccessResponse(supplier))
      : HttpResponse.json(generateErrorResponse('Supplier not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/suppliers`, async ({ request }) => {
    const body = await request.json() as any;
    const newSupplier = { id: `sup-${Date.now()}`, code: `SUP-${String(mockSuppliers.length + 1).padStart(5, '0')}`, ...body, isActive: true };
    mockSuppliers.push(newSupplier);
    return HttpResponse.json(generateSuccessResponse(newSupplier), { status: 201 });
  }),

  // ==================== Customers ====================
  http.get(`${API_BASE}/api/v1/customers`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockCustomers, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/customers/:id`, ({ params }) => {
    const customer = mockCustomers.find(c => c.id === params.id);
    return customer
      ? HttpResponse.json(generateSuccessResponse(customer))
      : HttpResponse.json(generateErrorResponse('Customer not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/customers`, async ({ request }) => {
    const body = await request.json() as any;
    const newCustomer = { id: `cust-${Date.now()}`, code: `CUST-${String(mockCustomers.length + 1).padStart(5, '0')}`, ...body, isActive: true };
    mockCustomers.push(newCustomer);
    return HttpResponse.json(generateSuccessResponse(newCustomer), { status: 201 });
  }),

  // ==================== Purchase Orders ====================
  http.get(`${API_BASE}/api/v1/purchase-orders`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');

    let filtered = status ? mockPurchaseOrders.filter(po => po.status === status) : mockPurchaseOrders;
    return HttpResponse.json(generatePaginatedResponse(filtered, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/purchase-orders/:id`, ({ params }) => {
    const po = mockPurchaseOrders.find(p => p.id === params.id);
    return po
      ? HttpResponse.json(generateSuccessResponse(po))
      : HttpResponse.json(generateErrorResponse('Purchase Order not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/purchase-orders`, async ({ request }) => {
    const body = await request.json() as any;
    const newPO = {
      id: `po-${Date.now()}`,
      poNumber: `PO-202511-${String(mockPurchaseOrders.length + 1).padStart(5, '0')}`,
      ...body,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
    };
    mockPurchaseOrders.push(newPO);
    return HttpResponse.json(generateSuccessResponse(newPO), { status: 201 });
  }),

  http.post(`${API_BASE}/api/v1/purchase-orders/:id/submit`, ({ params }) => {
    const po = mockPurchaseOrders.find(p => p.id === params.id);
    if (po) {
      po.status = 'pending_approval';
      return HttpResponse.json(generateSuccessResponse(po));
    }
    return HttpResponse.json(generateErrorResponse('PO not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/purchase-orders/:id/approve`, ({ params }) => {
    const po = mockPurchaseOrders.find(p => p.id === params.id);
    if (po) {
      po.status = 'approved';
      return HttpResponse.json(generateSuccessResponse(po));
    }
    return HttpResponse.json(generateErrorResponse('PO not found'), { status: 404 });
  }),

  // ==================== Goods Receipts ====================
  http.get(`${API_BASE}/api/v1/goods-receipts`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockGoodsReceipts, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/goods-receipts/:id`, ({ params }) => {
    const gr = mockGoodsReceipts.find(g => g.id === params.id);
    return gr
      ? HttpResponse.json(generateSuccessResponse(gr))
      : HttpResponse.json(generateErrorResponse('Goods Receipt not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/goods-receipts`, async ({ request }) => {
    const body = await request.json() as any;
    const newGR = {
      id: `gr-${Date.now()}`,
      grNumber: `GR-202511-${String(mockGoodsReceipts.length + 1).padStart(5, '0')}`,
      ...body,
      status: 'draft' as const,
    };
    mockGoodsReceipts.push(newGR);
    return HttpResponse.json(generateSuccessResponse(newGR), { status: 201 });
  }),

  http.post(`${API_BASE}/api/v1/goods-receipts/:id/post`, ({ params }) => {
    const gr = mockGoodsReceipts.find(g => g.id === params.id);
    if (gr) {
      gr.status = 'posted';
      return HttpResponse.json(generateSuccessResponse(gr));
    }
    return HttpResponse.json(generateErrorResponse('GR not found'), { status: 404 });
  }),

  // ==================== Inventory ====================
  http.get(`${API_BASE}/api/v1/inventory/onhand`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockInventoryOnHand, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/inventory/lots`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockInventoryLots, page, limit));
  }),

  // ==================== Stock Transfers ====================
  http.get(`${API_BASE}/api/v1/stock-transfers`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockStockTransfers, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/stock-transfers/:id`, ({ params }) => {
    const transfer = mockStockTransfers.find(t => t.id === params.id);
    return transfer
      ? HttpResponse.json(generateSuccessResponse(transfer))
      : HttpResponse.json(generateErrorResponse('Transfer not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/stock-transfers`, async ({ request }) => {
    const body = await request.json() as any;
    const newTransfer = {
      id: `st-${Date.now()}`,
      transferNumber: `ST-202511-${String(mockStockTransfers.length + 1).padStart(5, '0')}`,
      ...body,
      status: 'draft' as const,
    };
    mockStockTransfers.push(newTransfer);
    return HttpResponse.json(generateSuccessResponse(newTransfer), { status: 201 });
  }),

  // ==================== Recipes ====================
  http.get(`${API_BASE}/api/v1/recipes`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockRecipes, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/recipes/:id`, ({ params }) => {
    const recipe = mockRecipes.find(r => r.id === params.id);
    return recipe
      ? HttpResponse.json(generateSuccessResponse(recipe))
      : HttpResponse.json(generateErrorResponse('Recipe not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/recipes`, async ({ request }) => {
    const body = await request.json() as any;
    const newRecipe = {
      id: `recipe-${Date.now()}`,
      code: `RCP-${String(mockRecipes.length + 1).padStart(3, '0')}`,
      ...body,
      version: 1,
      status: 'active' as const,
      isActive: true,
    };
    mockRecipes.push(newRecipe);
    return HttpResponse.json(generateSuccessResponse(newRecipe), { status: 201 });
  }),

  // ==================== Production Orders ====================
  http.get(`${API_BASE}/api/v1/production-orders`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockProductionOrders, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/production-orders/:id`, ({ params }) => {
    const prodOrder = mockProductionOrders.find(po => po.id === params.id);
    return prodOrder
      ? HttpResponse.json(generateSuccessResponse(prodOrder))
      : HttpResponse.json(generateErrorResponse('Production Order not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/production-orders`, async ({ request }) => {
    const body = await request.json() as any;
    const newProdOrder = {
      id: `prod-order-${Date.now()}`,
      productionNumber: `PROD-202511-${String(mockProductionOrders.length + 1).padStart(5, '0')}`,
      ...body,
      status: 'draft' as const,
    };
    mockProductionOrders.push(newProdOrder);
    return HttpResponse.json(generateSuccessResponse(newProdOrder), { status: 201 });
  }),

  // ==================== Sales Orders ====================
  http.get(`${API_BASE}/api/v1/sales-orders`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockSalesOrders, page, limit));
  }),

  http.get(`${API_BASE}/api/v1/sales-orders/:id`, ({ params }) => {
    const so = mockSalesOrders.find(s => s.id === params.id);
    return so
      ? HttpResponse.json(generateSuccessResponse(so))
      : HttpResponse.json(generateErrorResponse('Sales Order not found'), { status: 404 });
  }),

  http.post(`${API_BASE}/api/v1/sales-orders`, async ({ request }) => {
    const body = await request.json() as any;
    const newSO = {
      id: `so-${Date.now()}`,
      orderNumber: `SO-202511-${String(mockSalesOrders.length + 1).padStart(5, '0')}`,
      ...body,
      status: 'draft' as const,
    };
    mockSalesOrders.push(newSO);
    return HttpResponse.json(generateSuccessResponse(newSO), { status: 201 });
  }),

  // ==================== Temperature Logs ====================
  http.get(`${API_BASE}/api/v1/temperature-logs`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(generatePaginatedResponse(mockTemperatureLogs, page, limit));
  }),

  http.post(`${API_BASE}/api/v1/temperature-logs`, async ({ request }) => {
    const body = await request.json() as any;
    const newLog = {
      id: `temp-${Date.now()}`,
      ...body,
      loggedAt: new Date().toISOString(),
    };
    mockTemperatureLogs.push(newLog);
    return HttpResponse.json(generateSuccessResponse(newLog), { status: 201 });
  }),
];
