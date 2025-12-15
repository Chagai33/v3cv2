// Management Functions - Account & System Management

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createDependencies } from '../dependencies';

const deps = createDependencies();

// Get account deletion summary
export const getAccountDeletionSummaryFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const bCount = await deps.db
    .collection('birthdays')
    .where('tenant_id', '==', data.tenantId)
    .count()
    .get();
  const gCount = await deps.db
    .collection('groups')
    .where('tenant_id', '==', data.tenantId)
    .count()
    .get();

  return { birthdaysCount: bCount.data().count, groupsCount: gCount.data().count };
});

// Delete account
export const deleteAccountFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { tenantId } = data;
  const userId = context.auth.uid;
  const tDoc = await deps.db.collection('tenants').doc(tenantId).get();
  if (tDoc.data()?.owner_id !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not owner');
  }

  const bulk = deps.db.bulkWriter();
  (
    await deps.db.collection('birthdays').where('tenant_id', '==', tenantId).get()
  ).docs.forEach((d) => bulk.delete(d.ref));
  (
    await deps.db.collection('groups').where('tenant_id', '==', tenantId).get()
  ).docs.forEach((d) => bulk.delete(d.ref));
  (
    await deps.db.collection('tenant_members').where('tenant_id', '==', tenantId).get()
  ).docs.forEach((d) => bulk.delete(d.ref));
  bulk.delete(tDoc.ref);
  bulk.delete(deps.db.collection('users').doc(userId));
  await bulk.close();
  await admin.auth().deleteUser(userId);
  return { success: true };
});


