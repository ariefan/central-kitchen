# ERP System - Comprehensive User Stories

> **Multi-outlet Coffee/Bakery Central Kitchen ERP System**
>
> Based on database schema and API endpoints

---

## Table of Contents
1. [System Actors](#system-actors)
2. [Authentication & User Management](#authentication--user-management)
3. [Procurement & Purchasing](#procurement--purchasing)
4. [Inventory Management](#inventory-management)
5. [Production & Recipes](#production--recipes)
6. [Point of Sale (POS)](#point-of-sale-pos)
7. [Order Management](#order-management)
8. [Stock Movement & Transfers](#stock-movement--transfers)
9. [Quality Control & Compliance](#quality-control--compliance)
10. [Customer & Loyalty](#customer--loyalty)
11. [Reporting & Analytics](#reporting--analytics)

---

## System Actors

### Primary Actors
1. **Admin** - Full system access, tenant configuration
2. **Manager** - Location management, approvals, oversight
3. **Procurement Staff** - Purchase orders, supplier management
4. **Warehouse Staff** - Receiving, transfers, stock counts
5. **Kitchen Staff** - Production, recipe execution
6. **Cashier** - POS operations, customer service
7. **Quality Control Staff** - Temperature logs, compliance checks
8. **Delivery Driver** - Order deliveries
9. **Customer** - Order placement, loyalty program

### System Actors
- **System** - Automated alerts, calculations, postings

---

## Authentication & User Management

### Epic: User Authentication & Authorization

#### US-AUTH-001: User Registration
**As an** Admin
**I want to** register new users in the system
**So that** staff members can access the appropriate features based on their role

**Acceptance Criteria:**
- Can create user with email, username, password
- Can assign first name, last name, phone
- Can assign role (admin, manager, cashier, staff)
- Can assign to specific location
- User is linked to tenant automatically
- Email uniqueness enforced per tenant
- Better-auth integration handles password hashing

**API Endpoints:**
- `POST /api/v1/users` - Create new user
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Deactivate user

---

#### US-AUTH-002: User Login
**As a** Staff Member
**I want to** login with my credentials
**So that** I can access the system securely

**Acceptance Criteria:**
- Can login with email/username and password
- Session token created on successful login
- Session persists across requests
- Last login timestamp updated
- Multi-tenant context established automatically
- Failed login attempts logged

**API Endpoints:**
- `POST /api/auth/sign-in/email` - Email/password login
- `POST /api/auth/sign-in/username` - Username/password login
- `POST /api/auth/sign-out` - Logout
- `GET /api/v1/auth/me` - Get current user info

---

#### US-AUTH-003: Multi-Location Access
**As a** Manager
**I want to** access data for my assigned location only
**So that** I don't see irrelevant information from other outlets

**Acceptance Criteria:**
- User assigned to specific location on creation
- All queries automatically filtered by user's location
- Can switch location if assigned to multiple (future)
- Location context included in session
- Row-level security enforced at database level

---

## Procurement & Purchasing

### Epic: Purchase Order Management

#### US-PROC-001: Create Purchase Order
**As a** Procurement Staff
**I want to** create purchase orders for raw materials
**So that** I can order supplies from suppliers

**Acceptance Criteria:**
- Can select supplier from active suppliers list
- Can add multiple products with quantities and UOM
- System calculates line totals automatically
- Can add tax, shipping, discount
- Total amount calculated correctly
- Document number auto-generated (PO-YYYYMM-00001)
- Can save as draft
- Can add delivery location
- Can set expected delivery date
- Can add notes

**API Endpoints:**
- `POST /api/v1/purchase-orders` - Create PO
- `GET /api/v1/purchase-orders` - List POs
- `GET /api/v1/purchase-orders/:id` - Get PO details
- `PUT /api/v1/purchase-orders/:id` - Update PO
- `DELETE /api/v1/purchase-orders/:id` - Delete draft PO

**Database Tables:**
- `purchase_orders` - Header
- `purchase_order_items` - Line items
- `doc_sequences` - Auto-numbering

---

#### US-PROC-002: Submit Purchase Order for Approval
**As a** Procurement Staff
**I want to** submit purchase order for manager approval
**So that** orders above threshold require authorization

**Acceptance Criteria:**
- Can submit draft PO for approval
- Status changes from "draft" to "pending_approval"
- Approval notification sent to manager
- Cannot modify PO after submission
- Shows submitted timestamp and user

**API Endpoints:**
- `POST /api/v1/purchase-orders/:id/submit` - Submit for approval

---

#### US-PROC-003: Approve/Reject Purchase Order
**As a** Manager
**I want to** approve or reject purchase orders
**So that** I can control procurement costs

**Acceptance Criteria:**
- Can view list of pending POs
- Can approve PO (status → "approved")
- Can reject PO with reason (status → "rejected")
- Approved timestamp and approver recorded
- Email notification sent to requester
- Rejected POs return to draft for modification

**API Endpoints:**
- `POST /api/v1/purchase-orders/:id/approve` - Approve PO
- `POST /api/v1/purchase-orders/:id/reject` - Reject PO

---

#### US-PROC-004: Send Purchase Order to Supplier
**As a** Procurement Staff
**I want to** send approved PO to supplier
**So that** supplier can prepare the order

**Acceptance Criteria:**
- Can only send approved POs
- Status changes to "sent"
- PDF generated with PO details
- Email sent to supplier contact
- Sent timestamp recorded

**API Endpoints:**
- `POST /api/v1/purchase-orders/:id/send` - Send to supplier

---

### Epic: Goods Receipt

#### US-PROC-005: Receive Goods
**As a** Warehouse Staff
**I want to** receive goods from supplier
**So that** inventory is updated accurately

**Acceptance Criteria:**
- Can create goods receipt from PO or standalone
- Can receive partial quantities
- Must specify lot number for each item
- Must enter expiry date for perishable items
- Must enter manufacture date (optional)
- Can enter received quantity per line
- System creates lot automatically if not exists
- Receipt number auto-generated (GR-YYYYMM-00001)
- Can add receiving notes
- Quality check status can be recorded

**API Endpoints:**
- `POST /api/v1/goods-receipts` - Create goods receipt
- `GET /api/v1/goods-receipts` - List receipts
- `GET /api/v1/goods-receipts/:id` - Get receipt details
- `POST /api/v1/goods-receipts/:id/post` - Post to inventory

**Database Tables:**
- `goods_receipts` - Header
- `goods_receipt_items` - Line items with lot references
- `lots` - Lot master data
- `stock_ledger` - Inventory movements (on posting)

---

#### US-PROC-006: Post Goods Receipt to Inventory
**As a** Warehouse Staff
**I want to** post goods receipt to inventory
**So that** stock quantities are updated

**Acceptance Criteria:**
- Can only post complete goods receipts
- System creates stock ledger entries (type: "rcv")
- Stock quantity increases per location/product/lot
- Unit cost from GR line used
- Posting creates cost layers for FIFO costing
- Cannot edit after posting
- PO status updated to "partial_receipt" or "completed"
- Posting timestamp recorded

**Database Functions:**
- `erp.post_goods_receipt(p_gr uuid, p_user uuid)` - Creates ledger entries

---

#### US-PROC-007: Handle Over/Under Delivery
**As a** Warehouse Staff
**I want to** record actual received quantity vs ordered
**So that** discrepancies are tracked

**Acceptance Criteria:**
- Can see ordered quantity from PO
- Can enter different received quantity
- Variance calculated automatically
- Over-delivery can be accepted (configurable)
- Under-delivery tracked for follow-up
- Notes field for explaining variance

---

### Epic: Supplier Management

#### US-PROC-008: Manage Suppliers
**As a** Procurement Staff
**I want to** maintain supplier master data
**So that** I can track supplier information

**Acceptance Criteria:**
- Can create supplier with code, name, contact
- Can add email, phone, address
- Can set payment terms (days)
- Can set credit limit
- Can mark supplier as active/inactive
- Supplier code unique per tenant
- Can add tax ID
- Can add notes

**API Endpoints:**
- `POST /api/v1/suppliers` - Create supplier
- `GET /api/v1/suppliers` - List suppliers
- `PUT /api/v1/suppliers/:id` - Update supplier
- `DELETE /api/v1/suppliers/:id` - Deactivate supplier

---

#### US-PROC-009: Manage Supplier Products
**As a** Procurement Staff
**I want to** link products to suppliers with pricing
**So that** I can track who supplies what at what price

**Acceptance Criteria:**
- Can link product to supplier
- Can set supplier SKU code
- Can set unit price per UOM
- Can set minimum order quantity
- Can set lead time in days
- Can mark as primary supplier for product
- Can track multiple suppliers per product
- Price history maintained

---

## Inventory Management

### Epic: Stock Visibility

#### US-INV-001: View On-Hand Inventory
**As a** Manager
**I want to** view current stock levels by product and location
**So that** I know what's available

**Acceptance Criteria:**
- Shows product, location, total quantity on-hand
- Quantity calculated from stock ledger (SUM of all movements)
- Filtered by user's location by default
- Can filter by product category, product type
- Shows UOM
- Real-time data from database view
- Can export to Excel

**API Endpoints:**
- `GET /api/v1/inventory/onhand` - On-hand inventory
- `GET /api/v1/inventory/onhand/export` - Excel export

**Database Views:**
- `v_inventory_onhand` - Materialized/computed on-hand quantities

---

#### US-INV-002: View Lot-Level Inventory
**As a** Warehouse Staff
**I want to** view inventory by lot with expiry dates
**So that** I can pick using FEFO (First Expiry, First Out)

**Acceptance Criteria:**
- Shows product, location, lot number, expiry date
- Shows quantity per lot
- Sorted by expiry date (earliest first)
- Shows days until expiry
- Highlights lots expiring soon (configurable days)
- Can filter by product, location
- Shows manufacture date, received date

**API Endpoints:**
- `GET /api/v1/inventory/lots` - Lot balances
- `GET /api/v1/inventory/lots/:id` - Lot details

**Database Views:**
- `v_lot_balances` - Lot-level quantities
- `v_fefo_pick` - FEFO-ordered picking list

---

#### US-INV-003: View Stock Movement History
**As a** Manager
**I want to** view all stock movements for a product
**So that** I can audit inventory changes

**Acceptance Criteria:**
- Shows all ledger entries for product/location
- Displays date, type (rcv, iss, xfer_in, etc.)
- Shows quantity delta, running balance
- Shows reference document (PO, GR, ORDER, etc.)
- Can filter by date range, movement type
- Shows user who created movement
- Includes notes/reason

**API Endpoints:**
- `GET /api/v1/inventory/ledger` - Stock ledger history
- `GET /api/v1/inventory/ledger/product/:id` - Product movements

**Database Tables:**
- `stock_ledger` - Immutable movement log

---

### Epic: Stock Adjustments

#### US-INV-004: Create Stock Adjustment
**As a** Warehouse Staff
**I want to** create inventory adjustments for discrepancies
**So that** system quantities match physical counts

**Acceptance Criteria:**
- Can create adjustment for location
- Can add multiple products/lots
- Must select reason: damage, expiry, theft, found, correction, waste, spoilage
- Enter quantity delta (+ or -)
- Can enter unit cost for valuation
- Can add notes per line
- Adjustment number auto-generated (ADJ-YYYYMM-00001)
- Saves as draft initially
- Must be approved before posting

**API Endpoints:**
- `POST /api/v1/adjustments` - Create adjustment
- `GET /api/v1/adjustments` - List adjustments
- `GET /api/v1/adjustments/:id` - Get details
- `PUT /api/v1/adjustments/:id` - Update draft

**Database Tables:**
- `stock_adjustments` - Header
- `stock_adjustment_items` - Line items

---

#### US-INV-005: Approve and Post Stock Adjustment
**As a** Manager
**I want to** approve stock adjustments
**So that** inventory changes are authorized

**Acceptance Criteria:**
- Can approve draft adjustments
- Status changes to "approved" then "posted"
- Approval timestamp and approver recorded
- Posting creates stock ledger entries (type: "adj")
- Stock quantities updated immediately
- Cannot edit after posting
- Negative stock guard prevents invalid adjustments

**API Endpoints:**
- `POST /api/v1/adjustments/:id/approve` - Approve
- `POST /api/v1/adjustments/:id/post` - Post to ledger

---

### Epic: Stock Counts

#### US-INV-006: Create Stock Count
**As a** Warehouse Staff
**I want to** perform physical stock counts
**So that** I can verify system quantities

**Acceptance Criteria:**
- Can create count for specific location
- Count number auto-generated (CNT-YYYYMM-00001)
- System pre-fills products with current system quantities
- Can add products manually
- Shows system quantity vs counted quantity
- Variance calculated automatically
- Can use mobile device for counting (barcode scan)
- Count status: draft → counting → review → posted
- Can save progress and resume later

**API Endpoints:**
- `POST /api/v1/stock-counts` - Create count
- `GET /api/v1/stock-counts` - List counts
- `GET /api/v1/stock-counts/:id` - Get count details
- `PUT /api/v1/stock-counts/:id/lines/:lineId` - Update count line
- `POST /api/v1/stock-counts/:id/complete` - Mark counting complete

**Database Tables:**
- `stock_counts` - Header
- `stock_count_lines` - Count lines with variance

---

#### US-INV-007: Review and Post Stock Count
**As a** Manager
**I want to** review count variances before posting
**So that** I can investigate significant discrepancies

**Acceptance Criteria:**
- Can view variance report (count vs system)
- Shows variance by product, lot
- Can add notes for investigation
- Can approve and post count
- Posting creates stock ledger adjustments (type: "adj", ref: "COUNT")
- System quantities updated to match counted
- Variance threshold alerts (configurable)
- Original system quantities preserved in history

**API Endpoints:**
- `POST /api/v1/stock-counts/:id/review` - Mark as reviewed
- `POST /api/v1/stock-counts/:id/post` - Post adjustments

**Database Functions:**
- `erp.post_stock_count(p_count uuid, p_user uuid)` - Creates adjustment ledger entries

---

#### US-INV-008: Mobile Stock Counting
**As a** Warehouse Staff
**I want to** use mobile device for stock counting
**So that** I can count efficiently on the warehouse floor

**Acceptance Criteria:**
- Mobile-optimized counting interface
- Barcode scanning support
- Can search product by SKU, name
- Can enter lot number
- Can enter counted quantity
- Saves immediately (no need to sync)
- Shows progress (% counted)
- Works offline (future)

---

## Stock Movement & Transfers

### Epic: Inter-Location Transfers

#### US-XFER-001: Create Stock Transfer Request
**As a** Manager (Requesting Location)
**I want to** request stock transfer from another location
**So that** I can get supplies when needed

**Acceptance Criteria:**
- Can create transfer from Location A to Location B
- Can add multiple products with quantities
- Transfer number auto-generated (XFER-YYYYMM-00001)
- Must specify UOM per line
- Can set expected delivery date
- Status: draft initially
- Can add notes
- Saves as draft

**API Endpoints:**
- `POST /api/v1/transfers` - Create transfer
- `GET /api/v1/transfers` - List transfers
- `GET /api/v1/transfers/:id` - Get details
- `PUT /api/v1/transfers/:id` - Update draft

**Database Tables:**
- `transfers` - Header
- `transfer_items` - Line items

---

#### US-XFER-002: Approve Transfer Request
**As a** Manager (Sending Location)
**I want to** approve or reject transfer requests
**So that** I can control my inventory allocation

**Acceptance Criteria:**
- Can view pending transfer requests
- Can approve (status → "approved")
- Can reject with reason (status → "rejected")
- Approval timestamp and approver recorded
- Email notification sent
- Cannot approve if insufficient stock
- Stock reserved on approval (soft allocation)

**API Endpoints:**
- `POST /api/v1/transfers/:id/approve` - Approve transfer
- `POST /api/v1/transfers/:id/reject` - Reject transfer

---

#### US-XFER-003: Ship Transfer
**As a** Warehouse Staff (Sending Location)
**I want to** ship approved transfer
**So that** stock moves to requesting location

**Acceptance Criteria:**
- Can only ship approved transfers
- Must specify lots for each item (FEFO recommended)
- Can adjust quantity if needed
- Status changes to "sent" or "in_transit"
- Sent timestamp and user recorded
- Stock deducted from sending location immediately
- Driver/vehicle info can be recorded
- Packing slip generated

**API Endpoints:**
- `POST /api/v1/transfers/:id/ship` - Mark as shipped
- `GET /api/v1/transfers/:id/packing-slip` - Generate packing slip

---

#### US-XFER-004: Receive Transfer
**As a** Warehouse Staff (Receiving Location)
**I want to** receive transfer shipment
**So that** stock is added to my location

**Acceptance Criteria:**
- Can view in-transit transfers
- Can enter received quantity per line
- Can flag damaged items
- Received timestamp recorded
- Status changes to "completed"
- Stock added to receiving location
- Variance tracked if qty received ≠ qty shipped
- Can create return for damaged goods

**API Endpoints:**
- `POST /api/v1/transfers/:id/receive` - Receive transfer
- `POST /api/v1/transfers/:id/complete` - Complete transfer

---

#### US-XFER-005: Post Transfer to Ledger
**As a** System
**I want to** post transfer to stock ledger
**So that** inventory movements are recorded

**Acceptance Criteria:**
- Two ledger entries created:
  - Sending location: type "xfer_out", qty negative
  - Receiving location: type "xfer_in", qty positive
- Unit cost carried from sending location
- Lot ID preserved
- Reference type: "XFER", ref ID: transfer ID
- Transaction timestamps match sent/received times
- Negative stock guard prevents invalid transfers

**Database Functions:**
- `erp.post_transfer(p_xfer uuid, p_user uuid)` - Creates bidirectional ledger entries

---

### Epic: Stock Requisitions

#### US-XFER-006: Create Requisition
**As a** Manager (Outlet)
**I want to** request stock from central kitchen
**So that** I can replenish my outlet inventory

**Acceptance Criteria:**
- Can create requisition to central kitchen
- Can add products with requested quantities
- Requisition number auto-generated (REQ-YYYYMM-00001)
- Can set required date
- Status: draft → pending_approval
- Can save as draft
- Auto-submission on save (optional)

**API Endpoints:**
- `POST /api/v1/requisitions` - Create requisition
- `GET /api/v1/requisitions` - List requisitions
- `GET /api/v1/requisitions/:id` - Get details

**Database Tables:**
- `requisitions` - Header
- `requisition_items` - Line items

---

#### US-XFER-007: Approve and Issue Requisition
**As a** Warehouse Staff (Central Kitchen)
**I want to** approve and issue requisition
**So that** outlets receive their stock

**Acceptance Criteria:**
- Can approve requisition
- Can enter issued quantity (may differ from requested)
- Status changes: approved → issued → delivered
- Issued timestamp recorded
- Stock ledger entry created (type: "iss")
- Can partially issue over multiple fulfillments
- Shortage tracked for backorder

**API Endpoints:**
- `POST /api/v1/requisitions/:id/approve` - Approve
- `POST /api/v1/requisitions/:id/issue` - Issue stock
- `POST /api/v1/requisitions/:id/deliver` - Mark delivered

---

## Production & Recipes

### Epic: Recipe Management

#### US-PROD-001: Create Recipe
**As a** Kitchen Manager
**I want to** create recipes for finished products
**So that** I can standardize production

**Acceptance Criteria:**
- Can create recipe for finished product
- Recipe code and name required
- Can add multiple ingredient lines
- Each ingredient has product, quantity in base UOM
- Can set yield quantity (how much finished product)
- Can add preparation instructions
- Can version recipes (version number auto-increment)
- Can mark recipe as active/inactive
- Only one active version per recipe code

**API Endpoints:**
- `POST /api/v1/recipes` - Create recipe
- `GET /api/v1/recipes` - List recipes
- `GET /api/v1/recipes/:id` - Get recipe details
- `PUT /api/v1/recipes/:id` - Update recipe (creates new version)

**Database Tables:**
- `recipes` - Recipe master
- `recipe_items` - Ingredients/components

---

#### US-PROD-002: Calculate Recipe Cost
**As a** Kitchen Manager
**I want to** see recipe cost based on ingredient costs
**So that** I can price products correctly

**Acceptance Criteria:**
- System calculates total ingredient cost
- Uses current/average cost from stock ledger
- Shows cost per yield unit
- Shows cost breakdown by ingredient
- Highlights missing costs (ingredients without cost data)
- Can recalculate when costs change

**API Endpoints:**
- `GET /api/v1/recipes/:id/cost` - Get recipe costing

---

### Epic: Production Orders

#### US-PROD-003: Create Production Order
**As a** Kitchen Manager
**I want to** schedule production batches
**So that** I can plan ingredient usage

**Acceptance Criteria:**
- Can select recipe
- Can enter planned quantity to produce
- Order number auto-generated (PROD-YYYYMM-00001)
- Can set production location
- Can schedule production date/time
- Status: scheduled initially
- System validates ingredient availability
- Warning shown if insufficient stock
- Can add notes (shift, supervisor, etc.)

**API Endpoints:**
- `POST /api/v1/production-orders` - Create production order
- `GET /api/v1/production-orders` - List orders
- `GET /api/v1/production-orders/:id` - Get details
- `PUT /api/v1/production-orders/:id` - Update order

**Database Tables:**
- `production_orders` - Production schedule

---

#### US-PROD-004: Start Production
**As a** Kitchen Staff
**I want to** start production batch
**So that** system tracks production time

**Acceptance Criteria:**
- Can mark order as "in_progress"
- Start timestamp recorded
- Supervisor recorded
- Cannot start if ingredients unavailable
- Order locked (cannot modify recipe)

**API Endpoints:**
- `POST /api/v1/production-orders/:id/start` - Start production

---

#### US-PROD-005: Complete Production
**As a** Kitchen Staff
**I want to** complete production and record output
**So that** finished goods are added to inventory

**Acceptance Criteria:**
- Can enter actual produced quantity
- Can differ from planned (yield variance tracked)
- Status changes to "completed"
- Completion timestamp recorded
- Must post to inventory before marking complete

**API Endpoints:**
- `POST /api/v1/production-orders/:id/complete` - Complete production
- `POST /api/v1/production-orders/:id/post` - Post to inventory

---

#### US-PROD-006: Post Production to Inventory
**As a** System
**I want to** post production to stock ledger
**So that** ingredients are consumed and finished goods received

**Acceptance Criteria:**
- Component consumption posted (type: "prod_out", qty negative)
- Finished product posted (type: "prod_in", qty positive)
- Cost calculated from consumed components
- Lot created for finished product (optional)
- Expiry date calculated (if applicable)
- Reference: "PROD", production order ID
- Negative stock guard prevents invalid production

**Database Functions:**
- `erp.post_production(p_prod uuid, p_user uuid)` - Posts component consumption and FG receipt

---

#### US-PROD-007: Handle Production Waste
**As a** Kitchen Staff
**I want to** record production waste/spoilage
**So that** I can track efficiency

**Acceptance Criteria:**
- Can record waste during production
- Waste quantity and reason captured
- Waste posted to ledger separately (type: "prod_out")
- Yield percentage calculated
- Waste cost allocated

---

## Point of Sale (POS)

### Epic: POS Operations

#### US-POS-001: Open POS Shift
**As a** Cashier
**I want to** open a shift with starting cash float
**So that** I can begin taking orders

**Acceptance Criteria:**
- Can open shift for specific device/terminal
- Must enter opening float amount
- Shift ID generated
- Opening timestamp and user recorded
- Only one active shift per device
- Cannot open if previous shift not closed

**API Endpoints:**
- `POST /api/v1/pos/shifts` - Open shift
- `GET /api/v1/pos/shifts/active` - Get active shift
- `GET /api/v1/pos/shifts/:id` - Get shift details

**Database Tables:**
- `pos_shifts` - Shift records

---

#### US-POS-002: Create Order (Dine-In/Takeaway)
**As a** Cashier
**I want to** create customer order
**So that** I can process sales

**Acceptance Criteria:**
- Order number auto-generated (ORD-YYYYMM-00001)
- Can select order type: dine_in, take_away, delivery
- Can add products from menu
- Can select product variants (size, etc.)
- Can add modifiers (extra shot, no sugar, etc.)
- Quantity can be adjusted
- Can add order notes
- Can assign table number (dine-in)
- Can select/create customer (optional)
- Prices pulled from active price book or default
- Subtotal, tax, service charge calculated automatically
- Order status: open initially
- Kitchen status: open (not started)

**API Endpoints:**
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id` - Update order (before payment)
- `POST /api/v1/orders/:id/items` - Add item to order
- `PUT /api/v1/orders/:id/items/:itemId` - Update item
- `DELETE /api/v1/orders/:id/items/:itemId` - Remove item

**Database Tables:**
- `orders` - Order header
- `order_items` - Order lines
- `order_item_modifiers` - Item customizations

---

#### US-POS-003: Apply Discounts and Vouchers
**As a** Cashier
**I want to** apply discounts and vouchers to orders
**So that** customers receive promotions

**Acceptance Criteria:**
- Can apply percentage or fixed discount
- Can apply voucher code
- System validates voucher:
  - Active and within date range
  - Meets minimum spend
  - Not exceeded usage limit
  - Valid for channel (POS)
- Discount amount calculated
- Total recalculated
- Voucher redemption recorded
- Cannot apply multiple vouchers (configurable)

**API Endpoints:**
- `POST /api/v1/orders/:id/discount` - Apply discount
- `POST /api/v1/orders/:id/voucher` - Apply voucher
- `DELETE /api/v1/orders/:id/voucher` - Remove voucher

**Database Tables:**
- `vouchers` - Voucher definitions
- `voucher_redemptions` - Usage tracking

---

#### US-POS-004: Process Payment
**As a** Cashier
**I want to** accept payment for order
**So that** sale is completed

**Acceptance Criteria:**
- Can select payment method: cash, card, mobile_payment, gift_card, store_credit
- Can accept split payments (multiple tenders)
- For cash: can enter tendered amount, change calculated
- Can enter payment reference (card auth code, etc.)
- Payment timestamp recorded
- Order status changes to "paid"
- Receipt printed/emailed
- Stock ledger updated (type: "iss", negative)
- Lot picked using FEFO for perishable items
- Kitchen ticket sent to KDS

**API Endpoints:**
- `POST /api/v1/orders/:id/payments` - Add payment
- `GET /api/v1/orders/:id/payments` - List payments
- `POST /api/v1/orders/:id/complete` - Finalize order
- `GET /api/v1/orders/:id/receipt` - Generate receipt

**Database Tables:**
- `payments` - Payment records

**Database Functions:**
- `erp.post_order_issue(p_order uuid, p_user uuid)` - Deduct inventory

---

#### US-POS-005: Void/Refund Order
**As a** Cashier (with Manager Approval)
**I want to** void or refund orders
**So that** I can handle customer complaints

**Acceptance Criteria:**
- Can void unpaid orders (status → "voided")
- Can refund paid orders (status → "refunded")
- Refund requires manager approval
- Refund reverses inventory deduction
- Refund reverses payment
- Reason required for void/refund
- Original order preserved for audit
- Refund posted to ledger (type: "iss", positive - reversal)

**API Endpoints:**
- `POST /api/v1/orders/:id/void` - Void order
- `POST /api/v1/orders/:id/refund` - Refund order

---

#### US-POS-006: Manage Cash Drawer
**As a** Cashier
**I want to** manage cash drawer during shift
**So that** I can handle cash operations

**Acceptance Criteria:**
- Can record cash in (petty cash, safe deposit)
- Can record cash out (expenses, safe drop)
- Must provide reason for movement
- Movement amount and timestamp recorded
- Running cash balance updated
- Requires manager approval for large amounts

**API Endpoints:**
- `POST /api/v1/pos/shifts/:id/cash-in` - Record cash in
- `POST /api/v1/pos/shifts/:id/cash-out` - Record cash out
- `GET /api/v1/pos/shifts/:id/movements` - List movements

**Database Tables:**
- `drawer_movements` - Cash movements

---

#### US-POS-007: Close POS Shift
**As a** Cashier
**I want to** close shift with cash reconciliation
**So that** shift is finalized

**Acceptance Criteria:**
- Can enter actual cash count
- System calculates expected cash (float + cash sales - cash out)
- Variance calculated (actual - expected)
- Shows sales summary (total sales, payment breakdown)
- Closing timestamp and user recorded
- Shift report generated (PDF)
- Cash deposit slip generated
- Cannot reopen closed shift
- Large variances flagged for investigation

**API Endpoints:**
- `POST /api/v1/pos/shifts/:id/close` - Close shift
- `GET /api/v1/pos/shifts/:id/report` - Shift report

---

### Epic: Kitchen Display System (KDS)

#### US-POS-008: View Kitchen Orders
**As a** Kitchen Staff
**I want to** see new orders on kitchen display
**So that** I can prepare items

**Acceptance Criteria:**
- Shows orders with kitchen_status "open"
- Displays order number, table, time elapsed
- Shows items grouped by station (hot, cold, drinks, etc.)
- Items sorted by prep_status: queued → preparing → ready
- Color-coded by urgency (time waiting)
- Auto-refreshes every few seconds
- Shows item modifiers and special requests
- Order read-aloud option for accessibility

**API Endpoints:**
- `GET /api/v1/pos/kitchen/orders` - Active kitchen orders
- `GET /api/v1/pos/kitchen/items` - Items by station

---

#### US-POS-009: Update Item Preparation Status
**As a** Kitchen Staff
**I want to** mark items as preparing/ready
**So that** order progress is tracked

**Acceptance Criteria:**
- Can mark item as "preparing"
- Can mark item as "ready"
- Timestamps recorded for each status change
- When all items ready, order kitchen_status → "ready"
- Notification sent to cashier/server
- Preparation time tracked for analytics

**API Endpoints:**
- `POST /api/v1/orders/:id/items/:itemId/start` - Start preparing
- `POST /api/v1/orders/:id/items/:itemId/ready` - Mark ready
- `POST /api/v1/orders/:id/complete-preparation` - All items ready

---

## Order Management

### Epic: Online Orders

#### US-ORDER-001: Create Online Order (Customer App)
**As a** Customer
**I want to** place order through mobile app
**So that** I can order for delivery/pickup

**Acceptance Criteria:**
- Can browse menu (filtered by active, available items)
- Can search products
- Can add items to cart with modifiers
- Can save cart for later
- Cart persists across sessions
- Can view cart total with tax, delivery fee
- Can select delivery address or pickup
- Can apply voucher code
- Can add order notes
- Order created with channel: "online"
- Order status: "open" until payment
- Email/SMS confirmation sent

**API Endpoints:**
- `GET /api/v1/menus` - Get active menus
- `POST /api/v1/carts` - Create cart
- `POST /api/v1/carts/:id/items` - Add to cart
- `POST /api/v1/carts/:id/checkout` - Convert cart to order

**Database Tables:**
- `carts` - Shopping carts
- `cart_items` - Cart contents
- `orders` - Order created on checkout

---

#### US-ORDER-002: Process Online Payment
**As a** Customer
**I want to** pay for online order
**So that** order is confirmed

**Acceptance Criteria:**
- Can pay with card (Stripe/payment gateway)
- Can pay with store credit/gift card
- Payment processed before order confirmed
- Order status changes to "paid" on success
- Inventory deducted
- Kitchen ticket sent if applicable
- Failed payment keeps order in "open" status
- Payment reference stored

---

#### US-ORDER-003: Assign Delivery
**As a** Manager
**I want to** assign orders to delivery drivers
**So that** customers receive their orders

**Acceptance Criteria:**
- Can view pending delivery orders
- Can assign to driver (internal or third-party)
- Delivery status: requested → assigned → picked_up → delivered
- Tracking code generated (if third-party)
- Customer notified with tracking link
- Delivery fee calculated based on distance
- ETA calculated and displayed

**API Endpoints:**
- `POST /api/v1/deliveries` - Create delivery
- `PUT /api/v1/deliveries/:id` - Update delivery status
- `GET /api/v1/deliveries/:id/track` - Track delivery

**Database Tables:**
- `deliveries` - Delivery records

---

## Returns Management

### Epic: Supplier Returns

#### US-RET-001: Create Supplier Return
**As a** Warehouse Staff
**I want to** return defective goods to supplier
**So that** I can get replacement or refund

**Acceptance Criteria:**
- Can create return for supplier
- Return type: "supplier_return"
- Can link to original goods receipt
- Can add products with lots and quantities
- Must provide return reason per line
- Return number auto-generated (RET-YYYYMM-00001)
- Status: requested initially
- Can upload photos of defect
- Notes field for details

**API Endpoints:**
- `POST /api/v1/returns` - Create return
- `GET /api/v1/returns` - List returns
- `GET /api/v1/returns/:id` - Get details

**Database Tables:**
- `return_orders` - Return header
- `return_order_items` - Return lines

---

#### US-RET-002: Approve Supplier Return
**As a** Manager
**I want to** approve return requests
**So that** returns are authorized

**Acceptance Criteria:**
- Can approve return (status → "approved")
- Can reject return with reason
- Approval timestamp and approver recorded
- Approved returns ready for shipping
- Rejection notification sent

**API Endpoints:**
- `POST /api/v1/returns/:id/approve` - Approve return
- `POST /api/v1/returns/:id/reject` - Reject return

---

#### US-RET-003: Ship Return and Update Inventory
**As a** Warehouse Staff
**I want to** ship return and update inventory
**So that** stock is deducted

**Acceptance Criteria:**
- Can mark return as "completed"
- Stock ledger entry created (type: "iss", negative)
- Lot stock reduced
- Cost recorded for accounting
- Tracking number captured
- Return amount tracked for credit note

**API Endpoints:**
- `POST /api/v1/returns/:id/complete` - Complete return

---

### Epic: Customer Returns

#### US-RET-004: Process Customer Return/Refund
**As a** Cashier
**I want to** process customer returns
**So that** customers can return unwanted items

**Acceptance Criteria:**
- Can create return linked to original order
- Return type: "customer_return"
- Can select items to return
- Must provide return reason
- Refund amount calculated
- Requires manager approval
- Restocking fee can be applied (configurable)
- Returned items added back to inventory (if resaleable)
- Payment refunded to original method
- Store credit option

**API Endpoints:**
- `POST /api/v1/returns` - Create customer return
- `POST /api/v1/returns/:id/refund` - Process refund

---

## Quality Control & Compliance

### Epic: Temperature Monitoring

#### US-QC-001: Record Temperature Logs
**As a** Quality Control Staff
**I want to** record temperature and humidity readings
**So that** I comply with food safety regulations

**Acceptance Criteria:**
- Can record temperature for location area (walk-in cooler, kitchen, etc.)
- Can enter temperature in Celsius/Fahrenheit
- Can enter humidity percentage
- Timestamp auto-recorded or manual entry
- Can link to device/sensor ID
- Can add notes
- Alert flagged if outside acceptable range
- Alert reason auto-populated
- Can attach photos

**API Endpoints:**
- `POST /api/v1/temperature-logs` - Create log
- `GET /api/v1/temperature-logs` - List logs
- `GET /api/v1/temperature-logs/alerts` - Get alerts

**Database Tables:**
- `temperature_logs` - Temperature records

---

#### US-QC-002: Receive Temperature Alerts
**As a** Manager
**I want to** receive alerts for temperature violations
**So that** I can take corrective action

**Acceptance Criteria:**
- System creates alert when temp out of range
- Alert priority: low, medium, high based on variance
- Alert shows current vs threshold
- Email/SMS notification sent to manager
- Alert shown in dashboard
- Can acknowledge alert
- Can add resolution notes
- Cannot mark resolved without action

**API Endpoints:**
- `GET /api/v1/alerts` - List all alerts
- `PUT /api/v1/alerts/:id/acknowledge` - Acknowledge alert
- `PUT /api/v1/alerts/:id/resolve` - Resolve alert

**Database Tables:**
- `alerts` - System alerts

---

### Epic: Expiry Management

#### US-QC-003: Monitor Expiring Stock
**As a** Warehouse Staff
**I want to** see products approaching expiry
**So that** I can use or dispose them in time

**Acceptance Criteria:**
- System generates alerts X days before expiry (configurable)
- Alert shows product, lot, location, expiry date, qty
- Alert priority based on days remaining
- Can filter by location, product
- Can mark for quick sale/discount
- Can mark for waste disposal
- Daily email digest of expiring items

**API Endpoints:**
- `GET /api/v1/inventory/expiring` - Get expiring lots
- `GET /api/v1/alerts?type=expiry` - Expiry alerts

---

#### US-QC-004: Dispose Expired Stock
**As a** Warehouse Staff
**I want to** dispose expired stock properly
**So that** unsafe products don't get used

**Acceptance Criteria:**
- Can create waste/adjustment for expired items
- Reason: "expiry" auto-selected
- Expiry date validation (must be expired)
- Photo upload required (compliance)
- Disposal method recorded (bin, compost, etc.)
- Batch disposal for efficiency
- Disposal certificate generated
- Stock ledger updated (qty negative)

**API Endpoints:**
- `POST /api/v1/waste` - Create waste record
- `POST /api/v1/adjustments` - Expiry adjustment

---

### Epic: Low Stock Alerts

#### US-QC-005: Set Reorder Points
**As a** Manager
**I want to** set minimum stock levels per product/location
**So that** I get alerted when stock is low

**Acceptance Criteria:**
- Can set reorder point quantity
- Can set maximum stock level
- Can set safety stock level
- Per product per location
- Historical usage considered (auto-suggest)

---

#### US-QC-006: Receive Low Stock Alerts
**As a** Procurement Staff
**I want to** receive low stock alerts
**So that** I can reorder before stock-out

**Acceptance Criteria:**
- Alert created when qty < reorder point
- Shows current qty, reorder point, suggested order qty
- Alert priority based on criticality
- Can create PO directly from alert
- Alert auto-resolved when stock replenished
- Daily digest email

---

## Customer & Loyalty

### Epic: Customer Management

#### US-CUST-001: Register Customer
**As a** Customer
**I want to** create account in mobile app
**So that** I can track orders and earn points

**Acceptance Criteria:**
- Can register with email, phone, password
- Can add name, profile photo
- Customer code auto-generated
- Type: "external" (regular customer)
- Email verification sent
- Welcome voucher issued (if configured)
- Loyalty account created automatically

**API Endpoints:**
- `POST /api/v1/customers` - Create customer (via app)
- `GET /api/v1/customers/me` - Get my profile
- `PUT /api/v1/customers/me` - Update profile

**Database Tables:**
- `customers` - Customer master
- `loyalty_accounts` - Loyalty points

---

#### US-CUST-002: Manage Delivery Addresses
**As a** Customer
**I want to** save multiple delivery addresses
**So that** I can quickly select for orders

**Acceptance Criteria:**
- Can add multiple addresses
- Each address has label (home, work, etc.)
- Can set default address
- Can add GPS coordinates for accurate delivery
- Address validation (Google Maps API)
- Can edit/delete addresses

**API Endpoints:**
- `POST /api/v1/customers/me/addresses` - Add address
- `GET /api/v1/customers/me/addresses` - List addresses
- `PUT /api/v1/customers/me/addresses/:id` - Update address
- `DELETE /api/v1/customers/me/addresses/:id` - Delete address

**Database Tables:**
- `addresses` - Customer addresses

---

### Epic: Loyalty Program

#### US-LOYAL-001: Earn Loyalty Points
**As a** Customer
**I want to** earn points on purchases
**So that** I can redeem rewards

**Acceptance Criteria:**
- Points earned based on spend (configurable rate)
- Points calculated at order completion
- Ledger entry created (ref: ORDER, points_delta positive)
- Points balance updated
- Points shown on receipt
- Exclusions: delivery fees, taxes (configurable)
- Bonus points on birthday (configurable)

**API Endpoints:**
- `GET /api/v1/customers/me/loyalty` - Get points balance
- `GET /api/v1/customers/me/loyalty/ledger` - Points history

**Database Tables:**
- `loyalty_ledger` - Points transactions

---

#### US-LOYAL-002: Redeem Loyalty Points
**As a** Customer
**I want to** redeem points for vouchers
**So that** I get discounts

**Acceptance Criteria:**
- Can view redemption catalog (points → vouchers)
- Can redeem if sufficient points
- Points deducted (ledger entry, negative delta)
- Voucher code issued
- Voucher sent via email/app
- Redemption history visible

**API Endpoints:**
- `POST /api/v1/customers/me/loyalty/redeem` - Redeem points
- `GET /api/v1/loyalty/catalog` - Redemption options

---

### Epic: Vouchers & Promotions

#### US-PROMO-001: Create Voucher Campaign
**As a** Marketing Manager
**I want to** create voucher campaigns
**So that** I can run promotions

**Acceptance Criteria:**
- Can create voucher with unique code
- Voucher types: percentage_off, fixed_amount, gift_card
- Can set discount amount/percentage
- Can set minimum spend requirement
- Can set usage limit (total redemptions)
- Can set per-customer limit
- Can set valid date range
- Can restrict to channel (POS, online, all)
- Can restrict to specific products (future)
- Auto-generated code option (bulk creation)

**API Endpoints:**
- `POST /api/v1/vouchers` - Create voucher
- `GET /api/v1/vouchers` - List vouchers
- `PUT /api/v1/vouchers/:id` - Update voucher
- `DELETE /api/v1/vouchers/:id` - Deactivate voucher

**Database Tables:**
- `vouchers` - Voucher master

---

#### US-PROMO-002: Track Voucher Usage
**As a** Marketing Manager
**I want to** track voucher redemptions
**So that** I can measure campaign effectiveness

**Acceptance Criteria:**
- Can view redemption count per voucher
- Shows unique customers redeemed
- Shows total discount amount
- Shows revenue generated (order totals)
- Can filter by date range
- Can export redemption details
- ROI calculation (revenue vs discount)

**API Endpoints:**
- `GET /api/v1/vouchers/:id/redemptions` - Redemption history
- `GET /api/v1/vouchers/:id/analytics` - Voucher analytics

---

## Reporting & Analytics

### Epic: Operational Reports

#### US-RPT-001: Daily Sales Report
**As a** Manager
**I want to** view daily sales summary
**So that** I track daily performance

**Acceptance Criteria:**
- Shows total sales by location
- Breakdown by payment method
- Breakdown by order type (dine-in, takeaway, delivery)
- Breakdown by channel (POS, online)
- Top selling products
- Number of orders, avg order value
- Hour-by-hour sales curve
- Comparison with previous day/week
- Can export to PDF/Excel

**API Endpoints:**
- `GET /api/v1/reports/sales/daily` - Daily sales
- `GET /api/v1/reports/sales/hourly` - Hourly breakdown

---

#### US-RPT-002: Inventory Valuation Report
**As a** Manager
**I want to** view inventory value by location
**So that** I know asset value

**Acceptance Criteria:**
- Shows qty on-hand per product
- Shows unit cost (average/FIFO)
- Shows extended value (qty × cost)
- Total inventory value
- Breakdown by category
- Breakdown by product type (raw, semi, finished)
- Can filter by location, date
- Slow-moving stock highlighted
- Can export

**API Endpoints:**
- `GET /api/v1/reports/inventory/valuation` - Inventory value

---

#### US-RPT-003: Product Performance Report
**As a** Manager
**I want to** analyze product sales performance
**So that** I can optimize menu

**Acceptance Criteria:**
- Shows sales quantity per product
- Shows revenue per product
- Shows profit margin (if cost available)
- Sales trend over time
- Comparison across locations
- Product ranking (best to worst)
- Category performance
- Can filter by date range, location

**API Endpoints:**
- `GET /api/v1/reports/products/performance` - Product analytics

---

#### US-RPT-004: Stock Movement Report
**As a** Warehouse Manager
**I want to** view stock movement history
**So that** I can audit inventory changes

**Acceptance Criteria:**
- Shows all ledger entries for period
- Filters by product, location, type
- Shows opening balance, movements, closing balance
- Movement types breakdown (receipt, issue, transfer, etc.)
- Reference document linkable
- User who created movement
- Can export to Excel

**API Endpoints:**
- `GET /api/v1/reports/inventory/movements` - Movement report

---

#### US-RPT-005: Waste & Spoilage Report
**As a** Operations Manager
**I want to** analyze waste and spoilage
**So that** I can reduce losses

**Acceptance Criteria:**
- Shows waste by reason (damage, expiry, theft, etc.)
- Waste quantity and value
- Trend over time
- Location comparison
- Product breakdown
- Waste percentage (waste/total usage)
- Root cause analysis data

**API Endpoints:**
- `GET /api/v1/reports/waste` - Waste report

---

#### US-RPT-006: Purchase Order Report
**As a** Procurement Manager
**I want to** view PO summary and status
**So that** I track procurement pipeline

**Acceptance Criteria:**
- Shows all POs by status
- Outstanding POs (sent, not received)
- PO value by supplier
- Delivery performance (on-time %)
- Lead time analysis
- Price variance (PO vs actual)

**API Endpoints:**
- `GET /api/v1/reports/procurement/orders` - PO report
- `GET /api/v1/reports/procurement/suppliers` - Supplier performance

---

### Epic: Financial Reports

#### US-RPT-007: Cash Reconciliation Report
**As a** Accounting Staff
**I want to** view shift cash reconciliation
**So that** I can audit cash handling

**Acceptance Criteria:**
- Shows all shifts by date range
- Opening float, cash sales, cash out
- Expected cash vs actual cash
- Variance per shift
- Cashier performance
- Large variances flagged
- Running daily cash position

**API Endpoints:**
- `GET /api/v1/reports/pos/reconciliation` - Cash reconciliation

---

#### US-RPT-008: Cost of Goods Sold (COGS) Report
**As a** Finance Manager
**I want to** calculate COGS for period
**So that** I can determine profitability

**Acceptance Criteria:**
- Opening inventory value
- Plus: Purchases (goods receipts)
- Minus: Closing inventory value
- Equals: COGS
- Breakdown by location, category
- Gross margin calculation (revenue - COGS)
- Gross margin percentage

**API Endpoints:**
- `GET /api/v1/reports/financial/cogs` - COGS report

---

## System Administration

### Epic: Product Catalog Management

#### US-ADMIN-001: Create Product
**As an** Admin
**I want to** create products in the system
**So that** they can be used across modules

**Acceptance Criteria:**
- Can enter SKU, name, description
- Must select product kind (raw_material, semi_finished, finished_good, packaging, consumable)
- Must select base UOM
- Can set standard cost, default price
- Can set tax category
- Can mark as perishable with shelf life days
- Can add barcode
- Can upload image
- Product code unique per tenant
- Can add to categories

**API Endpoints:**
- `POST /api/v1/products` - Create product
- `GET /api/v1/products` - List products
- `PUT /api/v1/products/:id` - Update product

**Database Tables:**
- `products` - Product master

---

#### US-ADMIN-002: Manage Product Variants
**As an** Admin
**I want to** create product variants
**So that** products have size/flavor options

**Acceptance Criteria:**
- Can create variants for product (Small, Medium, Large)
- Each variant has code and name
- Can set price differential (extra charge)
- Variants inherit base product properties
- Can activate/deactivate variants

**API Endpoints:**
- `POST /api/v1/products/:id/variants` - Create variant
- `GET /api/v1/products/:id/variants` - List variants

**Database Tables:**
- `product_variants`

---

#### US-ADMIN-003: Manage UOM and Conversions
**As an** Admin
**I want to** define units of measure and conversions
**So that** system handles different units correctly

**Acceptance Criteria:**
- Can create UOM (kg, g, L, mL, pcs, box, etc.)
- Can define conversions (1 kg = 1000 g)
- Conversion factor stored
- Bi-directional conversion supported
- System converts quantities automatically

**API Endpoints:**
- `POST /api/v1/uom-conversions` - Create UOM conversion
- `GET /api/v1/uom-conversions` - List conversions

**Database Tables:**
- `uoms` - Units of measure
- `uom_conversions` - Conversion rates

---

#### US-ADMIN-004: Manage Locations
**As an** Admin
**I want to** set up business locations
**So that** multi-location operations are supported

**Acceptance Criteria:**
- Can create location with code, name
- Location type: central_kitchen, outlet, warehouse
- Can add full address details
- Can set active/inactive
- Location code unique per tenant

**API Endpoints:**
- `POST /api/v1/locations` - Create location
- `GET /api/v1/locations` - List locations
- `PUT /api/v1/locations/:id` - Update location

**Database Tables:**
- `locations`

---

#### US-ADMIN-005: Manage Menus
**As an** Marketing Manager
**I want to** create menus for different channels
**So that** appropriate products shown to customers

**Acceptance Criteria:**
- Can create menu with name
- Can set channel (POS, online, both)
- Can set active date range
- Can add products to menu
- Can set product availability by location
- Can set display order
- Menu items pulled from products
- Can show/hide items dynamically

**API Endpoints:**
- `POST /api/v1/menus` - Create menu
- `POST /api/v1/menus/:id/items` - Add item to menu
- `GET /api/v1/menus` - List menus

**Database Tables:**
- `menus` - Menu definitions
- `menu_items` - Products in menu

---

#### US-ADMIN-006: Manage Price Books
**As an** Pricing Manager
**I want to** create different price lists
**So that** prices vary by channel/location

**Acceptance Criteria:**
- Can create price book with name
- Can set channel and date range
- Can add products with specific prices
- Can vary price by location
- Can vary price by variant
- Active price book used at POS/online
- Price book priority/precedence defined

**API Endpoints:**
- `POST /api/v1/pricebooks` - Create price book
- `POST /api/v1/pricebooks/:id/items` - Add pricing

**Database Tables:**
- `price_books` - Price list header
- `price_book_items` - Product pricing

---

## Technical Requirements

### Data Integrity

#### TR-001: Multi-Tenancy Isolation
- All tables have `tenant_id` column
- Row-level security enforced
- User session stores tenant context
- All queries automatically filtered by tenant
- No cross-tenant data leakage

#### TR-002: Negative Stock Prevention
- Database constraint trigger prevents negative stock
- Check executed per product/location/lot
- Transaction rolled back if violation
- Clear error message to user
- Deferred constraint (checked at commit)

#### TR-003: Document Numbering
- Auto-increment sequence per document type
- Format: PREFIX-YYYYMM-00001
- Thread-safe (database function)
- No gaps allowed
- Period-based reset (monthly)

#### TR-004: Audit Trail
- All modifications logged with user and timestamp
- Stock ledger immutable (insert-only)
- Updated_at timestamp auto-maintained
- Created_by, updated_by tracked
- Soft deletes preferred (is_active flag)

### Performance Requirements

#### PR-001: Response Times
- API responses < 200ms (95th percentile)
- Reports < 2 seconds for standard date ranges
- Dashboard loads < 1 second
- Real-time KDS updates < 500ms

#### PR-002: Scalability
- Support 100 concurrent users per location
- Handle 10,000 orders per day
- Support 100,000 products
- Support 50 locations per tenant
- Database indices on foreign keys, frequently queried fields

### Security Requirements

#### SR-001: Authentication
- Better-auth for session management
- Password hashing with bcrypt
- Session expiry: 7 days
- Session refresh: 24 hours
- Secure cookie storage

#### SR-002: Authorization
- Role-based access control
- Location-based data filtering
- API endpoint protection
- Feature flags per role

---

## Glossary

- **Tenant**: Organization/company using the system
- **Location**: Physical site (kitchen, outlet, warehouse)
- **SKU**: Stock Keeping Unit - unique product identifier
- **UOM**: Unit of Measure (kg, L, pcs, etc.)
- **Lot**: Batch of product with same expiry/manufacture date
- **FEFO**: First Expiry, First Out - picking strategy
- **PO**: Purchase Order
- **GR**: Goods Receipt
- **KDS**: Kitchen Display System
- **COGS**: Cost of Goods Sold
- **Ledger**: Immutable transaction log
- **Base UOM**: Primary unit for inventory tracking
- **Pack**: Alternate UOM with conversion to base
- **Variant**: Product variation (size, flavor)
- **Modifier**: Customization option (extra shot, no ice)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-18
**Total User Stories**: 90+

