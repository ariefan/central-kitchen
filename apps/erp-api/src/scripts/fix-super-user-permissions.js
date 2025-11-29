/**
 * Fix Super User Permissions
 * 
 * This script assigns ALL permissions to the Super User role
 * to ensure admin user can access all endpoints including tenants
 */

import { db } from '../config/database.js';
import { roles, permissions, rolePermissions } from '../config/schema.js';
import { eq } from 'drizzle-orm';

async function fixSuperUserPermissions() {
  console.log('🔧 Fixing Super User permissions...');
  
  try {
    // Find super_user role
    const [superUserRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.slug, 'super_user'))
      .limit(1);

    if (!superUserRole) {
      console.log('❌ Super User role not found');
      return;
    }

    console.log(`✓ Found Super User role: ${superUserRole.name}`);

    // Get all permissions
    const allPermissions = await db
      .select()
      .from(permissions);

    console.log(`✓ Found ${allPermissions.length} permissions`);

    // Remove existing permissions for super_user role
    await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, superUserRole.id));

    console.log('✓ Cleared existing Super User permissions');

    // Assign ALL permissions to super_user role
    const rolePermissionValues = allPermissions.map(perm => ({
      roleId: superUserRole.id,
      permissionId: perm.id,
      grantedBy: null, // System-assigned
    }));

    await db
      .insert(rolePermissions)
      .values(rolePermissionValues);

    console.log(`✓ Assigned ${rolePermissionValues.length} permissions to Super User role`);
    console.log('✅ Super User permissions fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing Super User permissions:', error);
    throw error;
  }
}

// Run the fix
fixSuperUserPermissions()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });