// Job Processors - Background job handlers

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createDependencies } from '../dependencies';

const deps = createDependencies();

// Process calendar sync job
export const processCalendarSyncJobFn = functions
  .runWith({ timeoutSeconds: 540, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { birthdayIds, userId, jobId } = req.body;

    const result = await deps.bulkSyncUseCase.processSyncJob(
      birthdayIds,
      userId,
      jobId
    );

    res.status(200).send({
      success: true,
      successes: result.successes,
      failures: result.failures
    });
  });

// Process deletion job
export const processDeletionJobFn = functions
  .runWith({ timeoutSeconds: 540, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { userId, tenantId } = req.body;
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }

    try {
      const result = await deps.cleanupOrphanEventsUseCase.executeWithDBCleanup(
        userId,
        tenantId
      );

      functions.logger.log(
        `[DeleteJob] Completed. Deleted: ${result.deletedCount}, Found: ${result.foundCount}`
      );

      await deps.tokenRepo.save(userId, {
        userId,
        syncStatus: 'IDLE',
        accessToken: '',
        expiresAt: 0
      });

      res.status(200).send({
        success: true,
        deletedCount: result.deletedCount,
        foundCount: result.foundCount
      });
    } catch (e: any) {
      functions.logger.error('[DeleteJob] Fatal error:', e);
      await deps.tokenRepo.save(userId, {
        userId,
        syncStatus: 'ERROR',
        accessToken: '',
        expiresAt: 0
      });
      res.status(500).send({ error: e.message });
    }
  });

// Trigger delete all events
export const triggerDeleteAllEventsFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const userId = context.auth.uid;
  const { tenantId } = data;

  await deps.tokenRepo.save(userId, {
    userId,
    syncStatus: 'DELETING',
    lastSyncStart: admin.firestore.FieldValue.serverTimestamp() as any,
    accessToken: '',
    expiresAt: 0
  });

  try {
    await deps.tasksClient.createDeletionTask({ userId, tenantId });
    return { success: true, message: 'Deletion job started' };
  } catch (e: any) {
    await deps.tokenRepo.save(userId, {
      userId,
      syncStatus: 'IDLE',
      accessToken: '',
      expiresAt: 0
    });
    throw new functions.https.HttpsError('internal', 'Failed to queue job: ' + e.message);
  }
});

// Delete all synced events (legacy)
export const deleteAllSyncedEventsFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { tenantId, forceDBOnly } = data;

  if (!forceDBOnly) {
    const result = await deps.cleanupOrphanEventsUseCase.executeWithDBCleanup(
      context.auth.uid,
      tenantId
    );
    functions.logger.log(`Deleted ${result.deletedCount} events`);
  } else {
    // DB cleanup only
    const docs = await deps.db
      .collection('birthdays')
      .where('tenant_id', '==', tenantId)
      .get();
    const batch = deps.db.batch();
    docs.forEach((doc) =>
      batch.update(doc.ref, {
        googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
        syncMetadata: admin.firestore.FieldValue.delete(),
        lastSyncedAt: admin.firestore.FieldValue.delete(),
        googleCalendarEventId: admin.firestore.FieldValue.delete(),
        googleCalendarEventIds: admin.firestore.FieldValue.delete(),
        syncedCalendarId: admin.firestore.FieldValue.delete(),
        isSynced: false
      })
    );
    await batch.commit();
  }

  return { success: true };
});

