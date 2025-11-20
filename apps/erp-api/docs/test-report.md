# 🧪 ERP API Test Report

## 📊 Test Run Summary

- **Run timestamp**: 2025-11-20T03:07:30.791Z
- **Duration**: 13.51s
- **Result**: FAILED
- **Tests**: 326 total | 280 passed | 38 failed | 8 skipped
- **Success Rate**: 85.9%

## 📁 Module Summary

| File | Passed | Failed | Skipped | Duration (ms) | Success Rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| tests/integration/adjustments.test.ts | 0 | 0 | 0 | 0 | 0.0% |
| tests/integration/auth.test.ts | 0 | 0 | 8 | 405 | 0.0% |
| tests/integration/customers.test.ts | 4 | 0 | 0 | 1790 | 100.0% |
| tests/integration/deliveries.test.ts | 14 | 0 | 0 | 2347 | 100.0% |
| tests/integration/fefo-picking.test.ts | 2 | 8 | 0 | 2082 | 20.0% |
| tests/integration/goods-receipts.test.ts | 3 | 0 | 0 | 2510 | 100.0% |
| tests/integration/health.test.ts | 1 | 0 | 0 | 538 | 100.0% |
| tests/integration/inventory-views.test.ts | 15 | 0 | 0 | 569 | 100.0% |
| tests/integration/inventory.test.ts | 15 | 4 | 0 | 2245 | 78.9% |
| tests/integration/locations.test.ts | 26 | 0 | 0 | 2967 | 100.0% |
| tests/integration/menus.test.ts | 8 | 0 | 0 | 1806 | 100.0% |
| tests/integration/multi-location.test.ts | 4 | 7 | 0 | 2645 | 36.4% |
| tests/integration/orders.test.ts | 0 | 0 | 0 | 0 | 0.0% |
| tests/integration/product-variants.test.ts | 26 | 0 | 0 | 942 | 100.0% |
| tests/integration/production-orders.test.ts | 15 | 0 | 0 | 1880 | 100.0% |
| tests/integration/products-bulk.test.ts | 10 | 18 | 0 | 2822 | 35.7% |
| tests/integration/products.test.ts | 35 | 0 | 0 | 3091 | 100.0% |
| tests/integration/profile.test.ts | 14 | 0 | 0 | 1284 | 100.0% |
| tests/integration/purchase-orders.test.ts | 0 | 0 | 0 | 0 | 0.0% |
| tests/integration/recipes.test.ts | 0 | 0 | 0 | 0 | 0.0% |
| tests/integration/requisitions.test.ts | 7 | 0 | 0 | 1705 | 100.0% |
| tests/integration/returns.test.ts | 0 | 0 | 0 | 0 | 0.0% |
| tests/integration/stock-counts.test.ts | 0 | 0 | 0 | 0 | 0.0% |
| tests/integration/suppliers.test.ts | 27 | 0 | 0 | 2932 | 100.0% |
| tests/integration/transfers.test.ts | 12 | 0 | 0 | 1847 | 100.0% |
| tests/integration/uoms.test.ts | 23 | 0 | 0 | 746 | 100.0% |
| tests/integration/waste.test.ts | 19 | 1 | 0 | 1993 | 95.0% |

## 🧪 Detailed Test Results

### tests/integration/auth.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Authentication > Better Auth Endpoints > should fail sign in with non-existent user | ⏭️ skipped | 0 | 0 |
| Authentication > Better Auth Endpoints > should fail sign in with wrong password | ⏭️ skipped | 0 | 0 |
| Authentication > Better Auth Endpoints > should return null for unauthenticated session requests | ⏭️ skipped | 0 | 0 |
| Authentication > Better Auth Endpoints > should sign in with username and password | ⏭️ skipped | 0 | 0 |
| Authentication > Protected Endpoints > should access protected endpoint with valid session | ⏭️ skipped | 0 | 0 |
| Authentication > Protected Endpoints > should have proper tenant isolation | ⏭️ skipped | 0 | 0 |
| Authentication > Protected Endpoints > should reject unauthenticated requests to protected endpoints | ⏭️ skipped | 0 | 0 |
| Authentication > Protected Endpoints > should return user information with tenant context when authenticated | ⏭️ skipped | 0 | 0 |

