// Birthday Triggers - Firebase Firestore Triggers
// מקור: onBirthdayWrite מ-index.ts

import * as functions from 'firebase-functions';
import { createDependencies, Dependencies } from '../dependencies';

let deps: Dependencies | null = null;

export const onBirthdayWriteFn = functions.firestore
  .document('birthdays/{birthdayId}')
  .onWrite(async (change, context) => {
    // Lazy initialization - רק בפעם הראשונה
    if (!deps) deps = createDependencies();
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    // 1. Deletion
    if (!afterData) {
      if (beforeData && beforeData.tenant_id) {
        try {
          await deps.syncBirthdayUseCase.execute(
            context.params.birthdayId,
            { ...beforeData, archived: true },
            beforeData.tenant_id,
            false,
            true
          );
        } catch (e) {
          functions.logger.error('Cleanup error:', e);
        }
      }
      return null;
    }

    if (!afterData.birth_date_gregorian) return null;

    // 2. Hebcal Logic
    const shouldCalculate = deps.calculateHebrewDataUseCase.shouldCalculate(
      beforeData,
      afterData
    );

    let updateData: any = {};
    if (shouldCalculate) {
      try {
        updateData = await deps.calculateHebrewDataUseCase.execute(
          context.params.birthdayId,
          afterData.birth_date_gregorian,
          afterData.after_sunset || false
        );
        return null; // Return early, don't continue to sync
      } catch (e) {
        functions.logger.error('Hebcal error:', e);
      }
    }

    // 3. Smart Sync
    const finalData = { ...afterData, ...updateData };
    
    // ✅ דלג על system updates כדי למנוע לולאה אינסופית
    if (afterData._systemUpdate) {
      functions.logger.log('Skipping sync - system update detected');
      return null;
    }
    
    if (finalData.tenant_id && finalData.isSynced === true) {
      try {
        await deps.syncBirthdayUseCase.execute(
          context.params.birthdayId,
          finalData,
          finalData.tenant_id
        );
      } catch (e) {
        functions.logger.error('Sync error:', e);
      }
    } else if (
      finalData.tenant_id &&
      beforeData?.isSynced === true &&
      finalData.isSynced === false
    ) {
      try {
        await deps.syncBirthdayUseCase.execute(
          context.params.birthdayId,
          { ...finalData, archived: true },
          finalData.tenant_id
        );
      } catch (e) {
        functions.logger.error('Removal error:', e);
      }
    }

    return null;
  });


