/**
 * Comprehensive RBAC (Role-Based Access Control) Types
 *
 * This file defines all types and interfaces for the enhanced RBAC system
 * that supports multiple roles per user, role hierarchy, and granular permissions.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  tenantId?: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  parentRoles?: string[];
  permissions?: Permission[];
  metadata?: Record<string, unknown> & {
    permissions?: Permission[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedBy?: string;
  assignedAt: string;
  context?: RoleContext;
  priority?: number;
  isActive: boolean;
}

export interface RoleContext {
  locationId?: string;
  departmentId?: string;
  projectId?: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  tenantId?: string;
  locationId?: string;
  roles?: Role[];
  permissions?: Permission[];
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedBy?: string;
  assignedAt: string;
  context?: RoleContext;
  priority?: number;
  isActive: boolean;
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

export interface PermissionCheck {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
  context?: RoleContext;
}

export interface PermissionResult {
  granted: boolean;
  permission?: Permission;
  source?: "direct" | "inherited" | "role";
  reason?: string;
  conditions?: Record<string, unknown>;
}

export interface EffectivePermissions {
  userId: string;
  permissions: Permission[];
  roles: Role[];
  inheritedPermissions: Permission[];
  context?: RoleContext;
  lastCalculated: string;
}

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

export interface RoleHierarchy {
  roleId: string;
  parentRoleIds: string[];
  childRoleIds: string[];
  depth: number;
  path: string[];
}

export interface RoleInheritanceMode {
  mode: "full" | "selective" | "custom" | "none";
  inheritedPermissions?: string[];
  excludedPermissions?: string[];
}

// ============================================================================
// ROLE TEMPLATES
// ============================================================================

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: string[];
  isSystemTemplate: boolean;
  variables?: TemplateVariable[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  options?: string[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface RoleTemplateInstance {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  variables: Record<string, unknown>;
  roleId?: string;
  createdAt: string;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: "user" | "role" | "permission" | "template";
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkOperation {
  id: string;
  type: "assign_roles" | "remove_roles" | "update_permissions" | "create_roles";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: BulkOperationError[];
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkOperationError {
  itemId: string;
  error: string;
  details?: unknown;
}

export interface BulkRoleAssignment {
  userIds: string[];
  roleIds: string[];
  context?: RoleContext;
  replaceExisting?: boolean;
}

export interface BulkPermissionUpdate {
  roleId: string;
  permissionIds: string[];
  mode: "replace" | "add" | "remove";
}

// ============================================================================
// MIGRATION
// ============================================================================

export interface MigrationConfig {
  sourceSystem: "current" | "legacy" | "import";
  targetSystem: "new_rbac";
  dryRun: boolean;
  batchSize: number;
  conflictResolution: "skip" | "overwrite" | "merge" | "prompt";
  preserveInactive: boolean;
  migrationDate: Date;
  rollbackEnabled: boolean;
  notifications: MigrationNotificationConfig;
}

export interface MigrationNotificationConfig {
  onStart: boolean;
  onProgress: boolean;
  onComplete: boolean;
  onError: boolean;
  recipients: string[];
  channels: ("email" | "in_app" | "webhook")[];
  customMessage?: string;
}

export interface MigrationResult {
  id: string;
  status: MigrationStatus;
  progress: MigrationProgress;
  summary: MigrationSummary;
  details: MigrationDetails;
  errors: Array<{
    id: string;
    type: string;
    message: string;
    details?: unknown;
    userId?: string;
    roleId?: string;
    permission?: string;
    timestamp: Date;
    retryable: boolean;
    resolved: boolean;
  }>;
  warnings: Array<{
    id: string;
    type: string;
    message: string;
    details?: unknown;
    affectedItems: string[];
    timestamp: Date;
    acknowledged: boolean;
  }>;
  rollbackAvailable: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface MigrationProgress {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  percentage: number;
  currentStep: string;
  estimatedTimeRemaining: number;
}

export interface MigrationSummary {
  totalUsers: number;
  migratedUsers: number;
  failedUsers: number;
  skippedUsers: number;
  totalRoles: number;
  migratedRoles: number;
  failedRoles: number;
  skippedRoles: number;
  duration: number;
  conflicts: number;
  resolutions: number;
}

export interface MigrationDetails {
  legacyRoleMappings: Array<{
    legacyRole: string;
    newRoles: string[];
    usersAffected: number;
  }>;
  permissionMappings: Array<{
    oldPermission: string;
    newPermissions: string[];
    usersAffected: number;
  }>;
  hierarchyChanges: Array<{
    userId: string;
    oldHierarchy: string[];
    newHierarchy: string[];
  }>;
}

export type MigrationStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolling_back"
  | "validation_failed";

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface RoleCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  parentRoles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string;
  parentRoles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UserRoleAssignment {
  userId: string;
  roleIds: string[];
  context?: RoleContext;
  replaceExisting?: boolean;
}

export interface PermissionCheckRequest {
  resource: string;
  action: string;
  context?: Record<string, unknown>;
}

export interface PermissionCheckResponse {
  granted: boolean;
  permissions: string[];
  roles: string[];
  source: string;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

export interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  resource?: string;
  action?: string;
  mode?: "hide" | "disable" | "readonly";
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  children: React.ReactNode;
  onAccessDenied?: () => void;
}

export interface RoleAssignmentProps {
  userId: string;
  availableRoles: Role[];
  assignedRoles: Role[];
  onAssignmentChange: (roleIds: string[]) => void;
  multiple?: boolean;
  showContext?: boolean;
  disabled?: boolean;
}

export interface PermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
  selectedPermissions: Record<string, string[]>;
  onPermissionChange: (roleId: string, permissionIds: string[]) => void;
  editable?: boolean;
  showInherited?: boolean;
}

export interface RoleHierarchyProps {
  roles: Role[];
  hierarchy: RoleHierarchy[];
  onHierarchyChange: (hierarchy: RoleHierarchy[]) => void;
  editable?: boolean;
  maxDepth?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const PERMISSION_RESOURCES = {
  TENANT: "tenant",
  USER: "user",
  ROLE: "role",
  PERMISSION: "permission",
  LOCATION: "location",
  PRODUCT: "product",
  SUPPLIER: "supplier",
  CUSTOMER: "customer",
  PURCHASE_ORDER: "purchase_order",
  GOODS_RECEIPT: "goods_receipt",
  TRANSFER: "transfer",
  REQUISITION: "requisition",
  INVENTORY: "inventory",
  PRODUCTION_ORDER: "production_order",
  RECIPE: "recipe",
  ORDER: "order",
  POS: "pos",
  REPORT: "report",
  AUDIT_LOG: "audit_log",
} as const;

export const PERMISSION_ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  MANAGE: "manage",
  VIEW: "view",
  APPROVE: "approve",
  REJECT: "reject",
  OPERATE: "operate",
  EXPORT: "export",
  IMPORT: "import",
  ASSIGN: "assign",
  REMOVE: "remove",
} as const;

export const ROLE_CATEGORIES = {
  SYSTEM: "system",
  ADMINISTRATION: "administration",
  OPERATIONS: "operations",
  SALES: "sales",
  WAREHOUSE: "warehouse",
  PRODUCTION: "production",
  MANAGEMENT: "management",
  CUSTOM: "custom",
} as const;

export const AUDIT_ACTIONS = {
  ROLE_CREATED: "role_created",
  ROLE_UPDATED: "role_updated",
  ROLE_DELETED: "role_deleted",
  ROLE_ASSIGNED: "role_assigned",
  ROLE_REMOVED: "role_removed",
  PERMISSION_GRANTED: "permission_granted",
  PERMISSION_REVOKED: "permission_revoked",
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DELETED: "user_deleted",
  LOGIN: "login",
  LOGOUT: "logout",
  PASSWORD_CHANGED: "password_changed",
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type PermissionString = `${string}:${string}`;
export type RoleSlug = string;
export type UserId = string;
export type RoleId = string;
export type PermissionId = string;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
