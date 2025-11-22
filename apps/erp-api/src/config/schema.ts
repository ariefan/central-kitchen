// F&B Central Kitchen — Real‑Life Schema v2 (POS + Consumer + Loyalty + Guards)
// Clean • DRY • Ledger-first • Multi-tenant • FEFO • Minimal POS + Consumer
// Drizzle ORM (PostgreSQL) — v2025-compatible API usage

import {
  pgSchema,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
  primaryKey,
  bigserial,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------
export const erp = pgSchema("erp");

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
export const tenants = erp.table("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: varchar("org_id", { length: 128 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqOrgSlug: unique("uq_tenant_org_slug").on(t.orgId, t.slug),
  idxOrg: index("idx_tenant_org").on(t.orgId),
}));

export const locations = erp.table("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 24 }).notNull(),
  address: text("address"), city: varchar("city", { length: 100 }), state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }), country: varchar("country", { length: 100 }),
  phone: varchar("phone", { length: 50 }), email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqTenantCode: unique("uq_loc_tenant_code").on(t.tenantId, t.code),
  idxType: index("idx_location_type").on(t.type),
}));

export const users = erp.table("users", {
  // Primary key
  id: uuid("id").primaryKey().defaultRandom(),

  // Better Auth compatibility field
  authUserId: varchar("auth_user_id", { length: 128 }),

  // Multi-tenant fields
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),

  // Core user fields
  name: text("name"),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 50 }),
  locationId: uuid("location_id").references(() => locations.id),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  metadata: jsonb("metadata"),

  // Better Auth fields
  username: varchar("username", { length: 255 }).unique(),
  displayUsername: varchar("display_username", { length: 255 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqTenantEmail: unique("uq_user_tenant_email").on(t.tenantId, t.email),
  idxAuth: index("idx_user_auth").on(t.authUserId),
}));

// ---------------------------------------------------------------------------
// Better Auth tables
// ---------------------------------------------------------------------------
export const sessions = erp.table("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = erp.table("accounts", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = erp.table("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Multi-Location Access Control (AUTH-002)
// ---------------------------------------------------------------------------
export const userLocations = erp.table("user_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => ({
  uqUserLocation: unique("uq_user_location").on(t.userId, t.locationId),
  idxUser: index("idx_user_locations_user").on(t.userId),
  idxLocation: index("idx_user_locations_location").on(t.locationId),
}));

// ---------------------------------------------------------------------------
// Document sequences
// ---------------------------------------------------------------------------
export const docSequences = erp.table("doc_sequences", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 24 }).notNull(),
  period: varchar("period", { length: 10 }).notNull(),
  locationId: uuid("location_id"),
  prefix: varchar("prefix", { length: 32 }),
  nextNumber: integer("next_number").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqSeq: unique("uq_docseq_tenant_type_period_loc").on(t.tenantId, t.docType, t.period, t.locationId),
}));

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------
export const suppliers = erp.table("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }), phone: varchar("phone", { length: 50 }),
  address: text("address"), city: varchar("city", { length: 100 }),
  taxId: varchar("tax_id", { length: 100 }),
  paymentTerms: integer("payment_terms"),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"), metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqTenantCode: unique("uq_supplier_tenant_code").on(t.tenantId, t.code),
  idxName: index("idx_supplier_name").on(t.name),
}));

export const customers = erp.table("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  authUserId: varchar("auth_user_id", { length: 128 }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("external"),
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }), phone: varchar("phone", { length: 50 }),
  address: text("address"), city: varchar("city", { length: 100 }),
  paymentTerms: integer("payment_terms"),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqTenantCode: unique("uq_customer_tenant_code").on(t.tenantId, t.code),
  uqTenantAuth: unique("uq_customer_tenant_auth").on(t.tenantId, t.authUserId),
}));

