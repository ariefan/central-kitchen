# ERP System Features Documentation

> **Comprehensive feature list for the Central Kitchen ERP System**
>
> This document maps all features from [USER_STORIES.md](./USER_STORIES.md) to the database schema in [schema.ts](../src/config/schema.ts), ensuring complete technical coverage and implementation feasibility.

## Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [Procurement & Purchasing](#2-procurement--purchasing)
3. [Inventory Management](#3-inventory-management)
4. [Stock Movement & Transfers](#4-stock-movement--transfers)
5. [Production & Recipes](#5-production--recipes)
6. [Point of Sale (POS)](#6-point-of-sale-pos)
7. [Order Management (Online)](#7-order-management-online)
8. [Returns Management](#8-returns-management)
9. [Quality Control & Compliance](#9-quality-control--compliance)
10. [Customer & Loyalty](#10-customer--loyalty)
11. [Reporting & Analytics](#11-reporting--analytics)
12. [System Administration](#12-system-administration)
13. [Schema Coverage Analysis](#schema-coverage-analysis)
14. [Recommended Enhancements](#recommended-enhancements)
15. [Implementation Priority](#implementation-priority)

---

## Overview

The Central Kitchen ERP System is a comprehensive F&B management solution supporting:
- **Multi-tenancy** with row-level security
- **Multi-location** operations (central kitchen, outlets, warehouses)
- **Ledger-first** immutable inventory tracking
- **FEFO** (First Expiry, First Out) picking for perishables
- **End-to-end** traceability from procurement to sale
- **Unified** POS and online ordering
- **Complete** quality and compliance management

**Total Features:** 150+ across 12 modules
**Database Tables:** 50+ core entities
**User Stories:** 90+ covering 11 epics

---

## 1. Authentication & User Management

**Database Tables:** `users`, `sessions`, `accounts`, `verifications`, `tenants`, `locations`

### 1.1 User Registration & Login

**Feature ID:** AUTH-001
**User Story:** As a system administrator, I want to create user accounts with role assignments.

**Features:**
- User registration with email verification
- Username and email login support
- Better Auth integration (`users.auth_user_id`)
- Role-based access control (admin, manager, cashier, staff)
- Multi-location access permissions
- User activation/deactivation
- Last login tracking (`users.last_login_at`)
- Session management with expiry

**Database Schema:**
```typescript
// Better Auth integration
users.auth_user_id → Better Auth users table
sessions → Session tracking
accounts → OAuth/Social login providers
verifications → Email verification codes
```

**Business Rules:**
- Email must be unique per tenant
- Username must be unique per tenant
- Passwords must meet complexity requirements (handled by Better Auth)
- Default role: staff
- Inactive users cannot login

**API Endpoints:**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/session` - Get current session
- `POST /api/v1/auth/verify-email` - Verify email address

---

### 1.2 Multi-Location Access Control

**Feature ID:** AUTH-002
**User Story:** As a manager, I want to control which locations a user can access.

**Features:**
- Row-level security enforcement
- Location-based data filtering
- Tenant isolation via `tenant_id`
- Session context setting (`app.tenant_id`, `app.user_id`)
- Location switching within allowed set
- Audit trail for location access

**Database Schema:**
```typescript
users.tenant_id → Multi-tenant isolation
locations → Physical locations
// RLS policies on all tables filtering by tenant_id
```

**Business Rules:**
- Users can only access data within their tenant
- Users can only see locations they're assigned to
- System administrators can access all locations
- Location access is checked at database level via RLS

**API Endpoints:**
- `GET /api/v1/users/:id/locations` - Get user's accessible locations
- `POST /api/v1/users/:id/locations` - Assign locations to user
- `POST /api/v1/auth/switch-location` - Switch active location

---

### 1.3 User Profile Management

**Feature ID:** AUTH-003
**User Story:** As a user, I want to manage my profile information.

**Features:**
- Profile viewing and editing
- Photo upload
- Contact information update
- Password change (via Better Auth)
- Activity log viewing
- Notification preferences

**Database Schema:**
```typescript
users.name, users.email, users.phone, users.photo
users.updated_at → Last profile update
```

**API Endpoints:**
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update profile
- `POST /api/v1/users/me/photo` - Upload profile photo
- `POST /api/v1/users/me/change-password` - Change password

---

## 2. Procurement & Purchasing

**Database Tables:** `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `suppliers`, `supplier_products`

### 2.1 Purchase Order Creation

**Feature ID:** PROC-001
**User Story:** As a purchasing officer, I want to create purchase orders with multiple line items.

**Features:**
- Multi-line PO creation
- Auto-generated document numbers (`PO-YYYYMM-00001`)
- Supplier selection with product catalog
- Product selection with supplier pricing
- Quantity and UOM specification
- Unit price and total calculation
- Tax calculation per line
- Expected delivery date
- Notes and attachments
- Draft mode before submission
- PO preview and PDF generation

**Database Schema:**
```typescript
purchase_orders {
  doc_no: VARCHAR // Auto-generated via generate_doc_sequence()
  supplier_id: UUID → suppliers
  status: ENUM (draft, pending, approved, sent, receiving, completed, cancelled)
  total_amount: NUMERIC
  tax_amount: NUMERIC
  created_by: UUID → users
}

purchase_order_items {
  purchase_order_id: UUID → purchase_orders
  product_id: UUID → products
  quantity: NUMERIC
  uom_id: UUID → uoms
  unit_price: NUMERIC
  tax_rate: NUMERIC
  line_total: NUMERIC
}
```

**Business Rules:**
- PO number is auto-generated on save
- Status starts as "draft"
- Line totals auto-calculate: `quantity * unit_price * (1 + tax_rate)`
- PO total is sum of all line totals
- Cannot edit PO after status = "approved"
- Supplier must have payment terms configured
- Product must be in supplier's catalog

**API Endpoints:**
- `POST /api/v1/purchase-orders` - Create PO
- `GET /api/v1/purchase-orders` - List POs
- `GET /api/v1/purchase-orders/:id` - Get PO details
- `PATCH /api/v1/purchase-orders/:id` - Update PO (draft only)
- `DELETE /api/v1/purchase-orders/:id` - Delete PO (draft only)
- `POST /api/v1/purchase-orders/:id/submit` - Submit for approval
- `GET /api/v1/purchase-orders/:id/pdf` - Generate PDF

---

### 2.2 Purchase Order Approval

**Feature ID:** PROC-002
**User Story:** As a manager, I need to approve POs above a certain threshold before they're sent.

**Features:**
- Approval threshold configuration (e.g., $1000)
- Manager approval required above threshold
- Approval notification to purchasing officer
- Approval history tracking
- Rejection with reason
- Re-submission after changes
- Approval delegation

**Database Schema:**
```typescript
purchase_orders {
  status: ENUM // "pending" → "approved"
  approved_by: UUID → users
  approved_at: TIMESTAMP
  rejection_reason: TEXT
}
```

**Business Rules:**
- POs < threshold: auto-approved
- POs ≥ threshold: require manager approval
- Only managers can approve
- Creator cannot approve their own PO
- Status: draft → pending → approved
- Email notification sent on approval/rejection

**API Endpoints:**
- `POST /api/v1/purchase-orders/:id/approve` - Approve PO
- `POST /api/v1/purchase-orders/:id/reject` - Reject PO
- `GET /api/v1/purchase-orders/pending-approval` - List pending POs

---

### 2.3 Send PO to Supplier

**Feature ID:** PROC-003
**User Story:** As a purchasing officer, I want to email the PO to the supplier as PDF.

**Features:**
- PDF generation with company branding
- Email template with PO details
- Attachment of PDF to email
- CC to internal stakeholders
- Send tracking (sent_at timestamp)
- Re-send capability
- SMS notification (optional)

**Database Schema:**
```typescript
purchase_orders {
  status: ENUM // "approved" → "sent"
  sent_at: TIMESTAMP
  sent_by: UUID → users
}

suppliers {
  email: VARCHAR
  phone: VARCHAR
}
```

**Business Rules:**
- PO must be approved before sending
- Status changes to "sent" after email
- PDF includes: PO number, date, supplier details, line items, terms
- Email template: "Dear [Supplier], please find attached PO #..."
- Track email delivery status

**API Endpoints:**
- `POST /api/v1/purchase-orders/:id/send` - Send PO via email
- `POST /api/v1/purchase-orders/:id/resend` - Resend PO

---

### 2.4 Goods Receipt Creation

**Feature ID:** PROC-004
**User Story:** As a warehouse clerk, I want to record goods receipts when deliveries arrive.

**Features:**
- GR from PO or standalone
- Receive full or partial quantities
- Lot number assignment
- Expiry date capture (for perishables)
- Over/under delivery tracking
- Variance notes
- Photo upload for documentation
- Packing slip reference
- Multiple GRs per PO (partial deliveries)
- GR date and time recording

**Database Schema:**
```typescript
goods_receipts {
  doc_no: VARCHAR // Auto-generated (GR-YYYYMM-00001)
  purchase_order_id: UUID → purchase_orders (nullable)
  supplier_id: UUID → suppliers
  received_date: DATE
  status: ENUM (draft, posted)
  created_by: UUID → users
}

goods_receipt_items {
  goods_receipt_id: UUID → goods_receipts
  po_item_id: UUID → purchase_order_items (nullable)
  product_id: UUID → products
  lot_number: VARCHAR
  expiry_date: DATE
  received_qty: NUMERIC
  ordered_qty: NUMERIC
  variance_qty: NUMERIC // received - ordered
  variance_notes: TEXT
}
```

**Business Rules:**
- GR number auto-generated on save
- Lot number required for products with `is_perishable = true`
- Expiry date required for perishable items
- Variance = received_qty - ordered_qty
- Cannot receive more than ordered without manager approval
- Status starts as "draft"
- Posting to inventory happens on status → "posted"

**API Endpoints:**
- `POST /api/v1/goods-receipts` - Create GR
- `GET /api/v1/goods-receipts` - List GRs
- `GET /api/v1/goods-receipts/:id` - Get GR details
- `PATCH /api/v1/goods-receipts/:id` - Update GR (draft only)
- `POST /api/v1/goods-receipts/:id/post` - Post to inventory

---

### 2.5 Post Goods Receipt to Inventory

**Feature ID:** PROC-005
**User Story:** As a warehouse clerk, I want goods receipts to automatically update inventory.

**Features:**
- Automatic lot creation for each GR line
- Stock ledger entry creation (`movement_type = 'gr'`)
- Inventory on-hand update
- Cost layer creation (FIFO costing)
- PO status update (receiving → completed when fully received)
- Email notification to purchasing officer
- Posting validation (negative stock prevention)
- Idempotent posting (prevent double-posting)

**Database Schema:**
```typescript
lots {
  lot_number: VARCHAR
  product_id: UUID → products
  expiry_date: DATE
  received_date: DATE
  is_active: BOOLEAN
}

stock_ledger {
  product_id: UUID → products
  location_id: UUID → locations
  lot_id: UUID → lots
  movement_type: ENUM // 'gr'
  quantity: NUMERIC // Positive for receipts
  uom_id: UUID → uoms
  unit_cost: NUMERIC
  reference_doc: VARCHAR // GR doc_no
  reference_id: UUID // goods_receipt_id
  txn_ts: TIMESTAMP
}

cost_layers {
  product_id: UUID → products
  location_id: UUID → locations
  lot_id: UUID → lots
  quantity_received: NUMERIC
  quantity_remaining: NUMERIC
  unit_cost: NUMERIC
  received_date: TIMESTAMP
}
```

**Business Rules:**
- Posting is atomic (all-or-nothing)
- Lot is created if doesn't exist
- Stock ledger entry with positive quantity
- Cost layer entry for FIFO costing
- Trigger `check_negative_stock()` to prevent negative inventory
- GR status → "posted" (immutable after posting)
- PO status updates based on received vs ordered quantities
- On-hand calculated via `v_inventory_onhand` view

**API Endpoints:**
- `POST /api/v1/goods-receipts/:id/post` - Post GR to inventory
- `GET /api/v1/goods-receipts/:id/impact` - Preview inventory impact

---

### 2.6 Supplier Management

**Feature ID:** PROC-006
**User Story:** As a purchasing officer, I want to maintain supplier master data.

**Features:**
- Supplier creation with code and name
- Contact information (email, phone, address)
- Payment terms configuration (days)
- Lead time tracking (days)
- Tax ID and business license
- Primary contact person
- Supplier rating/score
- Active/inactive status
- Supplier product catalog
- Product pricing per supplier
- Multiple suppliers per product
- Primary supplier designation

**Database Schema:**
```typescript
suppliers {
  code: VARCHAR // Unique
  name: VARCHAR
  email: VARCHAR
  phone: VARCHAR
  address: TEXT
  payment_terms: INTEGER // Days (e.g., 30 for Net 30)
  lead_time_days: INTEGER
  tax_id: VARCHAR
  is_active: BOOLEAN
}

supplier_products {
  supplier_id: UUID → suppliers
  product_id: UUID → products
  supplier_sku: VARCHAR // Supplier's product code
  unit_price: NUMERIC
  uom_id: UUID → uoms
  lead_time_days: INTEGER // Override supplier default
  is_primary: BOOLEAN // Primary supplier for this product
  is_active: BOOLEAN
}
```

**Business Rules:**
- Supplier code is unique per tenant
- Email required for PO sending
- Only one primary supplier per product
- Inactive suppliers cannot receive new POs
- Payment terms default to 30 days
- Lead time used for expected delivery calculation

**API Endpoints:**
- `POST /api/v1/suppliers` - Create supplier
- `GET /api/v1/suppliers` - List suppliers
- `GET /api/v1/suppliers/:id` - Get supplier details
- `PATCH /api/v1/suppliers/:id` - Update supplier
- `GET /api/v1/suppliers/:id/products` - Get supplier product catalog
- `POST /api/v1/suppliers/:id/products` - Add product to catalog
- `PATCH /api/v1/supplier-products/:id` - Update supplier product

---

## 3. Inventory Management

**Database Tables:** `stock_ledger`, `lots`, `v_inventory_onhand`, `v_lot_balances`, `stock_adjustments`, `stock_adjustment_items`, `stock_counts`, `stock_count_lines`

### 3.1 Real-Time Inventory Visibility

**Feature ID:** INV-001
**User Story:** As a warehouse manager, I want to see real-time on-hand inventory by product and location.

**Features:**
- On-hand quantity by product and location
- Multi-UOM display (e.g., 10 boxes = 1000 pcs)
- Lot-level detail with expiry dates
- Stock value calculation (quantity × cost)
- Inventory aging analysis
- Fast-moving vs slow-moving indicators
- Filter by category, product type, location
- Excel export
- Real-time updates (no caching lag)
- Negative stock highlighting

**Database Schema:**
```typescript
// View that calculates on-hand from ledger
v_inventory_onhand {
  tenant_id: UUID
  product_id: UUID
  location_id: UUID
  onhand_qty: NUMERIC // SUM of ledger quantities
  base_uom_id: UUID
  product_name: VARCHAR
  location_name: VARCHAR
}

// View for lot-level balances
v_lot_balances {
  tenant_id: UUID
  product_id: UUID
  location_id: UUID
  lot_id: UUID
  lot_number: VARCHAR
  expiry_date: DATE
  quantity: NUMERIC // Balance for this lot
  days_to_expiry: INTEGER
}
```

**Business Rules:**
- On-hand = SUM(stock_ledger.quantity) grouped by product, location
- Positive quantity = receipts (GR, transfers in, production in)
- Negative quantity = issues (sales, transfers out, production out)
- View is always current (computed on-demand)
- Cost from `get_mavg_cost()` function or cost_layers
- Alert if quantity < 0 (should never happen due to constraint)

**API Endpoints:**
- `GET /api/v1/inventory/onhand` - Get on-hand inventory
- `GET /api/v1/inventory/onhand/:productId/:locationId` - Get specific item
- `GET /api/v1/inventory/lots` - Get lot-level inventory
- `GET /api/v1/inventory/export` - Export to Excel

---

### 3.2 FEFO Picking for Perishables

**Feature ID:** INV-002
**User Story:** As a warehouse clerk, I want the system to suggest FEFO picking (First Expiry, First Out).

**Features:**
- Automatic lot selection based on earliest expiry
- FEFO pick list generation
- Expiry date visibility during picking
- Allocation to orders/production
- Pick by zone/bin location
- Handheld scanner integration
- Pick confirmation
- Short-pick handling

**Database Schema:**
```typescript
// View that orders lots by expiry date
v_fefo_pick {
  tenant_id: UUID
  product_id: UUID
  location_id: UUID
  lot_id: UUID
  lot_number: VARCHAR
  expiry_date: DATE
  quantity_available: NUMERIC
  pick_priority: INTEGER // 1 = pick first
}

// Ledger entries reference specific lots
stock_ledger {
  lot_id: UUID → lots
}
```

**Business Rules:**
- FEFO only applies to perishable products (`products.is_perishable = true`)
- Pick priority: earliest expiry date first
- Exclude expired lots (expiry_date < CURRENT_DATE)
- Exclude lots with zero balance
- Allocation to orders happens at payment time
- Production orders consume lots in FEFO order

**API Endpoints:**
- `GET /api/v1/inventory/fefo-pick` - Get FEFO pick list
- `POST /api/v1/inventory/allocate` - Allocate lots to order/production

---

### 3.3 Stock Adjustments

**Feature ID:** INV-003
**User Story:** As a warehouse manager, I want to create stock adjustments to correct inventory discrepancies.

**Features:**
- Adjustment creation with multiple reasons
- Reason types: damage, expiry, theft, found, correction, waste, spoilage
- Manager approval required before posting
- Photo upload for documentation
- Adjustment notes per line
- Lot-specific adjustments
- Cost tracking for valuation impact
- Negative stock prevention
- Audit trail

**Database Schema:**
```typescript
stock_adjustments {
  doc_no: VARCHAR // Auto-generated (ADJ-YYYYMM-00001)
  location_id: UUID → locations
  reason: ENUM (damage, expiry, theft, found, correction, waste, spoilage)
  status: ENUM (draft, pending, posted)
  notes: TEXT
  created_by: UUID → users
  approved_by: UUID → users
  approved_at: TIMESTAMP
}

stock_adjustment_items {
  adjustment_id: UUID → stock_adjustments
  product_id: UUID → products
  lot_id: UUID → lots (nullable)
  quantity: NUMERIC // Can be positive or negative
  uom_id: UUID → uoms
  unit_cost: NUMERIC
  reason_notes: TEXT
}
```

**Business Rules:**
- Adjustment number auto-generated on save
- Status flow: draft → pending → posted
- Manager approval required for posting
- Positive quantity = found/correction up
- Negative quantity = damage/waste/theft/expiry
- Cannot post if results in negative inventory
- Ledger entry created on posting (`movement_type = 'adjustment'`)
- Cost impact recorded for valuation

**API Endpoints:**
- `POST /api/v1/adjustments` - Create adjustment
- `GET /api/v1/adjustments` - List adjustments
- `GET /api/v1/adjustments/:id` - Get adjustment details
- `PATCH /api/v1/adjustments/:id` - Update adjustment (draft only)
- `POST /api/v1/adjustments/:id/submit` - Submit for approval
- `POST /api/v1/adjustments/:id/approve` - Approve and post
- `POST /api/v1/adjustments/:id/reject` - Reject adjustment

---

### 3.4 Physical Stock Counts

**Feature ID:** INV-004
**User Story:** As a warehouse manager, I want to conduct physical stock counts to verify inventory accuracy.

**Features:**
- Stock count creation by location
- Auto-numbering (`CNT-YYYYMM-00001`)
- System pre-fill with current on-hand quantities
- Mobile counting interface
- Barcode scanning support
- Lot-level counting
- Progress tracking (lines counted vs total)
- Resume capability (save partial counts)
- Variance calculation (counted vs system)
- Manager review before posting
- Automatic adjustment generation on posting
- Variance threshold alerts
- Count history tracking

**Database Schema:**
```typescript
stock_counts {
  doc_no: VARCHAR // Auto-generated
  location_id: UUID → locations
  count_date: DATE
  status: ENUM (draft, in_progress, completed, posted)
  total_lines: INTEGER
  counted_lines: INTEGER
  created_by: UUID → users
  reviewed_by: UUID → users
  posted_at: TIMESTAMP
}

stock_count_lines {
  count_id: UUID → stock_counts
  product_id: UUID → products
  lot_id: UUID → lots (nullable)
  system_qty: NUMERIC // Pre-filled from v_inventory_onhand
  counted_qty: NUMERIC // Entered by counter
  variance_qty: NUMERIC // counted - system
  uom_id: UUID → uoms
  notes: TEXT
  counted_by: UUID → users
  counted_at: TIMESTAMP
}
```

**Business Rules:**
- Count number auto-generated on save
- Status flow: draft → in_progress → completed → posted
- System quantities pre-filled from `v_inventory_onhand`
- Variance = counted_qty - system_qty
- Alert if |variance| > threshold (e.g., 5%)
- Manager must review and approve before posting
- Posting creates stock adjustment with variances
- Adjustment reason = "stock_count"
- Lock inventory during counting (optional)

**API Endpoints:**
- `POST /api/v1/stock-counts` - Create stock count
- `GET /api/v1/stock-counts` - List stock counts
- `GET /api/v1/stock-counts/:id` - Get count details
- `PATCH /api/v1/stock-counts/:id/lines/:lineId` - Update counted quantity
- `POST /api/v1/stock-counts/:id/start` - Start counting (draft → in_progress)
- `POST /api/v1/stock-counts/:id/complete` - Complete counting (in_progress → completed)
- `POST /api/v1/stock-counts/:id/post` - Post count (completed → posted)
- `GET /api/v1/stock-counts/:id/variances` - Get variance report

---

### 3.5 Mobile Counting Interface

**Feature ID:** INV-005
**User Story:** As a warehouse staff, I want a mobile interface to count stock with barcode scanning.

**Features:**
- Mobile-optimized UI
- Barcode scanner integration
- Product lookup by barcode or name
- Large input fields for counted quantity
- Offline mode with sync
- Voice input for hands-free counting
- Photo capture for discrepancies
- Real-time progress indicator
- Sort by aisle/bin location
- Skip products with zero count
- Batch scanning mode

**Database Schema:**
- Same as 3.4 (stock_counts, stock_count_lines)
- Products must have barcodes populated

**Business Rules:**
- Scan barcode → auto-fill product and system quantity
- Enter counted quantity → auto-calculate variance
- Save immediately to allow resume
- Offline queue syncs when online
- Display variance alert if significant

**API Endpoints:**
- `GET /api/v1/stock-counts/:id/mobile` - Get mobile-optimized count data
- `POST /api/v1/stock-counts/:id/scan` - Submit scanned barcode
- `POST /api/v1/stock-counts/:id/count-line` - Update count for a line

---

### 3.6 Inventory Valuation

**Feature ID:** INV-006
**User Story:** As a finance manager, I want to see inventory valuation by cost method (FIFO or moving average).

**Features:**
- Valuation by location
- Valuation by category/product type
- Cost method selection (FIFO vs moving average)
- Extended value calculation (quantity × unit cost)
- Cost layer detail (FIFO method)
- Valuation as of specific date (historical)
- Variance from standard cost
- Aging analysis (slow-moving items)
- Excel export with drill-down

**Database Schema:**
```typescript
cost_layers {
  product_id: UUID
  location_id: UUID
  lot_id: UUID
  quantity_received: NUMERIC
  quantity_remaining: NUMERIC
  unit_cost: NUMERIC
  received_date: TIMESTAMP
}

// Function for moving average cost
get_mavg_cost(p_tenant_id, p_product_id, p_location_id) → NUMERIC
```

**Business Rules:**
- FIFO: value = SUM(cost_layers.quantity_remaining × unit_cost)
- Moving Average: value = onhand_qty × get_mavg_cost()
- Default to moving average if cost layers not enabled
- Historical valuation uses ledger as of date
- Exclude inactive products
- Group by category, product type, location

**API Endpoints:**
- `GET /api/v1/inventory/valuation` - Get inventory valuation
- `GET /api/v1/inventory/valuation/detail` - Get cost layer details
- `GET /api/v1/inventory/valuation/export` - Export to Excel

---

## 4. Stock Movement & Transfers

**Database Tables:** `transfers`, `transfer_items`, `requisitions`, `requisition_items`

### 4.1 Inter-Location Stock Transfers

**Feature ID:** XFER-001
**User Story:** As a warehouse manager, I want to transfer stock between locations with approval workflow.

**Features:**
- Transfer request creation
- Multi-item transfers
- UOM specification per line
- From/to location selection
- Approval workflow (requesting vs sending location)
- Stock reservation on approval
- Lot selection for shipment (FEFO recommended)
- Ship/in-transit status tracking
- Receive transfer with damage flagging
- Variance tracking (shipped vs received)
- Packing slip generation
- Driver/vehicle information capture
- Dual ledger entries (xfer_out, xfer_in)
- Email notifications

**Database Schema:**
```typescript
transfers {
  doc_no: VARCHAR // Auto-generated (XFER-YYYYMM-00001)
  from_location_id: UUID → locations
  to_location_id: UUID → locations
  status: ENUM (draft, pending, approved, shipped, in_transit, received, cancelled)
  requested_date: DATE
  required_date: DATE
  shipped_date: DATE
  received_date: DATE
  notes: TEXT
  driver_name: VARCHAR
  vehicle_number: VARCHAR
  created_by: UUID → users
  approved_by: UUID → users
}

transfer_items {
  transfer_id: UUID → transfers
  product_id: UUID → products
  lot_id: UUID → lots (selected during shipment)
  requested_qty: NUMERIC
  shipped_qty: NUMERIC
  received_qty: NUMERIC
  damaged_qty: NUMERIC
  uom_id: UUID → uoms
  notes: TEXT
}
```

**Business Rules:**
- Transfer number auto-generated on save
- Status flow: draft → pending → approved → shipped → received
- Approval required before shipping
- Stock reserved in from_location on approval
- Lot selection happens during shipment (FEFO recommended)
- Ledger entry on ship: xfer_out (negative qty) in from_location
- Ledger entry on receive: xfer_in (positive qty) in to_location
- Variance = received_qty - shipped_qty
- Damaged quantity recorded for loss tracking
- Cannot ship more than on-hand
- Cannot ship without approval

**API Endpoints:**
- `POST /api/v1/transfers` - Create transfer
- `GET /api/v1/transfers` - List transfers
- `GET /api/v1/transfers/:id` - Get transfer details
- `PATCH /api/v1/transfers/:id` - Update transfer (draft only)
- `POST /api/v1/transfers/:id/submit` - Submit for approval
- `POST /api/v1/transfers/:id/approve` - Approve transfer
- `POST /api/v1/transfers/:id/ship` - Ship transfer (select lots)
- `POST /api/v1/transfers/:id/receive` - Receive transfer
- `GET /api/v1/transfers/:id/packing-slip` - Generate packing slip PDF

---

### 4.2 Stock Requisitions

**Feature ID:** XFER-002
**User Story:** As an outlet manager, I want to request stock from the central kitchen.

**Features:**
- Requisition creation to central kitchen
- Multi-item requisition
- Required date specification
- Approval by central kitchen manager
- Issuance workflow
- Partial fulfillment support
- Shortage tracking for backorders
- Issue stock with ledger posting
- Delivery scheduling
- Requisition status tracking
- Auto-conversion to transfer on approval

**Database Schema:**
```typescript
requisitions {
  doc_no: VARCHAR // Auto-generated (REQ-YYYYMM-00001)
  from_location_id: UUID → locations // Central kitchen
  to_location_id: UUID → locations // Requesting outlet
  status: ENUM (draft, pending, approved, issued, completed, cancelled)
  required_date: DATE
  issued_date: DATE
  notes: TEXT
  created_by: UUID → users
  approved_by: UUID → users
}

requisition_items {
  requisition_id: UUID → requisitions
  product_id: UUID → products
  requested_qty: NUMERIC
  approved_qty: NUMERIC // May be less than requested
  issued_qty: NUMERIC
  uom_id: UUID → uoms
  shortage_qty: NUMERIC // requested - issued
}
```

**Business Rules:**
- Requisition number auto-generated on save
- Status flow: draft → pending → approved → issued → completed
- Central kitchen manager approves requisition
- Approved quantity may be less than requested (due to stock availability)
- Shortage = requested_qty - issued_qty
- On issuance, create transfer from central kitchen to outlet
- Ledger entries via transfer flow
- Email notification to requester on approval/issuance

**API Endpoints:**
- `POST /api/v1/requisitions` - Create requisition
- `GET /api/v1/requisitions` - List requisitions
- `GET /api/v1/requisitions/:id` - Get requisition details
- `PATCH /api/v1/requisitions/:id` - Update requisition (draft only)
- `POST /api/v1/requisitions/:id/submit` - Submit for approval
- `POST /api/v1/requisitions/:id/approve` - Approve requisition
- `POST /api/v1/requisitions/:id/issue` - Issue stock (creates transfer)

---

## 5. Production & Recipes

**Database Tables:** `recipes`, `recipe_items`, `production_orders`

### 5.1 Recipe Management

**Feature ID:** PROD-001
**User Story:** As a production manager, I want to create recipes with multi-ingredient BOMs.

**Features:**
- Recipe creation for finished products
- Multi-ingredient BOM (Bill of Materials)
- Ingredient quantity and UOM
- Yield quantity specification
- Recipe versioning with active version control
- Preparation instructions
- Cooking time and temperature
- Recipe cost calculation
- Cost breakdown by ingredient
- Missing cost highlighting
- Recipe search and filtering
- Recipe duplication for variants
- Recipe photo upload

**Database Schema:**
```typescript
recipes {
  recipe_code: VARCHAR // e.g., "RC001"
  version: INTEGER // 1, 2, 3...
  product_id: UUID → products // Finished good
  yield_qty: NUMERIC // How much the recipe produces
  yield_uom_id: UUID → uoms
  instructions: TEXT
  prep_time_minutes: INTEGER
  cook_time_minutes: INTEGER
  is_active: BOOLEAN // Only one active version per recipe_code
  created_by: UUID → users
}

recipe_items {
  recipe_id: UUID → recipes
  product_id: UUID → products // Raw material or semi-finished
  quantity: NUMERIC
  uom_id: UUID → uoms
  notes: TEXT
  sort_order: INTEGER
}
```

**Business Rules:**
- Recipe code is unique per tenant
- Only one active version per recipe_code
- Creating new version: copy recipe + items, increment version
- Activating new version: set old version.is_active = false
- Recipe cost = SUM(item_quantity × item_unit_cost)
- Cost per unit = recipe_cost / yield_qty
- Missing cost alert if any ingredient has NULL cost
- Cannot delete recipe if used in production orders

**API Endpoints:**
- `POST /api/v1/recipes` - Create recipe
- `GET /api/v1/recipes` - List recipes
- `GET /api/v1/recipes/:id` - Get recipe details
- `PATCH /api/v1/recipes/:id` - Update recipe
- `POST /api/v1/recipes/:id/new-version` - Create new version
- `POST /api/v1/recipes/:id/activate` - Activate version
- `GET /api/v1/recipes/:id/cost` - Get recipe cost breakdown

---

### 5.2 Production Orders

**Feature ID:** PROD-002
**User Story:** As a production supervisor, I want to schedule production batches and track completion.

**Features:**
- Production batch scheduling
- Auto-numbering (`PROD-YYYYMM-00001`)
- Recipe selection (active version used)
- Batch quantity specification
- Ingredient availability validation
- Production date/time scheduling
- Status tracking (scheduled → in_progress → completed)
- Start/stop timestamps
- Actual vs planned quantity tracking
- Yield variance calculation
- Component consumption posting (`prod_out`)
- Finished goods receipt posting (`prod_in`)
- Production waste/spoilage recording
- Cost allocation from components to FG
- Lot creation for finished products
- Production notes and photos

**Database Schema:**
```typescript
production_orders {
  doc_no: VARCHAR // Auto-generated
  recipe_id: UUID → recipes // Active version
  location_id: UUID → locations
  status: ENUM (scheduled, in_progress, completed, cancelled)
  planned_qty: NUMERIC // How many units to produce
  actual_qty: NUMERIC // How many actually produced
  waste_qty: NUMERIC // Spoilage/waste
  yield_variance_pct: NUMERIC // (actual - planned) / planned
  scheduled_date: DATE
  started_at: TIMESTAMP
  completed_at: TIMESTAMP
  lot_number: VARCHAR // For finished goods
  expiry_date: DATE
  notes: TEXT
  created_by: UUID → users
}
```

**Business Rules:**
- Production number auto-generated on save
- Status flow: scheduled → in_progress → completed
- On start: validate ingredient availability
- On start: create ledger entries for ingredient consumption (prod_out, negative qty)
- On complete: create ledger entry for FG receipt (prod_in, positive qty)
- On complete: create lot for finished goods
- Cost of FG = sum of consumed component costs
- Yield variance = (actual_qty - planned_qty) / planned_qty × 100
- Waste recorded as separate adjustment
- Cannot start if ingredients insufficient
- Cannot complete without start

**API Endpoints:**
- `POST /api/v1/production-orders` - Create production order
- `GET /api/v1/production-orders` - List production orders
- `GET /api/v1/production-orders/:id` - Get production order details
- `PATCH /api/v1/production-orders/:id` - Update production order
- `POST /api/v1/production-orders/:id/start` - Start production
- `POST /api/v1/production-orders/:id/complete` - Complete production
- `GET /api/v1/production-orders/:id/ingredient-availability` - Check ingredients

---

### 5.3 Production Waste Tracking

**Feature ID:** PROD-003
**User Story:** As a production manager, I want to track waste and spoilage during production.

**Features:**
- Waste quantity recording
- Waste reason (over-production, spoilage, trimming, burnt)
- Photo upload for documentation
- Waste cost calculation
- Waste percentage by recipe
- Waste trend analysis
- Waste reduction targets
- Disposal method recording

**Database Schema:**
```typescript
production_orders {
  waste_qty: NUMERIC
  waste_reason: VARCHAR
  waste_notes: TEXT
}

// Also tracked via stock adjustments
stock_adjustments {
  reason: ENUM // 'waste', 'spoilage'
}
```

**Business Rules:**
- Waste reduces actual yield: actual_qty = planned_qty - waste_qty
- Waste cost allocated from component consumption
- Waste % = waste_qty / planned_qty × 100
- Alert if waste % > threshold (e.g., 10%)
- Waste ledger entry as adjustment (movement_type = 'adjustment')

**API Endpoints:**
- `POST /api/v1/production-orders/:id/record-waste` - Record waste
- `GET /api/v1/production/waste-report` - Waste analysis report

---

## 6. Point of Sale (POS)

**Database Tables:** `orders`, `order_items`, `order_item_modifiers`, `payments`, `pos_shifts`, `drawer_movements`, `modifier_groups`, `modifiers`

### 6.1 POS Shift Management

**Feature ID:** POS-001
**User Story:** As a cashier, I want to open a shift with a cash float and close it with reconciliation.

**Features:**
- Shift opening with cash float
- One active shift per device/user enforcement
- Shift details (cashier, device, location, start time)
- Cash drawer movements (cash in/out, petty cash, safe drop)
- Manager approval for large movements
- Shift close with reconciliation
- Expected vs actual cash calculation
- Variance tracking and flagging
- Shift report generation (PDF)
- Cash deposit slip
- Email report to manager
- Historical shift lookup

**Database Schema:**
```typescript
pos_shifts {
  shift_no: VARCHAR // Auto-generated (SHIFT-YYYYMM-00001)
  location_id: UUID → locations
  user_id: UUID → users // Cashier
  device_id: VARCHAR
  status: ENUM (open, closed)
  opened_at: TIMESTAMP
  closed_at: TIMESTAMP
  opening_float: NUMERIC
  cash_sales: NUMERIC // Sum of cash payments
  cash_in: NUMERIC // Cash added to drawer
  cash_out: NUMERIC // Cash removed from drawer
  expected_cash: NUMERIC // opening_float + cash_sales + cash_in - cash_out
  actual_cash: NUMERIC // Counted during close
  variance: NUMERIC // actual - expected
  notes: TEXT
}

drawer_movements {
  shift_id: UUID → pos_shifts
  type: ENUM (cash_in, cash_out, safe_drop, petty_cash)
  amount: NUMERIC
  reason: TEXT
  created_at: TIMESTAMP
  created_by: UUID → users
  approved_by: UUID → users (for large amounts)
}
```

**Business Rules:**
- Only one open shift per user/device at a time
- Opening float typically $100-500
- Expected cash = opening_float + cash_sales + cash_in - cash_out
- Variance = actual_cash - expected_cash
- Variance threshold: ±$5 acceptable, >$10 flagged for review
- Manager approval required for cash_out > $200
- Shift close: status = closed, cannot reopen
- Shift report includes: sales summary, payment breakdown, variance

**API Endpoints:**
- `POST /api/v1/pos/shifts/open` - Open shift
- `GET /api/v1/pos/shifts/current` - Get current shift
- `POST /api/v1/pos/shifts/:id/drawer-movement` - Record cash in/out
- `POST /api/v1/pos/shifts/:id/close` - Close shift
- `GET /api/v1/pos/shifts/:id/report` - Generate shift report PDF
- `GET /api/v1/pos/shifts` - List shifts (history)

---

### 6.2 POS Order Creation

**Feature ID:** POS-002
**User Story:** As a cashier, I want to create orders with products, variants, and modifiers.

**Features:**
- Order creation (dine-in, takeaway, delivery)
- Auto-numbering (`ORD-YYYYMM-00001`)
- Product selection from menu
- Variant selection (size, flavor)
- Modifier application (extra shot, no sugar)
- Quantity adjustment
- Table assignment for dine-in
- Customer linking (optional)
- Price book integration
- Discount application (percentage or fixed)
- Voucher redemption with validation
- Order notes (special instructions)
- Split items for sharing
- Course timing (appetizer, main, dessert)
- Order summary preview
- Hold/recall order
- Void order (unpaid only)

**Database Schema:**
```typescript
orders {
  doc_no: VARCHAR // Auto-generated
  location_id: UUID → locations
  channel: ENUM (pos, online, wholesale)
  order_type: ENUM (dine_in, takeaway, delivery)
  status: ENUM (draft, confirmed, preparing, ready, completed, cancelled)
  table_number: VARCHAR (for dine-in)
  customer_id: UUID → customers (optional)
  subtotal: NUMERIC
  discount_amount: NUMERIC
  tax_amount: NUMERIC
  total_amount: NUMERIC
  notes: TEXT
  created_by: UUID → users
  shift_id: UUID → pos_shifts
}

order_items {
  order_id: UUID → orders
  product_id: UUID → products
  variant_id: UUID → product_variants (nullable)
  quantity: NUMERIC
  unit_price: NUMERIC
  discount_amount: NUMERIC
  line_total: NUMERIC
  notes: TEXT
  prep_status: ENUM (queued, preparing, ready) // For KDS
  station: VARCHAR (hot, cold, drinks) // For KDS
}

order_item_modifiers {
  order_item_id: UUID → order_items
  modifier_id: UUID → modifiers
  modifier_name: VARCHAR
  price: NUMERIC
}
```

**Business Rules:**
- Order number auto-generated on save
- Status starts as "draft"
- Unit price from price book or product default
- Line total = quantity × (unit_price + modifier_prices) - discount
- Subtotal = SUM(line_total)
- Tax amount = subtotal × tax_rate
- Total = subtotal - discount + tax
- Cannot void order after payment
- Shift must be open to create orders
- Menu items filtered by location availability

**API Endpoints:**
- `POST /api/v1/pos/orders` - Create order
- `GET /api/v1/pos/orders` - List orders
- `GET /api/v1/pos/orders/:id` - Get order details
- `PATCH /api/v1/pos/orders/:id` - Update order (draft only)
- `POST /api/v1/pos/orders/:id/add-item` - Add item to order
- `PATCH /api/v1/pos/orders/:id/items/:itemId` - Update item
- `DELETE /api/v1/pos/orders/:id/items/:itemId` - Remove item
- `POST /api/v1/pos/orders/:id/void` - Void order

---

### 6.3 Payment Processing

**Feature ID:** POS-003
**User Story:** As a cashier, I want to process payments with multiple tender types.

**Features:**
- Multi-tender payment support
- Payment types: cash, card, mobile, gift card, store credit
- Split payment handling (e.g., $50 cash + $30 card)
- Cash change calculation
- Payment amount validation
- Card payment integration (Stripe terminal)
- Mobile payment (QR code, NFC)
- Gift card balance checking
- Store credit application
- Payment confirmation
- Receipt generation
- Email receipt to customer
- Inventory deduction on payment
- FEFO picking for inventory
- Loyalty points earning
- Tip handling

**Database Schema:**
```typescript
payments {
  order_id: UUID → orders
  payment_method: ENUM (cash, card, mobile_payment, gift_card, store_credit)
  amount: NUMERIC
  status: ENUM (pending, completed, failed, refunded)
  payment_reference: VARCHAR // Card transaction ID, etc.
  paid_at: TIMESTAMP
  created_by: UUID → users
}

orders {
  payment_status: ENUM (unpaid, partial, paid, refunded)
}
```

**Business Rules:**
- Order status → "confirmed" on first payment
- Payment status → "paid" when SUM(payments) >= total_amount
- Cash change = cash_paid - amount_due
- Inventory deduction happens on payment completion
- Inventory picked using FEFO (v_fefo_pick view)
- Ledger entry: movement_type = 'sale', negative quantity
- Loyalty points = total_amount × points_rate (exclude tax, delivery fee)
- Receipt includes: order items, modifiers, payments, change, loyalty points
- Cannot pay more than order total
- Card payment must be authorized before completion

**API Endpoints:**
- `POST /api/v1/pos/orders/:id/pay` - Process payment
- `GET /api/v1/pos/orders/:id/payments` - Get payment history
- `POST /api/v1/pos/orders/:id/receipt` - Generate receipt
- `POST /api/v1/pos/orders/:id/email-receipt` - Email receipt to customer

---

### 6.4 Order Refunds

**Feature ID:** POS-004
**User Story:** As a cashier, I want to refund orders with manager approval.

**Features:**
- Refund for paid orders
- Partial refund support (specific items)
- Refund reason capture
- Manager approval required
- Manager PIN/password verification
- Inventory reversal (return to stock)
- Payment reversal (refund to original method)
- Refund receipt generation
- Email notification
- Loyalty points reversal
- Voucher reversal (if used)

**Database Schema:**
```typescript
orders {
  status: ENUM // 'completed' → 'refunded'
  refunded_at: TIMESTAMP
  refunded_by: UUID → users
  refund_reason: TEXT
}

payments {
  status: ENUM // 'completed' → 'refunded'
}

// Inventory reversal via ledger
stock_ledger {
  movement_type: ENUM // 'refund' (positive quantity)
}
```

**Business Rules:**
- Only paid orders can be refunded
- Manager approval required (verify PIN)
- Full refund: all items returned to stock
- Partial refund: selected items returned to stock
- Payment refund to original method
- Ledger entry: movement_type = 'refund', positive quantity
- Loyalty points deducted: points_earned_from_order
- Voucher marked as unused (if applicable)
- Refund receipt generated with original order reference

**API Endpoints:**
- `POST /api/v1/pos/orders/:id/refund` - Process refund
- `POST /api/v1/pos/orders/:id/refund/verify-manager` - Verify manager PIN

---

### 6.5 Kitchen Display System (KDS)

**Feature ID:** POS-005
**User Story:** As a kitchen staff, I want to see real-time orders on a kitchen display with prep status.

**Features:**
- Real-time order display
- Item grouping by station (hot, cold, drinks)
- Time elapsed tracking with color-coding
- Item status updates (queued → preparing → ready)
- Order completion notification to cashier
- Preparation time analytics
- Rush order highlighting
- Order filtering by status
- Audio alerts for new orders
- Completed order archive
- Station-specific view
- Multi-screen support

**Database Schema:**
```typescript
order_items {
  prep_status: ENUM (queued, preparing, ready)
  station: VARCHAR // hot, cold, drinks
  prep_started_at: TIMESTAMP // When started preparing
  prep_completed_at: TIMESTAMP // When marked ready
}

orders {
  status: ENUM // 'confirmed' → 'preparing' → 'ready' → 'completed'
}
```

**Business Rules:**
- Items appear on KDS when order is confirmed
- Items grouped by station
- Color coding: green (<5 min), yellow (5-10 min), red (>10 min)
- Status flow: queued → preparing → ready
- When all items ready → order status = 'ready'
- Notification sent to cashier when ready
- Prep time = prep_completed_at - prep_started_at
- Average prep time tracked for performance

**API Endpoints:**
- `GET /api/v1/kds/orders` - Get active orders for KDS
- `GET /api/v1/kds/orders/station/:station` - Get orders for specific station
- `PATCH /api/v1/kds/items/:id/status` - Update item prep status
- WebSocket: `/api/v1/kds/stream` - Real-time order updates

---

## 7. Order Management (Online)

**Database Tables:** `orders`, `carts`, `cart_items`, `deliveries`

### 7.1 Online Ordering

**Feature ID:** ORD-001
**User Story:** As a customer, I want to browse the menu online and place orders for delivery or pickup.

**Features:**
- Menu browsing with availability filtering
- Product search and filtering
- Product details (photos, description, price)
- Cart management
- Add to cart with quantity and modifiers
- Cart persistence across sessions
- Delivery address or pickup selection
- Voucher application
- Order notes (special instructions)
- Order summary with breakdown
- Online payment processing (Stripe)
- Order confirmation email
- Order status tracking
- Reorder from history
- Guest checkout (no login required)

**Database Schema:**
```typescript
carts {
  customer_id: UUID → customers (nullable for guests)
  session_id: VARCHAR // For guest users
  location_id: UUID → locations
  subtotal: NUMERIC
  updated_at: TIMESTAMP
}

cart_items {
  cart_id: UUID → carts
  product_id: UUID → products
  variant_id: UUID → product_variants (nullable)
  quantity: NUMERIC
  unit_price: NUMERIC
  line_total: NUMERIC
  notes: TEXT
}

orders {
  channel: ENUM // 'online'
  order_type: ENUM // 'delivery' or 'pickup'
  delivery_address: TEXT
  delivery_fee: NUMERIC
  delivery_instructions: TEXT
}
```

**Business Rules:**
- Cart persists for 7 days
- Prices from price book (online channel)
- Menu items filtered by location availability
- Delivery fee calculated by distance
- Minimum order amount for delivery (e.g., $20)
- Order created from cart on checkout
- Cart cleared after order placement
- Payment processed via Stripe
- Order confirmed only after successful payment
- Inventory deducted on payment completion

**API Endpoints:**
- `GET /api/v1/online/menu` - Get online menu
- `POST /api/v1/online/cart/add` - Add item to cart
- `GET /api/v1/online/cart` - Get cart
- `PATCH /api/v1/online/cart/items/:id` - Update cart item
- `DELETE /api/v1/online/cart/items/:id` - Remove cart item
- `POST /api/v1/online/checkout` - Checkout and create order
- `POST /api/v1/online/orders/:id/pay` - Process payment
- `GET /api/v1/online/orders/:id/status` - Get order status

---

### 7.2 Delivery Management

**Feature ID:** ORD-002
**User Story:** As a delivery coordinator, I want to assign orders to drivers and track deliveries.

**Features:**
- Delivery assignment to drivers
- Driver selection (internal or third-party)
- Delivery status tracking
- Status: requested → assigned → picked_up → delivered
- Tracking code generation
- Customer notifications with tracking link
- Delivery fee calculation
- Distance-based pricing
- ETA calculation
- Driver location tracking
- Delivery photo (proof of delivery)
- Customer signature capture
- Delivery completion confirmation
- Failed delivery handling

**Database Schema:**
```typescript
deliveries {
  order_id: UUID → orders
  driver_id: UUID → drivers // Internal driver
  provider: VARCHAR // e.g., "GrabFood", "Internal"
  tracking_code: VARCHAR // Unique tracking number
  status: ENUM (requested, assigned, picked_up, in_transit, delivered, failed)
  delivery_fee: NUMERIC
  estimated_time: INTEGER // Minutes
  assigned_at: TIMESTAMP
  picked_up_at: TIMESTAMP
  delivered_at: TIMESTAMP
  notes: TEXT
  signature: TEXT // Base64 signature image
  photo_url: VARCHAR // Proof of delivery
}
```

**Business Rules:**
- Delivery created when order type = 'delivery'
- Status flow: requested → assigned → picked_up → delivered
- Tracking code format: DEL-YYYYMMDD-XXXXX
- Customer receives tracking link via SMS/email
- Delivery fee based on distance: $5 (<5km), $8 (5-10km), $12 (>10km)
- ETA = distance / average_speed + prep_time
- Photo required for completion
- Signature optional for high-value orders

**API Endpoints:**
- `POST /api/v1/deliveries` - Create delivery
- `GET /api/v1/deliveries` - List deliveries
- `GET /api/v1/deliveries/:id` - Get delivery details
- `PATCH /api/v1/deliveries/:id/assign` - Assign to driver
- `PATCH /api/v1/deliveries/:id/status` - Update status
- `GET /api/v1/deliveries/track/:trackingCode` - Track delivery (public)
- `POST /api/v1/deliveries/:id/complete` - Complete delivery

---

## 8. Returns Management

**Database Tables:** `return_orders`, `return_order_items`

### 8.1 Supplier Returns

**Feature ID:** RET-001
**User Story:** As a warehouse manager, I want to return defective goods to suppliers.

**Features:**
- Return creation linked to goods receipt
- Defect documentation with photos
- Return reason per line (damaged, expired, wrong_item, excess)
- Quantity specification
- Manager approval workflow
- Return shipment tracking
- Inventory deduction on completion
- Credit note tracking
- Email notification to supplier
- Return receipt PDF
- Cost tracking for credit

**Database Schema:**
```typescript
return_orders {
  doc_no: VARCHAR // Auto-generated (RET-YYYYMM-00001)
  return_type: ENUM (supplier_return, customer_return)
  supplier_id: UUID → suppliers (for supplier returns)
  goods_receipt_id: UUID → goods_receipts (reference)
  status: ENUM (draft, pending, approved, shipped, completed)
  return_date: DATE
  total_amount: NUMERIC // Credit expected
  credit_note_number: VARCHAR
  notes: TEXT
  created_by: UUID → users
  approved_by: UUID → users
}

return_order_items {
  return_order_id: UUID → return_orders
  product_id: UUID → products
  lot_id: UUID → lots
  quantity: NUMERIC
  uom_id: UUID → uoms
  unit_cost: NUMERIC
  reason: ENUM (damaged, expired, wrong_item, excess, defective)
  reason_notes: TEXT
  photo_urls: JSONB // Array of photo URLs
}
```

**Business Rules:**
- Return number auto-generated on save
- Status flow: draft → pending → approved → shipped → completed
- Manager approval required before shipping
- Inventory deducted on shipment (movement_type = 'return_out')
- Credit note number from supplier
- Photos required for damaged/defective items
- Email sent to supplier with return details

**API Endpoints:**
- `POST /api/v1/returns` - Create return
- `GET /api/v1/returns` - List returns
- `GET /api/v1/returns/:id` - Get return details
- `PATCH /api/v1/returns/:id` - Update return (draft only)
- `POST /api/v1/returns/:id/submit` - Submit for approval
- `POST /api/v1/returns/:id/approve` - Approve return
- `POST /api/v1/returns/:id/ship` - Ship return (deduct inventory)
- `POST /api/v1/returns/:id/complete` - Complete return (record credit note)

---

### 8.2 Customer Returns

**Feature ID:** RET-002
**User Story:** As a cashier, I want to process customer returns for refunds or exchange.

**Features:**
- Return linked to original order
- Item selection for return
- Return reason capture (wrong_item, defective, changed_mind)
- Manager approval required
- Restocking fee application (configurable)
- Inventory restoration for resaleable items
- Refund to original payment method
- Store credit option
- Return receipt generation
- Email notification to customer
- Return deadline enforcement (e.g., 7 days)

**Database Schema:**
```typescript
return_orders {
  return_type: ENUM // 'customer_return'
  customer_id: UUID → customers
  order_id: UUID → orders (reference)
  refund_amount: NUMERIC
  restocking_fee: NUMERIC
  refund_method: ENUM (original_method, store_credit)
}

return_order_items {
  return_order_id: UUID → return_orders
  order_item_id: UUID → order_items
  quantity: NUMERIC
  reason: ENUM (wrong_item, defective, changed_mind, damaged)
  is_resaleable: BOOLEAN
}
```

**Business Rules:**
- Return must be within 7 days of purchase
- Manager approval required
- Restocking fee: 10% for "changed_mind", 0% for "defective"
- Resaleable items returned to inventory (movement_type = 'return_in')
- Non-resaleable items written off as waste
- Refund amount = item_total - restocking_fee
- Refund to original payment method or store credit
- Store credit issued as voucher

**API Endpoints:**
- `POST /api/v1/returns/customer` - Create customer return
- `POST /api/v1/returns/:id/approve` - Approve return
- `POST /api/v1/returns/:id/complete` - Complete return and process refund

---

## 9. Quality Control & Compliance

**Database Tables:** `temperature_logs`, `alerts`

### 9.1 Temperature Monitoring

**Feature ID:** QC-001
**User Story:** As a quality manager, I want to log temperature and humidity readings for HACCP compliance.

**Features:**
- Temperature and humidity logging
- Location area specification (walk-in freezer, display case)
- Manual or automatic sensor recording
- Out-of-range alert generation
- Photo attachment support
- Time-stamped readings
- Alert priority (low, medium, high)
- Email/SMS notifications
- Alert acknowledgment and resolution
- Resolution notes
- Temperature history charts
- Compliance report generation
- CSV export for audits

**Database Schema:**
```typescript
temperature_logs {
  location_id: UUID → locations
  area: VARCHAR // e.g., "Walk-in Freezer", "Display Case"
  temperature: NUMERIC // Celsius
  humidity: NUMERIC // Percentage
  recorded_at: TIMESTAMP
  recorded_by: UUID → users
  is_automatic: BOOLEAN // Sensor vs manual
  notes: TEXT
  photo_url: VARCHAR
}

alerts {
  type: ENUM (temperature, expiry, low_stock)
  priority: ENUM (low, medium, high)
  message: TEXT
  reference_id: UUID // temperature_log_id
  status: ENUM (active, acknowledged, resolved)
  triggered_at: TIMESTAMP
  acknowledged_by: UUID → users
  acknowledged_at: TIMESTAMP
  resolved_by: UUID → users
  resolved_at: TIMESTAMP
  resolution_notes: TEXT
}
```

**Business Rules:**
- Temperature ranges by area (configurable):
  - Freezer: -18°C to -20°C
  - Refrigerator: 0°C to 4°C
  - Hot holding: >60°C
- Alert generated if reading outside acceptable range
- Priority based on deviation: high (>5°C out), medium (2-5°C), low (<2°C)
- Email notification sent immediately for high priority
- SMS notification for critical (>10°C deviation)
- Readings required every 4 hours (manual) or 30 minutes (automatic)
- Photo required for out-of-range readings

**API Endpoints:**
- `POST /api/v1/temperature-logs` - Create temperature log
- `GET /api/v1/temperature-logs` - List temperature logs
- `GET /api/v1/temperature-logs/chart` - Get chart data
- `GET /api/v1/alerts` - List alerts
- `POST /api/v1/alerts/:id/acknowledge` - Acknowledge alert
- `POST /api/v1/alerts/:id/resolve` - Resolve alert

---

### 9.2 Expiry Management

**Feature ID:** QC-002
**User Story:** As a warehouse manager, I want alerts for products nearing expiry so I can mark them for quick sale.

**Features:**
- Configurable days-before-expiry alerts
- Alert priority based on days remaining
- Location and product filtering
- Quick sale/discount marking
- Batch disposal for expired items
- Photo upload for disposal compliance
- Disposal method recording
- Disposal certificate generation
- Email digest (daily)
- Expiry dashboard
- FEFO enforcement

**Database Schema:**
```typescript
// Expiry tracked in lots
lots {
  expiry_date: DATE
  is_active: BOOLEAN
}

// View for lots nearing expiry
v_lot_balances {
  days_to_expiry: INTEGER // expiry_date - CURRENT_DATE
}

alerts {
  type: ENUM // 'expiry'
  priority: ENUM // high (<3 days), medium (3-7 days), low (7-14 days)
}
```

**Business Rules:**
- Alert thresholds:
  - High priority: <3 days to expiry
  - Medium priority: 3-7 days
  - Low priority: 7-14 days
- Daily email digest of expiring items
- Auto-generate alerts via scheduled job
- Quick sale: apply 50% discount (update price book)
- Disposal: create stock adjustment with reason = 'expiry'
- Disposal photo required for audit
- Disposal certificate includes: product, lot, quantity, date, authorized by

**API Endpoints:**
- `GET /api/v1/alerts/expiry` - Get expiry alerts
- `POST /api/v1/inventory/lots/:id/quick-sale` - Mark for quick sale
- `POST /api/v1/inventory/lots/:id/dispose` - Dispose expired items
- `GET /api/v1/reports/expiry-dashboard` - Expiry dashboard data

---

### 9.3 Low Stock Alerts

**Feature ID:** QC-003
**User Story:** As a purchasing officer, I want alerts when inventory falls below reorder point.

**Features:**
- Reorder point configuration per product/location
- Maximum stock level setting
- Safety stock levels
- Historical usage analysis
- Alert generation when qty < reorder point
- Suggested order quantity calculation
- Direct PO creation from alert
- Auto-resolution when replenished
- Daily digest email
- Low stock dashboard
- Location-specific alerts

**Database Schema:**
```typescript
// Recommended enhancement (not in current schema)
inventory_policies {
  product_id: UUID → products
  location_id: UUID → locations
  reorder_point: NUMERIC
  max_stock: NUMERIC
  safety_stock: NUMERIC
}

alerts {
  type: ENUM // 'low_stock'
  priority: ENUM // high (qty < safety_stock), medium (qty < reorder_point)
}
```

**Business Rules:**
- Alert triggered when onhand_qty < reorder_point
- High priority if qty < safety_stock
- Suggested order qty = max_stock - current_onhand
- Consider lead time in suggestion
- Consider pending POs (reduce suggestion)
- Alert auto-resolves when qty >= reorder_point
- Daily email digest to purchasing team

**API Endpoints:**
- `GET /api/v1/alerts/low-stock` - Get low stock alerts
- `POST /api/v1/inventory/policies` - Set reorder points
- `GET /api/v1/inventory/policies` - Get inventory policies
- `POST /api/v1/alerts/:id/create-po` - Create PO from alert

---

## 10. Customer & Loyalty

**Database Tables:** `customers`, `addresses`, `loyalty_accounts`, `loyalty_ledger`, `vouchers`, `voucher_redemptions`, `promotions`

### 10.1 Customer Management

**Feature ID:** CUS-001
**User Story:** As a customer, I want to register via mobile app and manage my profile.

**Features:**
- Customer registration with email verification
- Profile management (name, photo, phone)
- Auto-generated customer code
- Welcome voucher issuance
- Automatic loyalty account creation
- Multiple delivery address management
- Default address designation
- GPS coordinate capture
- Address validation via Google Maps API
- Birthday recording for birthday promotions
- Communication preferences
- Customer segmentation

**Database Schema:**
```typescript
customers {
  code: VARCHAR // Auto-generated (CUST-00001)
  name: VARCHAR
  email: VARCHAR
  phone: VARCHAR
  photo_url: VARCHAR
  date_of_birth: DATE
  is_active: BOOLEAN
  created_at: TIMESTAMP
}

addresses {
  customer_id: UUID → customers
  address_line1: VARCHAR
  address_line2: VARCHAR
  city: VARCHAR
  postal_code: VARCHAR
  country: VARCHAR
  latitude: NUMERIC
  longitude: NUMERIC
  is_default: BOOLEAN
}

loyalty_accounts {
  customer_id: UUID → customers
  points_balance: NUMERIC
  lifetime_points: NUMERIC
  tier: VARCHAR // bronze, silver, gold
}
```

**Business Rules:**
- Customer code auto-generated on registration
- Email must be unique per tenant
- Welcome voucher: $5 off issued on registration
- Loyalty account created automatically
- Starting tier: bronze
- Email verification required before first order
- Only one default address per customer
- GPS coordinates from mobile device or geocoded from address

**API Endpoints:**
- `POST /api/v1/customers/register` - Register customer
- `POST /api/v1/customers/verify-email` - Verify email
- `GET /api/v1/customers/me` - Get customer profile
- `PATCH /api/v1/customers/me` - Update profile
- `POST /api/v1/customers/me/addresses` - Add address
- `PATCH /api/v1/customers/me/addresses/:id` - Update address
- `DELETE /api/v1/customers/me/addresses/:id` - Delete address

---

### 10.2 Loyalty Program

**Feature ID:** CUS-002
**User Story:** As a customer, I want to earn loyalty points on purchases and redeem them for rewards.

**Features:**
- Points earning on purchases
- Configurable earning rate (e.g., 1 point per $1)
- Points exclusions (delivery fees, taxes)
- Birthday bonus points
- Points balance tracking
- Points ledger with transaction history
- Redemption catalog (points → vouchers)
- Voucher issuance on redemption
- Email/app delivery of vouchers
- Tier progression (bronze → silver → gold)
- Tier benefits (multiplier, exclusive offers)
- Points expiry (optional)
- Redemption history

**Database Schema:**
```typescript
loyalty_accounts {
  customer_id: UUID → customers
  points_balance: NUMERIC
  lifetime_points: NUMERIC
  tier: VARCHAR
  tier_expiry_date: DATE
}

loyalty_ledger {
  loyalty_account_id: UUID → loyalty_accounts
  transaction_type: ENUM (earned, redeemed, expired, adjusted)
  points: NUMERIC // Positive for earned, negative for redeemed
  reference_type: VARCHAR // 'order', 'voucher_redemption', 'birthday'
  reference_id: UUID
  description: TEXT
  created_at: TIMESTAMP
}
```

**Business Rules:**
- Earning rate: 1 point per $1 spent (exclude tax, delivery fee)
- Points earned on payment completion
- Birthday bonus: 100 points on birthday
- Tier thresholds:
  - Bronze: 0-999 lifetime points
  - Silver: 1000-2999 lifetime points
  - Gold: 3000+ lifetime points
- Tier multiplier:
  - Bronze: 1x
  - Silver: 1.25x
  - Gold: 1.5x
- Points expiry: 12 months from earn date (optional)
- Redemption: 100 points = $1 voucher

**API Endpoints:**
- `GET /api/v1/customers/me/loyalty` - Get loyalty account
- `GET /api/v1/customers/me/loyalty/ledger` - Get points history
- `POST /api/v1/customers/me/loyalty/redeem` - Redeem points for voucher
- `GET /api/v1/loyalty/catalog` - Get redemption catalog

---

### 10.3 Vouchers & Promotions

**Feature ID:** CUS-003
**User Story:** As a marketing manager, I want to create voucher campaigns to drive sales.

**Features:**
- Voucher campaign creation
- Voucher types (percentage_off, fixed_amount, gift_card)
- Discount configuration
- Minimum spend requirements
- Usage limits (total and per-customer)
- Valid date range
- Channel restrictions (POS, online, all)
- Auto-generated bulk codes
- Voucher distribution via email/SMS/app
- Redemption tracking
- Unique customer count
- Total discount amount tracking
- Revenue impact analysis
- ROI calculation
- Voucher duplication for similar campaigns

**Database Schema:**
```typescript
vouchers {
  code: VARCHAR // Unique voucher code
  campaign_name: VARCHAR
  voucher_type: ENUM (percentage_off, fixed_amount, gift_card)
  discount_value: NUMERIC
  min_spend: NUMERIC
  max_uses: INTEGER // Total redemptions allowed
  max_uses_per_customer: INTEGER
  valid_from: DATE
  valid_until: DATE
  channel: ENUM (pos, online, all)
  is_active: BOOLEAN
}

voucher_redemptions {
  voucher_id: UUID → vouchers
  order_id: UUID → orders
  customer_id: UUID → customers
  discount_applied: NUMERIC
  redeemed_at: TIMESTAMP
}
```

**Business Rules:**
- Voucher code is unique per tenant
- Bulk generation: create N vouchers with prefix (e.g., SAVE20-XXXXX)
- Validation on redemption:
  - Is active and within date range
  - Order total >= min_spend
  - Uses < max_uses
  - Customer uses < max_uses_per_customer
- Discount calculation:
  - percentage_off: subtotal × (discount_value / 100)
  - fixed_amount: discount_value
  - Max discount = subtotal (cannot exceed order total)
- Voucher marked as used on order payment
- Cannot un-redeem after payment (unless order refunded)

**API Endpoints:**
- `POST /api/v1/vouchers` - Create voucher campaign
- `GET /api/v1/vouchers` - List vouchers
- `GET /api/v1/vouchers/:id` - Get voucher details
- `POST /api/v1/vouchers/:id/generate-bulk` - Generate bulk codes
- `POST /api/v1/vouchers/validate` - Validate voucher code
- `GET /api/v1/vouchers/:id/redemptions` - Get redemption history
- `GET /api/v1/vouchers/:id/analytics` - Get campaign analytics

---

## 11. Reporting & Analytics

**Database Tables:** All operational tables (views and aggregations)

### 11.1 Daily Sales Summary

**Feature ID:** RPT-001
**User Story:** As a manager, I want to see daily sales summary by location.

**Features:**
- Sales summary by location and date
- Payment method breakdown
- Order type breakdown (dine-in, takeaway, delivery)
- Channel breakdown (POS, online)
- Top selling products
- Hourly sales curves
- Comparison with previous day/week/month
- Sales by cashier
- Average transaction value
- Customer count
- Excel export
- Email scheduled report

**API Endpoints:**
- `GET /api/v1/reports/daily-sales` - Get daily sales summary
- `GET /api/v1/reports/daily-sales/export` - Export to Excel
- `POST /api/v1/reports/daily-sales/schedule` - Schedule email report

---

### 11.2 Inventory Valuation Report

**Feature ID:** RPT-002
**User Story:** As a finance manager, I want inventory valuation reports.

**Features:**
- Valuation by location
- Cost basis (average/FIFO)
- Extended value calculation
- Category and product type breakdown
- Slow-moving stock identification
- Variance from standard cost
- As-of-date valuation
- Excel export

**API Endpoints:**
- `GET /api/v1/reports/inventory-valuation` - Get valuation report
- `GET /api/v1/reports/inventory-valuation/export` - Export to Excel

---

### 11.3 Product Performance

**Feature ID:** RPT-003
**User Story:** As a product manager, I want to analyze product performance.

**Features:**
- Sales quantity and revenue by product
- Profit margin calculation
- Sales trends over time
- Location comparison
- Product ranking
- Category comparison
- Slow-moving vs fast-moving
- Excel export

**API Endpoints:**
- `GET /api/v1/reports/product-performance` - Get product performance
- `GET /api/v1/reports/product-performance/export` - Export to Excel

---

### 11.4 Stock Movement Audit

**Feature ID:** RPT-004
**User Story:** As an auditor, I want complete stock movement history.

**Features:**
- Ledger-based audit trail
- Opening/closing balance
- Movement type breakdown
- Reference document linking
- User attribution
- Date range filtering
- Product/location filtering
- Excel export

**API Endpoints:**
- `GET /api/v1/reports/stock-movement` - Get stock movement report
- `GET /api/v1/reports/stock-movement/export` - Export to Excel

---

### 11.5 Waste & Spoilage Analysis

**Feature ID:** RPT-005
**User Story:** As an operations manager, I want to analyze waste and spoilage.

**Features:**
- Waste quantity and value by reason
- Trend analysis
- Location comparison
- Product breakdown
- Waste percentage calculation
- Cost impact
- Excel export

**API Endpoints:**
- `GET /api/v1/reports/waste-analysis` - Get waste analysis
- `GET /api/v1/reports/waste-analysis/export` - Export to Excel

---

### 11.6 Purchase Order Summary

**Feature ID:** RPT-006
**User Story:** As a purchasing manager, I want PO summary reports.

**Features:**
- PO summary and status
- Outstanding POs
- PO value by supplier
- Delivery performance (on-time %)
- Lead time analysis
- Price variance tracking
- Excel export

**API Endpoints:**
- `GET /api/v1/reports/purchase-orders` - Get PO summary
- `GET /api/v1/reports/purchase-orders/export` - Export to Excel

---

### 11.7 Cash Reconciliation

**Feature ID:** RPT-007
**User Story:** As a manager, I want cash reconciliation reports by shift.

**Features:**
- Reconciliation by shift
- Cashier performance tracking
- Variance flagging
- Daily cash position
- Payment method breakdown
- Excel export

**API Endpoints:**
- `GET /api/v1/reports/cash-reconciliation` - Get cash reconciliation
- `GET /api/v1/reports/cash-reconciliation/export` - Export to Excel

---

### 11.8 COGS & Gross Margin

**Feature ID:** RPT-008
**User Story:** As a finance manager, I want COGS and gross margin reports.

**Features:**
- COGS calculation (opening + purchases - closing)
- Location and category breakdown
- Gross margin calculation
- Gross margin percentage
- Comparison with previous periods
- Excel export

**API Endpoints:**
- `GET /api/v1/reports/cogs` - Get COGS report
- `GET /api/v1/reports/cogs/export` - Export to Excel

---

## 12. System Administration

**Database Tables:** `products`, `product_variants`, `uoms`, `uom_conversions`, `locations`, `menus`, `menu_items`, `price_books`, `price_book_items`, `tax_categories`, `tax_rates`

### 12.1 Product Catalog Management

**Feature ID:** ADM-001
**User Story:** As a product manager, I want to manage the product catalog.

**Features:**
- Product creation with SKU, name, description
- Product kinds (raw_material, semi_finished, finished_good, packaging, consumable)
- Base UOM assignment
- Standard cost and default price
- Tax category assignment
- Perishable flag with shelf life days
- Barcode management
- Image upload
- Category assignment (recommended enhancement)
- Active/inactive status
- Product search and filtering
- Bulk import via Excel
- Bulk export

**Database Schema:**
```typescript
products {
  sku: VARCHAR // Unique
  name: VARCHAR
  description: TEXT
  product_kind: ENUM (raw_material, semi_finished, finished_good, packaging, consumable)
  base_uom_id: UUID → uoms
  standard_cost: NUMERIC
  default_price: NUMERIC
  tax_category_id: UUID → tax_categories
  is_perishable: BOOLEAN
  shelf_life_days: INTEGER
  barcode: VARCHAR
  image_url: VARCHAR
  is_active: BOOLEAN
}
```

**Business Rules:**
- SKU is unique per tenant
- Base UOM required (e.g., kg, L, pcs)
- Shelf life days required for perishable items
- Standard cost used for valuation
- Default price used if no price book entry
- Inactive products not available for new transactions
- Barcode can be scanned for quick lookup

**API Endpoints:**
- `POST /api/v1/products` - Create product
- `GET /api/v1/products` - List products
- `GET /api/v1/products/:id` - Get product details
- `PATCH /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product (soft delete)
- `POST /api/v1/products/import` - Bulk import from Excel
- `GET /api/v1/products/export` - Bulk export to Excel

---

### 12.2 Product Variants

**Feature ID:** ADM-002
**User Story:** As a product manager, I want to create product variants (size, flavor).

**Features:**
- Variant creation linked to base product
- Variant name (e.g., "Large", "Strawberry")
- Price differential (extra charge)
- Variant activation/deactivation
- Inheritance of base product properties
- Variant-specific pricing in price books

**Database Schema:**
```typescript
product_variants {
  product_id: UUID → products
  variant_name: VARCHAR // e.g., "Large", "Extra Large"
  price_differential: NUMERIC // Extra charge (can be negative)
  is_active: BOOLEAN
}
```

**Business Rules:**
- Variant inherits product properties (tax, category)
- Variant price = base price + price_differential
- Price differential can be negative (discount)
- Inactive variants not available for selection
- Used in POS and online ordering

**API Endpoints:**
- `POST /api/v1/products/:id/variants` - Create variant
- `GET /api/v1/products/:id/variants` - List variants
- `PATCH /api/v1/product-variants/:id` - Update variant
- `DELETE /api/v1/product-variants/:id` - Delete variant

---

### 12.3 UOM Management

**Feature ID:** ADM-003
**User Story:** As a system administrator, I want to manage units of measure and conversions.

**Features:**
- UOM definition (kg, g, L, mL, pcs, box)
- UOM type (weight, volume, count)
- Conversion factor definition
- Bi-directional conversion support
- Automatic quantity conversion
- Conversion validation

**Database Schema:**
```typescript
uoms {
  code: VARCHAR // kg, g, L, pcs
  name: VARCHAR
  uom_type: VARCHAR // weight, volume, count
}

uom_conversions {
  from_uom_id: UUID → uoms
  to_uom_id: UUID → uoms
  conversion_factor: NUMERIC // 1 kg = 1000 g (factor = 1000)
}
```

**Business Rules:**
- UOM code is unique per tenant
- Conversion factor: from_qty × factor = to_qty
- Bi-directional: if kg→g = 1000, then g→kg = 0.001
- Used throughout system for quantity conversions
- Base UOM stored in ledger, display in any UOM

**API Endpoints:**
- `POST /api/v1/uoms` - Create UOM
- `GET /api/v1/uoms` - List UOMs
- `POST /api/v1/uom-conversions` - Create conversion
- `GET /api/v1/uom-conversions` - List conversions
- `POST /api/v1/uom-conversions/convert` - Convert quantity

---

### 12.4 Location Management

**Feature ID:** ADM-004
**User Story:** As a system administrator, I want to manage locations (central kitchen, outlets, warehouses).

**Features:**
- Location setup with code and name
- Location types (central_kitchen, outlet, warehouse)
- Full address details
- Active/inactive status
- Location hierarchy (optional)
- Operating hours
- Contact information

**Database Schema:**
```typescript
locations {
  code: VARCHAR // Unique
  name: VARCHAR
  location_type: ENUM (central_kitchen, outlet, warehouse)
  address: TEXT
  city: VARCHAR
  postal_code: VARCHAR
  phone: VARCHAR
  is_active: BOOLEAN
}
```

**Business Rules:**
- Location code is unique per tenant
- Inactive locations not available for transactions
- Used for inventory segregation
- Used for user access control

**API Endpoints:**
- `POST /api/v1/locations` - Create location
- `GET /api/v1/locations` - List locations
- `GET /api/v1/locations/:id` - Get location details
- `PATCH /api/v1/locations/:id` - Update location
- `DELETE /api/v1/locations/:id` - Deactivate location

---

### 12.5 Menu Management

**Feature ID:** ADM-005
**User Story:** As a menu manager, I want to create menus by channel (POS, online).

**Features:**
- Menu creation by channel (POS, online, wholesale)
- Active date range
- Product addition to menu
- Availability by location
- Display order configuration
- Dynamic show/hide
- Menu duplication
- Menu preview

**Database Schema:**
```typescript
menus {
  code: VARCHAR
  name: VARCHAR
  channel: ENUM (pos, online, wholesale)
  active_from: DATE
  active_until: DATE
  is_active: BOOLEAN
}

menu_items {
  menu_id: UUID → menus
  product_id: UUID → products
  location_id: UUID → locations (nullable for all locations)
  display_order: INTEGER
  is_available: BOOLEAN
}
```

**Business Rules:**
- Menu active if is_active = true AND CURRENT_DATE BETWEEN active_from AND active_until
- Products shown based on menu availability
- Display order determines sort in UI
- Location-specific availability
- Used in POS and online ordering

**API Endpoints:**
- `POST /api/v1/menus` - Create menu
- `GET /api/v1/menus` - List menus
- `GET /api/v1/menus/:id` - Get menu details
- `POST /api/v1/menus/:id/items` - Add product to menu
- `PATCH /api/v1/menu-items/:id` - Update menu item
- `DELETE /api/v1/menu-items/:id` - Remove from menu

---

### 12.6 Price Book Management

**Feature ID:** ADM-006
**User Story:** As a pricing manager, I want to manage price books for different channels and locations.

**Features:**
- Price list creation
- Channel and date range specification
- Product-specific pricing
- Price variation by location
- Price variation by variant
- Priority/precedence rules
- Bulk price updates
- Price history tracking
- Price comparison

**Database Schema:**
```typescript
price_books {
  code: VARCHAR
  name: VARCHAR
  channel: ENUM (pos, online, wholesale)
  valid_from: DATE
  valid_until: DATE
  priority: INTEGER // Higher = higher precedence
  is_active: BOOLEAN
}

price_book_items {
  price_book_id: UUID → price_books
  product_id: UUID → products
  variant_id: UUID → product_variants (nullable)
  location_id: UUID → locations (nullable for all)
  price: NUMERIC
}
```

**Business Rules:**
- Price lookup hierarchy: variant+location → variant → product+location → product → default
- Active price book: is_active = true AND CURRENT_DATE BETWEEN valid_from AND valid_until
- If multiple active, highest priority wins
- Fallback to product.default_price if no price book match
- Used in POS, online orders, and invoicing

**API Endpoints:**
- `POST /api/v1/price-books` - Create price book
- `GET /api/v1/price-books` - List price books
- `GET /api/v1/price-books/:id` - Get price book details
- `POST /api/v1/price-books/:id/items` - Add price
- `PATCH /api/v1/price-book-items/:id` - Update price
- `GET /api/v1/price-books/lookup` - Get price for product

---

## Schema Coverage Analysis

### ✅ Excellent Schema Coverage

The database schema in `apps/erp-api/src/config/schema.ts` provides **comprehensive support** for all user stories:

#### Fully Supported Features (140+):

1. **Multi-Tenancy & Security**
   - Tenant isolation via `tenant_id` on all tables
   - Row-Level Security (RLS) template provided
   - Session context via `app.tenant_id` and `app.user_id`

2. **Ledger-First Inventory**
   - Immutable `stock_ledger` as single source of truth
   - Views compute on-hand from ledger (`v_inventory_onhand`)
   - Perfect audit trail with time-travel capability

3. **FEFO/Lot Tracking**
   - `lots` table with expiry dates
   - `v_fefo_pick` view for picking logic
   - Lot traceability from GR to sale

4. **Negative Stock Prevention**
   - Database constraint trigger `check_negative_stock()`
   - Deferred constraint for multi-statement transactions

5. **Document Auto-Numbering**
   - Thread-safe `generate_doc_sequence()` function
   - Format: PREFIX-YYYYMM-00001
   - Handles concurrent inserts

6. **Better Auth Integration**
   - All Better Auth tables included
   - Clean linkage via `users.auth_user_id`

7. **Cost Tracking**
   - FIFO cost layers optional
   - Moving average via `get_mavg_cost()` function

8. **Unified Order Model**
   - Single `orders` table for POS, online, wholesale
   - Reduces duplication, simplifies reporting

9. **Production & Recipes**
   - BOM with versioning
   - Yield tracking and cost allocation

10. **Loyalty & Vouchers**
    - Points ledger for complete history
    - Flexible voucher system

---

## Recommended Enhancements

### Minor Schema Gaps (Low Priority)

While the schema supports all user stories, these enhancements would improve functionality:

#### 1. Product Categories

**Current State:** Categories mentioned in user stories but no dedicated table

**Recommendation:**
```typescript
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueTenantCode: unique().on(table.tenantId, table.code)
}));

export const productCategories = pgTable("product_categories", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" })
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.categoryId] })
}));
```

**Benefits:**
- Better product organization
- Enhanced filtering and reporting
- Category-based promotions

---

#### 2. Inventory Policies (Reorder Points)

**Current State:** Alerts mentioned but no configuration table

**Recommendation:**
```typescript
export const inventoryPolicies = pgTable("inventory_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  reorderPoint: decimal("reorder_point", { precision: 16, scale: 6 }).notNull(),
  maxStock: decimal("max_stock", { precision: 16, scale: 6 }),
  safetyStock: decimal("safety_stock", { precision: 16, scale: 6 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueProductLocation: unique().on(table.tenantId, table.productId, table.locationId)
}));
```

**Benefits:**
- Automated low stock alerts
- Suggested order quantity calculation
- Better inventory planning

---

#### 3. Internal Drivers

**Current State:** Delivery tracking exists but no driver master table

**Recommendation:**
```typescript
export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id), // Link to user if internal
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueTenantCode: unique().on(table.tenantId, table.code)
}));

// Add to deliveries table
ALTER TABLE deliveries ADD COLUMN driver_id UUID REFERENCES drivers(id);
```

**Benefits:**
- Better driver management
- Delivery performance tracking
- Internal vs third-party distinction

---

#### 4. KDS Prep Tracking

**Current State:** `order_items.prep_status` exists but no timestamps

**Recommendation:**
```typescript
// Add to order_items table
ALTER TABLE order_items
  ADD COLUMN prep_started_at TIMESTAMP,
  ADD COLUMN prep_completed_at TIMESTAMP;
```

**Benefits:**
- Accurate prep time tracking
- Kitchen performance analytics
- Bottleneck identification

---

#### 5. Performance Indexes

**Recommendation:**
```sql
-- Reporting performance
CREATE INDEX idx_orders_created_at ON erp.orders(created_at, tenant_id);
CREATE INDEX idx_stock_ledger_txn_ts ON erp.stock_ledger(txn_ts, tenant_id);
CREATE INDEX idx_lots_expiry_date ON erp.lots(expiry_date, tenant_id) WHERE is_active = true;
CREATE INDEX idx_payments_paid_at ON erp.payments(paid_at, tenant_id);

-- Lookup performance
CREATE INDEX idx_products_barcode ON erp.products(barcode, tenant_id);
CREATE INDEX idx_vouchers_code ON erp.vouchers(code, tenant_id);
CREATE INDEX idx_customers_email ON erp.customers(email, tenant_id);
```

---

#### 6. Materialized Views

**Recommendation:**
```sql
-- Cache on-hand inventory for faster queries
CREATE MATERIALIZED VIEW erp.mv_inventory_onhand AS
SELECT * FROM erp.v_inventory_onhand;

CREATE UNIQUE INDEX ON erp.mv_inventory_onhand(tenant_id, product_id, location_id);

-- Refresh strategy: after each ledger insert (via trigger) or scheduled (every 5 minutes)
CREATE OR REPLACE FUNCTION erp.refresh_inventory_onhand()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY erp.mv_inventory_onhand;
END;
$$ LANGUAGE plpgsql;
```

**Benefits:**
- Faster inventory queries
- Reduced load on ledger table
- Better UI responsiveness

---

## Implementation Priority

### Phase 1: Core Operations (MVP)

**Priority:** Critical
**Timeline:** Foundation for all operations

1. **Authentication & User Management** (AUTH-001 to AUTH-003)
2. **Product Catalog Management** (ADM-001 to ADM-003)
3. **Location Management** (ADM-004)
4. **Supplier Management** (PROC-006)
5. **Inventory Visibility** (INV-001)

**Why:** Foundation tables and basic CRUD operations

---

### Phase 2: Procurement & Inventory

**Priority:** High
**Timeline:** Enable stock management

1. **Purchase Orders** (PROC-001 to PROC-003)
2. **Goods Receipts** (PROC-004 to PROC-005)
3. **Stock Adjustments** (INV-003)
4. **FEFO Picking** (INV-002)
5. **Stock Transfers** (XFER-001)

**Why:** Core inventory workflows

---

### Phase 3: Point of Sale

**Priority:** High
**Timeline:** Enable sales operations

1. **POS Shift Management** (POS-001)
2. **POS Order Creation** (POS-002)
3. **Payment Processing** (POS-003)
4. **Menu Management** (ADM-005)
5. **Price Book Management** (ADM-006)

**Why:** Revenue generation

---

### Phase 4: Production & Quality

**Priority:** Medium
**Timeline:** Manufacturing operations

1. **Recipe Management** (PROD-001)
2. **Production Orders** (PROD-002)
3. **Production Waste Tracking** (PROD-003)
4. **Temperature Monitoring** (QC-001)
5. **Expiry Management** (QC-002)

**Why:** Central kitchen operations

---

### Phase 5: Online & Delivery

**Priority:** Medium
**Timeline:** Omnichannel sales

1. **Online Ordering** (ORD-001)
2. **Delivery Management** (ORD-002)
3. **Customer Management** (CUS-001)
4. **Loyalty Program** (CUS-002)

**Why:** Channel expansion

---

### Phase 6: Advanced Features

**Priority:** Low
**Timeline:** Optimization and growth

1. **Kitchen Display System** (POS-005)
2. **Stock Counts** (INV-004, INV-005)
3. **Requisitions** (XFER-002)
4. **Returns Management** (RET-001, RET-002)
5. **Vouchers & Promotions** (CUS-003)
6. **Low Stock Alerts** (QC-003)

**Why:** Operational efficiency

---

### Phase 7: Analytics & Reporting

**Priority:** Low
**Timeline:** Business intelligence

1. **Daily Sales Summary** (RPT-001)
2. **Inventory Valuation** (RPT-002)
3. **Product Performance** (RPT-003)
4. **Stock Movement Audit** (RPT-004)
5. **Cash Reconciliation** (RPT-007)
6. **COGS & Gross Margin** (RPT-008)

**Why:** Data-driven decisions

---

## Summary Statistics

| Category | Features | Database Tables | API Endpoints |
|----------|----------|-----------------|---------------|
| Authentication & User Management | 3 | 5 | 12 |
| Procurement & Purchasing | 6 | 6 | 25 |
| Inventory Management | 6 | 8 | 30 |
| Stock Movement & Transfers | 2 | 4 | 15 |
| Production & Recipes | 3 | 3 | 12 |
| Point of Sale (POS) | 5 | 8 | 25 |
| Order Management (Online) | 2 | 4 | 15 |
| Returns Management | 2 | 2 | 10 |
| Quality Control & Compliance | 3 | 2 | 15 |
| Customer & Loyalty | 3 | 7 | 20 |
| Reporting & Analytics | 8 | All (views) | 16 |
| System Administration | 6 | 10 | 30 |
| **TOTAL** | **49** | **50+** | **225+** |

---

## Conclusion

This ERP system provides a **production-ready, enterprise-grade** foundation for F&B operations with:

✅ **Complete feature coverage** of all 90+ user stories
✅ **Solid database design** with ledger-first architecture
✅ **Multi-tenancy** with proper isolation
✅ **FEFO lot tracking** for perishables
✅ **Unified order model** for omnichannel sales
✅ **Comprehensive workflows** from procurement to production to sale
✅ **Quality & compliance** built-in (HACCP, expiry management)
✅ **Scalable architecture** ready for growth

**Minor enhancements recommended** (categories, reorder points, drivers) but **not blockers** for implementation.

**Next Steps:**
1. Review and approve feature list
2. Implement schema enhancements (Phase 0)
3. Begin Phase 1 development (Core Operations)
4. Iterate through phases based on business priorities

---

*Generated: 2025-11-18*
*Version: 1.0*
*Status: Ready for Implementation*