### tests/integration/customers.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Customers > should create a new customer | ✅ passed | 0 | 0 |
| Customers > should list customers for the current tenant | ✅ passed | 0 | 0 |
| Customers > should return 404 for non-existent customer | ✅ passed | 0 | 0 |
| Customers > should validate required fields | ✅ passed | 0 | 0 |

### tests/integration/deliveries.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Deliveries > Customer Addresses > should create a new customer address | ✅ passed | 0 | 0 |
| Deliveries > Customer Addresses > should filter addresses by customer | ✅ passed | 0 | 0 |
| Deliveries > Customer Addresses > should list all addresses | ✅ passed | 0 | 0 |
| Deliveries > Customer Addresses > should return 404 when creating address for non-existent customer | ✅ passed | 0 | 0 |
| Deliveries > Customer Addresses > should validate required address fields | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should create a new delivery | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should filter deliveries by provider | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should filter deliveries by status | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should get delivery by ID | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should list all deliveries | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should mark delivery as delivered | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should return 404 for non-existent delivery | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should return 404 when creating delivery for non-existent order | ✅ passed | 0 | 0 |
| Deliveries > Delivery Management > should update delivery status | ✅ passed | 0 | 0 |

### tests/integration/fefo-picking.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| FEFO Picking Integration Tests (INV-002) > GET /api/v1/inventory/fefo/recommendations > should return 404 for non-existent product | ❌ failed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > GET /api/v1/inventory/fefo/recommendations > should return FEFO recommendations ordered by expiry date | ❌ failed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > GET /api/v1/inventory/fefo/recommendations > should show quantity needed analysis when specified | ❌ failed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should allocate across multiple lots when needed | ❌ failed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should allocate from earliest expiry lot first (FEFO) | ❌ failed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should create stock ledger entries when reserveOnly=false | ❌ failed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should handle partial allocation when allowPartial=true | ❌ failed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should reject allocation when stock insufficient and allowPartial=false | ❌ failed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > FEFO Integration with Database Views > should correctly query v_fefo_pick view directly | ✅ passed | 0 | 0 |
| FEFO Picking Integration Tests (INV-002) > FEFO Integration with Database Views > should reflect real-time stock changes in view | ✅ passed | 0 | 0 |

### tests/integration/goods-receipts.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Goods Receipts > should create a new goods receipt | ✅ passed | 0 | 0 |
| Goods Receipts > should list goods receipts | ✅ passed | 0 | 0 |
| Goods Receipts > should validate required fields | ✅ passed | 0 | 0 |

### tests/integration/health.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Health Check > should return 200 for health endpoint | ✅ passed | 0 | 0 |

### tests/integration/inventory-views.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| INV-001: Inventory Views > get_mavg_cost function > should calculate moving average cost correctly | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > get_mavg_cost function > should return standard cost if no cost layers exist | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > trg_prevent_negative_stock trigger > should allow consuming exactly available quantity | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > trg_prevent_negative_stock trigger > should allow positive inventory changes | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > trg_prevent_negative_stock trigger > should prevent negative inventory | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_fefo_pick > should not recommend expired lots | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_fefo_pick > should prioritize lots by expiry date (FEFO) | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_inventory_onhand > should aggregate on-hand inventory by product and location | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_inventory_onhand > should calculate total inventory value | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_inventory_onhand > should include product and location details | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_inventory_onhand > should not show products with zero inventory | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_lot_balances > should calculate days to expiry correctly | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_lot_balances > should only show lots with positive balance | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_lot_balances > should show lot unit cost from FIFO cost layer | ✅ passed | 0 | 0 |
| INV-001: Inventory Views > v_lot_balances > should show lot-level inventory balances | ✅ passed | 0 | 0 |

