"use strict";
// BulkSyncUseCase - סנכרון מרובה של ימי הולדת
// מקור: syncMultipleBirthdaysToGoogleCalendar + processCalendarSyncJob
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
exports.BulkSyncUseCase = void 0;
const admin = __importStar(require("firebase-admin"));
class BulkSyncUseCase {
    constructor(birthdayRepo, tokenRepo, tasksClient, syncUseCase, db) {
        this.birthdayRepo = birthdayRepo;
        this.tokenRepo = tokenRepo;
        this.tasksClient = tasksClient;
        this.syncUseCase = syncUseCase;
        this.db = db;
    }
    async createBulkSyncJob(userId, birthdayIds) {
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
            lastSyncStart: admin.firestore.FieldValue.serverTimestamp(),
            accessToken: '', // Will be filled by existing data
            expiresAt: 0
        });
        // Queue tasks in chunks
        const CHUNK_SIZE = 5;
        const DELAY_INCREMENT = 10;
        let delaySeconds = 0;
        for (let i = 0; i < birthdayIds.length; i += CHUNK_SIZE) {
            const chunk = birthdayIds.slice(i, i + CHUNK_SIZE);
            await this.tasksClient.createSyncTask({ birthdayIds: chunk, userId, jobId: jobRef.id }, delaySeconds);
            delaySeconds += DELAY_INCREMENT;
        }
        return {
            jobId: jobRef.id,
            totalAttempted: birthdayIds.length
        };
    }
    async processSyncJob(birthdayIds, userId, jobId) {
        let successes = 0;
        let failures = 0;
        for (const bid of birthdayIds) {
            try {
                const birthday = await this.birthdayRepo.findById(bid);
                if (birthday && birthday.tenant_id) {
                    await this.birthdayRepo.update(bid, { isSynced: true });
                    await this.syncUseCase.execute(bid, { ...birthday, isSynced: true }, birthday.tenant_id, false // ✅ שינוי: false כדי לכבד hash checking
                    );
                }
                successes++;
                if (jobId)
                    await this.updateSyncJob(jobId, 1);
            }
            catch (e) {
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
    async updateSyncJob(jobId, inc, err) {
        const update = {
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
exports.BulkSyncUseCase = BulkSyncUseCase;
//# sourceMappingURL=BulkSyncUseCase.js.map