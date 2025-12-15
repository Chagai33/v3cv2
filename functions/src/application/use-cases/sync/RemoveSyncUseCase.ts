// RemoveSyncUseCase - הסרת סנכרון של יום הולדת מ-Google Calendar

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { BirthdayRepository } from '../../../infrastructure/database/repositories/BirthdayRepository';
import { SyncBirthdayUseCase } from './SyncBirthdayUseCase';

export class RemoveSyncUseCase {
  constructor(
    private birthdayRepo: BirthdayRepository,
    private syncUseCase: SyncBirthdayUseCase
  ) {}

  async execute(birthdayId: string): Promise<void> {
    const birthday = await this.birthdayRepo.findById(birthdayId);
    if (!birthday) {
      throw new functions.https.HttpsError('not-found', 'Birthday not found');
    }

    if (!birthday.tenant_id) {
      throw new functions.https.HttpsError('invalid-argument', 'No tenant ID');
    }

    // Mark as unsynced FIRST to prevent trigger recreation loop
    await this.birthdayRepo.update(birthdayId, { isSynced: false });

    // Perform deletion (archived: true tells SyncBirthdayUseCase to delete ALL events)
    await this.syncUseCase.execute(
      birthdayId,
      { ...birthday, isSynced: false, archived: true },
      birthday.tenant_id
    );

    // Cleanup metadata - use FieldValue.delete() to properly remove fields
    await this.birthdayRepo.update(birthdayId, {
      googleCalendarEventsMap: admin.firestore.FieldValue.delete() as any,
      syncMetadata: admin.firestore.FieldValue.delete() as any,
      googleCalendarEventId: admin.firestore.FieldValue.delete() as any,
      googleCalendarEventIds: admin.firestore.FieldValue.delete() as any,
      lastSyncedAt: admin.firestore.FieldValue.delete() as any
    });
  }
}


