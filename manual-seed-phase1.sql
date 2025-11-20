-- ============================================================================
-- Manual Seed Script for Central Kitchen ERP - Phase 1
-- ============================================================================
-- Run this script using: psql -U postgres -d your_database_name -f manual-seed-phase1.sql
-- Or copy-paste into your PostgreSQL client
--
-- IMPORTANT: Update the database name and credentials as needed
-- Default admin credentials: username=admin, password=admin123
-- ============================================================================

-- Set schema
SET search_path TO erp, public;

-- Disable triggers temporarily for faster inserts
SET session_replication_role = replica;

-- Clean existing data (CAUTION: This will delete all data!)
TRUNCATE TABLE erp.stock_ledger CASCADE;
TRUNCATE TABLE erp.order_items CASCADE;
TRUNCATE TABLE erp.orders CASCADE;
TRUNCATE TABLE erp.payments CASCADE;
TRUNCATE TABLE erp.order_item_modifiers CASCADE;
TRUNCATE TABLE erp.pos_shifts CASCADE;
TRUNCATE TABLE erp.purchase_order_items CASCADE;
TRUNCATE TABLE erp.purchase_orders CASCADE;
TRUNCATE TABLE erp.supplier_products CASCADE;
TRUNCATE TABLE erp.temperature_logs CASCADE;
TRUNCATE TABLE erp.alerts CASCADE;
TRUNCATE TABLE erp.promotions CASCADE;
TRUNCATE TABLE erp.menu_items CASCADE;
TRUNCATE TABLE erp.menus CASCADE;
TRUNCATE TABLE erp.product_modifier_groups CASCADE;
TRUNCATE TABLE erp.modifiers CASCADE;
TRUNCATE TABLE erp.modifier_groups CASCADE;
TRUNCATE TABLE erp.price_book_items CASCADE;
TRUNCATE TABLE erp.price_books CASCADE;
TRUNCATE TABLE erp.product_packs CASCADE;
TRUNCATE TABLE erp.product_variants CASCADE;
TRUNCATE TABLE erp.lots CASCADE;
TRUNCATE TABLE erp.uom_conversions CASCADE;
TRUNCATE TABLE erp.addresses CASCADE;
TRUNCATE TABLE erp.customers CASCADE;
TRUNCATE TABLE erp.suppliers CASCADE;
TRUNCATE TABLE erp.products CASCADE;
TRUNCATE TABLE erp.uoms CASCADE;
TRUNCATE TABLE erp.accounts CASCADE;
TRUNCATE TABLE erp.sessions CASCADE;
TRUNCATE TABLE erp.verifications CASCADE;
TRUNCATE TABLE erp.users CASCADE;
TRUNCATE TABLE erp.locations CASCADE;
TRUNCATE TABLE erp.tenants CASCADE;
TRUNCATE TABLE erp.doc_sequences CASCADE;
TRUNCATE TABLE erp.tax_rates CASCADE;
TRUNCATE TABLE erp.tax_categories CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ============================================================================
-- 1. TENANT
-- ============================================================================
INSERT INTO erp.tenants (id, org_id, name, slug, is_active, metadata, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  gen_random_uuid(),
  'Central Kitchen Bakery & Cafe',
  'central-kitchen',
  true,
  '{"settings": {"timezone": "Asia/Jakarta", "currency": "IDR", "taxNumber": "TXN1234567890"}}'::jsonb,
  NOW(),
  NOW()
) RETURNING id \gset tenant_

-- ============================================================================
-- 2. TAX CATEGORIES & RATES
-- ============================================================================
INSERT INTO erp.tax_categories (tenant_id, code, name, created_at, updated_at)
VALUES
  (:'tenant_id', 'FOOD', 'Food & Beverages', NOW(), NOW()),
  (:'tenant_id', 'SERVICE', 'Service Charge', NOW(), NOW());

INSERT INTO erp.tax_rates (tenant_id, category_code, rate_pct, inclusive, start_at, created_at, updated_at)
VALUES
  (:'tenant_id', 'FOOD', '11', true, '2024-01-01', NOW(), NOW()),
  (:'tenant_id', 'SERVICE', '10', true, '2024-01-01', NOW(), NOW());

