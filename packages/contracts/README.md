# @contracts/erp

> **Single Source of Truth for Central Kitchen ERP API Contracts**

Type-safe API contracts ensuring consistency between backend (Fastify + Drizzle) and frontend (Next.js) across all 49 ERP features.

## 🎯 Purpose

This package provides:

- **100% alignment** with [FEATURES.md](../../apps/erp-api/docs/FEATURES.md) and [USER_STORIES.md](../../apps/erp-api/docs/USER_STORIES.md)
- **Type-safe** request/response contracts using Zod
- **Zero duplication** - DRY principle across all modules
- **Validated inputs** - Business rules enforced at schema level
- **Frontend autocomplete** - Full TypeScript IntelliSense
- **API documentation** - Self-documenting with JSDoc comments

## 📦 What's Included

### ✅ Phase 1 - Core Modules (Implemented)

| Module | Contracts | Status | Coverage |
|--------|-----------|--------|----------|
| **Common** | Pagination, Sorting, Responses | ✅ Complete | 100% |
| **Primitives** | Money, Quantity, Dates, Validation | ✅ Complete | 100% |
| **Enums** | All status enums from schema | ✅ Complete | 100% |
| **Purchase Orders** | Create, Approve, Send, Query | ✅ Complete | 100% |
| **Goods Receipts** | Create, Post with Lot Tracking | ✅ Complete | 100% |

### 🚧 Phase 2+ - Remaining Modules (To Be Implemented)

Following the same pattern, these modules need contracts:

- **Transfers** - Inter-location movements
- **Requisitions** - Stock requests
- **Inventory** - On-hand, lots, ledger queries
- **Stock Adjustments** - Corrections and write-offs
- **Stock Counts** - Physical count workflow
- **Production** - Recipes and production orders
- **Orders & POS** - Sales orders and payments
- **Deliveries** - Delivery management
- **Returns** - Supplier and customer returns
- **Quality Control** - Temperature, alerts, expiry
- **Customers** - Customer and loyalty management
- **Vouchers** - Promotions and vouchers
- **Admin** - Products, locations, menus, price books
- **Reports** - All reporting contracts

## 🚀 Installation

The package is already configured in your monorepo:

```bash
# In apps/erp-api/package.json
"@contracts/erp": "workspace:*"

# In apps/erp/package.json (add this)
"@contracts/erp": "workspace:*"
```

Then install dependencies:

```bash
pnpm install
```

## 📖 Usage

### Backend (Fastify API)

#### Before (Inline Schemas)

```typescript
// apps/erp-api/src/routes/v1/purchase-orders.routes.ts

import { z } from 'zod';

// ❌ 50+ lines of schema definitions duplicated
const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().uuid(),
  locationId: z.string().uuid(),
  // ... 20 more fields
});
```

#### After (Using Contracts)

```typescript
// apps/erp-api/src/routes/v1/purchase-orders.routes.ts

import {
  purchaseOrderCreateSchema,
  purchaseOrderResponseSchema,
  purchaseOrdersResponseSchema,
  type PurchaseOrderCreate,
  type PurchaseOrderResponse,
} from '@contracts/erp/procurement/purchase-orders';

// ✅ No schema definitions needed!
// ✅ Just use imported contracts
// ✅ Changes propagate automatically
```

### Frontend (Next.js)

#### Before (No Types)

```typescript
// apps/erp/src/lib/api/purchase-orders.ts

const response = await fetch('/api/v1/purchase-orders');
const data = await response.json();  // ❌ any type
```

#### After (Type-Safe)

```typescript
// apps/erp/src/lib/api/purchase-orders.ts

import type {
  PurchaseOrdersResponse,
  PurchaseOrderCreate,
} from '@contracts/erp/procurement/purchase-orders';

const response = await fetch('/api/v1/purchase-orders');
const data: PurchaseOrdersResponse = await response.json();  // ✅ Fully typed!

// ✅ TypeScript autocomplete works!
data.data.items.forEach(po => {
  console.log(po.orderNumber, po.totalAmount);
});
```