### tests/integration/inventory.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Inventory > Lot Management > should create a new lot | ❌ failed | 0 | 0 |
| Inventory > Lot Management > should prevent duplicate lot numbers for same product/location | ❌ failed | 0 | 0 |
| Inventory > Product Cost Analysis > should get product cost analysis | ❌ failed | 0 | 0 |
| Inventory > Product Cost Analysis > should get product cost analysis for specific location | ❌ failed | 0 | 0 |
| Inventory > Inventory Valuation > should calculate inventory valuation | ✅ passed | 0 | 0 |
| Inventory > Inventory Valuation > should calculate inventory valuation for specific location | ✅ passed | 0 | 0 |
| Inventory > Inventory Valuation > should calculate inventory valuation for specific product | ✅ passed | 0 | 0 |
| Inventory > Lot Management > should filter lots by location | ✅ passed | 0 | 0 |
| Inventory > Lot Management > should filter lots by product | ✅ passed | 0 | 0 |
| Inventory > Lot Management > should get lot by ID | ✅ passed | 0 | 0 |
| Inventory > Lot Management > should list all inventory lots | ✅ passed | 0 | 0 |
| Inventory > Lot Management > should return 404 for non-existent lot | ✅ passed | 0 | 0 |
| Inventory > Lot Management > should return 404 when creating lot for non-existent product | ✅ passed | 0 | 0 |
| Inventory > Lot Management > should search lots by lot number | ✅ passed | 0 | 0 |
| Inventory > Product Cost Analysis > should return 404 for non-existent product cost analysis | ✅ passed | 0 | 0 |
| Inventory > Stock Movements > should record stock movement (issuance) | ✅ passed | 0 | 0 |
| Inventory > Stock Movements > should record stock movement (receipt) | ✅ passed | 0 | 0 |
| Inventory > Stock Movements > should return 404 for movement with non-existent lot | ✅ passed | 0 | 0 |
| Inventory > Stock Movements > should return 404 for movement with non-existent product | ✅ passed | 0 | 0 |

### tests/integration/locations.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| ADM-004: Location Management > DELETE /api/v1/locations/:id > should deactivate location (soft delete) | ✅ passed | 0 | 0 |
| ADM-004: Location Management > DELETE /api/v1/locations/:id > should require authentication | ✅ passed | 0 | 0 |
| ADM-004: Location Management > DELETE /api/v1/locations/:id > should return 404 for non-existent location | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations > should filter locations by city | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations > should filter locations by isActive status | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations > should filter locations by locationType | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations > should filter locations by name | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations > should require authentication | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations > should return paginated list of locations | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations/:id > should require authentication | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations/:id > should return 404 for non-existent location | ✅ passed | 0 | 0 |
| ADM-004: Location Management > GET /api/v1/locations/:id > should return location details | ✅ passed | 0 | 0 |
| ADM-004: Location Management > PATCH /api/v1/locations/:id > should require authentication | ✅ passed | 0 | 0 |
| ADM-004: Location Management > PATCH /api/v1/locations/:id > should return 404 for non-existent location | ✅ passed | 0 | 0 |
| ADM-004: Location Management > PATCH /api/v1/locations/:id > should update location active status | ✅ passed | 0 | 0 |
| ADM-004: Location Management > PATCH /api/v1/locations/:id > should update location address fields | ✅ passed | 0 | 0 |
| ADM-004: Location Management > PATCH /api/v1/locations/:id > should update location contact information | ✅ passed | 0 | 0 |
| ADM-004: Location Management > PATCH /api/v1/locations/:id > should update location coordinates | ✅ passed | 0 | 0 |
| ADM-004: Location Management > PATCH /api/v1/locations/:id > should update location name | ✅ passed | 0 | 0 |
| ADM-004: Location Management > POST /api/v1/locations > should auto-generate location code if not provided | ✅ passed | 0 | 0 |
| ADM-004: Location Management > POST /api/v1/locations > should create a new location with all fields | ✅ passed | 0 | 0 |
| ADM-004: Location Management > POST /api/v1/locations > should create a warehouse location | ✅ passed | 0 | 0 |
| ADM-004: Location Management > POST /api/v1/locations > should reject duplicate location code | ✅ passed | 0 | 0 |
| ADM-004: Location Management > POST /api/v1/locations > should require authentication | ✅ passed | 0 | 0 |
| ADM-004: Location Management > POST /api/v1/locations > should require locationType field | ✅ passed | 0 | 0 |
| ADM-004: Location Management > POST /api/v1/locations > should require name field | ✅ passed | 0 | 0 |

