-- Seed Roti Roema Products
BEGIN;

-- 1. Create Tenant
INSERT INTO erp.tenants (id, org_id, name, slug, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ROTIROEMA001',
  'Roti Roema',
  'roti-roema',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create UOM
INSERT INTO erp.uoms (id, code, name, symbol, kind, created_at)
SELECT
  gen_random_uuid(),
  'PCS',
  'Pieces',
  'pcs',
  'count',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM erp.uoms WHERE code = 'PCS');

-- 3. Seed products
DO $$
DECLARE
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_uom_id uuid;
BEGIN
  SELECT id INTO v_uom_id FROM erp.uoms WHERE code = 'PCS' LIMIT 1;

  -- Create Location
  INSERT INTO erp.locations (id, tenant_id, code, name, type, is_active, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    v_tenant_id,
    'MAIN-KITCHEN',
    'Main Production Kitchen',
    'production',
    true,
    NOW(),
    NOW()
  WHERE NOT EXISTS (SELECT 1 FROM erp.locations WHERE code = 'MAIN-KITCHEN' AND tenant_id = v_tenant_id);

  -- Insert all 14 products
  INSERT INTO erp.products (id, tenant_id, sku, name, description, kind, base_uom_id, is_perishable, shelf_life_days, is_active, metadata, created_at, updated_at)
  VALUES
  (gen_random_uuid(), v_tenant_id, 'SSCK-001', 'Soft Sourdough Cranberry Keju', 'Roti soft sourdough dengan kranberi berisi creamcheese', 'finished-goods', v_uom_id, true, 4, true,
   '{"shelf_life_room_temp_days": 4, "shelf_life_chiller_days": 5, "reheat_microwave_minutes": "2-3", "category": "Soft Sourdough", "filling": "Cream Cheese"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'SSCC-002', 'Soft Sourdough Cranberry Coklat', 'Roti soft sourdough dengan kranberi berisi coklat pasta, compound, couverture', 'finished-goods', v_uom_id, true, 4, true,
   '{"shelf_life_room_temp_days": 4, "shelf_life_chiller_days": 5, "reheat_microwave_minutes": "2-3", "category": "Soft Sourdough", "filling": "Chocolate"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'SSCB-003', 'Soft Sourdough Cranberry Blueberry Creamcheese', 'Roti soft sourdough dengan kranberi berisi bluberi creamcheese', 'finished-goods', v_uom_id, true, 4, true,
   '{"shelf_life_room_temp_days": 4, "shelf_life_chiller_days": 5, "reheat_microwave_minutes": "2-3", "category": "Soft Sourdough", "filling": "Blueberry Cream Cheese"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'SSCK-004', 'Soft Sourdough Coklat Kacang', 'Roti soft sourdough isi coklat & kacang', 'finished-goods', v_uom_id, true, 4, true,
   '{"shelf_life_room_temp_days": 4, "shelf_life_chiller_days": 5, "reheat_microwave_minutes": "2-3", "category": "Soft Sourdough", "filling": "Chocolate & Nuts"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'SCC-005', 'Soft Cookies Coklat', 'Cookies renyah lembut rasa coklat', 'finished-goods', v_uom_id, true, 5, true,
   '{"shelf_life_room_temp_days": 5, "shelf_life_chiller_days": 7, "reheat_required": false, "category": "Cookies", "flavor": "Chocolate"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'SCRV-006', 'Soft Cookies Red Velvet', 'Cookies red velvet lembut dengan isi cream cheese', 'finished-goods', v_uom_id, true, 5, true,
   '{"shelf_life_room_temp_days": 5, "shelf_life_chiller_days": 7, "reheat_required": false, "category": "Cookies", "flavor": "Red Velvet", "filling": "Cream Cheese"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'BC-007', 'Brownies Cookies', 'Brownies fudgy dengan soft cookies diatasnya', 'finished-goods', v_uom_id, true, 3, true,
   '{"shelf_life_room_temp_days": 3, "shelf_life_chiller_days": 6, "reheat_required": false, "category": "Cookies"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'MC-008', 'Muffin Coklat', 'Muffin lembut dengan chips coklat di dalamnya', 'finished-goods', v_uom_id, true, 3, true,
   '{"shelf_life_room_temp_days": 3, "shelf_life_chiller_days": 5, "reheat_microwave_minutes": "1-2", "category": "Muffins", "flavor": "Chocolate"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'RC-009', 'Roti Cartepillar', 'Roti isian sosis dengan saos dan mayo', 'finished-goods', v_uom_id, true, 3, true,
   '{"shelf_life_room_temp_days": 3, "shelf_life_chiller_days": 4, "reheat_microwave_minutes": "1-2", "category": "Savory Bread", "filling": "Sausage with Sauce and Mayo"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'BB-010', 'Bolo Bun', 'Bun renyah luar dengan isian butter', 'finished-goods', v_uom_id, true, 3, true,
   '{"shelf_life_room_temp_days": 3, "shelf_life_chiller_days": 5, "reheat_microwave_minutes": "1-2", "category": "Buns", "filling": "Butter"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'GB-011', 'Garlic Bread', 'Roti dengan butter garlic dan parsley, isian keju spready', 'finished-goods', v_uom_id, true, 3, true,
   '{"shelf_life_room_temp_days": 3, "shelf_life_chiller_days": 4, "reheat_microwave_minutes": "1-2", "category": "Savory Bread", "filling": "Cheese Spread"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'CR-012', 'Cinnamon Roll', 'Roti gulung aroma kayu manis, dengan glaze diatasnya', 'finished-goods', v_uom_id, true, 4, true,
   '{"shelf_life_room_temp_days": 4, "shelf_life_chiller_days": 5, "reheat_microwave_minutes": "1-2", "category": "Sweet Rolls", "flavor": "Cinnamon"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'CHR-013', 'Choco Roll', 'Roti gulung coklat dengan pasta coklat diatasnya', 'finished-goods', v_uom_id, true, 4, true,
   '{"shelf_life_room_temp_days": 4, "shelf_life_chiller_days": 5, "reheat_microwave_minutes": "1-2", "category": "Sweet Rolls", "flavor": "Chocolate"}'::jsonb, NOW(), NOW()),

  (gen_random_uuid(), v_tenant_id, 'DM-014', 'Donut Mochi (All Variants)', 'Donut dengan tekstur kenyal khas mochi dan isi/topping', 'finished-goods', v_uom_id, true, 1, true,
   '{"shelf_life_room_temp_days": 1, "shelf_life_chiller_days": 2, "reheat_microwave_seconds": 30, "category": "Donuts", "texture": "Chewy Mochi"}'::jsonb, NOW(), NOW());

END $$;

COMMIT;

-- Display summary
SELECT
  'Seeding completed!' as status,
  (SELECT COUNT(*) FROM erp.tenants) as tenants_count,
  (SELECT COUNT(*) FROM erp.uoms) as uoms_count,
  (SELECT COUNT(*) FROM erp.locations) as locations_count,
  (SELECT COUNT(*) FROM erp.products) as products_count;
