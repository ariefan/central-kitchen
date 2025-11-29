# Comprehensive RBAC System Implementation Guide

## Overview

This document provides a comprehensive guide to the Role-Based Access Control (RBAC) system implemented in the ERP application. The system supports multiple roles per user, role hierarchy, granular permissions, and advanced management features.

## Architecture

### Core Components

#### 1. RBAC Types (`apps/erp/types/rbac.ts`)

- **Role**: Defines user roles with permissions and hierarchy
- **Permission**: Granular resource-action permissions
- **User**: User profile with assigned roles and effective permissions
- **RoleTemplate**: Reusable role configurations
- **AuditLog**: Comprehensive audit trail for all RBAC operations
- **BulkOperation**: Mass operations for roles and permissions

#### 2. Permission System

- **Resource-Action Pattern**: Permissions follow `resource:action` format
- **Permission Resources**: Users, Roles, Permissions, Locations, Products, etc.
- **Permission Actions**: Create, Read, Update, Delete, Manage, etc.

#### 3. Role Hierarchy

- **Parent-Child Relationships**: Roles can inherit permissions from parent roles
- **Priority System**: Higher priority roles override lower priority conflicts
- **Context-Based**: Roles can be scoped to specific contexts (location, department, etc.)

### Key Features

#### 1. Multi-Role Assignment

- Users can have multiple roles simultaneously
- Role assignments can be context-specific
- Priority-based conflict resolution
- Active/inactive role management

#### 2. Permission Management

- Granular resource-action permissions
- Permission categories for better organization
- Bulk permission operations
- Permission inheritance through role hierarchy

#### 3. Role Templates

- Predefined role configurations
- Template variables for customization
- Template instantiation with overrides
- System and custom templates

#### 4. Audit Logging

- Complete audit trail for all RBAC operations
- Filterable and searchable logs
- Export capabilities
- Change tracking with old/new values

#### 5. Advanced Features

- Bulk operations for mass changes
- Migration utilities for system upgrades
- Permission guards for UI components
- Real-time permission checking

## Components

### 1. RBAC Dashboard (`apps/erp/components/rbac/rbac-dashboard.tsx`)

**Purpose**: Central hub for all RBAC management activities

**Features**:

- Overview with statistics and health metrics
- Role management interface
- User assignment management
- Audit log viewer
- Quick actions and system health

**Usage**:

```tsx
import { RbacDashboard } from "@/components/rbac/rbac-dashboard";

<RbacDashboard
  roles={roles}
  templates={templates}
  permissions={permissions}
  users={users}
  auditLogs={auditLogs}
  onRoleCreate={handleRoleCreate}
  onRoleUpdate={handleRoleUpdate}
  onRoleDelete={handleRoleDelete}
  onUserAssignRoles={handleUserAssignment}
  isLoading={isLoading}
/>;
```

### 2. Role Management (`apps/erp/components/rbac/role-management.tsx`)

**Purpose**: Comprehensive role CRUD operations

**Features**:

- Role listing with filtering and search
- Role creation, editing, and deletion
- Permission matrix visualization
- Role hierarchy management
- Template-based role creation

**Usage**:

```tsx
import { RoleManagement } from "@/components/rbac/role-management";

<RoleManagement
  tenantId={tenantId}
  onRoleSelect={handleRoleSelect}
  className="custom-class"
/>;
```

### 3. Role Form (`apps/erp/components/rbac/role-form-simple.tsx`)

**Purpose**: Role creation and editing interface

**Features**:

- Template-based role creation
- Permission selection by categories
- Role hierarchy configuration
- Context-based role assignment
- Validation and error handling

**Usage**:

```tsx
import { RoleFormSimple } from "@/components/rbac/role-form-simple";

<RoleFormSimple
  role={selectedRole}
  templates={templates}
  parentRoles={availableParents}
  mode="create" // or "edit"
  onSubmit={handleRoleSubmit}
  onCancel={handleCancel}
  isLoading={isSaving}
/>;
```

### 4. Multi-Role Assignment (`apps/erp/components/rbac/multi-role-assignment.tsx`)

**Purpose**: User role assignment management

**Features**:

- Multiple role selection for users
- Context-specific assignments
- Bulk assignment capabilities
- Assignment history tracking
- Permission preview

**Usage**:

```tsx
import { MultiRoleAssignment } from "@/components/rbac/multi-role-assignment";

<MultiRoleAssignment
  userId={selectedUser.id}
  onRoleAssignmentChange={handleAssignmentChange}
  className="custom-class"
/>;
```

### 5. Permission Guard (`apps/erp/components/rbac/permission-guard.tsx`)

