// F&B Central Kitchen — SQLite Test Schema
// Adapted from PostgreSQL schema for fast in-memory testing
// Drizzle ORM (SQLite) — Test-only version

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Helper for UUID generation in SQLite (use randomUUID() in the app layer)
const uuid = (name: string) => text(name);
const varchar = (name: string, config?: { length: number }) => text(name);
const numeric = (name: string, config?: { precision: number; scale: number }) => text(name); // Store as text for precision
const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });
const boolean = (name: string) => integer(name, { mode: 'boolean' });
const jsonb = (name: string) => text(name, { mode: 'json' });
const bigserial = (name: string) => integer(name, { mode: 'number' }).primaryKey({ autoIncrement: true });

// ---------------------------------------------------------------------------
// Type-safe literals (VARCHAR in DB for migration sanity)
// ---------------------------------------------------------------------------
export const locationTypes = ["central_kitchen", "outlet", "warehouse"] as const;
export const productKinds = ["raw_material", "semi_finished", "finished_good", "packaging", "consumable"] as const;
export const adjustmentKinds = ["damage", "expiry", "theft", "found", "correction", "waste", "spoilage"] as const;
export const ledgerTypes = ["rcv", "iss", "xfer_in", "xfer_out", "prod_in", "prod_out", "adj"] as const;
export const refTypes = ["PO", "GR", "REQ", "XFER", "PROD", "ADJ", "ORDER", "RET", "COUNT"] as const;
export const orderChannels = ["pos", "online", "wholesale"] as const;
export const orderTypes = ["dine_in", "take_away", "delivery"] as const;
export const orderStatuses = ["open", "paid", "voided", "refunded"] as const;
export const docStatuses = {
  purchaseOrder: ["draft","pending_approval","approved","rejected","sent","confirmed","partial_receipt","completed","cancelled"] as const,
  transfer: ["draft","pending_approval","approved","rejected","sent","in_transit","partial_receipt","completed","cancelled"] as const,
  requisition: ["draft","pending_approval","approved","rejected","issued","partial_delivery","completed","cancelled"] as const,
  production: ["scheduled","in_progress","completed","cancelled","on_hold"] as const,
  count: ["draft","counting","review","posted"] as const,
  adjustment: ["draft","approved","posted"] as const,
  return: ["requested","approved","rejected","completed"] as const,
} as const;

// ---------------------------------------------------------------------------
// Tenancy & users
// ---------------------------------------------------------------------------
export const tenants = sqliteTable("tenants", {
  id: uuid("id").primaryKey(),
  orgId: varchar("org_id", { length: 128 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqOrgSlug: unique("uq_tenant_org_slug").on(t.orgId, t.slug),
  idxOrg: index("idx_tenant_org").on(t.orgId),
}));

export const locations = sqliteTable("locations", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 24 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqTenantCode: unique("uq_loc_tenant_code").on(t.tenantId, t.code),
  idxType: index("idx_location_type").on(t.type),
}));

export const users = sqliteTable("users", {
  id: uuid("id").primaryKey(),
  authUserId: varchar("auth_user_id", { length: 128 }).notNull(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 50 }),
  locationId: uuid("location_id").references(() => locations.id),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  metadata: jsonb("metadata"),
  username: varchar("username", { length: 255 }),
  displayUsername: varchar("display_username", { length: 255 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqTenantEmail: unique("uq_user_tenant_email").on(t.tenantId, t.email),
  uqUsername: unique("uq_username").on(t.username),
  idxAuth: index("idx_user_auth").on(t.authUserId),
}));

// Better Auth tables
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userLocations = sqliteTable("user_locations", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => ({
  uqUserLocation: unique("uq_user_location").on(t.userId, t.locationId),
  idxUser: index("idx_user_locations_user").on(t.userId),
  idxLocation: index("idx_user_locations_location").on(t.locationId),
}));