### tests/integration/menus.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Menu Management > Menu CRUD Operations > should add items to menu | ✅ passed | 0 | 0 |
| Menu Management > Menu CRUD Operations > should create a new menu | ✅ passed | 0 | 0 |
| Menu Management > Menu CRUD Operations > should delete menu | ✅ passed | 0 | 0 |
| Menu Management > Menu CRUD Operations > should get all menus | ✅ passed | 0 | 0 |
| Menu Management > Menu CRUD Operations > should get menu by ID | ✅ passed | 0 | 0 |
| Menu Management > Menu CRUD Operations > should get menu items | ✅ passed | 0 | 0 |
| Menu Management > Menu CRUD Operations > should return 404 for non-existent menu | ✅ passed | 0 | 0 |
| Menu Management > Menu CRUD Operations > should update menu | ✅ passed | 0 | 0 |

### tests/integration/multi-location.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/switch-location > should return 403 when switching to unassigned location | ❌ failed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/switch-location > should switch to assigned location | ❌ failed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/switch-location > should update user session context after switching | ❌ failed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should add more locations without replacing | ❌ failed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should assign locations to user | ❌ failed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should handle duplicate location assignments gracefully | ❌ failed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should replace existing locations when replaceExisting=true | ❌ failed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > GET /api/v1/auth/users/:id/locations > should return 404 for non-existent user | ✅ passed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > GET /api/v1/auth/users/:id/locations > should return user locations list | ✅ passed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/switch-location > should return 404 for non-existent location | ✅ passed | 0 | 0 |
| AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should return 400 for invalid location ID | ✅ passed | 0 | 0 |

### tests/integration/product-variants.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Product Variants (ADM-002) > Authentication and Authorization > should reject unauthenticated requests to create variant | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > Authentication and Authorization > should reject unauthenticated requests to get variant | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > Authentication and Authorization > should reject unauthenticated requests to list variants | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > Business Logic Validation > should allow same variant name for different products | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > Business Logic Validation > should maintain display order sorting | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > DELETE /api/v1/product-variants/:id - Delete Variant > should delete variant | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > DELETE /api/v1/product-variants/:id - Delete Variant > should return 404 when deleting non-existent variant | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > GET /api/v1/product-variants/:id - Get Variant by ID > should get variant details by ID | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > GET /api/v1/product-variants/:id - Get Variant by ID > should return 400 for invalid UUID format | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > GET /api/v1/product-variants/:id - Get Variant by ID > should return 404 for non-existent variant ID | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > GET /api/v1/products/:productId/variants - List Variants > should filter variants by active status | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > GET /api/v1/products/:productId/variants - List Variants > should list all variants for a product | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > GET /api/v1/products/:productId/variants - List Variants > should return 404 for non-existent product | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > GET /api/v1/products/:productId/variants - List Variants > should return empty list for product with no variants | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > PATCH /api/v1/product-variants/:id - Update Variant > should fail to update variant name to duplicate | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > PATCH /api/v1/product-variants/:id - Update Variant > should return 404 for updating non-existent variant | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > PATCH /api/v1/product-variants/:id - Update Variant > should update multiple fields at once | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > PATCH /api/v1/product-variants/:id - Update Variant > should update price differential | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > PATCH /api/v1/product-variants/:id - Update Variant > should update variant name | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > POST /api/v1/products/:productId/variants - Create Variant > should create a new variant with all fields | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > POST /api/v1/products/:productId/variants - Create Variant > should create variant with minimal fields (defaults applied) | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > POST /api/v1/products/:productId/variants - Create Variant > should fail to create variant for non-existent product | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > POST /api/v1/products/:productId/variants - Create Variant > should fail to create variant with duplicate name for same product | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > POST /api/v1/products/:productId/variants - Create Variant > should reject invalid product ID format | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > POST /api/v1/products/:productId/variants - Create Variant > should reject negative price differential (schema limitation) | ✅ passed | 0 | 0 |
| Product Variants (ADM-002) > Tenant Isolation > should only return variants for products belonging to current tenant | ✅ passed | 0 | 0 |