**Purpose**: UI component protection based on permissions

**Features**:

- Multiple rendering modes (hide, disable, readonly)
- Permission and role checking
- Fallback components
- Loading states

**Usage**:

```tsx
import { PermissionGuard } from "@/components/rbac/permission-guard";

<PermissionGuard
  resource="users"
  action="delete"
  mode="disable"
  fallback={<div>Access Denied</div>}
>
  <Button>Delete User</Button>
</PermissionGuard>;
```

### 6. Audit Log (`apps/erp/components/rbac/audit-log.tsx`)

**Purpose**: Comprehensive audit trail viewing

**Features**:

- Filterable and searchable logs
- Detailed change tracking
- Export capabilities
- Real-time updates
- Summary statistics

**Usage**:

```tsx
import { AuditLogViewer } from "@/components/rbac/audit-log";

<AuditLogViewer className="custom-class" autoRefresh={true} />;
```

### 7. Enhanced Permissions Hook (`apps/erp/hooks/use-enhanced-permissions.ts`)

**Purpose**: Client-side permission checking and caching

**Features**:

- Real-time permission evaluation
- Permission caching for performance
- Context-aware permission checking
- Multiple role support
- Permission inheritance

**Usage**:

```tsx
import { useEnhancedPermissions } from "@/hooks/use-enhanced-permissions";

function MyComponent() {
  const { hasPermission, canAccess, effectivePermissions } =
    useEnhancedPermissions();

  const canDeleteUsers = hasPermission("users", "delete");
  const canAccessInventory = canAccess("inventory", ["read", "update"]);

  return (
    <div>
      {canDeleteUsers && <Button>Delete User</Button>}
      {canAccessInventory && <Button>Manage Inventory</Button>}
    </div>
  );
}
```

## Permission System

### Resource-Action Pattern

Permissions follow a consistent `resource:action` pattern:

```typescript
// Examples
"users:create"; // Create users
"users:read"; // Read users
"users:update"; // Update users
"users:delete"; // Delete users
"roles:manage"; // Manage roles
"inventory:read"; // Read inventory
"reports:export"; // Export reports
```

### Available Resources

```typescript
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
```

### Available Actions

```typescript
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
```

## Role Hierarchy

### Parent-Child Relationships

Roles can be organized in a hierarchy where child roles inherit permissions from parent roles:

```typescript
// Example hierarchy
Super Admin (Level 100)
├── Warehouse Manager (Level 80)
│   ├── Inventory Clerk (Level 60)
│   └── Shipping Clerk (Level 60)
├── Sales Manager (Level 80)
│   ├── Sales Representative (Level 50)
│   └── Cashier (Level 40)
└── HR Manager (Level 80)
    ├── HR Specialist (Level 60)
    └── Recruiter (Level 50)
```

### Priority System

- **Higher numbers = higher priority**
- **Range**: 1-100
- **Conflict Resolution**: Higher priority roles override lower priority
- **Inheritance**: Child roles inherit parent permissions

### Context-Based Roles

Roles can be scoped to specific contexts:

```typescript
interface RoleContext {
  locationId?: string; // Specific location
  departmentId?: string; // Specific department
  projectId?: string; // Specific project
  [key: string]: unknown; // Custom context
}
```

## Role Templates

### Template Structure

```typescript
interface RoleTemplate {
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
```

### Template Variables

Templates can include variables for customization:

```typescript
interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}
```

### Example Templates

```typescript
// Warehouse Manager Template
const warehouseManagerTemplate = {
  id: "warehouse-manager",
  name: "Warehouse Manager Template",
  description: "Full warehouse management permissions",
  category: "operations",
  permissions: [
    "inventory:read",
    "inventory:update",
    "inventory:manage",
    "goods_receipt:create",
    "goods_receipt:read",
    "goods_receipt:update",
    "transfer:create",
    "transfer:read",
    "transfer:update",
  ],
  variables: [
    {
      name: "priority",
      type: "number",
      label: "Role Priority",
      description: "Priority level for conflict resolution",
      required: false,
      defaultValue: 75,
      validation: { min: 1, max: 100 },
    },
  ],
};
```

## Audit Logging

### Log Structure

```typescript
interface AuditLog {
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
```

### Audit Actions

```typescript
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
```

## Bulk Operations

### Bulk Role Assignment

```typescript
interface BulkRoleAssignment {
  userIds: string[];
  roleIds: string[];
  context?: RoleContext;
  replaceExisting?: boolean;
}
```

### Bulk Permission Update

```typescript
interface BulkPermissionUpdate {
  roleId: string;
  permissionIds: string[];
  mode: "replace" | "add" | "remove";
}
```