// Consumer addresses (delivery)
export const addresses = erp.table("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 64 }),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 100 }), state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }), country: varchar("country", { length: 100 }),
  lat: numeric("lat", { precision: 10, scale: 7 }), lon: numeric("lon", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// UoM
// ---------------------------------------------------------------------------
// UOM Management (ADM-003)
export const uoms = erp.table("uoms", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 16 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  uomType: varchar("uom_type", { length: 20 }).notNull(), // weight, volume, count, length, area, time
  symbol: varchar("symbol", { length: 20 }),
  description: varchar("description", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({ uqCode: unique("uq_uom_tenant_code").on(t.tenantId, t.code) }));

export const uomConversions = erp.table("uom_conversions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fromUomId: uuid("from_uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  toUomId: uuid("to_uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  factor: numeric("factor", { precision: 16, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({ uqPair: unique("uq_conv_tenant_pair").on(t.tenantId, t.fromUomId, t.toUomId) }));

// ---------------------------------------------------------------------------
// Products, variants, packs, supplier SKUs
// ---------------------------------------------------------------------------
export const products = erp.table("products", {
  id: uuid("id").primaryKey().defaultRandom(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqTenantSku: unique("uq_product_tenant_sku").on(t.tenantId, t.sku),
  idxKind: index("idx_product_kind").on(t.kind),
  idxName: index("idx_product_name").on(t.name),
}));

export const productVariants = erp.table("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantName: varchar("variant_name", { length: 128 }).notNull(), // e.g., "Large", "Strawberry"
  priceDifferential: varchar("price_differential", { length: 32 }).notNull().default("0"), // Money amount (can be negative)
  barcode: varchar("barcode", { length: 255 }),
  sku: varchar("sku", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  uqProdVariant: unique("uq_variant_prod_name").on(t.productId, t.variantName),
  idxDisplayOrder: index("idx_variant_display_order").on(t.productId, t.displayOrder),
}));

export const productPacks = erp.table("product_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  packName: varchar("pack_name", { length: 64 }),
  toBaseFactor: numeric("to_base_factor", { precision: 16, scale: 6 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ uqPack: unique("uq_pack_product_uom").on(t.productId, t.uomId) }));

export const supplierProducts = erp.table("supplier_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  supplierSku: varchar("supplier_sku", { length: 100 }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  unitPrice: numeric("unit_price", { precision: 16, scale: 6 }).notNull(),
  minOrderQty: numeric("min_order_qty", { precision: 16, scale: 6 }),
  leadTimeDays: integer("lead_time_days"),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqSupplierProduct: unique("uq_supplier_product").on(t.supplierId, t.productId),
  ckPricePos: check("ck_supplier_unit_price_pos", sql`${t.unitPrice} >= 0`),
}));

// Menu & modifiers (availability without over-engineering)
export const modifierGroups = erp.table("modifier_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  minSelect: integer("min_select").notNull().default(0),
  maxSelect: integer("max_select").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxName: index("idx_modgrp_name").on(t.name) }));

export const modifiers = erp.table("modifiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => modifierGroups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  priceDelta: numeric("price_delta", { precision: 16, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({ idxGroup: index("idx_mod_group").on(t.groupId) }));

export const productModifierGroups = erp.table("product_modifier_groups", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => modifierGroups.id, { onDelete: "cascade" }),
}, (t) => ({ pk: primaryKey({ columns: [t.productId, t.groupId], name: "pk_product_modifier_group" }) }));

export const menus = erp.table("menus", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  channel: varchar("channel", { length: 16 }), // pos|online
  startAt: timestamp("start_at"), endAt: timestamp("end_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const menuItems = erp.table("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuId: uuid("menu_id").notNull().references(() => menus.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "cascade" }),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Price books
export const priceBooks = erp.table("price_books", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  channel: varchar("channel", { length: 16 }),
  startAt: timestamp("start_at"), endAt: timestamp("end_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const priceBookItems = erp.table("price_book_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  priceBookId: uuid("price_book_id").notNull().references(() => priceBooks.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 16, scale: 2 }).notNull(),
});

// ---------------------------------------------------------------------------
// Lots & immutable stock ledger
// ---------------------------------------------------------------------------
export const lots = erp.table("lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  lotNo: varchar("lot_no", { length: 100 }),
  expiryDate: timestamp("expiry_date"), manufactureDate: timestamp("manufacture_date"),
  receivedDate: timestamp("received_date").defaultNow(),
  notes: text("notes"), metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  idxLot: index("idx_lot_prod_loc_exp").on(t.productId, t.locationId, t.expiryDate),
  uqScoped: unique("uq_lot_tenant_prod_loc_no").on(t.tenantId, t.productId, t.locationId, t.lotNo),
}));

export const stockLedger = erp.table("stock_ledger", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  txnTs: timestamp("txn_ts").notNull().defaultNow(),
  type: varchar("type", { length: 16 }).notNull(),
  qtyDeltaBase: numeric("qty_delta_base", { precision: 18, scale: 6 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 16, scale: 6 }),
  refType: varchar("ref_type", { length: 24 }).notNull(),
  refId: uuid("ref_id").notNull(),
  note: text("note"), createdBy: uuid("created_by"), metadata: jsonb("metadata"),
}, (t) => ({
  idxProdLocTs: index("idx_ledger_prod_loc_ts").on(t.productId, t.locationId, t.txnTs),
  idxRef: index("idx_ledger_ref").on(t.refType, t.refId),
  idxTenant: index("idx_ledger_tenant").on(t.tenantId),
  idxLot: index("idx_ledger_lot").on(t.lotId),
}));

