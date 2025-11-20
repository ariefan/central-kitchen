# ERP API Refactor Plan

## Goals
- Thin HTTP layer (Fastify routes) that only validates input, maps to DTOs, and returns standard responses.
- Domain logic isolated inside services with reusable repositories/helpers.
- Shared cross-cutting concerns (doc numbering, ledger movements, pagination/responses) live in one place.
- Keep structure simple—no DI containers or Nest-style modules—just clear folders and exported functions.

## Proposed Structure
```
src/
├── app.ts                    # bootstrap only
├── config/
├── middleware/
├── routes/
│   └── v1/
│       └── modules/
│           └── orders/
│               ├── order.route.ts
│               ├── order.schema.ts
│               └── index.ts
├── modules/
│   ├── orders/
│   │   ├── order.service.ts
│   │   ├── order.repository.ts
│   │   └── order.helpers.ts
│   ├── goods-receipts/
│   ├── inventory/
│   └── shared/
│       ├── doc-sequence.ts
│       ├── ledger.service.ts
│       ├── pagination.ts
│       └── responses.ts
└── shared/
    └── types/
```

## Incremental Refactor Steps

### Task List (Priority Order)
1. [x] Introduce shared utilities (doc sequence, ledger service, pagination, responses)
2. [x] Export request context builder from auth middleware
3. [x] Extract services/repositories for orders module
4. [x] Apply service pattern to purchase orders & goods receipts
5. [x] Move inventory logic into services and reuse ledger helpers
6. [x] Flatten HTTP layer (one route file per feature under routes/v1, importing modules via @/* aliases)
7. [x] Introduce shared contracts package (shared Zod DTOs consumed by routes + clients via @contracts/*)
8. [x] Update remaining modules to new structure
   - [x] POS
   - [x] Waste
   - [x] Returns
   - [x] Stock counts
   - [x] Transfers & requisitions
     - [x] Transfers
     - [x] Requisitions
   - [x] Deliveries
   - [x] Production & recipes
   - [x] Reports/analytics
9. [ ] Add unit/integration tests around services/routes
10. [ ] Refresh docs to match new architecture

1. **Introduce Shared Utilities**
   - `modules/shared/doc-sequence.ts`: canonical `generateDocNumber(entity, tenantId, date?)`.
   - `modules/shared/ledger.service.ts`: `recordInventoryMovement`, `reverseLedgerEntries`.
   - `modules/shared/pagination.ts`: wraps the current `buildQueryConditions/createPaginatedResponse` logic.
   - `modules/shared/responses.ts`: single success/error factory so every route stops custom formatting.

2. **Define Request Context**
   - In `middleware/auth.ts`, export a `RequestContext` type `{ tenantId, userId, user, tenant, location }`.
   - Add a helper `buildRequestContext(request)` so services don't touch Fastify objects.

3. **Carve Out Services per Domain**
   - Start with high-traffic flows (orders, purchase orders, goods receipts, inventory).
   - Create `order.service.ts` (create, update, post, void) and `order.repository.ts` (DB access via drizzle).
   - Move calculation helpers (totals, status transitions) into `order.helpers.ts`.
   - Update `order.route.ts` so each handler looks like:
     ```ts
     const dto = orderCreateSchema.parse(request.body);
     const context = buildRequestContext(request);
     const result = await orderService.create(dto, context);
     return reply.send(success(result));
     ```

4. **Normalize DB Access**
   - Repositories should accept `db` from config and expose simple functions (`findById`, `list`, `insertWithItems`).
   - Services orchestrate transactions; routes never touch drizzle directly.

5. **Apply Same Pattern to Other Modules**
   - Goods receipts: service handles posting + ledger writes, reuses shared ledger/doc utilities.
   - Inventory: service responsible for valuation, lot queries, etc., repository encapsulates custom SQL.
   - POS/Waste/Returns: once core modules are done, repeat to reduce 500-line route files.

6. **Testing + Docs**
   - Add unit tests for services (pure functions) and integration tests for key routes.
   - Update docs (README / module-specific) to reflect new folder structure and entry points.

## Guiding Principles
- Keep Fastify plugins/routes dumb; all business logic lives in modules.
- Favor functions over classes unless stateful behavior is required.
- No dependency injection frameworks—just import services/repositories directly.
- Reuse shared helpers aggressively to stay DRY.
- Refactor one module at a time, shipping after each to avoid a megamerge.

Chonk Bonk-Bonk approves this plan. Execute, goblok.
