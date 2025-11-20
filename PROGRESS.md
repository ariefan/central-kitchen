# Central Kitchen ERP - Contract Alignment & API Implementation

## Executive Summary

**Current Status**: Dev branch has contracts package ready, but API implementation needs alignment fixes.

### Quick Stats
- **Contracts Package**: ✅ 100% Ready (0 errors)
- **API TypeScript**: ⚠️ 282 errors (29 critical, 221 quality, 32 config)
- **Frontend TypeScript**: ✅ 0 errors
- **API Tests**: ❌ Database not running (all tests blocked)

---

## 📦 Contracts Package Status: **READY** ✅

### Build & Quality
- ✅ TypeScript compilation: **0 errors**
- ✅ Build output: Generated successfully
- ✅ Type definitions: Complete (.d.ts files)
- ✅ Zod 4.1.12: Latest version
- ✅ Documentation: JSDoc on all contracts

### Coverage: 49 ERP Features
| Domain | Status | Features |
|--------|--------|----------|
| **Common** | ✅ Complete | Pagination, responses, filters, sorting |
| **Primitives** | ✅ Complete | Money, quantities, dates, SKU, barcode validation |
| **Enums** | ✅ Complete | All status types aligned with schema |
| **Admin** | ✅ Complete | Products, locations, suppliers, UOMs, menus, categories, stock counts, price books |
| **Procurement** | ✅ Complete | Purchase orders, goods receipts |
| **Inventory** | ✅ Complete | Transfers, requisitions, adjustments, inventory queries |
| **Production** | ✅ Complete | Recipes, production orders, waste management |
| **Sales** | ✅ Complete | Orders, POS, deliveries, returns |
| **Quality** | ✅ Complete | Temperature monitoring, alerts |
| **Customers** | ✅ Complete | Customers, loyalty, vouchers |
| **Auth** | ✅ Complete | Authentication contracts |

### Verification: Schema Alignment
```typescript
// Contracts (/packages/contracts/src/enums.ts)
export const productKinds = ["raw_material", "semi_finished", "finished_good", "packaging", "consumable"];

// API Schema (/apps/erp-api/src/config/schema.ts)
export const productKinds = ["raw_material", "semi_finished", "finished_good", "packaging", "consumable"];

✅ PERFECTLY ALIGNED
```

---

## 🔧 API Implementation Status: **NEEDS FIXES** ⚠️

### Error Breakdown (282 Total)

#### Priority 1: Contract Mismatches (29 errors) 🔴 CRITICAL
| Error Type | Count | Issue | Impact |
|------------|-------|-------|--------|
| TS2339 | 20 | Property doesn't exist | **Orders & Locations broken** |
| TS2345 | 6 | Type not assignable | **Type safety broken** |
| TS2551 | 1 | Property typo (`tender` vs `tenders`) | **Payment broken** |
| TS2769 | 2 | No overload match | **Schema validation broken** |

**Files Affected**:
- `src/modules/orders/order.service.ts` (10 errors)
- `src/routes/v1/locations.routes.ts` (15 errors)
- `src/routes/v1/auth.routes.ts` (2 errors)
- `src/modules/orders/order.schema.ts` (2 errors)

#### Priority 2: TypeScript Config (32 errors) 🟡 MEDIUM
| Error Type | Count | Issue | Fix |
|------------|-------|-------|-----|
| TS6059 | 32 | File not under rootDir | Change `rootDir: "src"` to `rootDir: "."` |

**Impact**: IDE warnings only, code still runs

#### Priority 3: Code Quality (221 errors) 🟢 LOW
| Error Type | Count | Issue | Impact |
|------------|-------|-------|--------|
| TS18048 | 195 | `possibly 'undefined'` | Runtime errors if not handled |
| TS2532 | 20 | `Object is possibly 'undefined'` | Runtime errors if not handled |
| TS18047 | 6 | `is possibly 'null'` | Runtime errors if not handled |

**Impact**: Potential runtime bugs, but not blocking functionality

---

## 🎯 Phase-Based Implementation Plan

### Phase 1: Critical Contract Mismatches (PRIORITY 1) 🔴
**Goal**: Fix 29 contract mismatches to restore type safety
**Estimated Time**: 2-3 hours
**Impact**: High - Breaks orders, locations, payments

#### Tasks:
1. **Orders Module** (10 errors) - `src/modules/orders/order.service.ts`
   - [ ] Remove `query.type` usage → use `query.orderType`
   - [ ] Remove `query.kitchenStatus` usage → not in contract
   - [ ] Remove `data.type` usage → use `data.orderType`
   - [ ] Fix `tender` → `tenders` array
   - [ ] Fix `kitchenStatus` field references

2. **Locations Module** (15 errors) - `src/routes/v1/locations.routes.ts`
   - [ ] Remove `query.page` → use `offset`/`limit`
   - [ ] Fix undefined handling on location queries
   - [ ] Add null checks for query results

3. **Auth Routes** (2 errors) - `src/routes/v1/auth.routes.ts`
   - [ ] Fix undefined handling on user queries
   - [ ] Add null checks for updateData

4. **Order Schema** (2 errors) - `src/modules/orders/order.schema.ts`
   - [ ] Fix schema to match contracts
   - [ ] Ensure proper type exports