// Optional FIFO costing (simple, not over-engineered)
export const costLayers = erp.table("cost_layers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  qtyRemainingBase: numeric("qty_remaining_base", { precision: 18, scale: 6 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 16, scale: 6 }).notNull(),
  sourceType: varchar("source_type", { length: 24 }).notNull(), // GR|XFER|PROD|ADJ+
  sourceId: uuid("source_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxKey: index("idx_cost_layer_key").on(t.tenantId, t.productId, t.locationId, t.lotId) }));

export const costLayerConsumptions = erp.table("cost_layer_consumptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  layerId: uuid("layer_id").notNull().references(() => costLayers.id, { onDelete: "cascade" }),
  refType: varchar("ref_type", { length: 24 }).notNull(),
  refId: uuid("ref_id").notNull(),
  qtyOutBase: numeric("qty_out_base", { precision: 18, scale: 6 }).notNull(),
  amount: numeric("amount", { precision: 16, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxLayer: index("idx_cost_layer_cons").on(t.layerId) }));

// ---------------------------------------------------------------------------
// Purchasing (PO → GR)
// ---------------------------------------------------------------------------
export const purchaseOrders = erp.table("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  orderDate: timestamp("order_date").notNull().defaultNow(),
  expectedDeliveryDate: timestamp("expected_delivery_date"), actualDeliveryDate: timestamp("actual_delivery_date"),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  shippingCost: numeric("shipping_cost", { precision: 16, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 16, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  paymentTerms: integer("payment_terms"),
  notes: text("notes"),
  createdBy: uuid("created_by"), approvedBy: uuid("approved_by"), approvedAt: timestamp("approved_at"),
  metadata: jsonb("metadata"), createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uqPoNo: unique("uq_po_tenant_no").on(t.tenantId, t.orderNumber),
  idxStatus: index("idx_po_status").on(t.status),
  ckTotals: check("ck_po_totals_nonneg", sql`${t.subtotal} >= 0 AND ${t.taxAmount} >= 0 AND ${t.totalAmount} >= 0`),
}));

export const purchaseOrderItems = erp.table("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 16, scale: 6 }).notNull(),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  unitPrice: numeric("unit_price", { precision: 16, scale: 6 }).notNull(),
  discount: numeric("discount", { precision: 16, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 16, scale: 2 }).notNull(),
  notes: text("notes"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxPO: index("idx_poi_po").on(t.purchaseOrderId), ckQtyPos: check("ck_poi_qty_pos", sql`${t.quantity} > 0`) }));

export const goodsReceipts = erp.table("goods_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull(),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  receiptDate: timestamp("receipt_date").notNull().defaultNow(),
  receivedBy: uuid("received_by"), notes: text("notes"), metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqGrNo: unique("uq_gr_tenant_no").on(t.tenantId, t.receiptNumber), idxPO: index("idx_gr_po").on(t.purchaseOrderId) }));

export const goodsReceiptItems = erp.table("goods_receipt_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  goodsReceiptId: uuid("goods_receipt_id").notNull().references(() => goodsReceipts.id, { onDelete: "cascade" }),
  purchaseOrderItemId: uuid("purchase_order_item_id").references(() => purchaseOrderItems.id, { onDelete: "set null" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  quantityOrdered: numeric("quantity_ordered", { precision: 16, scale: 6 }),
  quantityReceived: numeric("quantity_received", { precision: 16, scale: 6 }).notNull(),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  unitCost: numeric("unit_cost", { precision: 16, scale: 6 }).notNull(),
  notes: text("notes"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxGR: index("idx_gri_gr").on(t.goodsReceiptId), ckQtyPos: check("ck_gri_qty_pos", sql`${t.quantityReceived} > 0`) }));

// ---------------------------------------------------------------------------
// Requisitions & transfers
// ---------------------------------------------------------------------------
export const requisitions = erp.table("requisitions", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  reqNumber: varchar("req_number", { length: 50 }).notNull(),
  fromLocationId: uuid("from_location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  toLocationId: uuid("to_location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  requestedDate: timestamp("requested_date").notNull().defaultNow(), requiredDate: timestamp("required_date"),
  issuedDate: timestamp("issued_date"), deliveredDate: timestamp("delivered_date"),
  requestedBy: uuid("requested_by"), approvedBy: uuid("approved_by"), approvedAt: timestamp("approved_at"),
  notes: text("notes"), metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqReqNo: unique("uq_req_tenant_no").on(t.tenantId, t.reqNumber), idxStatus: index("idx_req_status").on(t.status) }));

export const requisitionItems = erp.table("requisition_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  requisitionId: uuid("requisition_id").notNull().references(() => requisitions.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  qtyRequested: numeric("qty_requested", { precision: 16, scale: 6 }).notNull(),
  qtyIssued: numeric("qty_issued", { precision: 16, scale: 6 }).notNull().default("0"),
  notes: text("notes"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxReq: index("idx_req_items_req").on(t.requisitionId), ckQtyReqPos: check("ck_req_qtyreq_pos", sql`${t.qtyRequested} > 0`) }));

