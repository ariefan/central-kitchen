import { db } from '../config/database.js';
import { users, accounts } from '../config/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Create or update super user account with proper password hashing
 */
async function createSuperUser() {
  const email = 'admin@personalapp.id';
  const password = 'admin123';
  const name = 'Super User';

  try {
    console.log('🔐 Creating super user account...');

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed');

    // Check if user exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUsers.length === 0) {
      console.log('❌ User not found. Run setup-super-user.sql first!');
      process.exit(1);
    }

    const user = existingUsers[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Update account password
    const updated = await db
      .update(accounts)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(accounts.userId, user.id))
      .returning();

    if (updated.length === 0) {
      console.log('❌ Account not found. Run setup-super-user.sql first!');
      process.exit(1);
    }

    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('===========================================');
    console.log('Super User Account Ready!');
    console.log('===========================================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Name: ${name}`);
    console.log('===========================================');
    console.log('');
    console.log('✅ You can now log in with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super user:', error);
    process.exit(1);
  }
}

createSuperUser();