-- ============================================================================
-- 3. DOCUMENT SEQUENCES
-- ============================================================================
INSERT INTO erp.doc_sequences (tenant_id, doc_type, period, next_number, created_at, updated_at)
VALUES
  (:'tenant_id', 'PO', '2025-01', 1, NOW(), NOW()),
  (:'tenant_id', 'ORDER', '2025-01', 1, NOW(), NOW());

-- ============================================================================
-- 4. LOCATIONS
-- ============================================================================
INSERT INTO erp.locations (id, tenant_id, code, name, type, address, city, phone, email, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), :'tenant_id', 'CK-001', 'Central Kitchen - Jakarta', 'central_kitchen', 'Jl. Industri No. 123', 'Jakarta', '+62-21-12345678', 'kitchen@centralkitchen.com', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'OUT-001', 'Cafe Outlet - Senayan', 'outlet', 'Senayan City Mall', 'Jakarta', '+62-21-87654321', 'senayan@centralkitchen.com', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'OUT-002', 'Cafe Outlet - BSD', 'outlet', 'BSD City Plaza', 'Tangerang', '+62-21-11223344', 'bsd@centralkitchen.com', true, NOW(), NOW())
RETURNING id, code;

-- Store location IDs for later use
SELECT id FROM erp.locations WHERE code = 'CK-001' \gset loc_central_
SELECT id FROM erp.locations WHERE code = 'OUT-001' \gset loc_outlet1_
SELECT id FROM erp.locations WHERE code = 'OUT-002' \gset loc_outlet2_

-- ============================================================================
-- 5. USERS (with Better Auth)
-- ============================================================================
-- Note: Password is bcrypt hash of "admin123"
INSERT INTO erp.users (id, auth_user_id, tenant_id, email, username, display_username, first_name, last_name, role, location_id, is_active, email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  gen_random_uuid(),
  :'tenant_id',
  'admin@centralkitchen.com',
  'admin',
  'Admin',
  'System',
  'Administrator',
  'admin',
  :'loc_central_id',
  true,
  true,
  NOW(),
  NOW()
) RETURNING id, auth_user_id \gset admin_user_

-- Create Better Auth account (password hash for "admin123")
INSERT INTO erp.accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  :'admin_user_id',
  :'admin_user_id',
  'credential',
  '$2b$10$KeBh./2h4eUtKCIOsOhfC.sfMfsyRnj7SKjmZjj.KK2Qwl4y6jli2',
  NOW(),
  NOW()
);

-- Additional users
INSERT INTO erp.users (id, auth_user_id, tenant_id, email, first_name, last_name, role, location_id, is_active, email_verified, created_at, updated_at)
VALUES
  (gen_random_uuid(), gen_random_uuid(), :'tenant_id', 'manager@centralkitchen.com', 'John', 'Manager', 'manager', :'loc_outlet1_id', true, true, NOW(), NOW()),
  (gen_random_uuid(), gen_random_uuid(), :'tenant_id', 'barista@centralkitchen.com', 'Jane', 'Barista', 'cashier', :'loc_outlet1_id', true, true, NOW(), NOW());

-- ============================================================================
-- 6. UNITS OF MEASURE (UoM)
-- ============================================================================
INSERT INTO erp.uoms (id, tenant_id, code, name, symbol, uom_type, description, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), :'tenant_id', 'PCS', 'Pieces', 'pc', 'count', 'Individual pieces or units', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'KG', 'Kilogram', 'kg', 'weight', 'Weight in kilograms', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'L', 'Liter', 'L', 'volume', 'Volume in liters', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'ML', 'Milliliter', 'ml', 'volume', 'Volume in milliliters', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'G', 'Gram', 'g', 'weight', 'Weight in grams', true, NOW(), NOW())
RETURNING id, code;

-- Store UoM IDs
SELECT id FROM erp.uoms WHERE code = 'PCS' \gset uom_pcs_
SELECT id FROM erp.uoms WHERE code = 'KG' \gset uom_kg_
SELECT id FROM erp.uoms WHERE code = 'L' \gset uom_l_
SELECT id FROM erp.uoms WHERE code = 'ML' \gset uom_ml_
SELECT id FROM erp.uoms WHERE code = 'G' \gset uom_g_

-- ============================================================================
-- 7. UOM CONVERSIONS
-- ============================================================================
INSERT INTO erp.uom_conversions (tenant_id, from_uom_id, to_uom_id, factor, created_at, updated_at)
VALUES
  (:'tenant_id', :'uom_kg_id', :'uom_g_id', '1000', NOW(), NOW()),
  (:'tenant_id', :'uom_l_id', :'uom_ml_id', '1000', NOW(), NOW());

-- ============================================================================
-- 8. SUPPLIERS
-- ============================================================================
INSERT INTO erp.suppliers (id, tenant_id, code, name, contact_person, email, phone, address, city, payment_terms, credit_limit, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), :'tenant_id', 'SUP-001', 'Premium Coffee Supplies Co.', 'Ahmad Yani', 'contact@coffeesupply.com', '+62-21-5555001', 'Jl. Kopi Raya No. 45', 'Jakarta', 30, '50000000', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'SUP-002', 'Fresh Bakery Ingredients Ltd.', 'Siti Nurhaliza', 'info@bakeryingredients.com', '+62-21-5555002', 'Jl. Tepung No. 78', 'Bogor', 14, '30000000', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'SUP-003', 'Dairy Fresh Indonesia', 'Budi Santoso', 'sales@dairyfresh.id', '+62-21-5555003', 'Jl. Susu Segar No. 12', 'Tangerang', 7, '20000000', true, NOW(), NOW())
RETURNING id, code;

-- Store supplier IDs
SELECT id FROM erp.suppliers WHERE code = 'SUP-001' \gset sup_coffee_
SELECT id FROM erp.suppliers WHERE code = 'SUP-002' \gset sup_flour_
SELECT id FROM erp.suppliers WHERE code = 'SUP-003' \gset sup_milk_

-- ============================================================================
-- 9. PRODUCTS
-- ============================================================================

-- Raw Materials
INSERT INTO erp.products (id, tenant_id, sku, name, description, kind, base_uom_id, tax_category, standard_cost, default_price, is_perishable, shelf_life_days, barcode, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), :'tenant_id', 'RM-COFFEE01', 'Premium Arabica Coffee Beans', 'High-quality Arabica beans from Sumatra', 'raw_material', :'uom_kg_id', 'FOOD', '120000', '150000', true, 365, '1234567890001', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'RM-FLOUR01', 'Bread Flour', 'Premium bread flour for baking', 'raw_material', :'uom_kg_id', 'FOOD', '15000', '18000', true, 180, '1234567890002', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'RM-MILK01', 'Fresh Milk', 'Fresh whole milk', 'raw_material', :'uom_l_id', 'FOOD', '14000', '16000', true, 7, '1234567890003', true, NOW(), NOW())
RETURNING id, sku;

-- Store raw material IDs
SELECT id FROM erp.products WHERE sku = 'RM-COFFEE01' \gset prod_coffee_
SELECT id FROM erp.products WHERE sku = 'RM-FLOUR01' \gset prod_flour_
SELECT id FROM erp.products WHERE sku = 'RM-MILK01' \gset prod_milk_

-- Finished Goods - Coffee & Beverages
INSERT INTO erp.products (id, tenant_id, sku, name, description, kind, base_uom_id, tax_category, standard_cost, default_price, is_perishable, shelf_life_days, barcode, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), :'tenant_id', 'FG-ESPRESSO', 'Espresso', 'Rich and bold espresso shot', 'finished_good', :'uom_ml_id', 'FOOD', '3000', '15000', false, 0, '2000000001', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-CAPPUCCINO', 'Cappuccino', 'Classic cappuccino with steamed milk', 'finished_good', :'uom_ml_id', 'FOOD', '4500', '25000', false, 0, '2000000002', true, NOW(), NOW())
RETURNING id, sku;