### Phase 2: TypeScript Config Fix (PRIORITY 2) 🟡
**Goal**: Fix tsconfig rootDir issue
**Estimated Time**: 5 minutes
**Impact**: Medium - IDE warnings

#### Tasks:
1. **tsconfig.json** - `apps/erp-api/tsconfig.json`
   - [ ] Change `"rootDir": "src"` → `"rootDir": "."`
   - [ ] Verify contracts still resolve
   - [ ] Re-run typecheck

### Phase 3: Code Quality (PRIORITY 3) 🟢
**Goal**: Add null/undefined checks for strict TypeScript
**Estimated Time**: 3-4 hours
**Impact**: Low - Prevents potential runtime bugs

#### Tasks:
1. **Auth Routes** (50+ errors)
   - [ ] Add optional chaining (`?.`)
   - [ ] Add null checks before property access

2. **Locations Routes** (80+ errors)
   - [ ] Add null guards for query results
   - [ ] Use optional chaining

3. **Other Modules** (90+ errors)
   - [ ] Systematic null check additions
   - [ ] Use TypeScript non-null assertions where safe

### Phase 4: Test Infrastructure (PRIORITY 2) 🟡
**Goal**: Enable test execution
**Estimated Time**: 30 minutes
**Impact**: High - Blocks test validation

#### Tasks:
1. **Database Setup**
   - [ ] Start PostgreSQL on port 5432
   - [ ] Run migrations: `pnpm db:migrate`
   - [ ] Seed test data: `pnpm test:setup`

2. **Test Execution**
   - [ ] Run Phase 1 tests: `pnpm test:run`
   - [ ] Document pass/fail status
   - [ ] Update this file with results

---

## 📊 Detailed Error Analysis

### Orders Module Mismatches

**Location**: `src/modules/orders/order.service.ts`

```typescript
// ❌ WRONG (Current API)
if (query.type) {
  where.push(eq(schema.orders.orderType, query.type));
}
if (query.kitchenStatus) {
  where.push(eq(schema.orders.kitchenStatus, query.kitchenStatus));
}

// ✅ CORRECT (According to Contracts)
if (query.orderType) {
  where.push(eq(schema.orders.orderType, query.orderType));
}
// kitchenStatus not in contract - remove or add to contract
```

**Contract Definition**: `packages/contracts/src/sales/orders.ts`
```typescript
export const orderFiltersSchema = z.object({
  status: orderStatusSchema.optional(),
  channel: orderChannelSchema.optional(),
  orderType: orderTypeSchema.optional(), // ✅ orderType, not "type"
  customerId: uuidSchema.optional(),
  shiftId: uuidSchema.optional(),
  // ❌ No kitchenStatus field
});
```

### Locations Module Mismatches

**Location**: `src/routes/v1/locations.routes.ts`

```typescript
// ❌ WRONG (Current API)
const page = query.page || 1;

// ✅ CORRECT (According to Contracts)
const offset = query.offset || 0;
const limit = query.limit || 50;
```

**Contract Definition**: `packages/contracts/src/common.ts`
```typescript
export const baseQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
  // ❌ No "page" field - uses offset/limit for pagination
});
```

---

## ✅ Phase 1 Execution Checklist

### Pre-Execution
- [x] Contracts package built successfully
- [x] Vitest config has @contracts alias
- [x] API dependencies installed
- [ ] Phase 1 errors documented

### Execution Steps
- [ ] Fix Orders module (10 errors)
- [ ] Fix Locations module (15 errors)
- [ ] Fix Auth routes (2 errors)
- [ ] Fix Order schema (2 errors)
- [ ] Run typecheck to verify fixes
- [ ] Commit changes
- [ ] Push to remote

### Validation
- [ ] TypeScript errors reduced from 282 to ~253
- [ ] Critical contract mismatches: 29 → 0
- [ ] All modules use correct contract fields
- [ ] No breaking changes to API

---

## 📈 Progress Tracking

| Phase | Status | Errors Fixed | Errors Remaining | Time Spent | ETA |
|-------|--------|--------------|------------------|------------|-----|
| Phase 1 | ⏳ In Progress | 0 / 29 | 282 | 0h | 2-3h |
| Phase 2 | ⏸️ Pending | 0 / 32 | - | 0h | 5m |
| Phase 3 | ⏸️ Pending | 0 / 221 | - | 0h | 3-4h |
| Phase 4 | ⏸️ Pending | N/A | - | 0h | 30m |
| **Total** | **1% Complete** | **0 / 282** | **282** | **0h** | **6-8h** |

---

## 🚀 Next Actions

### Immediate (Phase 1 - NOW)
1. Fix `order.service.ts` - change `type` to `orderType`
2. Fix `order.service.ts` - remove `kitchenStatus` references
3. Fix `locations.routes.ts` - remove `page`, use `offset`/`limit`
4. Fix `auth.routes.ts` - add null checks
5. Verify with typecheck

### Short Term (Phase 2 & 4)
6. Fix tsconfig rootDir issue
7. Start PostgreSQL database
8. Run test suite

### Medium Term (Phase 3)
9. Add null/undefined guards throughout codebase
10. Enable strict null checks validation

---

**Last Updated**: 2025-11-20 08:00 UTC
**Updated By**: Claude
**Branch**: `dev` → `claude/fix-vitest-contracts-alias-01K3F3sLaHkLJnok6JRyvAPU`
**Status**: Phase 1 ready to execute
