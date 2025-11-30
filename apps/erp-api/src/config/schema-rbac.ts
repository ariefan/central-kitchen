/**
 * Role-Based Access Control (RBAC) Schema
 *
 * Provides comprehensive permission management with:
 * - Multiple roles per user
 * - Dynamic permissions per role
 * - Tenant-scoped roles
 * - Fine-grained access control
 *
 * @module schema-rbac
 */

import {
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { erp } from "./schema.js";
import { tenants, users } from "./schema.js";

// ===========================================================================
// RBAC TABLES
// ===========================================================================

/**
 * Roles table
 *
 * Stores role definitions for tenant-scoped roles
 */
export const roles = erp.table(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    // Unique slug per tenant
    uqTenantSlug: unique("uq_role_tenant_slug").on(t.tenantId, t.slug),
    idxTenant: index("idx_role_tenant").on(t.tenantId),
  })
);

/**
 * Permissions table
 *
 * Stores permission definitions using resource:action pattern.
 * Examples:
 * - tenant:manage, tenant:view
 * - location:create, location:read, location:update, location:delete
 * - product:manage_prices
 * - purchase_order:approve
 * - pos:operate
 */
export const permissions = erp.table(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resource: varchar("resource", { length: 100 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uqResourceAction: unique("uq_permission_resource_action").on(
      t.resource,
      t.action
    ),
    idxResource: index("idx_permission_resource").on(t.resource),
  })
);

/**
 * User Roles junction table
 *
 * Many-to-many relationship between users and roles.
 * Users can have multiple roles.
 */
export const userRoles = erp.table(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  },
  (t) => ({
    uqUserRole: unique("uq_user_role").on(t.userId, t.roleId),
    idxUser: index("idx_user_roles_user").on(t.userId),
    idxRole: index("idx_user_roles_role").on(t.roleId),
  })
);

/**
 * Role Permissions junction table
 *
 * Many-to-many relationship between roles and permissions.
 * Roles can have multiple permissions.
 */
export const rolePermissions = erp.table(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
  },
  (t) => ({
    uqRolePermission: unique("uq_role_permission").on(t.roleId, t.permissionId),
    idxRole: index("idx_role_permissions_role").on(t.roleId),
    idxPermission: index("idx_role_permissions_permission").on(t.permissionId),
  })
);

// ===========================================================================
// PERMISSION CONSTANTS
// ===========================================================================

/**
 * Resource types for permissions
 */
export const RESOURCES = {
  // System-level
  TENANT: "tenant",

  // Admin
  LOCATION: "location",
  USER: "user",
  ROLE: "role",
  SUPPLIER: "supplier",
  PRODUCT: "product",
  UOM: "uom",
  MENU: "menu",
  PRICEBOOK: "pricebook",
  CATEGORY: "category",

  // Procurement
  PURCHASE_ORDER: "purchase_order",
  GOODS_RECEIPT: "goods_receipt",

  // Inventory
  INVENTORY: "inventory",
  TRANSFER: "transfer",
  REQUISITION: "requisition",
  ADJUSTMENT: "adjustment",
  STOCK_COUNT: "stock_count",

  // Production
  RECIPE: "recipe",
  PRODUCTION_ORDER: "production_order",
  WASTE: "waste",

  // Sales
  ORDER: "order",
  POS: "pos",
  DELIVERY: "delivery",
  RETURN: "return",

  // Quality
  TEMPERATURE: "temperature",
  ALERT: "alert",

  // Customer
  CUSTOMER: "customer",
  LOYALTY: "loyalty",
  VOUCHER: "voucher",

  // Reports
  REPORT: "report",
} as const;

/**
 * Action types for permissions
 */
export const ACTIONS = {
  // Standard CRUD
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",

  // Special actions
  MANAGE: "manage", // Full control
  VIEW: "view", // Read-only
  APPROVE: "approve",
  REJECT: "reject",
  OPERATE: "operate",
  EXPORT: "export",
  IMPORT: "import",

  // Specific actions
  MANAGE_PRICES: "manage_prices",
  MANAGE_STOCK: "manage_stock",
  VIEW_REPORTS: "view_reports",
  MANAGE_ROLES: "manage_roles",
  MANAGE_PERMISSIONS: "manage_permissions",
} as const;

/**
 * Default permission definitions
 *
 * Format: [resource, action, description]
 */