## 📚 Module Reference

### Common Utilities

```typescript
import {
  // Schemas
  baseQuerySchema,         // Pagination + sort + search
  paginationSchema,        // Just pagination
  sortSchema,              // Just sorting
  dateRangeFilterSchema,   // Date filtering
  approvalSchema,          // Approval workflows
  rejectionSchema,         // Rejection workflows

  // Response builders
  successResponseSchema,   // Wrap success responses
  paginatedResponseSchema, // Wrap paginated lists

  // Types
  type BaseQuery,
  type PaginatedResponse,
  type SuccessResponse,
} from '@contracts/erp/common';
```

### Primitives

```typescript
import {
  // Money validation
  moneyAmountSchema,       // String with 2 decimals
  moneyInputSchema,        // Number or string → string
  currencySchema,          // ISO 4217 codes
  taxRateSchema,           // 0-100%

  // Quantity validation
  quantitySchema,          // Positive numbers
  stockQuantitySchema,     // Precision decimal strings
  quantityDeltaSchema,     // Can be negative

  // Identifiers
  uuidSchema,              // UUID validation
  documentNumberSchema,    // PO-202501-00001
  skuSchema,               // Product SKUs
  lotNumberSchema,         // Lot numbers

  // Dates
  dateTimeInputSchema,     // ISO 8601
  dateRangeSchema,         // From/to validation

  // Contact
  emailSchema,             // Email validation
  phoneSchema,             // Phone numbers
} from '@contracts/erp/primitives';
```

### Enums

```typescript
import {
  // Document statuses
  purchaseOrderStatusSchema,
  transferStatusSchema,
  productionStatusSchema,

  // Status arrays
  purchaseOrderStatuses,
  docStatuses,

  // Entity enums
  locationTypeSchema,
  productKindSchema,
  orderChannelSchema,

  // Helper functions
  isValidStatusTransition,
  getValidStatusTransitions,

  // Types
  type PurchaseOrderStatus,
  type LocationType,
  type ProductKind,
} from '@contracts/erp/enums';
```

### Purchase Orders

```typescript
import {
  // Input schemas
  purchaseOrderCreateSchema,
  purchaseOrderUpdateSchema,
  purchaseOrderApprovalSchema,
  purchaseOrderSendSchema,

  // Query schemas
  purchaseOrderQuerySchema,
  purchaseOrderFiltersSchema,

  // Response schemas
  purchaseOrderResponseSchema,
  purchaseOrdersResponseSchema,

  // Types
  type PurchaseOrderCreate,
  type PurchaseOrderUpdate,
  type PurchaseOrderResponse,
  type PurchaseOrdersResponse,
  type PurchaseOrderDetail,

  // Helpers
  isValidPOStatusTransition,
  calculateLineTotal,
  calculatePOTotal,
} from '@contracts/erp/procurement/purchase-orders';
```

### Goods Receipts

```typescript
import {
  // Input schemas
  goodsReceiptCreateSchema,
  goodsReceiptPostSchema,

  // Query schemas
  goodsReceiptQuerySchema,

  // Response schemas
  goodsReceiptResponseSchema,
  goodsReceiptsResponseSchema,

  // Types
  type GoodsReceiptCreate,
  type GoodsReceiptDetail,
  type GoodsReceiptResponse,

  // Helpers
  validateLotTracking,      // Critical for perishables!
  calculateVariance,
  requiresOverDeliveryApproval,
} from '@contracts/erp/procurement/goods-receipts';
```

## 🔥 Critical Business Rules Enforced

### Lot Tracking for Perishables

