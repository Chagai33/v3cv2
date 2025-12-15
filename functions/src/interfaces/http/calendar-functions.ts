// Calendar Functions - Google Calendar Sync Operations

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createDependencies } from '../dependencies';

const deps = createDependencies();
const db = admin.firestore();

// Sync single birthday
export const syncBirthdayFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const docRef = db.collection('birthdays').doc(data.birthdayId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Not found');
  }

  const bData = doc.data();
  const tDoc = await db.collection('tenants').doc(bData?.tenant_id).get();
  if (tDoc.data()?.owner_id !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not owner');
  }

  await docRef.update({ isSynced: true });
  await deps.syncBirthdayUseCase.execute(
    data.birthdayId,
    { ...bData, isSynced: true },
    bData?.tenant_id,
    true
  );

  return { success: true };
});

// Sync multiple birthdays
export const syncMultipleFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { birthdayIds } = data;
  const userId = context.auth.uid;

  const result = await deps.bulkSyncUseCase.createBulkSyncJob(userId, birthdayIds);

  return {
    success: true,
    message: 'Batch started',
    jobId: result.jobId,
    status: 'queued',
    totalAttempted: result.totalAttempted
  };
});

// Remove birthday from calendar
export const removeBirthdayFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  try {
    await deps.removeSyncUseCase.execute(data.birthdayId);
    return { success: true };
  } catch (error: any) {
    functions.logger.error('Error removing birthday:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Cleanup orphan events
export const cleanupOrphanFn = functions
  .runWith({ timeoutSeconds: 540, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }

    const { tenantId, dryRun } = data;

    try {
      const result = await deps.cleanupOrphanEventsUseCase.execute(
        context.auth.uid,
        tenantId,
        dryRun
      );

      const calendarName = await deps.authClient.getCalendarName(context.auth.uid);

      return {
        success: true,
        deletedCount: result.deletedCount,
        foundCount: result.foundCount,
        failedCount: result.failedCount,
        calendarName
      };
    } catch (e) {
      functions.logger.error('Orphan cleanup failed:', e);
      throw new functions.https.HttpsError('internal', 'Orphan cleanup failed');
    }
  });

// Refresh Hebrew data
export const refreshHebrewDataFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const doc = await db.collection('birthdays').doc(data.birthdayId).get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Not found');
  }

  await doc.ref.update({ updated_at: admin.firestore.FieldValue.serverTimestamp() });
  return { success: true };
});

// Reset sync data
export const resetSyncDataFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { birthdayId } = data;
  if (!birthdayId) {
    throw new functions.https.HttpsError('invalid-argument', 'Birthday ID required');
  }

  try {
    await db.collection('birthdays').doc(birthdayId).update({
      googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
      googleCalendarEventId: admin.firestore.FieldValue.delete(),
      googleCalendarEventIds: admin.firestore.FieldValue.delete(),
      syncedCalendarId: admin.firestore.FieldValue.delete(),
      lastSyncedAt: admin.firestore.FieldValue.delete(),
      syncMetadata: admin.firestore.FieldValue.delete()
    });
    return { success: true, message: 'Sync data reset successfully' };
  } catch (error: any) {
    functions.logger.error('Error resetting sync data:', error);
    throw new functions.https.HttpsError('internal', 'Failed to reset sync data');
  }
});

// Preview deletion
export const previewDeletionFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  try {
    const calendarId = await deps.authClient.getCalendarId(context.auth.uid);
    const calendarName = await deps.authClient.getCalendarName(context.auth.uid);
    const snaps = await db
      .collection('birthdays')
      .where('tenant_id', '==', data.tenantId)
      .get();
    const summary: any[] = [];
    let totalCount = 0;

    snaps.forEach((doc) => {
      const d = doc.data();
      const hasEvents =
        d.googleCalendarEventsMap &&
        Object.keys(d.googleCalendarEventsMap).length > 0;

      if (hasEvents) {
        const count = Object.keys(d.googleCalendarEventsMap).length;
        summary.push({
          name: `${d.first_name} ${d.last_name}`,
          hebrewEvents: count,
          gregorianEvents: 0
        });
        totalCount += count;
      }
    });
    return { success: true, summary, recordsCount: summary.length, totalCount, calendarId, calendarName };
  } catch (e) {
    throw new functions.https.HttpsError('internal', 'Preview failed');
  }
});