// Document sequences
export const docSequences = sqliteTable("doc_sequences", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 24 }).notNull(),
  period: varchar("period", { length: 10 }).notNull(),
  locationId: uuid("location_id"),
  prefix: varchar("prefix", { length: 32 }),
  nextNumber: integer("next_number").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqSeq: unique("uq_docseq_tenant_type_period_loc").on(t.tenantId, t.docType, t.period, t.locationId),
}));

// Partners
export const suppliers = sqliteTable("suppliers", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  taxId: varchar("tax_id", { length: 100 }),
  paymentTerms: integer("payment_terms"),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqTenantCode: unique("uq_supplier_tenant_code").on(t.tenantId, t.code),
  idxName: index("idx_supplier_name").on(t.name),
}));

export const customers = sqliteTable("customers", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  authUserId: varchar("auth_user_id", { length: 128 }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("external"),
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  paymentTerms: integer("payment_terms"),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqTenantCode: unique("uq_customer_tenant_code").on(t.tenantId, t.code),
  uqTenantAuth: unique("uq_customer_tenant_auth").on(t.tenantId, t.authUserId),
}));

export const addresses = sqliteTable("addresses", {
  id: uuid("id").primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 64 }),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lon: numeric("lon", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// UoM
export const uoms = sqliteTable("uoms", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 16 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  uomType: varchar("uom_type", { length: 20 }).notNull(),
  symbol: varchar("symbol", { length: 20 }),
  description: varchar("description", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqCode: unique("uq_uom_tenant_code").on(t.tenantId, t.code),
}));

export const uomConversions = sqliteTable("uom_conversions", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fromUomId: uuid("from_uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  toUomId: uuid("to_uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  factor: numeric("factor", { precision: 16, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqPair: unique("uq_conv_tenant_pair").on(t.tenantId, t.fromUomId, t.toUomId),
}));

// Products
export const products = sqliteTable("products", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  kind: varchar("kind", { length: 24 }).notNull(),
  baseUomId: uuid("base_uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  taxCategory: varchar("tax_category", { length: 32 }),
  standardCost: numeric("standard_cost", { precision: 16, scale: 6 }),
  defaultPrice: numeric("default_price", { precision: 16, scale: 2 }),
  isPerishable: boolean("is_perishable").notNull().default(false),
  shelfLifeDays: integer("shelf_life_days"),
  barcode: varchar("barcode", { length: 255 }),
  imageUrl: varchar("image_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqTenantSku: unique("uq_product_tenant_sku").on(t.tenantId, t.sku),
  idxKind: index("idx_product_kind").on(t.kind),
  idxName: index("idx_product_name").on(t.name),
}));

export const productVariants = sqliteTable("product_variants", {
  id: uuid("id").primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantName: varchar("variant_name", { length: 128 }).notNull(),
  priceDifferential: varchar("price_differential", { length: 32 }).notNull().default("0"),
  barcode: varchar("barcode", { length: 255 }),
  sku: varchar("sku", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqProdVariant: unique("uq_variant_prod_name").on(t.productId, t.variantName),
  idxDisplayOrder: index("idx_variant_display_order").on(t.productId, t.displayOrder),
}));

export const productPacks = sqliteTable("product_packs", {
  id: uuid("id").primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  packName: varchar("pack_name", { length: 64 }),
  toBaseFactor: numeric("to_base_factor", { precision: 16, scale: 6 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqPack: unique("uq_pack_product_uom").on(t.productId, t.uomId),
}));

export const supplierProducts = sqliteTable("supplier_products", {
  id: uuid("id").primaryKey(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  supplierSku: varchar("supplier_sku", { length: 100 }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  unitPrice: numeric("unit_price", { precision: 16, scale: 6 }).notNull(),
  minOrderQty: numeric("min_order_qty", { precision: 16, scale: 6 }),
  leadTimeDays: integer("lead_time_days"),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqSupplierProduct: unique("uq_supplier_product").on(t.supplierId, t.productId),
}));

// Lots & stock ledger
export const lots = sqliteTable("lots", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  lotNo: varchar("lot_no", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  manufactureDate: timestamp("manufacture_date"),
  receivedDate: timestamp("received_date").default(sql`CURRENT_TIMESTAMP`),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxLot: index("idx_lot_prod_loc_exp").on(t.productId, t.locationId, t.expiryDate),
  uqScoped: unique("uq_lot_tenant_prod_loc_no").on(t.tenantId, t.productId, t.locationId, t.lotNo),
}));

export const stockLedger = sqliteTable("stock_ledger", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  txnTs: timestamp("txn_ts").notNull().default(sql`CURRENT_TIMESTAMP`),
  type: varchar("type", { length: 16 }).notNull(),
  qtyDeltaBase: numeric("qty_delta_base", { precision: 18, scale: 6 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 16, scale: 6 }),
  refType: varchar("ref_type", { length: 24 }).notNull(),
  refId: uuid("ref_id").notNull(),
  note: text("note"),
  createdBy: uuid("created_by"),
  metadata: jsonb("metadata"),
}, (t) => ({
  idxProdLocTs: index("idx_ledger_prod_loc_ts").on(t.productId, t.locationId, t.txnTs),
  idxRef: index("idx_ledger_ref").on(t.refType, t.refId),
  idxTenant: index("idx_ledger_tenant").on(t.tenantId),
  idxLot: index("idx_ledger_lot").on(t.lotId),
}));

export const costLayers = sqliteTable("cost_layers", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  qtyRemainingBase: numeric("qty_remaining_base", { precision: 18, scale: 6 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 16, scale: 6 }).notNull(),
  sourceType: varchar("source_type", { length: 24 }).notNull(),
  sourceId: uuid("source_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxKey: index("idx_cost_layer_key").on(t.tenantId, t.productId, t.locationId, t.lotId),
}));

