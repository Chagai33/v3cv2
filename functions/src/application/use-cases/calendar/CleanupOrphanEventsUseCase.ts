// CleanupOrphanEventsUseCase - ניקוי אירועים יתומים מ-Google Calendar

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleCalendarClient } from '../../../infrastructure/google/GoogleCalendarClient';
import { GoogleAuthClient } from '../../../infrastructure/google/GoogleAuthClient';

export class CleanupOrphanEventsUseCase {
  constructor(
    private calendarClient: GoogleCalendarClient,
    private authClient: GoogleAuthClient,
    private db: admin.firestore.Firestore
  ) {}

  async execute(
    userId: string,
    tenantId: string,
    dryRun: boolean = false
  ): Promise<{ deletedCount: number; foundCount: number; failedCount: number }> {
    const calendarId = await this.authClient.getCalendarId(userId);
    let deletedCount = 0;
    let foundCount = 0;
    let failedCount = 0;
    let pageToken: string | undefined;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    do {
      const result = await this.calendarClient.listEvents(userId, calendarId, {
        privateExtendedProperty: ['createdByApp=hebbirthday'],
        maxResults: 250,
        pageToken,
        singleEvents: true
      });

      for (const ev of result.items) {
        if (ev.id) {
          foundCount++;
          if (!dryRun) {
            try {
              await this.calendarClient.deleteEvent(userId, calendarId, ev.id);
              deletedCount++;
              await sleep(150);
            } catch (e) {
              failedCount++;
              functions.logger.warn(`Orphan delete fail ${ev.id}`, e);
            }
          }
        }
      }

      pageToken = result.nextPageToken;
    } while (pageToken);

    return { deletedCount: dryRun ? foundCount : deletedCount, foundCount, failedCount };
  }

  async executeWithDBCleanup(
    userId: string,
    tenantId: string
  ): Promise<{ deletedCount: number; foundCount: number }> {
    // Delete from Google Calendar
    const result = await this.execute(userId, tenantId, false);

    // Cleanup Firestore
    const docs = await this.db.collection('birthdays')
      .where('tenant_id', '==', tenantId)
      .get();

    let opCount = 0;
    let currentBatch = this.db.batch();

    for (const doc of docs.docs) {
      currentBatch.update(doc.ref, {
        googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
        syncMetadata: admin.firestore.FieldValue.delete(),
        lastSyncedAt: admin.firestore.FieldValue.delete(),
        googleCalendarEventId: admin.firestore.FieldValue.delete(),
        googleCalendarEventIds: admin.firestore.FieldValue.delete(),
        isSynced: false
      });
      opCount++;

      if (opCount >= 450) {
        await currentBatch.commit();
        currentBatch = this.db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) await currentBatch.commit();

    return {
      deletedCount: result.deletedCount,
      foundCount: result.foundCount
    };
  }
}

