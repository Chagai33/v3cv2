/**
 * Script to seed emulator with test data
 * Run: node scripts/seed-emulator.js
 */

import admin from 'firebase-admin';

// Initialize with emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({ projectId: 'hebbirthday2026' });

const db = admin.firestore();
const auth = admin.auth();

async function seedEmulator() {
  console.log('🌱 Starting emulator seeding...\n');

  try {
    // 1. Create test user
    console.log('👤 Creating test user...');
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: 'test@test.com',
        password: '123456',
        displayName: 'Test User',
        emailVerified: true
      });
      console.log('✅ User created:', userRecord.email);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('ℹ️  User already exists, fetching...');
        userRecord = await auth.getUserByEmail('test@test.com');
      } else {
        throw error;
      }
    }

    // 2. Create tenant
    console.log('\n🏢 Creating tenant...');
    const tenantRef = db.collection('tenants').doc('test-tenant-001');
    await tenantRef.set({
      name: 'Test Organization',
      owner_id: userRecord.uid,
      default_language: 'he',
      default_calendar_preference: 'both',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Tenant created: test-tenant-001');

    // 3. Create tenant member
    console.log('\n👥 Creating tenant member...');
    await db.collection('tenant_members').doc('test-member-001').set({
      tenant_id: 'test-tenant-001',
      user_id: userRecord.uid,
      role: 'owner'
    });
    console.log('✅ Tenant member created');

    // 4. Set custom claims
    console.log('\n🔑 Setting custom claims...');
    await auth.setCustomUserClaims(userRecord.uid, {
      tenantId: 'test-tenant-001',
      role: 'owner'
    });
    console.log('✅ Custom claims set');

    // 5. Create sample birthday
    console.log('\n🎂 Creating sample birthday...');
    await db.collection('birthdays').doc('test-birthday-001').set({
      tenant_id: 'test-tenant-001',
      first_name: 'משה',
      last_name: 'כהן',
      birth_date_gregorian: '1990-05-15',
      after_sunset: false,
      archived: false,
      isSynced: false,
      group_ids: [],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Sample birthday created');

    // 6. Create a group
    console.log('\n📁 Creating sample group...');
    await db.collection('groups').doc('test-group-001').set({
      tenant_id: 'test-tenant-001',
      name: 'משפחה',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Sample group created');

    console.log('\n✨ Emulator seeding completed!\n');
    console.log('📧 Login credentials:');
    console.log('   Email: test@test.com');
    console.log('   Password: 123456\n');

  } catch (error) {
    console.error('❌ Error seeding emulator:', error);
  }

  process.exit(0);
}

seedEmulator();