-- Finished Goods - Bakery Items
INSERT INTO erp.products (id, tenant_id, sku, name, description, kind, base_uom_id, tax_category, standard_cost, default_price, is_perishable, shelf_life_days, barcode, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), :'tenant_id', 'FG-CROISSANT', 'Butter Croissant', 'Flaky butter croissant', 'finished_good', :'uom_pcs_id', 'FOOD', '8000', '20000', true, 2, '2000000003', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-CAKESLICE', 'Chocolate Cake Slice', 'Rich chocolate cake slice', 'finished_good', :'uom_pcs_id', 'FOOD', '15000', '35000', true, 3, '2000000004', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-SOURDOUGH-KEJU', 'Soft Sourdough Cranberry Keju', 'Soft sourdough with cranberry and cheese', 'finished_good', :'uom_pcs_id', 'FOOD', '12000', '28000', true, 3, '2000000005', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-SOURDOUGH-COKLAT', 'Soft Sourdough Cranberry Coklat', 'Soft sourdough with cranberry and chocolate', 'finished_good', :'uom_pcs_id', 'FOOD', '12000', '28000', true, 3, '2000000006', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-COOKIES-COKLAT', 'Soft Cookies Coklat', 'Soft chocolate cookies', 'finished_good', :'uom_pcs_id', 'FOOD', '8000', '18000', true, 5, '2000000007', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-COOKIES-REDVELVET', 'Soft Cookies Red Velvet', 'Red velvet cookies with cream cheese', 'finished_good', :'uom_pcs_id', 'FOOD', '10000', '22000', true, 5, '2000000008', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-MUFFIN', 'Muffin Coklat', 'Chocolate muffins', 'finished_good', :'uom_pcs_id', 'FOOD', '10000', '25000', true, 3, '2000000009', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-CINNAMON-ROLL', 'Cinnamon Roll', 'Sweet cinnamon roll with glaze', 'finished_good', :'uom_pcs_id', 'FOOD', '12000', '28000', true, 3, '2000000010', true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'FG-DONUT-MOCHI', 'Donut Mochi', 'Mochi donut with various flavors', 'finished_good', :'uom_pcs_id', 'FOOD', '8000', '20000', true, 3, '2000000011', true, NOW(), NOW())
RETURNING id, sku;

-- ============================================================================
-- 10. CUSTOMERS
-- ============================================================================
INSERT INTO erp.customers (id, tenant_id, code, name, type, email, phone, address, city, payment_terms, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), :'tenant_id', 'WALKIN', 'Walk-in Customer', 'walk_in', NULL, NULL, NULL, NULL, 0, true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'CUST-001', 'Andi Wijaya', 'external', 'andi@email.com', '+62-812-3456-7890', 'Jl. Sudirman No. 123', 'Jakarta', 0, true, NOW(), NOW()),
  (gen_random_uuid(), :'tenant_id', 'CUST-002', 'Dewi Sartika', 'external', 'dewi@email.com', '+62-813-9876-5432', 'Jl. Thamrin No. 456', 'Jakarta', 30, true, NOW(), NOW());

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo ''
\echo '✅ Phase 1 seed data inserted successfully!'
\echo ''
\echo '📊 Summary:'
\echo '- 1 Tenant: Central Kitchen Bakery & Cafe'
\echo '- 3 Locations: 1 Central Kitchen + 2 Outlets'
\echo '- 3 Users: Admin + Manager + Barista'
\echo '- 5 UoMs: PCS, KG, L, ML, G'
\echo '- 2 UoM Conversions'
\echo '- 3 Suppliers'
\echo '- 12 Products (3 Raw Materials + 9 Finished Goods)'
\echo '- 3 Customers'
\echo ''
\echo '🔐 Admin Login:'
\echo '   Username: admin'
\echo '   Email: admin@centralkitchen.com'
\echo '   Password: admin123 (update bcrypt hash in the script)'
\echo ''
\echo '⚠️  IMPORTANT: Update the bcrypt password hash for the admin user'
\echo '   Generate hash: node -e "console.log(require(''bcryptjs'').hashSync(''admin123'', 10))"'
\echo ''
