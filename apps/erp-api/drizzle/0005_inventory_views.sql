-- ============================================================================
-- Migration: 0005_inventory_views.sql
-- Feature: INV-001 - Real-Time Inventory Visibility
-- Description: Create database views and functions for real-time inventory tracking
--
-- Views Created:
-- 1. v_inventory_onhand - Real-time on-hand inventory by product/location (base UOM only)
-- 2. v_lot_balances - Lot-level inventory with expiry tracking
-- 3. v_fefo_pick - FEFO (First Expiry, First Out) pick recommendations
--
-- Functions Created:
-- 1. get_mavg_cost - Calculate moving average cost for product/location
--
-- Triggers Created:
-- 1. trg_prevent_negative_stock - Prevent inventory from going negative
-- ============================================================================

-- ============================================================================
-- VIEW 1: v_inventory_onhand
-- Real-time on-hand inventory aggregated by product and location (base UOM)
-- ============================================================================
CREATE OR REPLACE VIEW erp.v_inventory_onhand AS
SELECT
  sl.tenant_id,
  sl.product_id,
  sl.location_id,

  -- Product details
  p.sku AS product_sku,
  p.name AS product_name,
  p.kind AS product_kind,
  p.is_perishable,
  p.base_uom_id,

  -- Location details
  l.code AS location_code,
  l.name AS location_name,
  l.type AS location_type,

  -- UOM details (base UOM)
  u.code AS uom_code,
  u.name AS uom_name,

  -- Inventory quantities (SUM of all stock ledger entries)
  COALESCE(SUM(sl.qty_delta_base), 0) AS quantity_on_hand,

  -- Stock status indicators (simplified without reorder_point/min_stock_level)
  CASE
    WHEN COALESCE(SUM(sl.qty_delta_base), 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(SUM(sl.qty_delta_base), 0) <= 10 THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status,

  -- Cost information (latest moving average cost)
  (
    SELECT cl.unit_cost
    FROM erp.cost_layers cl
    WHERE cl.tenant_id = sl.tenant_id
      AND cl.product_id = sl.product_id
      AND cl.location_id = sl.location_id
      AND cl.qty_remaining_base > 0
    ORDER BY cl.created_at DESC
    LIMIT 1
  ) AS latest_unit_cost,

  -- Calculated value
  COALESCE(SUM(sl.qty_delta_base), 0) * COALESCE(
    (
      SELECT cl.unit_cost::numeric
      FROM erp.cost_layers cl
      WHERE cl.tenant_id = sl.tenant_id
        AND cl.product_id = sl.product_id
        AND cl.location_id = sl.location_id
        AND cl.qty_remaining_base > 0
      ORDER BY cl.created_at DESC
      LIMIT 1
    ), 0
  ) AS total_value,

  -- Metadata
  COUNT(DISTINCT sl.lot_id) FILTER (WHERE sl.lot_id IS NOT NULL) AS lot_count,
  MIN(sl.txn_ts) AS first_transaction_date,
  MAX(sl.txn_ts) AS last_transaction_date

FROM erp.stock_ledger sl
INNER JOIN erp.products p ON sl.product_id = p.id
INNER JOIN erp.locations l ON sl.location_id = l.id
INNER JOIN erp.uoms u ON p.base_uom_id = u.id

GROUP BY
  sl.tenant_id,
  sl.product_id,
  sl.location_id,
  p.sku,
  p.name,
  p.kind,
  p.is_perishable,
  p.base_uom_id,
  l.code,
  l.name,
  l.type,
  u.code,
  u.name

HAVING COALESCE(SUM(sl.qty_delta_base), 0) != 0;  -- Only show items with inventory

-- ============================================================================
-- VIEW 2: v_lot_balances
-- Lot-level inventory with expiry tracking and FEFO prioritization
-- ============================================================================
CREATE OR REPLACE VIEW erp.v_lot_balances AS
SELECT
  sl.tenant_id,
  sl.lot_id,
  sl.product_id,
  sl.location_id,

  -- Lot details
  lot.lot_no,
  lot.expiry_date,
  lot.manufacture_date,
  lot.received_date,

  -- Product details
  p.sku AS product_sku,
  p.name AS product_name,
  p.is_perishable,
  p.base_uom_id,

  -- Location details
  l.code AS location_code,
  l.name AS location_name,

  -- UOM details (base UOM)
  u.code AS uom_code,
  u.name AS uom_name,

  -- Quantity on hand for this lot
  COALESCE(SUM(sl.qty_delta_base), 0) AS quantity_on_hand,

  -- Expiry calculations
  lot.expiry_date - CURRENT_DATE AS days_to_expiry,

  CASE
    WHEN lot.expiry_date IS NULL THEN 'no_expiry'
    WHEN lot.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN lot.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
    WHEN lot.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_this_month'
    ELSE 'good'
  END AS expiry_status,

  -- Cost information (FIFO cost from first available cost layer)
  (
    SELECT cl.unit_cost
    FROM erp.cost_layers cl
    WHERE cl.tenant_id = sl.tenant_id
      AND cl.product_id = sl.product_id
      AND cl.location_id = sl.location_id
      AND cl.lot_id = sl.lot_id
      AND cl.qty_remaining_base > 0
    ORDER BY cl.created_at ASC
    LIMIT 1
  ) AS lot_unit_cost,

  -- Metadata
  MIN(sl.txn_ts) AS first_transaction_date,
  MAX(sl.txn_ts) AS last_transaction_date

FROM erp.stock_ledger sl
INNER JOIN erp.lots lot ON sl.lot_id = lot.id
INNER JOIN erp.products p ON sl.product_id = p.id
INNER JOIN erp.locations l ON sl.location_id = l.id
INNER JOIN erp.uoms u ON p.base_uom_id = u.id

WHERE sl.lot_id IS NOT NULL

GROUP BY
  sl.tenant_id,
  sl.lot_id,
  sl.product_id,
  sl.location_id,
  lot.lot_no,
  lot.expiry_date,
  lot.manufacture_date,
  lot.received_date,
  p.sku,
  p.name,
  p.is_perishable,
  p.base_uom_id,
  l.code,
  l.name,
  u.code,
  u.name

HAVING COALESCE(SUM(sl.qty_delta_base), 0) > 0;  -- Only show lots with positive balance

-- ============================================================================
-- VIEW 3: v_fefo_pick
-- FEFO (First Expiry, First Out) pick recommendations
-- Ordered by expiry date for perishable items
-- ============================================================================
CREATE OR REPLACE VIEW erp.v_fefo_pick AS
SELECT
  tenant_id,
  product_id,
  location_id,
  base_uom_id,
  lot_id,
  lot_no,
  product_sku,
  product_name,
  location_code,
  location_name,
  uom_code,
  quantity_on_hand,
  expiry_date,
  days_to_expiry,
  expiry_status,
  lot_unit_cost,

  -- FEFO prioritization
  ROW_NUMBER() OVER (
    PARTITION BY tenant_id, product_id, location_id
    ORDER BY
      CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,  -- Non-expiry items last
      expiry_date ASC,  -- Earliest expiry first (FEFO)
      first_transaction_date ASC  -- Then FIFO as tiebreaker
  ) AS pick_priority

FROM erp.v_lot_balances

WHERE quantity_on_hand > 0
  AND expiry_status != 'expired'  -- Don't recommend expired lots

ORDER BY
  tenant_id,
  product_id,
  location_id,
  pick_priority;

-- ============================================================================
-- FUNCTION: get_mavg_cost
-- Calculate moving average cost for a product at a location
-- ============================================================================
CREATE OR REPLACE FUNCTION erp.get_mavg_cost(
  p_tenant_id UUID,
  p_product_id UUID,
  p_location_id UUID
)
RETURNS NUMERIC(10,4) AS $$
DECLARE
  v_total_value NUMERIC(14,4);
  v_total_qty NUMERIC(10,2);
  v_mavg_cost NUMERIC(10,4);
BEGIN
  -- Calculate weighted average cost from cost layers with remaining quantity
  SELECT
    COALESCE(SUM(cl.unit_cost::numeric * cl.qty_remaining_base::numeric), 0),
    COALESCE(SUM(cl.qty_remaining_base::numeric), 0)
  INTO v_total_value, v_total_qty
  FROM erp.cost_layers cl
  WHERE cl.tenant_id = p_tenant_id
    AND cl.product_id = p_product_id
    AND cl.location_id = p_location_id
    AND cl.qty_remaining_base > 0;

  -- Avoid division by zero
  IF v_total_qty > 0 THEN
    v_mavg_cost := v_total_value / v_total_qty;
  ELSE
    -- No cost layers available, use standard cost from product
    SELECT COALESCE(p.standard_cost::numeric, 0)
    INTO v_mavg_cost
    FROM erp.products p
    WHERE p.id = p_product_id;
  END IF;

  RETURN ROUND(v_mavg_cost, 4);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION erp.get_mavg_cost(UUID, UUID, UUID) TO PUBLIC;

-- ============================================================================
-- TRIGGER: trg_prevent_negative_stock
-- Prevent stock ledger entries that would result in negative inventory
-- ============================================================================

-- First, create trigger function
CREATE OR REPLACE FUNCTION erp.fn_prevent_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_current_balance NUMERIC(10,2);
  v_new_balance NUMERIC(10,2);
BEGIN
  -- Only check for negative quantity changes (consumption/outbound)
  IF NEW.qty_delta_base < 0 THEN
    -- Calculate current balance before this transaction
    SELECT COALESCE(SUM(qty_delta_base), 0)
    INTO v_current_balance
    FROM erp.stock_ledger
    WHERE tenant_id = NEW.tenant_id
      AND product_id = NEW.product_id
      AND location_id = NEW.location_id
      AND (lot_id = NEW.lot_id OR (lot_id IS NULL AND NEW.lot_id IS NULL));

    -- Calculate what the new balance would be
    v_new_balance := v_current_balance + NEW.qty_delta_base;

    -- If new balance would be negative, reject the transaction
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient stock: Current balance % + change % = %. Cannot create negative inventory.',
        v_current_balance, NEW.qty_delta_base, v_new_balance
        USING ERRCODE = '23514',  -- check_violation
              HINT = 'Check available inventory before creating outbound transactions';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on stock_ledger table
DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON erp.stock_ledger;
CREATE TRIGGER trg_prevent_negative_stock
  BEFORE INSERT ON erp.stock_ledger
  FOR EACH ROW
  EXECUTE FUNCTION erp.fn_prevent_negative_stock();

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Note: These indexes already exist, added here for reference and idempotency
CREATE INDEX IF NOT EXISTS idx_stock_ledger_lot_balance
  ON erp.stock_ledger (tenant_id, lot_id, product_id, location_id);

CREATE INDEX IF NOT EXISTS idx_cost_layers_fifo
  ON erp.cost_layers (tenant_id, product_id, location_id, created_at ASC)
  WHERE qty_remaining_base > 0;

CREATE INDEX IF NOT EXISTS idx_lots_expiry
  ON erp.lots (tenant_id, expiry_date ASC)
  WHERE expiry_date IS NOT NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON VIEW erp.v_inventory_onhand IS
  'Real-time on-hand inventory aggregated by product and location in base UOM. Includes stock status and valuation.';

COMMENT ON VIEW erp.v_lot_balances IS
  'Lot-level inventory balances with expiry tracking. Used for lot traceability and expiry management.';

COMMENT ON VIEW erp.v_fefo_pick IS
  'FEFO (First Expiry, First Out) pick recommendations. Prioritizes lots by expiry date for picking operations.';

COMMENT ON FUNCTION erp.get_mavg_cost(UUID, UUID, UUID) IS
  'Calculate moving average cost for a product at a specific location based on cost layers.';

COMMENT ON TRIGGER trg_prevent_negative_stock ON erp.stock_ledger IS
  'Prevents creation of stock ledger entries that would result in negative inventory balances.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
