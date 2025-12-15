"use strict";
// CleanupOrphanEventsUseCase - ניקוי אירועים יתומים מ-Google Calendar
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupOrphanEventsUseCase = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
class CleanupOrphanEventsUseCase {
    constructor(calendarClient, authClient, db) {
        this.calendarClient = calendarClient;
        this.authClient = authClient;
        this.db = db;
    }
    async execute(userId, tenantId, dryRun = false) {
        const calendarId = await this.authClient.getCalendarId(userId);
        let deletedCount = 0;
        let foundCount = 0;
        let failedCount = 0;
        let pageToken;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
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
                        }
                        catch (e) {
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
    async executeWithDBCleanup(userId, tenantId) {
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
        if (opCount > 0)
            await currentBatch.commit();
        return {
            deletedCount: result.deletedCount,
            foundCount: result.foundCount
        };
    }
}
exports.CleanupOrphanEventsUseCase = CleanupOrphanEventsUseCase;
//# sourceMappingURL=CleanupOrphanEventsUseCase.js.map