export const transfers = erp.table("transfers", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  transferNumber: varchar("transfer_number", { length: 50 }).notNull(),
  fromLocationId: uuid("from_location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  toLocationId: uuid("to_location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  transferDate: timestamp("transfer_date").notNull().defaultNow(), expectedDeliveryDate: timestamp("expected_delivery_date"), actualDeliveryDate: timestamp("actual_delivery_date"),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  requestedBy: uuid("requested_by"), approvedBy: uuid("approved_by"), approvedAt: timestamp("approved_at"),
  sentBy: uuid("sent_by"), sentAt: timestamp("sent_at"), receivedBy: uuid("received_by"), receivedAt: timestamp("received_at"),
  notes: text("notes"), metadata: jsonb("metadata"), createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqXferNo: unique("uq_xfer_tenant_no").on(t.tenantId, t.transferNumber), idxStatus: index("idx_xfer_status").on(t.status) }));

export const transferItems = erp.table("transfer_items", {
  id: uuid("id").primaryKey().defaultRandom(), transferId: uuid("transfer_id").notNull().references(() => transfers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 16, scale: 6 }).notNull(),
  qtyReceived: numeric("qty_received", { precision: 16, scale: 6 }),
  notes: text("notes"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxXfer: index("idx_xfer_items").on(t.transferId), ckQtyPos: check("ck_xfer_qty_pos", sql`${t.quantity} > 0`) }));

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------
export const recipes = erp.table("recipes", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(), name: varchar("name", { length: 255 }).notNull(),
  finishedProductId: uuid("finished_product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  yieldQtyBase: numeric("yield_qty_base", { precision: 16, scale: 6 }).notNull(),
  instructions: text("instructions"), version: integer("version").notNull().default(1), isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"), createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqRecipe: unique("uq_recipe_code_ver").on(t.tenantId, t.code, t.version) }));

export const recipeItems = erp.table("recipe_items", {
  id: uuid("id").primaryKey().defaultRandom(), recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  qtyBase: numeric("qty_base", { precision: 16, scale: 6 }).notNull(), sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxRecipe: index("idx_recipe_items_recipe").on(t.recipeId), ckQtyPos: check("ck_recipe_qty_pos", sql`${t.qtyBase} > 0`) }));

export const productionOrders = erp.table("production_orders", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 50 }).notNull(), recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  plannedQtyBase: numeric("planned_qty_base", { precision: 16, scale: 6 }).notNull(),
  producedQtyBase: numeric("produced_qty_base", { precision: 16, scale: 6 }).notNull().default("0"),
  status: varchar("status", { length: 24 }).notNull().default("scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(), startedAt: timestamp("started_at"), completedAt: timestamp("completed_at"),
  notes: text("notes"), createdBy: uuid("created_by"), supervisedBy: uuid("supervised_by"), metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqProdNo: unique("uq_prod_tenant_no").on(t.tenantId, t.orderNumber), idxStatus: index("idx_prod_status").on(t.status) }));

// ---------------------------------------------------------------------------
// Unified Orders (POS + Online) & Payments
// ---------------------------------------------------------------------------
export const orders = erp.table("orders", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
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
  createdBy: uuid("created_by"), createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqOrdNo: unique("uq_order_no").on(t.tenantId, t.orderNumber), idxStatus: index("idx_order_status").on(t.status), idxKitchenStatus: index("idx_order_kitchen_status").on(t.kitchenStatus) }));

export const orderItems = erp.table("order_items", {
  id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
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
  notes: text("notes"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxOrder: index("idx_order_items").on(t.orderId), idxPrepStatus: index("idx_order_items_prep_status").on(t.prepStatus), ckQtyPos: check("ck_order_qty_pos", sql`${t.quantity} > 0`) }));

export const orderItemModifiers = erp.table("order_item_modifiers", {
  id: uuid("id").primaryKey().defaultRandom(), orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  modifierId: uuid("modifier_id").notNull().references(() => modifiers.id, { onDelete: "restrict" }),
  priceDelta: numeric("price_delta", { precision: 16, scale: 2 }).notNull().default("0"),
}, (t) => ({ idxItem: index("idx_item_mods").on(t.orderItemId) }));

export const payments = erp.table("payments", {
  id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  tender: varchar("tender", { length: 24 }).notNull(), amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 128 }), change: numeric("change", { precision: 16, scale: 2 }).notNull().default("0"),
  paidAt: timestamp("paid_at").notNull().defaultNow(), createdBy: uuid("created_by"),
}, (t) => ({ idxOrder: index("idx_payment_order").on(t.orderId) }));

export const posShifts = erp.table("pos_shifts", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  deviceId: varchar("device_id", { length: 64 }), openedBy: uuid("opened_by"), openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedBy: uuid("closed_by"), closedAt: timestamp("closed_at"),
  floatAmount: numeric("float_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  expectedCash: numeric("expected_cash", { precision: 16, scale: 2 }).notNull().default("0"),
  actualCash: numeric("actual_cash", { precision: 16, scale: 2 }).notNull().default("0"),
  variance: numeric("variance", { precision: 16, scale: 2 }).notNull().default("0"),
}, (t) => ({ idxShiftLoc: index("idx_shift_loc").on(t.locationId, t.openedAt) }));

