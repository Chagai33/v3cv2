// SyncBirthdayUseCase - סנכרון יום הולדת ל-Google Calendar
// מקור: processBirthdaySync שורות 285-474 מ-index.ts
// העתקה מדויקת של הלוגיקה עם DI

import * as functions from 'firebase-functions';
import * as crypto from 'crypto';
import { HDate } from '@hebcal/core';
import { BirthdayRepository } from '../../../infrastructure/database/repositories/BirthdayRepository';
import { TenantRepository } from '../../../infrastructure/database/repositories/TenantRepository';
import { WishlistRepository } from '../../../infrastructure/database/repositories/WishlistRepository';
import { GroupRepository } from '../../../infrastructure/database/repositories/GroupRepository';
import { GoogleAuthClient } from '../../../infrastructure/google/GoogleAuthClient';
import { GoogleCalendarClient } from '../../../infrastructure/google/GoogleCalendarClient';
import { EventBuilderService } from '../../../domain/services/EventBuilderService';
import { SyncEvent } from '../../../domain/entities/types';
import { generateEventKey, batchProcessor } from '../../../shared/utils/calendar-utils';

export class SyncBirthdayUseCase {
  constructor(
    private birthdayRepo: BirthdayRepository,
    private tenantRepo: TenantRepository,
    private wishlistRepo: WishlistRepository,
    private groupRepo: GroupRepository,
    private authClient: GoogleAuthClient,
    private calendarClient: GoogleCalendarClient,
    private eventBuilder: EventBuilderService
  ) {}

