"use strict";
// SyncBirthdayUseCase - סנכרון יום הולדת ל-Google Calendar
// מקור: processBirthdaySync שורות 285-474 מ-index.ts
// העתקה מדויקת של הלוגיקה עם DI
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
exports.SyncBirthdayUseCase = void 0;
const functions = __importStar(require("firebase-functions"));
const crypto = __importStar(require("crypto"));
const core_1 = require("@hebcal/core");
const calendar_utils_1 = require("../../../shared/utils/calendar-utils");
class SyncBirthdayUseCase {
    constructor(birthdayRepo, tenantRepo, wishlistRepo, groupRepo, authClient, calendarClient, eventBuilder) {
        this.birthdayRepo = birthdayRepo;
        this.tenantRepo = tenantRepo;
        this.wishlistRepo = wishlistRepo;
        this.groupRepo = groupRepo;
        this.authClient = authClient;
        this.calendarClient = calendarClient;
        this.eventBuilder = eventBuilder;
    }
    async execute(birthdayId, currentData, tenantId, force = false, skipUpdate = false) {
        // A. Get tenant and owner
        const tenant = await this.tenantRepo.findById(tenantId);
        const ownerId = tenant?.owner_id;
        if (!ownerId) {
            functions.logger.warn(`No owner_id for tenant ${tenantId}`);
            return;
        }
        // B. Get access token
        let accessToken = null;
        try {
            accessToken = await this.authClient.getValidAccessToken(ownerId);
        }
        catch (e) {
            functions.logger.error(`Auth error for ${ownerId}:`, e);
            // ✅ שינוי 1+4: No Silent Failure + זיהוי טוקן מת
            const isTokenRevoked = e.message === 'TOKEN_REVOKED';
            await this.birthdayRepo.update(birthdayId, {
                syncMetadata: {
                    status: 'ERROR',
                    lastAttemptAt: new Date().toISOString(),
                    failedKeys: [],
                    lastErrorMessage: isTokenRevoked
                        ? 'החיבור ליומן Google נותק. לחץ כאן להתחבר מחדש בהגדרות.'
                        : 'שגיאה זמנית בחיבור ליומן. המערכת תנסה שוב בעוד שעה.',
                    retryCount: isTokenRevoked ? 999 : (currentData.syncMetadata?.retryCount || 0) + 1,
                    dataHash: ''
                }
            });
            return;
        }
        if (!accessToken)
            return;
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
        functions.logger.log(`DEBUG: Syncing ${birthdayId} to Calendar: ${calendarId} | Force: ${force} | HasEvents: ${hasMappedEvents}`);
        functions.logger.log(`DEBUG: CurrentHash: ${currentDataHash} | StoredHash: ${currentData.syncMetadata?.dataHash}`);
        if (!force &&
            hasMappedEvents &&
            currentData.syncMetadata?.dataHash === currentDataHash &&
            currentData.syncMetadata?.status === 'SYNCED') {
            functions.logger.log(`Idempotent skip for ${birthdayId}`);
            return;
        }
        // E. Planning - Build desired events
        let desiredEvents = new Map();
        if (!currentData.archived) {
            // Fetch dependencies for event building
            const wishlistItems = await this.wishlistRepo.findByBirthdayId(birthdayId);
            const groupIds = currentData.group_ids || (currentData.group_id ? [currentData.group_id] : []);
            const groups = await this.groupRepo.findByIds(groupIds);
            const eventsList = await this.eventBuilder.buildEventsForBirthday({ id: birthdayId, ...currentData, tenant_id: tenantId }, tenant, groups, wishlistItems);
            eventsList.forEach(event => desiredEvents.set((0, calendar_utils_1.generateEventKey)(event._type, event._year || 0), event));
        }
        const currentMap = currentData.googleCalendarEventsMap || {};
        const creates = [];
        const updates = [];
        const deletes = [];
        // F. Smart Diff
        for (const [key, event] of desiredEvents.entries()) {
            const existingId = currentMap[key];
            const { _type, _year, ...resource } = event;
            if (existingId) {
                updates.push({ key, eventId: existingId, resource });
            }
            else {
                creates.push({ key, resource });
            }
        }
        const now = new Date();
        const currentGregYear = now.getFullYear();
        const currentHebYear = new core_1.HDate().getFullYear();
        for (const [key, eventId] of Object.entries(currentMap)) {
            if (!desiredEvents.has(key)) {
                if (currentData.archived) {
                    deletes.push({ key, eventId });
                }
                else {
                    const parts = key.split('_');
                    const year = parseInt(parts[1], 10);
                    const isFuture = (parts[0] === 'gregorian' && year >= currentGregYear) ||
                        (parts[0] === 'hebrew' && year >= currentHebYear);
                    if (isFuture)
                        deletes.push({ key, eventId });
                }
            }
        }
        // G. Execution
        const tasks = [];
        const failedKeys = [];
        // Create Tasks with Deterministic IDs
        creates.forEach(item => {
            tasks.push(async () => {
                try {
                    const uniqueStr = `${birthdayId}_${item.key}`;
                    const deterministicId = 'hb' + crypto.createHash('md5')
                        .update(uniqueStr)
                        .digest('hex');
                    const eventId = await this.calendarClient.createEvent(ownerId, calendarId, item.resource, deterministicId);
                    currentMap[item.key] = eventId;
                }
                catch (e) {
                    if (e.code === 409) {
                        functions.logger.log(`Event ${item.key} exists (409). Reconciling state...`);
                        const uniqueStr = `${birthdayId}_${item.key}`;
                        const deterministicId = 'hb' + crypto.createHash('md5')
                            .update(uniqueStr)
                            .digest('hex');
                        try {
                            await this.calendarClient.updateEvent(ownerId, calendarId, deterministicId, item.resource);
                            currentMap[item.key] = deterministicId;
                            functions.logger.log(`Successfully restored/updated event ${deterministicId}`);
                        }
                        catch (updateErr) {
                            functions.logger.error(`Failed to reconcile event ${deterministicId}`, updateErr);
                            failedKeys.push(item.key);
                        }
                    }
                    else {
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
                    await this.calendarClient.updateEvent(ownerId, calendarId, item.eventId, item.resource);
                }
                catch (e) {
                    if (e.code === 404 || e.code === 410) {
                        functions.logger.log(`Event ${item.eventId} deleted externally (404/410), recreating...`);
                        try {
                            const uniqueStr = `${birthdayId}_${item.key}`;
                            const deterministicId = 'hb' + crypto.createHash('md5')
                                .update(uniqueStr)
                                .digest('hex');
                            const eventId = await this.calendarClient.createEvent(ownerId, calendarId, item.resource, deterministicId);
                            currentMap[item.key] = eventId;
                        }
                        catch (e2) {
                            failedKeys.push(item.key);
                            throw e2;
                        }
                    }
                    else {
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
                }
                catch (e) {
                    if (e.code === 404 || e.code === 410) {
                        delete currentMap[item.key];
                    }
                    else {
                        failedKeys.push(item.key);
                        throw e;
                    }
                }
            });
        });
        // Run sequentially (Concurrency: 1) to prevent rate limit
        await (0, calendar_utils_1.batchProcessor)(tasks, 1);
        // H. Reconciliation
        if (skipUpdate) {
            functions.logger.log(`Skipping DB update for deleted/archived doc ${birthdayId}`);
            return;
        }
        const newStatus = failedKeys.length > 0 ? 'PARTIAL_SYNC' : 'SYNCED';
        let retryCount = currentData.syncMetadata?.retryCount || 0;
        if (newStatus === 'SYNCED') {
            retryCount = 0;
        }
        else if (['PARTIAL_SYNC', 'ERROR'].includes(currentData.syncMetadata?.status)) {
            retryCount++;
        }
        await this.birthdayRepo.update(birthdayId, {
            googleCalendarEventsMap: currentMap,
            syncMetadata: {
                status: newStatus,
                lastAttemptAt: new Date().toISOString(),
                failedKeys,
                lastErrorMessage: failedKeys.length > 0
                    ? `נכשלו ${failedKeys.length} אירועים מתוך ${desiredEvents.size}`
                    : null, // ✅ שינוי 2: אכלוס lastErrorMessage
                retryCount,
                dataHash: currentDataHash
            },
            lastSyncedAt: new Date(),
            _systemUpdate: true // ✅ מניעת לולאה אינסופית
        });
    }
}
exports.SyncBirthdayUseCase = SyncBirthdayUseCase;
//# sourceMappingURL=SyncBirthdayUseCase.js.map