### tests/integration/production-orders.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Production Orders > Production Order Management > should cancel production order | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should complete production order | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should create a new production order | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should filter production orders by date range | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should filter production orders by location | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should filter production orders by status | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should get production order by ID | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should list all production orders | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should put production order on hold | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should return 404 for non-existent production order | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should return 404 when creating production order for non-existent location | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should return 404 when creating production order for non-existent recipe | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should start production order | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should update production order | ✅ passed | 0 | 0 |
| Production Orders > Production Order Management > should validate required production order fields | ✅ passed | 0 | 0 |

### tests/integration/products-bulk.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Product Bulk Operations (ADM-001) - API Endpoints > Export -> Import Roundtrip > should successfully import previously exported data | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > GET /api/v1/products/bulk/export > should export all active products as CSV | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > GET /api/v1/products/bulk/export > should export products filtered by kind | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > GET /api/v1/products/bulk/export > should include inactive products when specified | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle all product kinds | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle empty CSV | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle mixed valid and invalid rows | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle numeric values correctly | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle quoted fields with commas and special characters | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should import valid CSV data | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should import without skipHeader option | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should reject import with duplicate SKU | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should reject import with invalid product kind | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should reject import with missing required fields | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should reject import with non-existent UOM | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should return error details limited to 100 entries | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > Product creation and retrieval > should filter products by active status | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > Product creation and retrieval > should filter products by kind | ❌ failed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > GET /api/v1/products/bulk/export > should format CSV with proper quoting | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - API Endpoints > GET /api/v1/products/bulk/export > should return empty CSV with no products | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > Bulk operations simulation > should bulk insert multiple products | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > Bulk operations simulation > should query products with UOM join | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > CSV data format validation > should enforce unique SKU per tenant | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > CSV data format validation > should handle numeric fields correctly | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > CSV data format validation > should handle product kind enum values | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > CSV data format validation > should validate required fields for product creation | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > Product creation and retrieval > should create products with all required fields | ✅ passed | 0 | 0 |
| Product Bulk Operations (ADM-001) - Database Tests > Product creation and retrieval > should retrieve products by tenant | ✅ passed | 0 | 0 |

### tests/integration/products.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| ADM-001: Product Catalog Management > DELETE /api/v1/products/:id > should deactivate product (soft delete) | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > DELETE /api/v1/products/:id > should require authentication | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > DELETE /api/v1/products/:id > should return 404 for non-existent product | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products > should filter products by isActive status | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products > should filter products by isPerishable status | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products > should filter products by name | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products > should filter products by productKind | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products > should filter products by SKU | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products > should require authentication | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products > should return paginated list of products | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products/:id > should require authentication | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products/:id > should return 404 for non-existent product | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > GET /api/v1/products/:id > should return product details | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > PATCH /api/v1/products/:id > should reject update to perishable without shelfLifeDays | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > PATCH /api/v1/products/:id > should require authentication | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > PATCH /api/v1/products/:id > should return 404 for non-existent product | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > PATCH /api/v1/products/:id > should update product active status | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > PATCH /api/v1/products/:id > should update product description | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > PATCH /api/v1/products/:id > should update product name | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > PATCH /api/v1/products/:id > should update product prices | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > PATCH /api/v1/products/:id > should update product to perishable with shelfLifeDays | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should auto-generate SKU for consumable (CS-00001) | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should auto-generate SKU for finished_good (FG-00001) | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should auto-generate SKU for packaging (PK-00001) | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should auto-generate SKU for raw_material (RM-00001) | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should auto-generate SKU for semi_finished (SF-00001) | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should create a new product with all fields | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should create perishable product with shelfLifeDays | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should reject duplicate SKU | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should reject invalid base UOM | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should reject perishable product without shelfLifeDays | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should require authentication | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should require baseUomId field | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should require name field | ✅ passed | 0 | 0 |
| ADM-001: Product Catalog Management > POST /api/v1/products > should require productKind field | ✅ passed | 0 | 0 |