```typescript
import {
  goodsReceiptItemInputSchema,
  validateLotTracking,
} from '@contracts/erp/procurement/goods-receipts';

// ⚠️ CRITICAL: Lot number and expiry date REQUIRED for perishable products
const item = {
  productId: "uuid...",
  quantityReceived: 100,
  uomId: "uuid...",
  unitCost: 5.50,
  lotNumber: "LOT-2025-001",        // REQUIRED if product.isPerishable = true
  expiryDate: "2025-06-01T00:00:00Z", // REQUIRED if product.isPerishable = true
};

// Validate at API layer after product lookup
const validation = validateLotTracking(item, product.isPerishable);
if (!validation.valid) {
  throw new Error(validation.errors.join(', '));
}
```

### Status Workflow Enforcement

```typescript
import {
  isValidPOStatusTransition,
  purchaseOrderStatuses,
} from '@contracts/erp/procurement/purchase-orders';

// Validate status transition
const canTransition = isValidPOStatusTransition('draft', 'pending_approval'); // true
const cannotTransition = isValidPOStatusTransition('draft', 'sent'); // false

// Valid flow: draft → pending_approval → approved → sent → completed
```

### Financial Calculations

```typescript
import {
  calculateLineTotal,
  calculatePOTotal,
} from '@contracts/erp/procurement/purchase-orders';

// Line total: quantity × unitPrice × (1 + taxRate / 100) - discount
const lineTotal = calculateLineTotal(100, 10.50, 10, 5); // Qty, Price, Tax%, Discount

// PO total: SUM(line totals) + shippingCost - documentDiscount
const poTotal = calculatePOTotal(items, shippingCost, discount);
```

## 🎨 Design Patterns

### 1. Base Query Pattern

All list endpoints extend `baseQuerySchema`:

```typescript
export const myQuerySchema = baseQuerySchema.merge(z.object({
  status: z.enum(['active', 'inactive']).optional(),
  // ... custom filters
}));

// Result: Automatic pagination, sorting, and search!
```

### 2. Response Wrapper Pattern

All responses use standard wrappers:

```typescript
// Single item response
export const myResponseSchema = successResponseSchema(myDetailSchema);
// Result: { success: true, data: {...}, message: string }

// Paginated list response
export const myListResponseSchema = paginatedResponseSchema(myListItemSchema);
// Result: { success: true, data: { items: [...], pagination: {...} }, message: string }
```

### 3. Approval Workflow Pattern

Documents with approval use standard schemas:

```typescript
import { approvalSchema, rejectionSchema } from '@contracts/erp/common';

// Approve action
export const myApprovalSchema = approvalSchema;  // { approvalNotes?: string }

// Reject action
export const myRejectionSchema = rejectionSchema;  // { rejectionReason: string }
```

## 📝 Adding New Modules

To add contracts for a new module (e.g., Transfers):

### 1. Create Module File

```bash
touch packages/contracts/src/transfers/transfers.ts
```

### 2. Define Contracts

```typescript
// packages/contracts/src/transfers/transfers.ts

import { z } from 'zod';
import { baseQuerySchema, successResponseSchema } from '../common.js';
import { uuidSchema, quantitySchema } from '../primitives.js';
import { transferStatusSchema } from '../enums.js';

// Input schemas
export const transferCreateSchema = z.object({
  fromLocationId: uuidSchema,
  toLocationId: uuidSchema,
  // ... more fields from FEATURES.md
});

// Response schemas
export const transferDetailSchema = z.object({
  id: uuidSchema,
  transferNumber: z.string(),
  status: transferStatusSchema,
  // ... more fields from FEATURES.md
});

export const transferResponseSchema = successResponseSchema(transferDetailSchema);

// Types
export type TransferCreate = z.infer<typeof transferCreateSchema>;
export type TransferDetail = z.infer<typeof transferDetailSchema>;
```

### 3. Export from Index

```typescript
// packages/contracts/src/index.ts

export * from './transfers/transfers.js';
```

### 4. Update Package.json

```json
{
  "exports": {
    "./transfers/transfers": {
      "import": "./dist/transfers/transfers.js",
      "types": "./dist/transfers/transfers.d.ts"
    }
  }
}
```

### 5. Build and Use

```bash
pnpm --filter @contracts/erp build
```

## 🧪 Testing

### Validate Schemas

