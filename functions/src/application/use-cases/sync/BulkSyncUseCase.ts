// BulkSyncUseCase - סנכרון מרובה של ימי הולדת
// מקור: syncMultipleBirthdaysToGoogleCalendar + processCalendarSyncJob

import * as admin from 'firebase-admin';
import { TasksClient } from '../../../infrastructure/tasks/CloudTasksClient';
import { BirthdayRepository } from '../../../infrastructure/database/repositories/BirthdayRepository';
import { TokenRepository } from '../../../infrastructure/database/repositories/TokenRepository';
import { SyncBirthdayUseCase } from './SyncBirthdayUseCase';

export class BulkSyncUseCase {
  constructor(
    private birthdayRepo: BirthdayRepository,
    private tokenRepo: TokenRepository,
    private tasksClient: TasksClient,
    private syncUseCase: SyncBirthdayUseCase,
    private db: admin.firestore.Firestore
  ) {}

  async createBulkSyncJob(
    userId: string,
    birthdayIds: string[]
  ): Promise<{ jobId: string; totalAttempted: number }> {
    // Create job document
    const jobRef = this.db.collection('calendar_sync_jobs').doc();
    await jobRef.set({
      userId,
      status: 'pending',
      totalItems: birthdayIds.length,
      processedItems: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      errors: []
    });

    // Update token status
    await this.tokenRepo.save(userId, {
      userId,
      syncStatus: 'IN_PROGRESS',
      lastSyncStart: admin.firestore.FieldValue.serverTimestamp() as any,
      accessToken: '', // Will be filled by existing data
      expiresAt: 0
    });

    // Queue tasks in chunks
    const CHUNK_SIZE = 5;
    const DELAY_INCREMENT = 10;
    let delaySeconds = 0;

    for (let i = 0; i < birthdayIds.length; i += CHUNK_SIZE) {
      const chunk = birthdayIds.slice(i, i + CHUNK_SIZE);
      await this.tasksClient.createSyncTask(
        { birthdayIds: chunk, userId, jobId: jobRef.id },
        delaySeconds
      );
      delaySeconds += DELAY_INCREMENT;
    }

    return {
      jobId: jobRef.id,
      totalAttempted: birthdayIds.length
    };
  }

  async processSyncJob(
    birthdayIds: string[],
    userId: string,
    jobId?: string
  ): Promise<{ successes: number; failures: number }> {
    let successes = 0;
    let failures = 0;

    for (const bid of birthdayIds) {
      try {
        const birthday = await this.birthdayRepo.findById(bid);
        if (birthday && birthday.tenant_id) {
          await this.birthdayRepo.update(bid, { isSynced: true });
          await this.syncUseCase.execute(
            bid,
            { ...birthday, isSynced: true },
            birthday.tenant_id,
            false // ✅ שינוי: false כדי לכבד hash checking
          );
        }
        successes++;
        if (jobId) await this.updateSyncJob(jobId, 1);
      } catch (e: any) {
        failures++;
        if (jobId) {
          await this.updateSyncJob(jobId, 1, {
            message: e.message,
            itemId: bid
          });
        }
      }
    }

    // Mark job as completed if all items processed
    if (jobId) {
      const jDoc = await this.db.collection('calendar_sync_jobs').doc(jobId).get();
      const data = jDoc.data();
      if (data && data.processedItems >= data.totalItems) {
        await jDoc.ref.update({ status: 'completed' });
        await this.tokenRepo.save(userId, {
          userId,
          syncStatus: 'IDLE',
          accessToken: '',
          expiresAt: 0
        });
      }
    }

    return { successes, failures };
  }

  private async updateSyncJob(jobId: string, inc: number, err?: any): Promise<void> {
    const update: any = {
      processedItems: admin.firestore.FieldValue.increment(inc),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (err) {
      update.errors = admin.firestore.FieldValue.arrayUnion({
        message: err.message,
        itemId: err.itemId,
        timestamp: new Date().toISOString()
      });
    }
    await this.db.collection('calendar_sync_jobs').doc(jobId).update(update);
  }
}