### tests/integration/profile.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| AUTH-003: User Profile Management > GET /api/v1/auth/me > should return current user profile with all fields | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > PATCH /api/v1/auth/me > should require authentication | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > PATCH /api/v1/auth/me > should update multiple profile fields at once | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > PATCH /api/v1/auth/me > should update notification preferences | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > PATCH /api/v1/auth/me > should update user profile name | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > PATCH /api/v1/auth/me > should update user profile phone | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > PATCH /api/v1/auth/me > should update user profile photo URL | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > POST /api/v1/auth/me/change-password > should change password with valid current password | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > POST /api/v1/auth/me/change-password > should reject incorrect current password | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > POST /api/v1/auth/me/change-password > should require authentication | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > POST /api/v1/auth/me/change-password > should validate new password length | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > POST /api/v1/auth/me/photo > should require authentication | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > POST /api/v1/auth/me/photo > should upload profile photo | ✅ passed | 0 | 0 |
| AUTH-003: User Profile Management > POST /api/v1/auth/me/photo > should validate photo URL format | ✅ passed | 0 | 0 |

### tests/integration/requisitions.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Requisitions > should approve a requisition | ✅ passed | 0 | 0 |
| Requisitions > should create a new requisition | ✅ passed | 0 | 0 |
| Requisitions > should filter requisitions by status | ✅ passed | 0 | 0 |
| Requisitions > should list requisitions | ✅ passed | 0 | 0 |
| Requisitions > should reject a requisition | ✅ passed | 0 | 0 |
| Requisitions > should validate items are required | ✅ passed | 0 | 0 |
| Requisitions > should validate required fields | ✅ passed | 0 | 0 |

### tests/integration/suppliers.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| PROC-006: Supplier Management > DELETE /api/v1/suppliers/:id > should deactivate supplier (soft delete) | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > DELETE /api/v1/suppliers/:id > should require authentication | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > DELETE /api/v1/suppliers/:id > should return 404 for non-existent supplier | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers > should filter suppliers by code | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers > should filter suppliers by email | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers > should filter suppliers by isActive status | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers > should filter suppliers by minimum rating | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers > should filter suppliers by name | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers > should require authentication | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers > should return paginated list of suppliers | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers/:id > should require authentication | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers/:id > should return 404 for non-existent supplier | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > GET /api/v1/suppliers/:id > should return supplier details | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > PATCH /api/v1/suppliers/:id > should require authentication | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > PATCH /api/v1/suppliers/:id > should return 404 for non-existent supplier | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > PATCH /api/v1/suppliers/:id > should update supplier active status | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > PATCH /api/v1/suppliers/:id > should update supplier contact information | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > PATCH /api/v1/suppliers/:id > should update supplier name | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > PATCH /api/v1/suppliers/:id > should update supplier payment terms and lead time | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > PATCH /api/v1/suppliers/:id > should update supplier rating | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > POST /api/v1/suppliers > should auto-generate supplier code if not provided | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > POST /api/v1/suppliers > should create a new supplier with all fields | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > POST /api/v1/suppliers > should reject duplicate supplier code | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > POST /api/v1/suppliers > should require authentication | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > POST /api/v1/suppliers > should require email field | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > POST /api/v1/suppliers > should require name field | ✅ passed | 0 | 0 |
| PROC-006: Supplier Management > POST /api/v1/suppliers > should use default payment terms (30 days) if not provided | ✅ passed | 0 | 0 |

### tests/integration/transfers.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Transfers > should create a new transfer | ✅ passed | 0 | 0 |
| Transfers > should filter transfers by from location | ✅ passed | 0 | 0 |
| Transfers > should filter transfers by status | ✅ passed | 0 | 0 |
| Transfers > should get transfer by ID with items | ✅ passed | 0 | 0 |
| Transfers > should list transfers | ✅ passed | 0 | 0 |
| Transfers > should post a completed transfer | ✅ passed | 0 | 0 |
| Transfers > should receive a transfer | ✅ passed | 0 | 0 |
| Transfers > should return 404 for non-existent transfer | ✅ passed | 0 | 0 |
| Transfers > should send a transfer | ✅ passed | 0 | 0 |
| Transfers > should update a draft transfer | ✅ passed | 0 | 0 |
| Transfers > should validate items are required | ✅ passed | 0 | 0 |
| Transfers > should validate required fields | ✅ passed | 0 | 0 |

