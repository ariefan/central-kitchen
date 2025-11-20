/**
 * Mock Data Generators for all ERP modules
 * Based on @contracts/erp types
 */

export const mockTenantId = "tenant-001";
export const mockUserId = "user-001";
export const mockLocationId = "loc-wh-001";

// UOMs
export const mockUOMs = [
  { id: "uom-ea", code: "EA", name: "Each", type: "discrete" as const, isActive: true },
  { id: "uom-kg", code: "KG", name: "Kilogram", type: "continuous" as const, isActive: true },
  { id: "uom-l", code: "L", name: "Liter", type: "continuous" as const, isActive: true },
  { id: "uom-box", code: "BOX", name: "Box", type: "discrete" as const, isActive: true },
];

// Locations
export const mockLocations = [
  { id: "loc-wh-001", code: "WH-001", name: "Main Warehouse", type: "warehouse" as const, isActive: true, tenantId: mockTenantId },
  { id: "loc-kch-001", code: "KCH-001", name: "Central Kitchen", type: "kitchen" as const, isActive: true, tenantId: mockTenantId },
  { id: "loc-store-001", code: "STR-001", name: "Retail Store", type: "store" as const, isActive: true, tenantId: mockTenantId },
];

// Categories
export const mockCategories = [
  { id: "cat-001", code: "RAW", name: "Raw Materials", tenantId: mockTenantId },
  { id: "cat-002", code: "FIN", name: "Finished Goods", tenantId: mockTenantId },
  { id: "cat-003", code: "PKG", name: "Packaging", tenantId: mockTenantId },
];

// Products
export const mockProducts = [
  {
    id: "prod-001", sku: "FLOUR-001", name: "All Purpose Flour",
    categoryId: "cat-001", stockUomId: "uom-kg", isLotTracked: true,
    shelfLifeDays: 180, isActive: true, tenantId: mockTenantId
  },
  {
    id: "prod-002", sku: "SUGAR-001", name: "White Sugar",
    categoryId: "cat-001", stockUomId: "uom-kg", isLotTracked: true,
    shelfLifeDays: 365, isActive: true, tenantId: mockTenantId
  },
  {
    id: "prod-003", sku: "BREAD-001", name: "White Bread",
    categoryId: "cat-002", stockUomId: "uom-ea", isLotTracked: true,
    shelfLifeDays: 5, isActive: true, tenantId: mockTenantId
  },
];

// Suppliers
export const mockSuppliers = [
  {
    id: "sup-001", code: "SUP-00001", name: "ABC Suppliers Ltd",
    contactPerson: "John Doe", email: "john@abc.com", phone: "+1234567890",
    address: "123 Main St", city: "New York", country: "USA",
    paymentTerms: "Net 30", isActive: true, tenantId: mockTenantId
  },
  {
    id: "sup-002", code: "SUP-00002", name: "XYZ Trading Co",
    contactPerson: "Jane Smith", email: "jane@xyz.com", phone: "+0987654321",
    address: "456 Oak Ave", city: "Los Angeles", country: "USA",
    paymentTerms: "Net 60", isActive: true, tenantId: mockTenantId
  },
];

// Customers
export const mockCustomers = [
  {
    id: "cust-001", code: "CUST-00001", name: "Retail Customer A",
    email: "customer-a@example.com", phone: "+1111111111",
    address: "789 Pine St", city: "Chicago", country: "USA",
    isActive: true, tenantId: mockTenantId
  },
  {
    id: "cust-002", code: "CUST-00002", name: "Wholesale Customer B",
    email: "customer-b@example.com", phone: "+2222222222",
    address: "321 Elm St", city: "Houston", country: "USA",
    isActive: true, tenantId: mockTenantId
  },
];

// Purchase Orders
export const mockPurchaseOrders = [
  {
    id: "po-001",
    poNumber: "PO-202511-00001",
    supplierId: "sup-001",
    locationId: "loc-wh-001",
    orderDate: "2025-11-15",
    expectedDate: "2025-11-20",
    status: "draft" as const,
    totalAmount: "1250.00",
    notes: "Monthly flour order",
    tenantId: mockTenantId,
    createdAt: "2025-11-15T10:00:00Z",
    items: [
      {
        id: "po-item-001",
        productId: "prod-001",
        quantity: "100",
        uomId: "uom-kg",
        unitPrice: "12.50",
        totalPrice: "1250.00",
      }
    ]
  },
  {
    id: "po-002",
    poNumber: "PO-202511-00002",
    supplierId: "sup-002",
    locationId: "loc-wh-001",
    orderDate: "2025-11-16",
    expectedDate: "2025-11-22",
    status: "approved" as const,
    totalAmount: "2400.00",
    notes: "Sugar purchase",
    tenantId: mockTenantId,
    createdAt: "2025-11-16T10:00:00Z",
    items: [
      {
        id: "po-item-002",
        productId: "prod-002",
        quantity: "200",
        uomId: "uom-kg",
        unitPrice: "12.00",
        totalPrice: "2400.00",
      }
    ]
  },
];

