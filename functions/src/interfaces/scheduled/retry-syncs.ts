// Scheduled function - Retry failed syncs

import * as functions from 'firebase-functions';
import { createDependencies } from '../dependencies';
import { batchProcessor } from '../../shared/utils/calendar-utils';

const deps = createDependencies();

export const retryFailedSyncsFn = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const snap = await deps.db
      .collection('birthdays')
      .where('archived', '==', false)
      .where('syncMetadata.status', 'in', ['PARTIAL_SYNC', 'ERROR'])
      .limit(50)  // ✅ שינוי 3: הגבלת כמות למניעת עומס
      .get();

    const tasks = snap.docs
      .map((doc) => {
        const d = doc.data();
        const retryCount = d.syncMetadata?.retryCount || 0;
        
        // דלג על טוקנים מתים (999) או מי שעבר את המכסה (>=3)
        if (retryCount === 999 || retryCount >= 3) {
          return null;
        }
        
        return () => deps.syncBirthdayUseCase.execute(doc.id, d, d.tenant_id);
      })
      .filter((t) => t !== null) as (() => Promise<void>)[];

    if (tasks.length) {
      await batchProcessor(tasks, 5);
      functions.logger.log(`Retried ${tasks.length} syncs`);
    }
  });