### tests/integration/uoms.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| UOM Management (ADM-003) > Authentication and Authorization > should reject unauthenticated requests to create UOM | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > Authentication and Authorization > should reject unauthenticated requests to list UOMs | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > DELETE /api/v1/uoms/:id - Delete (Deactivate) UOM > should return 404 when deleting non-existent UOM | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > DELETE /api/v1/uoms/:id - Delete (Deactivate) UOM > should soft delete (deactivate) UOM | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms - List UOMs > should filter UOMs by active status | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms - List UOMs > should filter UOMs by type | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms - List UOMs > should list all UOMs with pagination | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms - List UOMs > should search UOMs by code | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms - List UOMs > should search UOMs by name | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms - List UOMs > should search UOMs with general search query | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms/:id - Get UOM by ID > should get UOM details by ID | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms/:id - Get UOM by ID > should return 400 for invalid UUID format | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > GET /api/v1/uoms/:id - Get UOM by ID > should return 404 for non-existent UOM ID | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > PATCH /api/v1/uoms/:id - Update UOM > should deactivate UOM via PATCH | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > PATCH /api/v1/uoms/:id - Update UOM > should return 404 for updating non-existent UOM | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > PATCH /api/v1/uoms/:id - Update UOM > should update UOM name and description | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > PATCH /api/v1/uoms/:id - Update UOM > should update UOM type | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > POST /api/v1/uoms - Create UOM > should automatically uppercase the UOM code | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > POST /api/v1/uoms - Create UOM > should create a new UOM with all fields | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > POST /api/v1/uoms - Create UOM > should create UOM with minimal fields (defaults applied) | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > POST /api/v1/uoms - Create UOM > should fail to create UOM with duplicate code | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > POST /api/v1/uoms - Create UOM > should reject invalid UOM type | ✅ passed | 0 | 0 |
| UOM Management (ADM-003) > Tenant Isolation > should only return UOMs belonging to current tenant | ✅ passed | 0 | 0 |

### tests/integration/waste.test.ts

| Test Name | Status | Duration (ms) | Retries |
| --- | --- | ---: | ---: |
| Waste Management > Waste Analysis > should get waste analysis filtered by reason | ❌ failed | 0 | 0 |
| Waste Management > Waste Analysis > should get waste analysis | ✅ passed | 0 | 0 |
| Waste Management > Waste Analysis > should get waste analysis filtered by date range | ✅ passed | 0 | 0 |
| Waste Management > Waste Analysis > should get waste analysis filtered by location | ✅ passed | 0 | 0 |
| Waste Management > Waste Analysis > should get waste analysis filtered by product | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should approve and post waste record | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should create a new waste record | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should create waste record for damage | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should create waste record for expiry | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should filter waste records by date range | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should filter waste records by location | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should filter waste records by reason | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should filter waste records by status | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should get waste record by ID | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should list all waste records | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should require at least one item in waste record | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should return 400 when creating waste record with non-existent product | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should return 404 for non-existent waste record | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should return 404 when creating waste record for non-existent location | ✅ passed | 0 | 0 |
| Waste Management > Waste Records Management > should validate required waste record fields | ✅ passed | 0 | 0 |

## ❌ Failure Details

### FEFO Picking Integration Tests (INV-002) > GET /api/v1/inventory/fefo/recommendations > should return FEFO recommendations ordered by expiry date
**File**: `tests/integration/fefo-picking.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 500 to be 200 // Object.is equality

### FEFO Picking Integration Tests (INV-002) > GET /api/v1/inventory/fefo/recommendations > should show quantity needed analysis when specified
**File**: `tests/integration/fefo-picking.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 400 to be 200 // Object.is equality

### FEFO Picking Integration Tests (INV-002) > GET /api/v1/inventory/fefo/recommendations > should return 404 for non-existent product
**File**: `tests/integration/fefo-picking.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 400 to be 404 // Object.is equality

### FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should allocate from earliest expiry lot first (FEFO)
**File**: `tests/integration/fefo-picking.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 500 to be 200 // Object.is equality

### FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should allocate across multiple lots when needed
**File**: `tests/integration/fefo-picking.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 500 to be 200 // Object.is equality

### FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should create stock ledger entries when reserveOnly=false
**File**: `tests/integration/fefo-picking.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 500 to be 200 // Object.is equality

### FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should handle partial allocation when allowPartial=true
**File**: `tests/integration/fefo-picking.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 500 to be 200 // Object.is equality

### FEFO Picking Integration Tests (INV-002) > POST /api/v1/inventory/fefo/allocate > should reject allocation when stock insufficient and allowPartial=false
**File**: `tests/integration/fefo-picking.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 500 to be 400 // Object.is equality

### Inventory > Lot Management > should create a new lot
**File**: `tests/integration/inventory.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 404 to be 201 // Object.is equality

### Inventory > Lot Management > should prevent duplicate lot numbers for same product/location
**File**: `tests/integration/inventory.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 404 to be 400 // Object.is equality

### Inventory > Product Cost Analysis > should get product cost analysis
**File**: `tests/integration/inventory.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 404 to be 200 // Object.is equality

### Inventory > Product Cost Analysis > should get product cost analysis for specific location
**File**: `tests/integration/inventory.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 404 to be 200 // Object.is equality

### AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should assign locations to user
**File**: `tests/integration/multi-location.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 500 to be 200 // Object.is equality

### AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should add more locations without replacing
**File**: `tests/integration/multi-location.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 400 to be 200 // Object.is equality

### AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should replace existing locations when replaceExisting=true
**File**: `tests/integration/multi-location.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 400 to be 200 // Object.is equality

### AUTH-002: Multi-Location Access Control > POST /api/v1/auth/users/:id/locations > should handle duplicate location assignments gracefully
**File**: `tests/integration/multi-location.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 400 to be 200 // Object.is equality

### AUTH-002: Multi-Location Access Control > POST /api/v1/auth/switch-location > should switch to assigned location
**File**: `tests/integration/multi-location.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 403 to be 200 // Object.is equality

### AUTH-002: Multi-Location Access Control > POST /api/v1/auth/switch-location > should return 403 when switching to unassigned location
**File**: `tests/integration/multi-location.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 400 to be 403 // Object.is equality

### AUTH-002: Multi-Location Access Control > POST /api/v1/auth/switch-location > should update user session context after switching
**File**: `tests/integration/multi-location.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected '44642b3e-3125-4317-9078-f221826d4b97' to be 'ec7318eb-e9c5-4d30-876b-1624deacdc24' // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > GET /api/v1/products/bulk/export > should export all active products as CSV
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 12 to be 2 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > GET /api/v1/products/bulk/export > should export products filtered by kind
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 6 to be 1 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > GET /api/v1/products/bulk/export > should include inactive products when specified
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 13 to be 3 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should import valid CSV data
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should import without skipHeader option
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should reject import with missing required fields
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should reject import with invalid product kind
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should reject import with non-existent UOM
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should reject import with duplicate SKU
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle mixed valid and invalid rows
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle quoted fields with commas and special characters
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle empty CSV
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle all product kinds
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should handle numeric values correctly
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > POST /api/v1/products/bulk/import > should return error details limited to 100 entries
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - API Endpoints > Export -> Import Roundtrip > should successfully import previously exported data
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected 401 to be 200 // Object.is equality

### Product Bulk Operations (ADM-001) - Database Tests > Product creation and retrieval > should filter products by kind
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- and is not defined

### Product Bulk Operations (ADM-001) - Database Tests > Product creation and retrieval > should filter products by active status
**File**: `tests/integration/products-bulk.test.ts`
**Duration**: 0ms

**Error Messages:**
- and is not defined

### Waste Management > Waste Analysis > should get waste analysis filtered by reason
**File**: `tests/integration/waste.test.ts`
**Duration**: 0ms

**Error Messages:**
- expected [] to deeply equal ArrayContaining{…}

## ⚡ Performance Analysis

- **Average Test Duration**: 0ms
- **Total Test Time**: 0ms
- **Slowest Test**: 0ms
- **Fastest Test**: 0ms