export const costLayerConsumptions = sqliteTable("cost_layer_consumptions", {
  id: uuid("id").primaryKey(),
  layerId: uuid("layer_id").notNull().references(() => costLayers.id, { onDelete: "cascade" }),
  refType: varchar("ref_type", { length: 24 }).notNull(),
  refId: uuid("ref_id").notNull(),
  qtyOutBase: numeric("qty_out_base", { precision: 18, scale: 6 }).notNull(),
  amount: numeric("amount", { precision: 16, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxLayer: index("idx_cost_layer_cons").on(t.layerId),
}));

// Purchase Orders
export const purchaseOrders = sqliteTable("purchase_orders", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  orderDate: timestamp("order_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  shippingCost: numeric("shipping_cost", { precision: 16, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 16, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  paymentTerms: integer("payment_terms"),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqPoNo: unique("uq_po_tenant_no").on(t.tenantId, t.orderNumber),
  idxStatus: index("idx_po_status").on(t.status),
}));

export const purchaseOrderItems = sqliteTable("purchase_order_items", {
  id: uuid("id").primaryKey(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 16, scale: 6 }).notNull(),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  unitPrice: numeric("unit_price", { precision: 16, scale: 6 }).notNull(),
  discount: numeric("discount", { precision: 16, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 16, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxPO: index("idx_poi_po").on(t.purchaseOrderId),
}));

export const goodsReceipts = sqliteTable("goods_receipts", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull(),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  receiptDate: timestamp("receipt_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  receivedBy: uuid("received_by"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqGrNo: unique("uq_gr_tenant_no").on(t.tenantId, t.receiptNumber),
  idxPO: index("idx_gr_po").on(t.purchaseOrderId),
}));