export const drawerMovements = erp.table("drawer_movements", {
  id: uuid("id").primaryKey().defaultRandom(), shiftId: uuid("shift_id").notNull().references(() => posShifts.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 24 }).notNull(), amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
  reason: text("reason"), createdBy: uuid("created_by"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxShift: index("idx_drawer_shift").on(t.shiftId) }));

// Deliveries (for online/delivery orders)
export const deliveries = erp.table("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 64 }), trackingCode: varchar("tracking_code", { length: 128 }),
  fee: numeric("fee", { precision: 16, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 24 }).notNull().default("requested"), // requested|assigned|picked_up|delivered|failed
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Carts (consumer)
export const carts = erp.table("carts", {
  id: uuid("id").primaryKey().defaultRandom(), customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  deviceId: varchar("device_id", { length: 64 }), channel: varchar("channel", { length: 16 }).default("online"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cartItems = erp.table("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(), cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  quantity: numeric("quantity", { precision: 16, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Returns, adjustments, stock counts
// ---------------------------------------------------------------------------
export const returnOrders = erp.table("return_orders", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  returnNumber: varchar("return_number", { length: 50 }).notNull(),
  returnType: varchar("return_type", { length: 24 }).notNull(), referenceType: varchar("reference_type", { length: 24 }), referenceId: uuid("reference_id"),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }), customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  returnDate: timestamp("return_date").notNull().defaultNow(),
  status: varchar("status", { length: 24 }).notNull().default("requested"),
  reason: text("reason").notNull(), totalAmount: numeric("total_amount", { precision: 16, scale: 2 }),
  notes: text("notes"), createdBy: uuid("created_by"), approvedBy: uuid("approved_by"), approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqReturnNo: unique("uq_return_tenant_no").on(t.tenantId, t.returnNumber), idxStatus: index("idx_return_status").on(t.status) }));

export const returnOrderItems = erp.table("return_order_items", {
  id: uuid("id").primaryKey().defaultRandom(), returnOrderId: uuid("return_order_id").notNull().references(() => returnOrders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 16, scale: 6 }).notNull(), unitPrice: numeric("unit_price", { precision: 16, scale: 2 }),
  reason: text("reason"), notes: text("notes"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxReturn: index("idx_return_items").on(t.returnOrderId), ckQtyPos: check("ck_return_qty_pos", sql`${t.quantity} > 0`) }));

export const stockAdjustments = erp.table("stock_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  adjNumber: varchar("adj_number", { length: 50 }).notNull(), locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  reason: varchar("reason", { length: 24 }).notNull(), status: varchar("status", { length: 24 }).notNull().default("draft"),
  notes: text("notes"), createdBy: uuid("created_by"), approvedBy: uuid("approved_by"), approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqAdjNo: unique("uq_adj_tenant_no").on(t.tenantId, t.adjNumber) }));

export const stockAdjustmentItems = erp.table("stock_adjustment_items", {
  id: uuid("id").primaryKey().defaultRandom(), adjustmentId: uuid("adjustment_id").notNull().references(() => stockAdjustments.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  uomId: uuid("uom_id").notNull().references(() => uoms.id, { onDelete: "restrict" }),
  qtyDelta: numeric("qty_delta", { precision: 16, scale: 6 }).notNull(), unitCost: numeric("unit_cost", { precision: 16, scale: 6 }),
  reason: text("reason"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxAdj: index("idx_adj_items").on(t.adjustmentId) }));

export const stockCounts = erp.table("stock_counts", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  countNumber: varchar("count_number", { length: 50 }).notNull(), locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).notNull().default("draft"), notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ uqCountNo: unique("uq_count_tenant_no").on(t.tenantId, t.countNumber) }));

export const stockCountLines = erp.table("stock_count_lines", {
  id: uuid("id").primaryKey().defaultRandom(), countId: uuid("count_id").notNull().references(() => stockCounts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  systemQtyBase: numeric("system_qty_base", { precision: 16, scale: 6 }).notNull(),
  countedQtyBase: numeric("counted_qty_base", { precision: 16, scale: 6 }).notNull(),
  varianceQtyBase: numeric("variance_qty_base", { precision: 16, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxCount: index("idx_count_lines").on(t.countId) }));

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------
export const alerts = erp.table("alerts", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  alertType: varchar("alert_type", { length: 32 }).notNull(), priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  title: varchar("title", { length: 255 }).notNull(), message: text("message").notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  referenceType: varchar("reference_type", { length: 24 }), referenceId: uuid("reference_id"),
  threshold: numeric("threshold", { precision: 16, scale: 6 }), currentValue: numeric("current_value", { precision: 16, scale: 6 }),
  isRead: boolean("is_read").notNull().default(false), isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"), resolvedBy: uuid("resolved_by"), resolutionNotes: text("resolution_notes"),
  expiresAt: timestamp("expires_at"), metadata: jsonb("metadata"), createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ idxType: index("idx_alert_type").on(t.alertType), idxPriority: index("idx_alert_priority").on(t.priority) }));

