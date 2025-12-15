"use strict";
// Job Processors - Background job handlers
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
exports.deleteAllSyncedEventsFn = exports.triggerDeleteAllEventsFn = exports.processDeletionJobFn = exports.processCalendarSyncJobFn = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const dependencies_1 = require("../dependencies");
const deps = (0, dependencies_1.createDependencies)();
// Process calendar sync job
exports.processCalendarSyncJobFn = functions
    .runWith({ timeoutSeconds: 540, memory: '256MB' })
    .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { birthdayIds, userId, jobId } = req.body;
    const result = await deps.bulkSyncUseCase.processSyncJob(birthdayIds, userId, jobId);
    res.status(200).send({
        success: true,
        successes: result.successes,
        failures: result.failures
    });
});
// Process deletion job
exports.processDeletionJobFn = functions
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
        const result = await deps.cleanupOrphanEventsUseCase.executeWithDBCleanup(userId, tenantId);
        functions.logger.log(`[DeleteJob] Completed. Deleted: ${result.deletedCount}, Found: ${result.foundCount}`);
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
    }
    catch (e) {
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
exports.triggerDeleteAllEventsFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const userId = context.auth.uid;
    const { tenantId } = data;
    await deps.tokenRepo.save(userId, {
        userId,
        syncStatus: 'DELETING',
        lastSyncStart: admin.firestore.FieldValue.serverTimestamp(),
        accessToken: '',
        expiresAt: 0
    });
    try {
        await deps.tasksClient.createDeletionTask({ userId, tenantId });
        return { success: true, message: 'Deletion job started' };
    }
    catch (e) {
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
exports.deleteAllSyncedEventsFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const { tenantId, forceDBOnly } = data;
    if (!forceDBOnly) {
        const result = await deps.cleanupOrphanEventsUseCase.executeWithDBCleanup(context.auth.uid, tenantId);
        functions.logger.log(`Deleted ${result.deletedCount} events`);
    }
    else {
        // DB cleanup only
        const docs = await deps.db
            .collection('birthdays')
            .where('tenant_id', '==', tenantId)
            .get();
        const batch = deps.db.batch();
        docs.forEach((doc) => batch.update(doc.ref, {
            googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
            syncMetadata: admin.firestore.FieldValue.delete(),
            lastSyncedAt: admin.firestore.FieldValue.delete(),
            googleCalendarEventId: admin.firestore.FieldValue.delete(),
            googleCalendarEventIds: admin.firestore.FieldValue.delete(),
            syncedCalendarId: admin.firestore.FieldValue.delete(),
            isSynced: false
        }));
        await batch.commit();
    }
    return { success: true };
});
//# sourceMappingURL=job-processors.js.map