```typescript
import { purchaseOrderCreateSchema } from '@contracts/erp/procurement/purchase-orders';

// Valid data
const validPO = {
  supplierId: "uuid...",
  locationId: "uuid...",
  items: [{
    productId: "uuid...",
    quantity: 100,
    uomId: "uuid...",
    unitPrice: 10.50,
  }],
};

const result = purchaseOrderCreateSchema.safeParse(validPO);
if (result.success) {
  console.log('Valid!', result.data);
} else {
  console.error('Invalid!', result.error.errors);
}
```

### Type Checking

```typescript
import type { PurchaseOrderCreate } from '@contracts/erp/procurement/purchase-orders';

// TypeScript will catch errors at compile time
const po: PurchaseOrderCreate = {
  supplierId: "uuid...",
  locationId: "uuid...",
  items: [],  // ❌ Error: At least 1 item required
};
```

## 📋 Checklist for New Contracts

When creating contracts for a new module:

- [ ] Read corresponding section in FEATURES.md
- [ ] Read corresponding user stories in USER_STORIES.md
- [ ] Include ALL fields mentioned in FEATURES.md
- [ ] Add validation rules from business rules section
- [ ] Use common patterns (baseQuerySchema, response wrappers)
- [ ] Import primitives (uuidSchema, quantitySchema, etc.)
- [ ] Import enums (status schemas)
- [ ] Add JSDoc comments with references to FEATURES.md
- [ ] Export all schemas and types
- [ ] Add to main index.ts
- [ ] Update package.json exports
- [ ] Test with safeParse()
- [ ] Document in README

## 🔄 Migration Guide

### Backend Migration

1. **Install @contracts/erp** (already done in erp-api)

2. **Replace inline schemas** with imports:

```typescript
// Before
const purchaseOrderCreateSchema = z.object({...});

// After
import { purchaseOrderCreateSchema } from '@contracts/erp/procurement/purchase-orders';
```

3. **Update route handlers** to use imported types:

```typescript
import type { PurchaseOrderCreate } from '@contracts/erp/procurement/purchase-orders';

app.post('/purchase-orders', async (request, reply) => {
  const data = request.body as PurchaseOrderCreate;
  // ... handler logic
});
```

### Frontend Migration

1. **Add @contracts/erp** to frontend package.json:

```json
{
  "dependencies": {
    "@contracts/erp": "workspace:*"
  }
}
```

2. **Import types** for API calls:

```typescript
import type { PurchaseOrdersResponse } from '@contracts/erp/procurement/purchase-orders';

const { data } = await fetch('/api/v1/purchase-orders')
  .then(res => res.json() as Promise<PurchaseOrdersResponse>);
```

3. **Enjoy autocomplete!** TypeScript will now provide full IntelliSense.

## 🎯 Success Metrics

With @contracts/erp:

- ✅ **Zero schema duplication** - DRY principle enforced
- ✅ **Type-safe API calls** - Frontend knows exact response shapes
- ✅ **Compile-time errors** - Catch API mismatches before runtime
- ✅ **Self-documenting** - Types serve as documentation
- ✅ **Consistent validation** - Same rules everywhere
- ✅ **Faster development** - Autocomplete speeds up coding
- ✅ **Fewer bugs** - Type system catches errors early

## 📚 References

- [FEATURES.md](../../apps/erp-api/docs/FEATURES.md) - Complete feature specifications
- [USER_STORIES.md](../../apps/erp-api/docs/USER_STORIES.md) - User requirements
- [Database Schema](../../apps/erp-api/src/config/schema.ts) - Source of truth for enums

## 📞 Support

For questions or issues:
1. Check this README
2. Review FEATURES.md for business rules
3. Look at existing contracts for patterns
4. Ask in #erp-development channel

---

**Version:** 1.0.0
**Last Updated:** 2025-01-18
**Status:** Phase 1 Complete (Purchase Orders & Goods Receipts)
**Next:** Phase 2 - Transfers, Inventory, Adjustments