export const goodsReceiptItems = sqliteTable("goods_receipt_items", {
  id: uuid("id").primaryKey(),
  goodsReceiptId: uuid("goods_receipt_id").notNull().references(() => goodsReceipts.id, { onDelete: "cascade" }),
  purchaseOrderItemId: uuid("purchase_order_item_id").references(() => purchaseOrderItems.id, { onDelete: "set null" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  quantityOrdered: numeric("quantity_ordered", { precision: 16, scale: 6 }),
  quantityReceived: numeric("quantity_received", { precision: 16, scale: 6 }).notNull(),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  unitCost: numeric("unit_cost", { precision: 16, scale: 6 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxGR: index("idx_gri_gr").on(t.goodsReceiptId),
}));

// Requisitions & Transfers
export const requisitions = sqliteTable("requisitions", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  reqNumber: varchar("req_number", { length: 50 }).notNull(),
  fromLocationId: uuid("from_location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  toLocationId: uuid("to_location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  requestedDate: timestamp("requested_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  requiredDate: timestamp("required_date"),
  issuedDate: timestamp("issued_date"),
  deliveredDate: timestamp("delivered_date"),
  requestedBy: uuid("requested_by"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqReqNo: unique("uq_req_tenant_no").on(t.tenantId, t.reqNumber),
  idxStatus: index("idx_req_status").on(t.status),
}));

export const requisitionItems = sqliteTable("requisition_items", {
  id: uuid("id").primaryKey(),
  requisitionId: uuid("requisition_id").notNull().references(() => requisitions.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  qtyRequested: numeric("qty_requested", { precision: 16, scale: 6 }).notNull(),
  qtyIssued: numeric("qty_issued", { precision: 16, scale: 6 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxReq: index("idx_req_items_req").on(t.requisitionId),
}));

export const transfers = sqliteTable("transfers", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  transferNumber: varchar("transfer_number", { length: 50 }).notNull(),
  fromLocationId: uuid("from_location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  toLocationId: uuid("to_location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  transferDate: timestamp("transfer_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  requestedBy: uuid("requested_by"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  sentBy: uuid("sent_by"),
  sentAt: timestamp("sent_at"),
  receivedBy: uuid("received_by"),
  receivedAt: timestamp("received_at"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqXferNo: unique("uq_xfer_tenant_no").on(t.tenantId, t.transferNumber),
  idxStatus: index("idx_xfer_status").on(t.status),
}));

export const transferItems = sqliteTable("transfer_items", {
  id: uuid("id").primaryKey(),
  transferId: uuid("transfer_id").notNull().references(() => transfers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 16, scale: 6 }).notNull(),
  qtyReceived: numeric("qty_received", { precision: 16, scale: 6 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxXfer: index("idx_xfer_items").on(t.transferId),
}));

// Production
export const recipes = sqliteTable("recipes", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  finishedProductId: uuid("finished_product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  yieldQtyBase: numeric("yield_qty_base", { precision: 16, scale: 6 }).notNull(),
  instructions: text("instructions"),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqRecipe: unique("uq_recipe_code_ver").on(t.tenantId, t.code, t.version),
}));

export const recipeItems = sqliteTable("recipe_items", {
  id: uuid("id").primaryKey(),
  recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  qtyBase: numeric("qty_base", { precision: 16, scale: 6 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxRecipe: index("idx_recipe_items_recipe").on(t.recipeId),
}));

export const productionOrders = sqliteTable("production_orders", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  plannedQtyBase: numeric("planned_qty_base", { precision: 16, scale: 6 }).notNull(),
  producedQtyBase: numeric("produced_qty_base", { precision: 16, scale: 6 }).notNull().default("0"),
  status: varchar("status", { length: 24 }).notNull().default("scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  supervisedBy: uuid("supervised_by"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqProdNo: unique("uq_prod_tenant_no").on(t.tenantId, t.orderNumber),
  idxStatus: index("idx_prod_status").on(t.status),
}));

// Orders (POS + Online)
export const orders = sqliteTable("orders", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  deviceId: varchar("device_id", { length: 64 }),
  channel: varchar("channel", { length: 16 }).notNull().default("pos"),
  type: varchar("type", { length: 16 }).notNull().default("take_away"),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  kitchenStatus: varchar("kitchen_status", { length: 16 }).notNull().default("open"),
  tableNo: varchar("table_no", { length: 16 }),
  addressId: uuid("address_id").references(() => addresses.id, { onDelete: "set null" }),
  subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  serviceChargeAmount: numeric("svc_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  tipsAmount: numeric("tips_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  voucherAmount: numeric("voucher_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqOrdNo: unique("uq_order_no").on(t.tenantId, t.orderNumber),
  idxStatus: index("idx_order_status").on(t.status),
  idxKitchenStatus: index("idx_order_kitchen_status").on(t.kitchenStatus),
}));

export const orderItems = sqliteTable("order_items", {
  id: uuid("id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  uomId: uuid("uom_id").references(() => uoms.id, { onDelete: "set null" }),
  quantity: numeric("quantity", { precision: 16, scale: 6 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 16, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 16, scale: 2 }).notNull(),
  prepStatus: varchar("prep_status", { length: 16 }).notNull().default("queued"),
  station: varchar("station", { length: 32 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxOrder: index("idx_order_items").on(t.orderId),
  idxPrepStatus: index("idx_order_items_prep_status").on(t.prepStatus),
}));

// Stock Adjustments
export const stockAdjustments = sqliteTable("stock_adjustments", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  adjNumber: varchar("adj_number", { length: 50 }).notNull(),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  reason: varchar("reason", { length: 24 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqAdjNo: unique("uq_adj_tenant_no").on(t.tenantId, t.adjNumber),
}));

export const stockAdjustmentItems = sqliteTable("stock_adjustment_items", {
  id: uuid("id").primaryKey(),
  adjustmentId: uuid("adjustment_id").notNull().references(() => stockAdjustments.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  qtyDelta: numeric("qty_delta", { precision: 16, scale: 6 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 16, scale: 6 }),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxAdj: index("idx_adj_items").on(t.adjustmentId),
}));

// Stock Counts
export const stockCounts = sqliteTable("stock_counts", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  countNumber: varchar("count_number", { length: 50 }).notNull(),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uqCountNo: unique("uq_count_tenant_no").on(t.tenantId, t.countNumber),
}));

export const stockCountLines = sqliteTable("stock_count_lines", {
  id: uuid("id").primaryKey(),
  countId: uuid("count_id").notNull().references(() => stockCounts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  systemQtyBase: numeric("system_qty_base", { precision: 16, scale: 6 }).notNull(),
  countedQtyBase: numeric("counted_qty_base", { precision: 16, scale: 6 }).notNull(),
  varianceQtyBase: numeric("variance_qty_base", { precision: 16, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxCount: index("idx_count_lines").on(t.countId),
}));

// Alerts & Temperature Logs
export const alerts = sqliteTable("alerts", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  alertType: varchar("alert_type", { length: 32 }).notNull(),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  referenceType: varchar("reference_type", { length: 24 }),
  referenceId: uuid("reference_id"),
  threshold: numeric("threshold", { precision: 16, scale: 6 }),
  currentValue: numeric("current_value", { precision: 16, scale: 6 }),
  isRead: boolean("is_read").notNull().default(false),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by"),
  resolutionNotes: text("resolution_notes"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxType: index("idx_alert_type").on(t.alertType),
  idxPriority: index("idx_alert_priority").on(t.priority),
}));

export const temperatureLogs = sqliteTable("temperature_logs", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  area: varchar("area", { length: 255 }),
  temperature: numeric("temperature", { precision: 6, scale: 2 }).notNull(),
  humidity: numeric("humidity", { precision: 6, scale: 2 }),
  recordedAt: timestamp("recorded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  deviceId: varchar("device_id", { length: 100 }),
  isAlert: boolean("is_alert").notNull().default(false),
  alertReason: text("alert_reason"),
  recordedBy: uuid("recorded_by"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  idxLocTime: index("idx_temp_loc_time").on(t.locationId, t.recordedAt),
  idxAlert: index("idx_temp_alert").on(t.isAlert),
}));

// Note: SQLite doesn't support complex SQL functions, views, and triggers like PostgreSQL
// These would need to be implemented in the application layer or with simple SQLite equivalents