### Operation Tracking

```typescript
interface BulkOperation {
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
```

## Migration System

### Migration Configuration

```typescript
interface MigrationConfig {
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
```

### Migration Process

1. **Analysis Phase**: Analyze existing roles and permissions
2. **Planning Phase**: Create migration plan and conflict resolution
3. **Execution Phase**: Perform migration in batches
4. **Validation Phase**: Verify migration results
5. **Rollback Phase**: Rollback if critical issues detected

## Best Practices

### 1. Permission Design

- **Principle of Least Privilege**: Grant only necessary permissions
- **Resource-Based**: Organize permissions by resource
- **Action-Specific**: Use specific actions rather than generic "manage"
- **Consistent Naming**: Follow `resource:action` pattern

### 2. Role Design

- **Single Responsibility**: Each role should have clear purpose
- **Logical Grouping**: Group related permissions
- **Hierarchical**: Use hierarchy for inheritance
- **Descriptive Names**: Clear, understandable role names

### 3. Implementation Guidelines

- **Permission Guards**: Always protect UI components with permission checks
- **Server Validation**: Never trust client-side permission checks
- **Audit Everything**: Log all permission-related changes
- **Error Handling**: Provide clear feedback for permission denials

### 4. Performance Considerations

- **Permission Caching**: Cache permission calculations
- **Lazy Loading**: Load permission data as needed
- **Batch Operations**: Use bulk operations for multiple changes
- **Optimized Queries**: Efficient database queries for permission checks

## Security Considerations

### 1. Permission Validation

- **Server-Side Authorization**: Always validate permissions on server
- **Context Validation**: Verify role context is valid for user
- **Session Validation**: Validate user session and role assignments
- **Permission Escalation**: Prevent privilege escalation attacks

### 2. Audit Security

- **Immutable Logs**: Prevent modification of audit logs
- **Complete Logging**: Log all permission checks and changes
- **Log Protection**: Secure audit logs from unauthorized access
- **Regular Review**: Regular audit log review and analysis

### 3. Data Protection

- **Encryption**: Encrypt sensitive permission data
- **Access Control**: Restrict access to permission data
- **Backup**: Regular backups of role and permission data
- **Retention**: Appropriate data retention policies

## Testing Strategy

### 1. Unit Testing

- **Permission Logic**: Test permission calculation logic
- **Role Hierarchy**: Test inheritance and priority
- **Component Testing**: Test all RBAC components
- **Mock Data**: Use consistent mock data for tests

### 2. Integration Testing

- **API Integration**: Test RBAC API endpoints
- **Permission Guards**: Test permission guard functionality
- **Role Assignment**: Test role assignment workflows
- **Audit Logging**: Test audit log creation and retrieval

### 3. End-to-End Testing

- **User Workflows**: Test complete user workflows
- **Permission Scenarios**: Test various permission combinations
- **Edge Cases**: Test unusual permission scenarios
- **Performance Testing**: Test with large datasets

## Troubleshooting

### Common Issues

1. **Permission Not Working**

   - Check permission string format
   - Verify role assignments
   - Check role hierarchy
   - Validate context

2. **Performance Issues**

   - Check permission caching
   - Optimize database queries
   - Reduce permission calculations
   - Use batch operations

3. **Audit Log Issues**
   - Check log configuration
   - Verify audit permissions
   - Check log storage
   - Validate log format

### Debug Tools

1. **Permission Debugger**: Component to debug permission calculations
2. **Role Visualizer**: Tool to visualize role hierarchy
3. **Audit Inspector**: Tool to inspect audit logs
4. **Performance Monitor**: Track permission check performance

## Future Enhancements

### Planned Features

1. **Dynamic Permissions**: Context-aware dynamic permissions
2. **Time-Based Roles**: Roles with time-based restrictions
3. **Conditional Permissions**: Permissions based on conditions
4. **Advanced Analytics**: Permission usage analytics
5. **Machine Learning**: Automated permission recommendations

### Scalability Considerations

1. **Database Optimization**: Optimized queries and indexes
2. **Caching Strategy**: Multi-level caching system
3. **Microservices**: Distributed permission service
4. **Event Streaming**: Real-time permission updates

## Conclusion

This comprehensive RBAC system provides:

- **Granular Control**: Fine-grained permission management
- **Scalability**: Handles large numbers of users and roles
- **Flexibility**: Supports complex permission scenarios
- **Security**: Comprehensive audit and validation
- **Usability**: Intuitive management interfaces

The system is designed to meet enterprise requirements while maintaining security and performance standards. Regular updates and improvements should be based on user feedback, security requirements, and technological advancements.