export const temperatureLogs = erp.table("temperature_logs", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
  area: varchar("area", { length: 255 }), temperature: numeric("temperature", { precision: 6, scale: 2 }).notNull(),
  humidity: numeric("humidity", { precision: 6, scale: 2 }), recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  deviceId: varchar("device_id", { length: 100 }), isAlert: boolean("is_alert").notNull().default(false), alertReason: text("alert_reason"),
  recordedBy: uuid("recorded_by"), metadata: jsonb("metadata"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idxLocTime: index("idx_temp_loc_time").on(t.locationId, t.recordedAt), idxAlert: index("idx_temp_alert").on(t.isAlert) }));

// ---------------------------------------------------------------------------
// Loyalty, vouchers, promotions (minimal, real)
// ---------------------------------------------------------------------------
export const loyaltyAccounts = erp.table("loyalty_accounts", {
  id: uuid("id").primaryKey().defaultRandom(), customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  pointsBalance: integer("points_balance").notNull().default(0), createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loyaltyLedger = erp.table("loyalty_ledger", {
  id: uuid("id").primaryKey().defaultRandom(), accountId: uuid("account_id").notNull().references(() => loyaltyAccounts.id, { onDelete: "cascade" }),
  refType: varchar("ref_type", { length: 24 }).notNull(), refId: uuid("ref_id").notNull(),
  pointsDelta: integer("points_delta").notNull(), reason: text("reason"), createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vouchers = erp.table("vouchers", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 32 }).notNull(),
  kind: varchar("kind", { length: 16 }).notNull(), // percent|fixed|gift
  amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
  minSpend: numeric("min_spend", { precision: 16, scale: 2 }),
  usageLimit: integer("usage_limit"), usagePerCustomer: integer("usage_per_customer"),
  startAt: timestamp("start_at"), endAt: timestamp("end_at"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({ uqCode: unique("uq_voucher_code").on(t.tenantId, t.code) }));

export const voucherRedemptions = erp.table("voucher_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(), voucherId: uuid("voucher_id").notNull().references(() => vouchers.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  amountApplied: numeric("amount_applied", { precision: 16, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const promotions = erp.table("promotions", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  percentOff: numeric("percent_off", { precision: 5, scale: 2 }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  startAt: timestamp("start_at"), endAt: timestamp("end_at"),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  channel: varchar("channel", { length: 16 }),
  isActive: boolean("is_active").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Tax model (snapshotted)
// ---------------------------------------------------------------------------
export const taxCategories = erp.table("tax_categories", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 32 }).notNull(), name: varchar("name", { length: 64 }).notNull(),
}, (t) => ({ uqTaxCat: unique("uq_taxcat").on(t.tenantId, t.code) }));

export const taxRates = erp.table("tax_rates", {
  id: uuid("id").primaryKey().defaultRandom(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryCode: varchar("category_code", { length: 32 }).notNull(),
  ratePct: numeric("rate_pct", { precision: 6, scale: 3 }).notNull(),
  inclusive: boolean("inclusive").notNull().default(true),
  startAt: timestamp("start_at").notNull(), endAt: timestamp("end_at"),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
});

// ---------------------------------------------------------------------------
// Views (tenant-aware)
// ---------------------------------------------------------------------------
export const createViews = sql`
CREATE OR REPLACE VIEW erp.v_inventory_onhand AS
SELECT sl.tenant_id, sl.product_id, sl.location_id, SUM(sl.qty_delta_base) AS qty_onhand
FROM erp.stock_ledger sl
WHERE sl.tenant_id = current_setting('app.tenant_id', true)::uuid
GROUP BY sl.tenant_id, sl.product_id, sl.location_id;

CREATE OR REPLACE VIEW erp.v_lot_balances AS
SELECT sl.tenant_id, sl.product_id, sl.location_id, sl.lot_id, l.expiry_date,
       SUM(sl.qty_delta_base) AS qty_onhand
FROM erp.stock_ledger sl
LEFT JOIN erp.lots l ON l.id = sl.lot_id
WHERE sl.tenant_id = current_setting('app.tenant_id', true)::uuid
GROUP BY sl.tenant_id, sl.product_id, sl.location_id, sl.lot_id, l.expiry_date;

CREATE OR REPLACE VIEW erp.v_fefo_pick AS
SELECT * FROM erp.v_lot_balances WHERE qty_onhand > 0
ORDER BY expiry_date NULLS LAST, lot_id;
`;

// ---------------------------------------------------------------------------
// Functions — numbering, housekeeping, costing, guards, postings (minimal)
// ---------------------------------------------------------------------------
export const createDocNumberingFn = sql`
CREATE OR REPLACE FUNCTION erp.take_next_doc_no(
  in_tenant uuid, in_doctype text, in_period text, in_location uuid, in_prefix text
) RETURNS text AS $$
DECLARE v_next int; v_prefix text := COALESCE(in_prefix, '');
BEGIN
  LOOP
    UPDATE erp.doc_sequences SET next_number = next_number + 1, updated_at = now()
    WHERE tenant_id = in_tenant AND doc_type = in_doctype AND period = in_period
      AND ((location_id IS NULL AND in_location IS NULL) OR location_id = in_location)
    RETURNING next_number INTO v_next;
    IF FOUND THEN RETURN v_prefix || lpad((v_next - 1)::text, 5, '0'); END IF;
    BEGIN
      INSERT INTO erp.doc_sequences(tenant_id, doc_type, period, location_id, prefix, next_number)
      VALUES (in_tenant, in_doctype, in_period, in_location, in_prefix, 1);
    EXCEPTION WHEN unique_violation THEN END;
  END LOOP;
END;$$ LANGUAGE plpgsql;`;

export const housekeepingTriggers = sql`
CREATE OR REPLACE FUNCTION erp.bump_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;`;

// Moving average cost helper (fallback when FIFO not enabled)
export const movingAvgCostFn = sql`
CREATE OR REPLACE FUNCTION erp.get_mavg_cost(p_tenant uuid, p_product uuid, p_location uuid)
RETURNS numeric AS $$
DECLARE v_cost numeric; BEGIN
  SELECT CASE WHEN SUM(CASE WHEN qty_delta_base>0 THEN qty_delta_base ELSE 0 END)=0 THEN NULL
         ELSE SUM(CASE WHEN qty_delta_base>0 THEN qty_delta_base*unit_cost ELSE 0 END)
              / SUM(CASE WHEN qty_delta_base>0 THEN qty_delta_base ELSE 0 END) END
  INTO v_cost
  FROM erp.stock_ledger
  WHERE tenant_id=p_tenant AND product_id=p_product AND location_id=p_location;
  RETURN v_cost; END; $$ LANGUAGE plpgsql;`;

// Negative stock guard (deferred, per affected keys)
export const negativeStockGuard = sql`
CREATE OR REPLACE FUNCTION erp.prevent_negative_stock() RETURNS trigger AS $$
DECLARE rec record; BEGIN
  FOR rec IN (
    SELECT nl.tenant_id, nl.product_id, nl.location_id, nl.lot_id
    FROM new_ledger nl
    GROUP BY 1,2,3,4
  ) LOOP
    -- Check lot-level if lot specified
    IF rec.lot_id IS NOT NULL THEN
      IF (SELECT COALESCE(SUM(qty_delta_base),0) FROM erp.stock_ledger
          WHERE tenant_id=rec.tenant_id AND product_id=rec.product_id AND location_id=rec.location_id AND lot_id=rec.lot_id) < 0
      THEN RAISE EXCEPTION 'Negative stock for product %, location %, lot %', rec.product_id, rec.location_id, rec.lot_id; END IF;
    END IF;
    -- Check product/location level
    IF (SELECT COALESCE(SUM(qty_delta_base),0) FROM erp.stock_ledger
        WHERE tenant_id=rec.tenant_id AND product_id=rec.product_id AND location_id=rec.location_id) < 0
    THEN RAISE EXCEPTION 'Negative stock for product %, location %', rec.product_id, rec.location_id; END IF;
  END LOOP; RETURN NULL; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON erp.stock_ledger;
CREATE CONSTRAINT TRIGGER trg_prevent_negative_stock
AFTER INSERT OR UPDATE ON erp.stock_ledger
DEFERRABLE INITIALLY DEFERRED
REFERENCING NEW TABLE AS new_ledger
FOR EACH STATEMENT EXECUTE FUNCTION erp.prevent_negative_stock();`;

// Minimal postings
export const postingFns = sql`
-- 1) Post Goods Receipt → stock_ledger (+)
CREATE OR REPLACE FUNCTION erp.post_goods_receipt(p_gr uuid, p_user uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO erp.stock_ledger(tenant_id, product_id, location_id, lot_id, txn_ts, type, qty_delta_base, unit_cost, ref_type, ref_id, created_by)
  SELECT gr.tenant_id, gri.product_id, gr.location_id, gri.lot_id, gr.receipt_date, 'rcv',
         gri.quantity_received, gri.unit_cost, 'GR', gr.id, p_user
  FROM erp.goods_receipts gr
  JOIN erp.goods_receipt_items gri ON gri.goods_receipt_id = gr.id
  WHERE gr.id = p_gr;
END; $$ LANGUAGE plpgsql;

-- 2) Post Order (issue) → stock_ledger (-)
CREATE OR REPLACE FUNCTION erp.post_order_issue(p_order uuid, p_user uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO erp.stock_ledger(tenant_id, product_id, location_id, lot_id, txn_ts, type, qty_delta_base, unit_cost, ref_type, ref_id, created_by)
  SELECT o.tenant_id, oi.product_id, o.location_id, oi.lot_id, o.created_at, 'iss',
         -oi.quantity,
         COALESCE(erp.get_mavg_cost(o.tenant_id, oi.product_id, o.location_id), 0),
         'ORDER', o.id, p_user
  FROM erp.orders o
  JOIN erp.order_items oi ON oi.order_id = o.id
  WHERE o.id = p_order;
END; $$ LANGUAGE plpgsql;

-- 3) Post Production (consume components, produce FG)
CREATE OR REPLACE FUNCTION erp.post_production(p_prod uuid, p_user uuid)
RETURNS void AS $$
DECLARE v_tenant uuid; v_loc uuid; v_recipe uuid; v_qty numeric; v_fg uuid; BEGIN
  SELECT tenant_id, location_id, recipe_id, produced_qty_base INTO v_tenant, v_loc, v_recipe, v_qty FROM erp.production_orders WHERE id=p_prod;
  SELECT finished_product_id INTO v_fg FROM erp.recipes WHERE id=v_recipe;
  -- consume components
  INSERT INTO erp.stock_ledger(tenant_id, product_id, location_id, txn_ts, type, qty_delta_base, unit_cost, ref_type, ref_id, created_by)
  SELECT v_tenant, ri.product_id, v_loc, now(), 'prod_out', -ri.qty_base * v_qty / NULLIF((SELECT yield_qty_base FROM erp.recipes WHERE id=v_recipe),0),
         COALESCE(erp.get_mavg_cost(v_tenant, ri.product_id, v_loc),0), 'PROD', p_prod, p_user
  FROM erp.recipe_items ri WHERE ri.recipe_id=v_recipe;
  -- receive finished good
  INSERT INTO erp.stock_ledger(tenant_id, product_id, location_id, txn_ts, type, qty_delta_base, unit_cost, ref_type, ref_id, created_by)
  SELECT v_tenant, v_fg, v_loc, now(), 'prod_in', v_qty,
         (SELECT COALESCE(SUM(CASE WHEN qty_delta_base<0 THEN -qty_delta_base*unit_cost ELSE 0 END),0)/NULLIF(v_qty,0) FROM erp.stock_ledger WHERE ref_type='PROD' AND ref_id=p_prod),
         'PROD', p_prod, p_user;
END; $$ LANGUAGE plpgsql;

-- 4) Post Transfer (out at source, in at dest)
CREATE OR REPLACE FUNCTION erp.post_transfer(p_xfer uuid, p_user uuid)
RETURNS void AS $$
BEGIN
  -- out (source)
  INSERT INTO erp.stock_ledger(tenant_id, product_id, location_id, lot_id, txn_ts, type, qty_delta_base, unit_cost, ref_type, ref_id, created_by)
  SELECT x.tenant_id, xi.product_id, x.from_location_id, xi.lot_id, COALESCE(x.sent_at, now()), 'xfer_out',
         -xi.quantity, COALESCE(erp.get_mavg_cost(x.tenant_id, xi.product_id, x.from_location_id),0),
         'XFER', x.id, p_user
  FROM erp.transfers x JOIN erp.transfer_items xi ON xi.transfer_id = x.id
  WHERE x.id = p_xfer;

  -- in (dest)
  INSERT INTO erp.stock_ledger(tenant_id, product_id, location_id, lot_id, txn_ts, type, qty_delta_base, unit_cost, ref_type, ref_id, created_by)
  SELECT x.tenant_id, xi.product_id, x.to_location_id, xi.lot_id, COALESCE(x.received_at, now()), 'xfer_in',
         COALESCE(xi.qty_received, xi.quantity),
         COALESCE(erp.get_mavg_cost(x.tenant_id, xi.product_id, x.from_location_id),0),
         'XFER', x.id, p_user
  FROM erp.transfers x JOIN erp.transfer_items xi ON xi.transfer_id = x.id
  WHERE x.id = p_xfer;
END; $$ LANGUAGE plpgsql;

-- 5) Post Stock Count variance
CREATE OR REPLACE FUNCTION erp.post_stock_count(p_count uuid, p_user uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO erp.stock_ledger(tenant_id, product_id, location_id, lot_id, txn_ts, type, qty_delta_base, unit_cost, ref_type, ref_id, created_by)
  SELECT sc.tenant_id, scl.product_id, sc.location_id, scl.lot_id, now(), 'adj',
         scl.variance_qty_base,
         COALESCE(erp.get_mavg_cost(sc.tenant_id, scl.product_id, sc.location_id),0),
         'COUNT', sc.id, p_user
  FROM erp.stock_counts sc
  JOIN erp.stock_count_lines scl ON scl.count_id = sc.id
  WHERE sc.id = p_count AND scl.variance_qty_base != 0;
END; $$ LANGUAGE plpgsql;`;

// ---------------------------------------------------------------------------
// RLS Template
// ---------------------------------------------------------------------------
export const rlsTemplate = sql`
ALTER TABLE erp.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_rw ON erp.products;
CREATE POLICY products_rw ON erp.products
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
`;