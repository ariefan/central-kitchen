/**
 * RBAC Seeder
 *
 * Seeds the database with:
 * - All available permissions
 * - Default system and tenant roles
 * - Super user role for app owner
 */

import { db } from '../config/database.js';
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  users,
} from '../config/schema.js';
import {
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
} from '../config/schema-rbac.js';
import { eq, and } from 'drizzle-orm';

/**
 * Seed all permissions
 */
async function seedPermissions() {
  console.log('🔐 Seeding permissions...');

  const permissionRecords = [];

  for (const [resource, action, description] of DEFAULT_PERMISSIONS) {
    permissionRecords.push({
      resource,
      action,
      description,
    });
  }

  // Insert permissions (skip duplicates)
  await db
    .insert(permissions)
    .values(permissionRecords)
    .onConflictDoNothing();

  console.log(`   ✓ Seeded ${permissionRecords.length} permissions`);
}

/**
 * Seed super_user role (system-level, no tenant)
 */
async function seedSuperUserRole() {
  console.log('👑 Seeding super_user role...');

  const roleConfig = DEFAULT_ROLES.SUPER_USER;

  // Create super_user role
  const [superUserRole] = await db
    .insert(roles)
    .values({
      tenantId: null, // System role, no tenant
      name: roleConfig.name,
      slug: roleConfig.slug,
      description: roleConfig.description,
      isSystemRole: true,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!superUserRole) {
    console.log('   ⚠ Super user role already exists');
    return;
  }

  // Get permission IDs for super user
  const permissionRecords = await db
    .select()
    .from(permissions)
    .where(eq(permissions.resource, 'tenant'));

  // Assign tenant management permissions to super_user role
  const rolePermissionValues = permissionRecords.map(perm => ({
    roleId: superUserRole.id,
    permissionId: perm.id,
    grantedBy: null, // System-seeded
  }));

  await db
    .insert(rolePermissions)
    .values(rolePermissionValues)
    .onConflictDoNothing();

  console.log(`   ✓ Created super_user role with ${rolePermissionValues.length} permissions`);
}

/**
 * Seed default tenant roles
 */
async function seedTenantRoles(tenantId: string) {
  console.log(`📋 Seeding tenant roles for tenant ${tenantId}...`);

  const tenantRoleConfigs = [
    DEFAULT_ROLES.ADMIN,
    DEFAULT_ROLES.MANAGER,
    DEFAULT_ROLES.WAREHOUSE_STAFF,
    DEFAULT_ROLES.KITCHEN_STAFF,
    DEFAULT_ROLES.CASHIER,
    DEFAULT_ROLES.STAFF,
  ];

  for (const roleConfig of tenantRoleConfigs) {
    // Create role
    const [role] = await db
      .insert(roles)
      .values({
        tenantId,
        name: roleConfig.name,
        slug: roleConfig.slug,
        description: roleConfig.description,
        isSystemRole: false,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    if (!role) {
      console.log(`   ⚠ Role ${roleConfig.slug} already exists`);
      continue;
    }

    // Parse permissions from "resource:action" format
    const permissionChecks: Array<[string, string]> = roleConfig.permissions.map(p => {
      const [resource, action] = p.split(':');
      return [resource!, action!];
    });

    // Get permission IDs
    const permissionRecords = [];
    for (const [resource, action] of permissionChecks) {
      const [perm] = await db
        .select()
        .from(permissions)
        .where(
          and(
            eq(permissions.resource, resource),
            eq(permissions.action, action)
          )
        )
        .limit(1);

      if (perm) {
        permissionRecords.push(perm);
      }
    }

    // Assign permissions to role
    if (permissionRecords.length > 0) {
      const rolePermissionValues = permissionRecords.map(perm => ({
        roleId: role.id,
        permissionId: perm.id,
        grantedBy: null, // System-seeded
      }));

      await db
        .insert(rolePermissions)
        .values(rolePermissionValues)
        .onConflictDoNothing();

      console.log(`   ✓ Created ${roleConfig.slug} role with ${permissionRecords.length} permissions`);
    } else {
      console.log(`   ⚠ No permissions found for ${roleConfig.slug}`);
    }
  }
}

/**
 * Assign super_user role to a specific user
 */
export async function assignSuperUserRole(userEmail: string) {
  console.log(`👤 Assigning super_user role to ${userEmail}...`);

  // Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, userEmail))
    .limit(1);

  if (!user) {
    console.log(`   ⚠ User ${userEmail} not found`);
    return;
  }

  // Find super_user role
  const [superUserRole] = await db
    .select()
    .from(roles)
    .where(
      and(
        eq(roles.slug, 'super_user'),
        eq(roles.isSystemRole, true)
      )
    )
    .limit(1);

  if (!superUserRole) {
    console.log('   ⚠ Super user role not found');
    return;
  }

  // Assign role to user
  await db
    .insert(userRoles)
    .values({
      userId: user.id,
      roleId: superUserRole.id,
      assignedBy: null, // System-assigned
    })
    .onConflictDoNothing();

  console.log(`   ✓ Assigned super_user role to ${userEmail}`);
}

/**
 * Assign admin role to a specific user
 */
export async function assignAdminRole(userEmail: string, tenantId: string) {
  console.log(`👤 Assigning admin role to ${userEmail}...`);

  // Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, userEmail),
        eq(users.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!user) {
    console.log(`   ⚠ User ${userEmail} not found in tenant ${tenantId}`);
    return;
  }

  // Find admin role for tenant
  const [adminRole] = await db
    .select()
    .from(roles)
    .where(
      and(
        eq(roles.slug, 'admin'),
        eq(roles.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!adminRole) {
    console.log('   ⚠ Admin role not found');
    return;
  }

  // Assign role to user
  await db
    .insert(userRoles)
    .values({
      userId: user.id,
      roleId: adminRole.id,
      assignedBy: null, // System-assigned
    })
    .onConflictDoNothing();

  console.log(`   ✓ Assigned admin role to ${userEmail}`);
}

/**
 * Main seed function for RBAC
 */
export async function seedRBAC(tenantId?: string) {
  console.log('\n🔐 Seeding RBAC data...\n');

  try {
    // 1. Seed all permissions
    await seedPermissions();

    // 2. Seed super_user role
    await seedSuperUserRole();

    // 3. Seed tenant roles if tenant ID provided
    if (tenantId) {
      await seedTenantRoles(tenantId);
    }

    console.log('\n✅ RBAC seeding completed successfully!\n');
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    throw error;
  }
}

// Run standalone if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRBAC()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