export const DEFAULT_PERMISSIONS = [
  // System-level permissions
  [
    "tenant",
    "manage",
    "Full tenant management (create, update, delete tenants)",
  ],
  ["tenant", "view", "View tenant information"],

  // Location permissions
  ["location", "create", "Create new locations"],
  ["location", "read", "View location details"],
  ["location", "update", "Update location information"],
  ["location", "delete", "Delete locations"],
  ["location", "manage", "Full location management"],

  // User permissions
  ["user", "create", "Create new users"],
  ["user", "read", "View user details"],
  ["user", "update", "Update user information"],
  ["user", "delete", "Delete users"],
  ["user", "manage", "Full user management"],

  // Role permissions
  ["role", "create", "Create new roles"],
  ["role", "read", "View role details"],
  ["role", "update", "Update role information"],
  ["role", "delete", "Delete roles"],
  ["role", "manage_permissions", "Assign permissions to roles"],
  ["role", "manage", "Full role management"],

  // Product permissions
  ["product", "create", "Create new products"],
  ["product", "read", "View product details"],
  ["product", "update", "Update product information"],
  ["product", "delete", "Delete products"],
  ["product", "manage_prices", "Manage product pricing"],
  ["product", "manage", "Full product management"],

  // Purchase Order permissions
  ["purchase_order", "create", "Create purchase orders"],
  ["purchase_order", "read", "View purchase orders"],
  ["purchase_order", "update", "Update purchase orders"],
  ["purchase_order", "delete", "Delete purchase orders"],
  ["purchase_order", "approve", "Approve purchase orders"],
  ["purchase_order", "reject", "Reject purchase orders"],

  // Goods Receipt permissions
  ["goods_receipt", "create", "Create goods receipts"],
  ["goods_receipt", "read", "View goods receipts"],
  ["goods_receipt", "update", "Update goods receipts"],
  ["goods_receipt", "delete", "Delete goods receipts"],

  // Inventory permissions
  ["inventory", "view", "View inventory levels"],
  ["inventory", "manage_stock", "Manage stock levels"],
  ["inventory", "adjust", "Create stock adjustments"],
  ["inventory", "count", "Perform stock counts"],

  // Transfer permissions
  ["transfer", "create", "Create stock transfers"],
  ["transfer", "read", "View stock transfers"],
  ["transfer", "update", "Update stock transfers"],
  ["transfer", "approve", "Approve stock transfers"],
  ["transfer", "reject", "Reject stock transfers"],

  // Requisition permissions
  ["requisition", "create", "Create requisitions"],
  ["requisition", "read", "View requisitions"],
  ["requisition", "update", "Update requisitions"],
  ["requisition", "approve", "Approve requisitions"],
  ["requisition", "reject", "Reject requisitions"],

  // Production permissions
  ["recipe", "create", "Create recipes"],
  ["recipe", "read", "View recipes"],
  ["recipe", "update", "Update recipes"],
  ["recipe", "delete", "Delete recipes"],

  ["production_order", "create", "Create production orders"],
  ["production_order", "read", "View production orders"],
  ["production_order", "update", "Update production orders"],
  ["production_order", "delete", "Delete production orders"],

  // POS permissions
  ["pos", "operate", "Operate POS terminal"],
  ["pos", "view_reports", "View POS reports"],
  ["pos", "manage", "Full POS management including shift operations"],

  // Order permissions
  ["order", "create", "Create orders"],
  ["order", "read", "View orders"],
  ["order", "update", "Update orders"],
  ["order", "void", "Void orders"],
  ["order", "refund", "Process refunds"],

  // Customer permissions
  ["customer", "create", "Create customers"],
  ["customer", "read", "View customer details"],
  ["customer", "update", "Update customer information"],
  ["customer", "delete", "Delete customers"],

  // Report permissions
  ["report", "view_reports", "View all reports"],
  ["report", "export", "Export reports"],

  // Temperature & Quality permissions
  ["temperature", "create", "Record temperature logs"],
  ["temperature", "read", "View temperature logs"],

  ["alert", "read", "View quality alerts"],
  ["alert", "manage", "Manage and resolve quality alerts"],

  // Supplier permissions
  ["supplier", "create", "Create suppliers"],
  ["supplier", "read", "View supplier details"],
  ["supplier", "update", "Update supplier information"],
  ["supplier", "delete", "Delete suppliers"],

  // UOM permissions
  ["uom", "create", "Create units of measure"],
  ["uom", "read", "View units of measure"],
  ["uom", "update", "Update units of measure"],
  ["uom", "delete", "Delete units of measure"],
] as const;

/**
 * Default role configurations
 *
 * Format: [slug, name, description, permissions[]]
 */
export const DEFAULT_ROLES = {
  ADMIN: {
    slug: "admin",
    name: "Administrator",
    description: "Full access to all tenant features",
    permissions: [
      // All permissions except tenant management
      "location:manage",
      "user:manage",
      "role:manage",
      "role:manage_permissions",
      "product:manage",
      "product:manage_prices",
      "purchase_order:approve",
      "transfer:approve",
      "requisition:approve",
      "pos:manage",
      "report:view_reports",
      "report:export",
    ],
  },
  MANAGER: {
    slug: "manager",
    name: "Manager",
    description: "Manage operations and approve transactions",
    permissions: [
      "location:read",
      "user:read",
      "product:read",
      "product:update",
      "purchase_order:create",
      "purchase_order:read",
      "purchase_order:update",
      "purchase_order:approve",
      "transfer:approve",
      "requisition:approve",
      "inventory:view",
      "inventory:manage_stock",
      "pos:manage",
      "report:view_reports",
    ],
  },
  WAREHOUSE_STAFF: {
    slug: "warehouse_staff",
    name: "Warehouse Staff",
    description: "Manage warehouse operations and inventory",
    permissions: [
      "product:read",
      "goods_receipt:create",
      "goods_receipt:read",
      "goods_receipt:update",
      "transfer:create",
      "transfer:read",
      "transfer:update",
      "requisition:create",
      "requisition:read",
      "inventory:view",
      "inventory:adjust",
      "inventory:count",
    ],
  },
  KITCHEN_STAFF: {
    slug: "kitchen_staff",
    name: "Kitchen Staff",
    description: "Manage production and recipes",
    permissions: [
      "recipe:read",
      "production_order:create",
      "production_order:read",
      "production_order:update",
      "inventory:view",
      "temperature:create",
      "temperature:read",
    ],
  },
  CASHIER: {
    slug: "cashier",
    name: "Cashier",
    description: "Operate POS and process sales",
    permissions: [
      "pos:operate",
      "order:create",
      "order:read",
      "customer:read",
      "customer:create",
    ],
  },
  STAFF: {
    slug: "staff",
    name: "Staff",
    description: "General staff with basic access",
    permissions: ["product:read", "inventory:view", "order:read"],
  },
} as const;
