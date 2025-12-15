// Scheduled function - Update next birthdays daily

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createDependencies } from '../dependencies';

const deps = createDependencies();

export const updateNextBirthdayScheduledFn = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    try {
      const nowStr = new Date().toISOString().split('T')[0];
      const snapshot = await deps.db
        .collection('birthdays')
        .where('archived', '==', false)
        .where('next_upcoming_hebrew_birthday', '<', nowStr)
        .get();

      if (snapshot.empty) return null;

      const batch = deps.db.batch();
      let count = 0;

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
      });

      await batch.commit();
      functions.logger.log(`Scheduled update triggered for ${count} outdated birthdays`);
      return null;
    } catch (error) {
      functions.logger.error('Error in scheduled update:', error);
      return null;
    }
  });