  async execute(
    birthdayId: string,
    currentData: any,
    tenantId: string,
    force: boolean = false,
    skipUpdate: boolean = false
  ): Promise<void> {
    // A. Get tenant and owner
    const tenant = await this.tenantRepo.findById(tenantId);
    const ownerId = tenant?.owner_id;

    if (!ownerId) {
      functions.logger.warn(`No owner_id for tenant ${tenantId}`);
      return;
    }

    // B. Get access token
    let accessToken: string | null = null;
    try {
      accessToken = await this.authClient.getValidAccessToken(ownerId);
    } catch (e) {
      functions.logger.log(`No token for ${ownerId}, skipping`);
      return;
    }

    if (!accessToken) return;

    // C. Get calendar ID and validate
    const calendarId = await this.authClient.getCalendarId(ownerId);
    if (calendarId === 'primary') {
      functions.logger.error('Strict Mode: Syncing to Primary Calendar is not allowed.');
      return;
    }

    // D. Validation & Idempotency
    const dataToHash = {
      firstName: currentData.first_name,
      lastName: currentData.last_name,
      date: currentData.birth_date_gregorian,
      sunset: currentData.after_sunset,
      prefs: currentData.calendar_preference_override || tenant?.default_calendar_preference,
      archived: currentData.archived,
      notes: currentData.notes,
      groups: currentData.group_ids || []
    };
    const currentDataHash = crypto.createHash('sha256')
      .update(JSON.stringify(dataToHash))
      .digest('hex');

    const hasMappedEvents = currentData.googleCalendarEventsMap && 
      Object.keys(currentData.googleCalendarEventsMap).length > 0;

    functions.logger.log(
      `DEBUG: Syncing ${birthdayId} to Calendar: ${calendarId} | Force: ${force} | HasEvents: ${hasMappedEvents}`
    );
    functions.logger.log(
      `DEBUG: CurrentHash: ${currentDataHash} | StoredHash: ${currentData.syncMetadata?.dataHash}`
    );

    if (
      !force && 
      hasMappedEvents && 
      currentData.syncMetadata?.dataHash === currentDataHash && 
      currentData.syncMetadata?.status === 'SYNCED'
    ) {
      functions.logger.log(`Idempotent skip for ${birthdayId}`);
      return;
    }

    // E. Planning - Build desired events
    let desiredEvents: Map<string, SyncEvent> = new Map();
    if (!currentData.archived) {
      // Fetch dependencies for event building
      const wishlistItems = await this.wishlistRepo.findByBirthdayId(birthdayId);
      const groupIds = currentData.group_ids || (currentData.group_id ? [currentData.group_id] : []);
      const groups = await this.groupRepo.findByIds(groupIds);

      const eventsList = await this.eventBuilder.buildEventsForBirthday(
        { id: birthdayId, ...currentData, tenant_id: tenantId },
        tenant!,
        groups,
        wishlistItems
      );
      eventsList.forEach(event => 
        desiredEvents.set(generateEventKey(event._type, event._year || 0), event)
      );
    }

    const currentMap: { [key: string]: string } = currentData.googleCalendarEventsMap || {};
    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: any[] = [];

    // F. Smart Diff
    for (const [key, event] of desiredEvents.entries()) {
      const existingId = currentMap[key];
      const { _type, _year, ...resource } = event;
      if (existingId) {
        updates.push({ key, eventId: existingId, resource });
      } else {
        creates.push({ key, resource });
      }
    }

    const now = new Date();
    const currentGregYear = now.getFullYear();
    const currentHebYear = new HDate().getFullYear();

    for (const [key, eventId] of Object.entries(currentMap)) {
      if (!desiredEvents.has(key)) {
        if (currentData.archived) {
          deletes.push({ key, eventId });
        } else {
          const parts = key.split('_');
          const year = parseInt(parts[1], 10);
          const isFuture = 
            (parts[0] === 'gregorian' && year >= currentGregYear) || 
            (parts[0] === 'hebrew' && year >= currentHebYear);
          if (isFuture) deletes.push({ key, eventId });
        }
      }
    }

    // G. Execution
    const tasks: (() => Promise<any>)[] = [];
    const failedKeys: string[] = [];

    // Create Tasks with Deterministic IDs
    creates.forEach(item => {
      tasks.push(async () => {
        try {
          const uniqueStr = `${birthdayId}_${item.key}`;
          const deterministicId = 'hb' + crypto.createHash('md5')
            .update(uniqueStr)
            .digest('hex');

          const eventId = await this.calendarClient.createEvent(
            ownerId,
            calendarId,
            item.resource,
            deterministicId
          );
          currentMap[item.key] = eventId;
        } catch (e: any) {
          if (e.code === 409) {
            functions.logger.log(`Event ${item.key} exists (409). Reconciling state...`);
            const uniqueStr = `${birthdayId}_${item.key}`;
            const deterministicId = 'hb' + crypto.createHash('md5')
              .update(uniqueStr)
              .digest('hex');
            
            try {
              await this.calendarClient.updateEvent(
                ownerId,
                calendarId,
                deterministicId,
                item.resource
              );
              currentMap[item.key] = deterministicId;
              functions.logger.log(`Successfully restored/updated event ${deterministicId}`);
            } catch (updateErr) {
              functions.logger.error(`Failed to reconcile event ${deterministicId}`, updateErr);
              failedKeys.push(item.key);
            }
          } else {
            failedKeys.push(item.key);
            throw e;
          }
        }
      });
    });

    // Update Tasks
    updates.forEach(item => {
      tasks.push(async () => {
        try {
          await this.calendarClient.updateEvent(
            ownerId,
            calendarId,
            item.eventId,
            item.resource
          );
        } catch (e: any) {
          if (e.code === 404 || e.code === 410) {
            functions.logger.log(`Event ${item.eventId} deleted externally (404/410), recreating...`);
            try {
              const uniqueStr = `${birthdayId}_${item.key}`;
              const deterministicId = 'hb' + crypto.createHash('md5')
                .update(uniqueStr)
                .digest('hex');
              
              const eventId = await this.calendarClient.createEvent(
                ownerId,
                calendarId,
                item.resource,
                deterministicId
              );
              currentMap[item.key] = eventId;
            } catch (e2) {
              failedKeys.push(item.key);
              throw e2;
            }
          } else {
            failedKeys.push(item.key);
            throw e;
          }
        }
      });
    });

    // Delete Tasks
    deletes.forEach(item => {
      tasks.push(async () => {
        try {
          await this.calendarClient.deleteEvent(ownerId, calendarId, item.eventId);
          delete currentMap[item.key];
        } catch (e: any) {
          if (e.code === 404 || e.code === 410) {
            delete currentMap[item.key];
          } else {
            failedKeys.push(item.key);
            throw e;
          }
        }
      });
    });

    // Run sequentially (Concurrency: 1) to prevent rate limit
    await batchProcessor(tasks, 1);

    // H. Reconciliation
    if (skipUpdate) {
      functions.logger.log(`Skipping DB update for deleted/archived doc ${birthdayId}`);
      return;
    }

    const newStatus = failedKeys.length > 0 ? 'PARTIAL_SYNC' : 'SYNCED';
    let retryCount = currentData.syncMetadata?.retryCount || 0;
    if (newStatus === 'SYNCED') {
      retryCount = 0;
    } else if (['PARTIAL_SYNC', 'ERROR'].includes(currentData.syncMetadata?.status)) {
      retryCount++;
    }

    await this.birthdayRepo.update(birthdayId, {
      googleCalendarEventsMap: currentMap,
      syncMetadata: {
        status: newStatus,
        lastAttemptAt: new Date().toISOString(),
        failedKeys,
        retryCount,
        dataHash: currentDataHash
      },
      lastSyncedAt: new Date() as any
    });
  }
}