// Goods Receipts
export const mockGoodsReceipts = [
  {
    id: "gr-001",
    grNumber: "GR-202511-00001",
    purchaseOrderId: "po-002",
    locationId: "loc-wh-001",
    receivedDate: "2025-11-18",
    status: "draft" as const,
    notes: "Partial receipt",
    tenantId: mockTenantId,
    items: [
      {
        id: "gr-item-001",
        poItemId: "po-item-002",
        productId: "prod-002",
        quantityReceived: "150",
        uomId: "uom-kg",
        lotNumber: "LOT-20251118-001",
        manufactureDate: "2025-11-10",
        expiryDate: "2026-11-10",
      }
    ]
  },
];

// Inventory On-Hand
export const mockInventoryOnHand = [
  {
    productId: "prod-001",
    productName: "All Purpose Flour",
    productSku: "FLOUR-001",
    locationId: "loc-wh-001",
    locationName: "Main Warehouse",
    quantityOnHand: "250.00",
    allocatedQty: "50.00",
    availableQty: "200.00",
    uomCode: "KG",
  },
  {
    productId: "prod-002",
    productName: "White Sugar",
    productSku: "SUGAR-001",
    locationId: "loc-wh-001",
    locationName: "Main Warehouse",
    quantityOnHand: "150.00",
    allocatedQty: "0.00",
    availableQty: "150.00",
    uomCode: "KG",
  },
];

// Inventory Lots
export const mockInventoryLots = [
  {
    id: "lot-001",
    lotNumber: "LOT-20251101-001",
    productId: "prod-001",
    productName: "All Purpose Flour",
    locationId: "loc-wh-001",
    locationName: "Main Warehouse",
    quantity: "250.00",
    uomCode: "KG",
    manufactureDate: "2025-11-01",
    expiryDate: "2026-05-01",
    status: "active" as const,
  },
];

// Stock Transfers
export const mockStockTransfers = [
  {
    id: "st-001",
    transferNumber: "ST-202511-00001",
    fromLocationId: "loc-wh-001",
    toLocationId: "loc-kch-001",
    transferDate: "2025-11-19",
    status: "draft" as const,
    notes: "Daily kitchen transfer",
    tenantId: mockTenantId,
    items: [
      {
        id: "st-item-001",
        productId: "prod-001",
        quantity: "50",
        uomId: "uom-kg",
        lotNumber: "LOT-20251101-001",
      }
    ]
  },
];

// Recipes
export const mockRecipes = [
  {
    id: "recipe-001",
    code: "RCP-001",
    name: "White Bread Recipe",
    version: 1,
    outputProductId: "prod-003",
    outputQuantity: "20",
    outputUomId: "uom-ea",
    status: "active" as const,
    isActive: true,
    tenantId: mockTenantId,
    ingredients: [
      {
        id: "ing-001",
        productId: "prod-001",
        quantity: "10",
        uomId: "uom-kg",
        costPerUnit: "12.50",
      },
      {
        id: "ing-002",
        productId: "prod-002",
        quantity: "2",
        uomId: "uom-kg",
        costPerUnit: "12.00",
      }
    ]
  },
];

// Production Orders
export const mockProductionOrders = [
  {
    id: "prod-order-001",
    productionNumber: "PROD-202511-00001",
    recipeId: "recipe-001",
    locationId: "loc-kch-001",
    plannedQuantity: "20",
    plannedDate: "2025-11-20",
    status: "draft" as const,
    tenantId: mockTenantId,
  },
];

// Sales Orders
export const mockSalesOrders = [
  {
    id: "so-001",
    orderNumber: "SO-202511-00001",
    customerId: "cust-001",
    orderDate: "2025-11-19",
    deliveryDate: "2025-11-21",
    status: "draft" as const,
    totalAmount: "100.00",
    tenantId: mockTenantId,
    items: [
      {
        id: "so-item-001",
        productId: "prod-003",
        quantity: "20",
        uomId: "uom-ea",
        unitPrice: "5.00",
        totalPrice: "100.00",
      }
    ]
  },
];

// Temperature Logs
export const mockTemperatureLogs = [
  {
    id: "temp-001",
    locationId: "loc-kch-001",
    equipmentName: "Refrigerator #1",
    temperature: 4.2,
    minThreshold: 0,
    maxThreshold: 5,
    loggedAt: "2025-11-20T08:00:00Z",
    loggedBy: mockUserId,
    notes: "Morning check",
    tenantId: mockTenantId,
  },
  {
    id: "temp-002",
    locationId: "loc-kch-001",
    equipmentName: "Freezer #1",
    temperature: -18.5,
    minThreshold: -20,
    maxThreshold: -15,
    loggedAt: "2025-11-20T08:05:00Z",
    loggedBy: mockUserId,
    tenantId: mockTenantId,
  },
];

// Helper functions
export function generatePaginatedResponse<T>(data: T[], page: number = 1, limit: number = 20) {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = data.slice(start, end);

  return {
    success: true,
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
    },
  };
}

export function generateSuccessResponse<T>(data: T) {
  return {
    success: true,
    data,
  };
}

export function generateErrorResponse(message: string, code?: string) {
  return {
    success: false,
    error: message,
    code,
  };
}
