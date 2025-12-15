// User Triggers - Firebase Auth Triggers

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onUserCreateFn = functions.auth.user().onCreate(async (user) => {
  try {
    const db = admin.firestore();
    const batch = db.batch();
    const tenantRef = db.collection('tenants').doc();
    
    batch.set(tenantRef, {
      name: `${user.displayName || 'User'}'s Organization`,
      owner_id: user.uid,
      default_language: 'he',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    batch.set(db.collection('tenant_members').doc(), {
      tenant_id: tenantRef.id,
      user_id: user.uid,
      role: 'owner'
    });
    
    await batch.commit();
    
    // Set custom claims AFTER batch commit
    await admin.auth().setCustomUserClaims(user.uid, {
      tenantId: tenantRef.id,
      role: 'owner'
    });
    
    functions.logger.log(`✅ User ${user.uid} created with tenant ${tenantRef.id}`);
  } catch (error) {
    functions.logger.error('Error in onUserCreate:', error);
    throw error;
  }
});


