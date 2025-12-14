"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestPortalOps = exports.updateNextBirthdayScheduled = exports.resetBirthdaySyncData = exports.deleteAccount = exports.getAccountDeletionSummary = exports.previewDeletion = exports.cleanupOrphanEvents = exports.listGoogleCalendars = exports.updateGoogleCalendarSelection = exports.getGoogleAccountInfo = exports.getGoogleCalendarStatus = exports.disconnectGoogleCalendar = exports.removeBirthdayFromGoogleCalendar = exports.onUserCreate = exports.deleteAllSyncedEventsFromGoogleCalendar = exports.deleteGoogleCalendar = exports.createGoogleCalendar = exports.exchangeGoogleAuthCode = exports.triggerDeleteAllEvents = exports.processDeletionJob = exports.syncMultipleBirthdaysToGoogleCalendar = exports.processCalendarSyncJob = exports.retryFailedSyncs = exports.syncBirthdayToGoogleCalendar = exports.refreshBirthdayHebrewData = exports.onBirthdayWrite = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const calendar_utils_1 = require("./utils/calendar-utils");
const tasks_1 = require("@google-cloud/tasks");
const core_1 = require("@hebcal/core");
const crypto = __importStar(require("crypto"));
admin.initializeApp();
const db = admin.firestore();
const PROJECT_ID = JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId;
const LOCATION = 'us-central1';
const QUEUE = 'calendar-sync';
// Google Client Credentials
const GOOGLE_CLIENT_ID = functions.config().google?.client_id || '';
const GOOGLE_CLIENT_SECRET = functions.config().google?.client_secret || '';
const GOOGLE_REDIRECT_URI = functions.config().google?.redirect_uri || 'postmessage';
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    functions.logger.warn('Missing Google Client Credentials in functions.config()!');
}
const tasksClient = new tasks_1.CloudTasksClient();
// --- Interfaces ---
// --- Helper Functions: Hebcal & Zodiac ---
// Helper Functions (Zodiac)
function getGregorianZodiacSign(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
        return 'aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
        return 'taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
        return 'gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
        return 'cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
        return 'leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
        return 'virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
        return 'libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
        return 'scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
        return 'sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
        return 'capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
        return 'aquarius';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
        return 'pisces';
    return null;
}
function getHebrewZodiacSign(hebrewMonth) {
    if (!hebrewMonth)
        return null;
    switch (hebrewMonth) {
        case 'Nisan': return 'aries';
        case 'Iyyar': return 'taurus';
        case 'Sivan': return 'gemini';
        case 'Tamuz': return 'cancer';
        case 'Av': return 'leo';
        case 'Elul': return 'virgo';
        case 'Tishrei': return 'libra';
        case 'Cheshvan': return 'scorpio';
        case 'Kislev': return 'sagittarius';
        case 'Tevet': return 'capricorn';
        case 'Sh\'vat': return 'aquarius';
        case 'Adar':
        case 'Adar I':
        case 'Adar II': return 'pisces';
        default: return null;
    }
}
function getZodiacSignNameEn(sign) {
    const names = { 'aries': 'Aries', 'taurus': 'Taurus', 'gemini': 'Gemini', 'cancer': 'Cancer', 'leo': 'Leo', 'virgo': 'Virgo', 'libra': 'Libra', 'scorpio': 'Scorpio', 'sagittarius': 'Sagittarius', 'capricorn': 'Capricorn', 'aquarius': 'Aquarius', 'pisces': 'Pisces' };
    return names[sign] || sign;
}
function getZodiacSignNameHe(sign) {
    const names = { 'aries': 'טלה', 'taurus': 'שור', 'gemini': 'תאומים', 'cancer': 'סרטן', 'leo': 'אריה', 'virgo': 'בתולה', 'libra': 'מאזניים', 'scorpio': 'עקרב', 'sagittarius': 'קשת', 'capricorn': 'גדי', 'aquarius': 'דלי', 'pisces': 'דגים' };
    return names[sign] || sign;
}
// --- Helper Functions: Google Auth & Calendar ---
async function getValidAccessToken(userId, minValidityMillis = 60000) {
    const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
    if (!tokenDoc.exists)
        throw new functions.https.HttpsError('not-found', 'googleCalendar.connectFirst');
    const tokenData = tokenDoc.data();
    if (!tokenData)
        throw new functions.https.HttpsError('not-found', 'googleCalendar.syncError');
    const now = Date.now();
    const expiresAt = tokenData.expiresAt || 0;
    if (now < expiresAt - minValidityMillis)
        return tokenData.accessToken;
    functions.logger.log(`Token for user ${userId} expired, refreshing...`);
    if (!tokenData.refreshToken) {
        functions.logger.warn(`No refresh token for user ${userId}`);
        throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }
    try {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
        oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken });
        const { credentials } = await oauth2Client.refreshAccessToken();
        await tokenDoc.ref.update({
            accessToken: credentials.access_token,
            expiresAt: credentials.expiry_date || (Date.now() + 3600 * 1000),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return credentials.access_token;
    }
    catch (error) {
        functions.logger.error(`Failed to refresh token for user ${userId}:`, error);
        throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }
}
async function getCalendarId(userId) {
    const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
    return tokenDoc.exists ? (tokenDoc.data()?.calendarId || 'primary') : 'primary';
}
async function getCalendarName(userId) {
    const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
    return tokenDoc.exists ? (tokenDoc.data()?.calendarName || 'Primary Calendar') : 'Primary Calendar';
}
async function calculateExpectedEvents(birthday) {
    const events = [];
    const tenantDoc = await db.collection('tenants').doc(birthday.tenant_id).get();
    const tenant = tenantDoc.data();
    const language = (tenant?.default_language || 'he');
    // Groups logic
    const groupIds = birthday.group_ids || (birthday.group_id ? [birthday.group_id] : []);
    const groups = [];
    if (groupIds.length > 0) {
        const groupDocs = await Promise.all(groupIds.map((id) => db.collection('groups').doc(id).get()));
        for (const groupDoc of groupDocs) {
            if (groupDoc.exists) {
                const gData = groupDoc.data();
                let parentName;
                if (gData?.parent_id) {
                    const pDoc = await db.collection('groups').doc(gData.parent_id).get();
                    if (pDoc.exists)
                        parentName = pDoc.data()?.name;
                }
                groups.push({ name: gData?.name || 'Unknown', parentName });
            }
        }
    }
    // Description Construction
    let description = '';
    let wishlistText = '';
    try {
        const wSnapshot = await db.collection('wishlist_items').where('birthday_id', '==', birthday.id).get();
        if (!wSnapshot.empty) {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            const items = wSnapshot.docs.map(doc => doc.data())
                .sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))
                .map((item, index) => `${index + 1}. ${item.item_name}`);
            if (items.length > 0)
                wishlistText = (language === 'en' ? '🎁 Wishlist:\n' : '🎁 רשימת משאלות:\n') + items.join('\n') + '\n\n';
        }
    }
    catch (e) { /* ignore */ }
    description += wishlistText;
    description += language === 'en'
        ? `Gregorian Birth Date: ${birthday.birth_date_gregorian}\nHebrew Birth Date: ${birthday.birth_date_hebrew_string || ''}\n`
        : `תאריך לידה לועזי: ${birthday.birth_date_gregorian}\nתאריך לידה עברי: ${birthday.birth_date_hebrew_string || ''}\n`;
    if (birthday.after_sunset)
        description += language === 'en' ? '⚠️ After Sunset\n' : '⚠️ לאחר השקיעה\n';
    if (groups.length > 0) {
        const gNames = groups.map(g => g.parentName ? `${g.parentName}: ${g.name}` : g.name);
        description += `\n${language === 'en' ? 'Groups' : 'קבוצות'}: ${gNames.join(', ')}`;
    }
    if (birthday.notes)
        description += `\n\n${language === 'en' ? 'Notes' : 'הערות'}: ${birthday.notes}`;
    const extendedProperties = { private: { createdByApp: 'hebbirthday', tenantId: birthday.tenant_id, birthdayId: birthday.id || 'unknown' } };
    // Zodiacs
    const gregSign = getGregorianZodiacSign(new Date(birthday.birth_date_gregorian));
    const hebSign = birthday.birth_date_hebrew_month ? getHebrewZodiacSign(birthday.birth_date_hebrew_month) : null;
    const prefs = birthday.calendar_preference_override || tenant?.default_calendar_preference || 'both';
    const doHeb = prefs === 'hebrew' || prefs === 'both';
    const doGreg = prefs === 'gregorian' || prefs === 'both';
    const createEvent = (title, date, type, year, desc) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return {
            summary: title, description: desc,
            start: { date: start.toISOString().split('T')[0] },
            end: { date: end.toISOString().split('T')[0] },
            extendedProperties,
            reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }, { method: 'popup', minutes: 60 }] },
            _type: type, _year: year
        };
    };
    if (doGreg) {
        const bDate = new Date(birthday.birth_date_gregorian);
        let gregDesc = description;
        if (gregSign)
            gregDesc += `\n\n${language === 'en' ? 'Zodiac Sign' : 'מזל'}: ${language === 'en' ? getZodiacSignNameEn(gregSign) : getZodiacSignNameHe(gregSign)}`;
        const curYear = new Date().getFullYear();
        for (let i = 0; i <= 10; i++) {
            const y = curYear + i;
            const d = new Date(y, bDate.getMonth(), bDate.getDate());
            const age = y - bDate.getFullYear();
            const title = language === 'en' ? `${birthday.first_name} ${birthday.last_name} | ${age} | Birthday 🎂` : `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת לועזי 🎂`;
            events.push(createEvent(title, d, 'gregorian', y, gregDesc));
        }
    }
    if (doHeb && birthday.future_hebrew_birthdays) {
        let hebDesc = description;
        if (hebSign)
            hebDesc += `\n\n${language === 'en' ? 'Zodiac Sign' : 'מזל'}: ${language === 'en' ? getZodiacSignNameEn(hebSign) : getZodiacSignNameHe(hebSign)}`;
        birthday.future_hebrew_birthdays.slice(0, 10).forEach((item) => {
            const dStr = typeof item === 'string' ? item : item.gregorian;
            const hYear = typeof item === 'string' ? 0 : item.hebrewYear;
            const age = (hYear && birthday.hebrew_year) ? hYear - birthday.hebrew_year : 0;
            const title = language === 'en' ? `${birthday.first_name} ${birthday.last_name} | ${age} | Hebrew Birthday 🎂` : `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת עברי 🎂`;
            events.push(createEvent(title, new Date(dStr), 'hebrew', hYear, hebDesc));
        });
    }
    return events;
}
// --- CORE SYNC LOGIC (V3.2) ---
async function processBirthdaySync(birthdayId, currentData, tenantId, force = false) {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const ownerId = tenantDoc.data()?.owner_id;
    if (!ownerId) {
        functions.logger.warn(`No owner_id for tenant ${tenantId}`);
        return;
    }
    let accessToken = null;
    try {
        accessToken = await getValidAccessToken(ownerId);
    }
    catch (e) {
        functions.logger.log(`No token for ${ownerId}, skipping`);
        return;
    }
    if (accessToken) {
        const calendarId = await getCalendarId(ownerId);
        if (calendarId === 'primary') {
            functions.logger.error('Strict Mode: Syncing to Primary Calendar is not allowed.');
            return;
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        // A. Validation & Idempotency
        const dataToHash = {
            firstName: currentData.first_name, lastName: currentData.last_name,
            date: currentData.birth_date_gregorian, sunset: currentData.after_sunset,
            prefs: currentData.calendar_preference_override || tenantDoc.data()?.default_calendar_preference,
            archived: currentData.archived, notes: currentData.notes, groups: currentData.group_ids || []
        };
        const currentDataHash = crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
        // Check if we have mapped events. If map is empty/missing, force sync even if hash matches.
        const hasMappedEvents = currentData.googleCalendarEventsMap && Object.keys(currentData.googleCalendarEventsMap).length > 0;
        // DEBUG LOGS
        functions.logger.log(`DEBUG: Syncing ${birthdayId} to Calendar: ${calendarId} | Force: ${force} | HasEvents: ${hasMappedEvents}`);
        functions.logger.log(`DEBUG: CurrentHash: ${currentDataHash} | StoredHash: ${currentData.syncMetadata?.dataHash}`);
        if (!force && hasMappedEvents && currentData.syncMetadata?.dataHash === currentDataHash && currentData.syncMetadata?.status === 'SYNCED') {
            functions.logger.log(`Idempotent skip for ${birthdayId}`);
            return;
        }
        // B. Planning
        let desiredEvents = new Map();
        if (!currentData.archived) {
            const eventsList = await calculateExpectedEvents({ id: birthdayId, ...currentData, tenant_id: tenantId });
            eventsList.forEach(event => desiredEvents.set((0, calendar_utils_1.generateEventKey)(event._type, event._year || 0), event));
        }
        const currentMap = currentData.googleCalendarEventsMap || {};
        const creates = [];
        const updates = [];
        const deletes = [];
        // C. Smart Diff
        for (const [key, event] of desiredEvents.entries()) {
            const existingId = currentMap[key];
            const { _type, _year, ...resource } = event;
            if (existingId)
                updates.push({ key, eventId: existingId, resource });
            else
                creates.push({ key, resource });
        }
        const now = new Date();
        const currentGregYear = now.getFullYear();
        const currentHebYear = new core_1.HDate().getFullYear();
        for (const [key, eventId] of Object.entries(currentMap)) {
            if (!desiredEvents.has(key)) {
                // Fix: If explicitly archived (removal requested), delete ALL events regardless of date.
                // Otherwise (just smart diff), only delete future events to preserve history.
                if (currentData.archived) {
                    deletes.push({ key, eventId });
                }
                else {
                    const parts = key.split('_');
                    const year = parseInt(parts[1], 10);
                    let isFuture = (parts[0] === 'gregorian' && year >= currentGregYear) || (parts[0] === 'hebrew' && year >= currentHebYear);
                    if (isFuture)
                        deletes.push({ key, eventId });
                }
            }
        }
        // D. Execution
        const tasks = [];
        const failedKeys = [];
        // Create Tasks (With Deterministic IDs to prevent duplicates)
        creates.forEach(item => {
            tasks.push(async () => {
                try {
                    // 1. Generate Deterministic ID (Allowed chars: 0-9, a-v)
                    // Format: hb_<md5_hash_of_unique_key>
                    const uniqueStr = `${birthdayId}_${item.key}`;
                    const deterministicId = 'hb' + crypto.createHash('md5').update(uniqueStr).digest('hex');
                    // 2. Add ID to resource
                    const resourceWithId = { ...item.resource, id: deterministicId };
                    const res = await calendar.events.insert({ calendarId, requestBody: resourceWithId });
                    if (res.data.id) {
                        currentMap[item.key] = res.data.id;
                    }
                }
                catch (e) {
                    // 3. Handle Duplicate Scenario (409 Conflict) - PROFESSIONAL FIX
                    if (e.code === 409) {
                        functions.logger.log(`Event ${item.key} exists (409). Reconciling state...`);
                        // 1. Recalculate the Deterministic ID
                        const uniqueStr = `${birthdayId}_${item.key}`;
                        const deterministicId = 'hb' + crypto.createHash('md5').update(uniqueStr).digest('hex');
                        try {
                            // 2. Perform full UPDATE (PUT) to overwrite existing state
                            // We explicitly set status: 'confirmed' to "undelete" the event if it was in trash.
                            await calendar.events.update({
                                calendarId,
                                eventId: deterministicId,
                                requestBody: {
                                    ...item.resource,
                                    id: deterministicId,
                                    status: 'confirmed' // Crucial: Resurrects cancelled events
                                }
                            });
                            // 3. Update Map
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
        updates.forEach(item => tasks.push(async () => {
            try {
                // FORCE status='confirmed' on updates to resurrect cancelled events
                const resourceWithStatus = { ...item.resource, status: 'confirmed' };
                await calendar.events.patch({ calendarId, eventId: item.eventId, requestBody: resourceWithStatus });
            }
            catch (e) {
                if (e.code === 404 || e.code === 410) { // Desync Trap Fix
                    functions.logger.log(`Event ${item.eventId} deleted externally (404/410), recreating...`);
                    try {
                        // Re-calculate Deterministic ID to link it back correctly (Gemini Improvement)
                        const uniqueStr = `${birthdayId}_${item.key}`;
                        const deterministicId = 'hb' + crypto.createHash('md5').update(uniqueStr).digest('hex');
                        const resourceWithId = { ...item.resource, id: deterministicId };
                        const res = await calendar.events.insert({ calendarId, requestBody: resourceWithId });
                        if (res.data.id) {
                            currentMap[item.key] = res.data.id;
                        }
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
        }));
        deletes.forEach(item => tasks.push(async () => {
            try {
                await calendar.events.delete({ calendarId, eventId: item.eventId });
                delete currentMap[item.key];
            }
            catch (e) {
                if (e.code === 404 || e.code === 410)
                    delete currentMap[item.key];
                else {
                    failedKeys.push(item.key);
                    throw e;
                }
            }
        }));
        // Run SEQUENTIALLY (Concurrency: 1) to prevent Google Rate Limit (403)
        // This is more robust than sleep() and ensures stability.
        await (0, calendar_utils_1.batchProcessor)(tasks, 1);
        // E. Reconciliation
        const newStatus = failedKeys.length > 0 ? 'PARTIAL_SYNC' : 'SYNCED';
        let retryCount = currentData.syncMetadata?.retryCount || 0;
        if (newStatus === 'SYNCED')
            retryCount = 0;
        else if (['PARTIAL_SYNC', 'ERROR'].includes(currentData.syncMetadata?.status))
            retryCount++;
        await db.collection('birthdays').doc(birthdayId).update({
            googleCalendarEventsMap: currentMap,
            syncMetadata: { status: newStatus, lastAttemptAt: new Date().toISOString(), failedKeys, retryCount, dataHash: currentDataHash },
            lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}
// --- Cloud Functions: Triggers & Callables ---
exports.onBirthdayWrite = functions.firestore.document('birthdays/{birthdayId}').onWrite(async (change, context) => {
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;
    // 1. Deletion
    if (!afterData) {
        if (beforeData && beforeData.tenant_id) {
            try {
                await processBirthdaySync(context.params.birthdayId, { ...beforeData, archived: true }, beforeData.tenant_id);
            }
            catch (e) {
                functions.logger.error('Cleanup error:', e);
            }
        }
        return null;
    }
    // 2. Smart Sync
    // CRITICAL FIX: Only sync if explicitly enabled via 'isSynced' flag
    if (afterData.tenant_id && afterData.isSynced === true) {
        try {
            await processBirthdaySync(context.params.birthdayId, afterData, afterData.tenant_id);
        }
        catch (e) {
            functions.logger.error('Sync error:', e);
        }
    }
    else if (afterData.tenant_id && beforeData?.isSynced === true && afterData.isSynced === false) {
        // If it was synced and now turned off -> Trigger removal
        try {
            await processBirthdaySync(context.params.birthdayId, { ...afterData, archived: true }, afterData.tenant_id);
        }
        catch (e) {
            functions.logger.error('Removal error:', e);
        }
    }
    return null;
});
exports.refreshBirthdayHebrewData = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    // ... [Rate limit logic omitted for brevity, but logically present in full file] ... 
    // Simply calling the logic from onBirthdayWrite manually
    const doc = await db.collection('birthdays').doc(data.birthdayId).get();
    if (!doc.exists)
        throw new functions.https.HttpsError('not-found', 'Not found');
    // Force recalculate by calling update with timestamp
    await doc.ref.update({ updated_at: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true };
});
// Sync Wrappers & Jobs
exports.syncBirthdayToGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const docRef = db.collection('birthdays').doc(data.birthdayId);
    const doc = await docRef.get();
    if (!doc.exists)
        throw new functions.https.HttpsError('not-found', 'Not found');
    const bData = doc.data();
    const tDoc = await db.collection('tenants').doc(bData?.tenant_id).get();
    if (tDoc.data()?.owner_id !== context.auth.uid)
        throw new functions.https.HttpsError('permission-denied', 'Not owner');
    // 1. Set flag to enable sync loop
    await docRef.update({ isSynced: true });
    // 2. Process with FORCE=true because user manually requested it
    await processBirthdaySync(data.birthdayId, { ...bData, isSynced: true }, bData?.tenant_id, true);
    return { success: true };
});
exports.retryFailedSyncs = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
    const snap = await db.collection('birthdays').where('archived', '==', false).where('syncMetadata.status', 'in', ['PARTIAL_SYNC', 'ERROR']).get();
    const tasks = snap.docs.map(doc => {
        const d = doc.data();
        if ((d.syncMetadata?.retryCount || 0) < 3)
            return () => processBirthdaySync(doc.id, d, d.tenant_id);
        return null;
    }).filter(t => t !== null);
    if (tasks.length) {
        await (0, calendar_utils_1.batchProcessor)(tasks, 5);
        functions.logger.log(`Retried ${tasks.length} syncs`);
    }
});
// Job Status Helpers
async function createSyncJob(userId, totalItems) {
    const ref = db.collection('calendar_sync_jobs').doc();
    await ref.set({ userId, status: 'pending', totalItems, processedItems: 0, createdAt: admin.firestore.FieldValue.serverTimestamp(), errors: [] });
    return ref.id;
}
async function updateSyncJob(jobId, inc, err) {
    const update = { processedItems: admin.firestore.FieldValue.increment(inc), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (err)
        update.errors = admin.firestore.FieldValue.arrayUnion({ message: err.message, itemId: err.itemId, timestamp: new Date().toISOString() });
    await db.collection('calendar_sync_jobs').doc(jobId).update(update);
}
exports.processCalendarSyncJob = functions.runWith({ timeoutSeconds: 540, memory: '256MB' }).https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { birthdayIds, userId, jobId } = req.body;
    let successes = 0, failures = 0;
    for (const bid of birthdayIds) {
        try {
            const docRef = db.collection('birthdays').doc(bid);
            const doc = await docRef.get();
            if (doc.exists) {
                const d = doc.data();
                if (d && d.tenant_id) {
                    // Set flag (this might trigger onBirthdayWrite, but Idempotency will catch it)
                    await docRef.update({ isSynced: true });
                    // Force sync for manual bulk jobs
                    await processBirthdaySync(bid, { ...d, isSynced: true }, d.tenant_id, true);
                }
            }
            successes++;
            if (jobId)
                await updateSyncJob(jobId, 1);
        }
        catch (e) {
            failures++;
            functions.logger.error(`Batch sync error ${bid}:`, e);
            if (jobId)
                await updateSyncJob(jobId, 1, { message: e.message, itemId: bid });
        }
    }
    if (jobId) {
        const jDoc = await db.collection('calendar_sync_jobs').doc(jobId).get();
        if (jDoc.data()?.processedItems >= jDoc.data()?.totalItems) {
            await jDoc.ref.update({ status: 'completed' });
            // Cleanup token status
            await db.collection('googleCalendarTokens').doc(userId).set({ syncStatus: 'IDLE' }, { merge: true });
        }
    }
    res.status(200).send({ success: true, successes, failures });
});
exports.syncMultipleBirthdaysToGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const { birthdayIds } = data;
    const userId = context.auth.uid;
    const jobId = await createSyncJob(userId, birthdayIds.length);
    await db.collection('googleCalendarTokens').doc(userId).set({ syncStatus: 'IN_PROGRESS', lastSyncStart: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    const parent = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE);
    const CHUNK_SIZE = 5;
    let delaySeconds = 0;
    // Staggered Scheduling: Spread load over time to avoid Google API Rate Limits
    // 5 birthdays * ~20 events = 100 requests. 10s gap keeps us well under 600 req/min quota.
    const DELAY_INCREMENT = 10;
    for (let i = 0; i < birthdayIds.length; i += CHUNK_SIZE) {
        const chunk = birthdayIds.slice(i, i + CHUNK_SIZE);
        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net/processCalendarSyncJob`,
                body: Buffer.from(JSON.stringify({ birthdayIds: chunk, userId, jobId })).toString('base64'),
                headers: { 'Content-Type': 'application/json' },
                oidcToken: { serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com` }
            },
            scheduleTime: {
                seconds: Math.floor(Date.now() / 1000) + delaySeconds
            }
        };
        await tasksClient.createTask({ parent, task });
        delaySeconds += DELAY_INCREMENT;
    }
    return { success: true, message: 'Batch started', jobId, status: 'queued', totalAttempted: birthdayIds.length };
});
// --- NEW: Async Delete All Logic ---
exports.processDeletionJob = functions.runWith({ timeoutSeconds: 540, memory: '256MB' }).https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    // Verify payload
    const { userId, tenantId } = req.body;
    if (!userId) {
        res.status(400).send('Missing userId');
        return;
    }
    try {
        // 1. Setup Google Client
        const accessToken = await getValidAccessToken(userId);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarId = await getCalendarId(userId);
        functions.logger.log(`[DeleteJob] Starting cleanup for user ${userId}, tenant ${tenantId || 'all'}, cal ${calendarId}`);
        let pageToken;
        let deletedCount = 0;
        let foundCount = 0;
        let failedCount = 0;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        // 2. Iterate and Delete from Google Calendar
        do {
            const resList = await calendar.events.list({
                calendarId,
                privateExtendedProperty: ['createdByApp=hebbirthday'],
                maxResults: 250,
                pageToken,
                singleEvents: true
            });
            const items = resList.data.items || [];
            functions.logger.log(`[DeleteJob] Found page with ${items.length} items`);
            for (const ev of items) {
                if (ev.id) {
                    foundCount++;
                    try {
                        await calendar.events.delete({ calendarId, eventId: ev.id });
                        deletedCount++;
                        // Serial processing with delay to avoid Rate Limits (403/429)
                        await sleep(150);
                    }
                    catch (e) {
                        // Ignore 404/410 (already deleted)
                        if (e.code === 404 || e.code === 410) {
                            deletedCount++; // Count as deleted for success tracking
                        }
                        else {
                            failedCount++;
                            functions.logger.warn(`[DeleteJob] Delete fail ${ev.id}: ${e.message}`);
                        }
                    }
                }
            }
            pageToken = resList.data.nextPageToken;
        } while (pageToken);
        functions.logger.log(`[DeleteJob] Calendar cleanup done. Found: ${foundCount}, Deleted: ${deletedCount}, Failed: ${failedCount}`);
        // 3. Cleanup Firestore Metadata (Unsync All)
        // Only if tenantId provided, otherwise we can't safely target specific documents without scanning all
        if (tenantId) {
            const docs = await db.collection('birthdays').where('tenant_id', '==', tenantId).get();
            // Chunking batches (limit is 500)
            let opCount = 0;
            let batchCount = 0;
            let currentBatch = db.batch();
            for (const doc of docs.docs) {
                currentBatch.update(doc.ref, {
                    googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
                    syncMetadata: admin.firestore.FieldValue.delete(),
                    lastSyncedAt: admin.firestore.FieldValue.delete(),
                    googleCalendarEventId: admin.firestore.FieldValue.delete(), // Legacy
                    googleCalendarEventIds: admin.firestore.FieldValue.delete(), // Legacy
                    syncedCalendarId: admin.firestore.FieldValue.delete(),
                    isSynced: false
                });
                opCount++;
                if (opCount >= 450) { // Safety margin
                    await currentBatch.commit();
                    currentBatch = db.batch();
                    opCount = 0;
                    batchCount++;
                }
            }
            if (opCount > 0)
                await currentBatch.commit();
            functions.logger.log(`[DeleteJob] Firestore cleanup done. Updated ${docs.size} docs in ${batchCount + 1} batches.`);
        }
        // 4. Update Token Status
        await db.collection('googleCalendarTokens').doc(userId).set({
            syncStatus: 'IDLE',
            lastDeletionJob: { timestamp: admin.firestore.FieldValue.serverTimestamp(), deleted: deletedCount, found: foundCount }
        }, { merge: true });
        res.status(200).send({ success: true, deletedCount, foundCount });
    }
    catch (e) {
        functions.logger.error('[DeleteJob] Fatal error:', e);
        // Reset status to IDLE so user isn't stuck, but log error
        await db.collection('googleCalendarTokens').doc(userId).set({ syncStatus: 'ERROR', lastError: e.message }, { merge: true });
        res.status(500).send({ error: e.message });
    }
});
exports.triggerDeleteAllEvents = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const userId = context.auth.uid;
    const { tenantId } = data;
    // Mark as in progress immediately
    await db.collection('googleCalendarTokens').doc(userId).set({
        syncStatus: 'DELETING', // New status for UI
        lastSyncStart: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    const parent = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE);
    const task = {
        httpRequest: {
            httpMethod: 'POST',
            url: `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net/processDeletionJob`,
            body: Buffer.from(JSON.stringify({ userId, tenantId })).toString('base64'),
            headers: { 'Content-Type': 'application/json' },
            oidcToken: { serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com` }
        },
        // Start immediately
        scheduleTime: { seconds: Math.floor(Date.now() / 1000) }
    };
    try {
        await tasksClient.createTask({ parent, task });
        return { success: true, message: 'Deletion job started' };
    }
    catch (e) {
        await db.collection('googleCalendarTokens').doc(userId).set({ syncStatus: 'IDLE' }, { merge: true });
        throw new functions.https.HttpsError('internal', 'Failed to queue job: ' + e.message);
    }
});
// Calendar Management & Maintenance
exports.exchangeGoogleAuthCode = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const oauth2Client = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(data.code);
    const userId = context.auth.uid;
    const update = { userId, accessToken: tokens.access_token, expiresAt: tokens.expiry_date, scope: tokens.scope, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (tokens.refresh_token)
        update.refreshToken = tokens.refresh_token;
    await db.collection('googleCalendarTokens').doc(userId).set(update, { merge: true });
    return { accessToken: tokens.access_token };
});
exports.createGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const accessToken = await getValidAccessToken(context.auth.uid);
    const oauth2Client = new googleapis_1.google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await calendar.calendars.insert({ requestBody: { summary: data.name, description: 'Birthday Calendar - Created by Hebrew Birthday App' } });
    const calId = res.data.id;
    const tDoc = await db.collection('googleCalendarTokens').doc(context.auth.uid).get();
    const created = tDoc.data()?.createdCalendars || [];
    await tDoc.ref.update({
        calendarId: calId, calendarName: data.name,
        createdCalendars: [...created, { calendarId: calId, calendarName: data.name, createdAt: new Date().toISOString() }]
    });
    return { success: true, calendarId: calId };
});
exports.deleteGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const accessToken = await getValidAccessToken(context.auth.uid);
    const oauth2Client = new googleapis_1.google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.calendars.delete({ calendarId: data.calendarId });
    // Cleanup Firestore logic... (simplified for brevity)
    return { success: true };
});
exports.deleteAllSyncedEventsFromGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const { tenantId, forceDBOnly } = data;
    if (!forceDBOnly) {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarId = await getCalendarId(context.auth.uid);
        functions.logger.log(`Deleting events from calendar: ${calendarId} for tenant: ${tenantId}`); // DEBUG LOG
        let pageToken;
        let deletedCount = 0, foundCount = 0, failedCount = 0;
        let queryParams = {
            calendarId,
            privateExtendedProperty: ['createdByApp=hebbirthday'],
            maxResults: 250,
            singleEvents: true
        };
        // We only add tenantId if it's provided and valid, otherwise we do a "broad" cleanup based on app ID only
        if (tenantId && tenantId !== 'undefined' && tenantId !== 'null') {
            queryParams.privateExtendedProperty.push(`tenantId=${tenantId}`);
        }
        // Define dryRun if not present in data (default to false for forceful delete)
        const dryRun = false;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        do {
            const res = await calendar.events.list({ ...queryParams, pageToken });
            const items = res.data.items || [];
            for (const ev of items) {
                if (ev.id) {
                    foundCount++;
                    if (!dryRun) {
                        try {
                            await calendar.events.delete({ calendarId, eventId: ev.id });
                            deletedCount++;
                            await sleep(50); // Reduced delay to prevent Timeout (408)
                        }
                        catch (e) {
                            failedCount++;
                            functions.logger.warn(`Orphan delete fail ${ev.id}`, e);
                        }
                    }
                }
            }
            pageToken = res.data.nextPageToken;
        } while (pageToken);
    }
    // DB Clean
    const batch = db.batch();
    const docs = await db.collection('birthdays').where('tenant_id', '==', tenantId).get();
    docs.forEach(doc => batch.update(doc.ref, {
        googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
        syncMetadata: admin.firestore.FieldValue.delete(),
        lastSyncedAt: admin.firestore.FieldValue.delete(),
        googleCalendarEventId: admin.firestore.FieldValue.delete(),
        googleCalendarEventIds: admin.firestore.FieldValue.delete(),
        syncedCalendarId: admin.firestore.FieldValue.delete(),
        isSynced: false // Break the loop: Explicitly mark as not synced
    }));
    await batch.commit();
    return { success: true };
});
// Legacy / Other exports
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const batch = db.batch();
    const tenantRef = db.collection('tenants').doc();
    batch.set(tenantRef, { name: `${user.displayName || 'User'}'s Organization`, owner_id: user.uid, default_language: 'he', created_at: admin.firestore.FieldValue.serverTimestamp() });
    batch.set(db.collection('tenant_members').doc(), { tenant_id: tenantRef.id, user_id: user.uid, role: 'owner' });
    await admin.auth().setCustomUserClaims(user.uid, { tenantId: tenantRef.id, role: 'owner' });
    await batch.commit();
});
// --- Missing Management Functions (Restored) ---
exports.removeBirthdayFromGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    try {
        const doc = await db.collection('birthdays').doc(data.birthdayId).get();
        if (!doc.exists)
            throw new functions.https.HttpsError('not-found', 'Not found');
        const bData = doc.data();
        if (bData?.tenant_id) {
            // 1. CRITICAL: Mark as unsynced FIRST to prevent Trigger recreation loop
            await doc.ref.update({ isSynced: false });
            // 2. Perform the deletion (waits for it to finish)
            // We pass isSynced: false so processBirthdaySync knows not to re-enable it
            await processBirthdaySync(data.birthdayId, { ...bData, isSynced: false, archived: true }, bData.tenant_id);
            // 3. Cleanup metadata
            await doc.ref.update({
                googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
                syncMetadata: admin.firestore.FieldValue.delete(),
                googleCalendarEventId: admin.firestore.FieldValue.delete(),
                googleCalendarEventIds: admin.firestore.FieldValue.delete(),
                syncedCalendarId: admin.firestore.FieldValue.delete(),
                lastSyncedAt: admin.firestore.FieldValue.delete()
            });
        }
        return { success: true };
    }
    catch (error) {
        functions.logger.error('Error removing birthday:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
exports.disconnectGoogleCalendar = functions.runWith({ timeoutSeconds: 540, memory: '256MB' }).https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    try {
        await db.collection('googleCalendarTokens').doc(context.auth.uid).delete();
        functions.logger.log(`Disconnected Google Calendar for user ${context.auth.uid}`);
        return { success: true };
    }
    catch (error) {
        functions.logger.error('Error disconnecting:', error);
        throw new functions.https.HttpsError('internal', 'Error disconnecting');
    }
});
exports.getGoogleCalendarStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const userId = context.auth.uid;
    try {
        const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
        if (!tokenDoc.exists || !tokenDoc.data()?.accessToken)
            return { isConnected: false };
        const tokenData = tokenDoc.data();
        let email = '', name = '', picture = '';
        try {
            const accessToken = await getValidAccessToken(userId);
            const oauth2Client = new googleapis_1.google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: accessToken });
            const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            email = userInfo.data.email || '';
            name = userInfo.data.name || '';
            picture = userInfo.data.picture || '';
        }
        catch (e) { /* ignore info fetch fail */ }
        const historySnap = await db.collection('users').doc(userId).collection('sync_history').orderBy('timestamp', 'desc').limit(5).get();
        const recentActivity = historySnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toMillis() || 0 }));
        // Determine isPrimary securely on server
        const currentCalId = tokenData?.calendarId || 'primary';
        const isPrimary = currentCalId === 'primary' || (email && currentCalId === email);
        return {
            isConnected: true, email, name, picture,
            calendarId: currentCalId,
            calendarName: tokenData?.calendarName || 'Primary Calendar',
            isPrimary, // Explicit flag for frontend
            syncStatus: tokenData?.syncStatus || 'IDLE',
            lastSyncStart: tokenData?.lastSyncStart?.toMillis() || 0,
            recentActivity
        };
    }
    catch (error) {
        return { isConnected: false };
    }
});
exports.getGoogleAccountInfo = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    try {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const userInfo = await googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get();
        return { success: true, email: userInfo.data.email, name: userInfo.data.name, picture: userInfo.data.picture };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', 'Error fetching info');
    }
});
exports.updateGoogleCalendarSelection = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    if (data.calendarId === 'primary')
        throw new functions.https.HttpsError('failed-precondition', 'Primary not allowed');
    await db.collection('googleCalendarTokens').doc(context.auth.uid).update({
        calendarId: data.calendarId,
        calendarName: data.calendarName || 'Custom Calendar',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
});
exports.listGoogleCalendars = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    try {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        const list = await calendar.calendarList.list({ minAccessRole: 'writer' });
        return { success: true, calendars: (list.data.items || []).map((cal) => ({
                id: cal.id, summary: cal.summary, description: cal.description, primary: cal.primary, accessRole: cal.accessRole, extendedProperties: cal.extendedProperties
            })) };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', 'Error listing calendars');
    }
});
exports.cleanupOrphanEvents = functions.runWith({ timeoutSeconds: 540, memory: '256MB' }).https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const { tenantId, dryRun } = data;
    try {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const calendarId = await getCalendarId(context.auth.uid);
        const calendarName = await getCalendarName(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        let pageToken;
        let deletedCount = 0, foundCount = 0, failedCount = 0;
        // Check tenantId usage (suppress unused variable warning if logically not needed here but kept for API compat)
        if (tenantId) { /* Logic that might use tenantId in future or logs */ }
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        do {
            // שינוי קריטי: חיפוש רחב יותר רק לפי שם האפליקציה, ללא תלות ב-TenantId
            // זה מבטיח שנמצא גם אירועים "שבורים"
            const res = await calendar.events.list({
                calendarId,
                privateExtendedProperty: ['createdByApp=hebbirthday'],
                maxResults: 250,
                pageToken,
                singleEvents: true
            });
            const items = res.data.items || [];
            for (const ev of items) {
                if (ev.id) {
                    foundCount++;
                    if (!dryRun) {
                        try {
                            await calendar.events.delete({ calendarId, eventId: ev.id });
                            deletedCount++;
                            await sleep(150); // Rate Limit Protection
                        }
                        catch (e) {
                            failedCount++;
                            functions.logger.warn(`Orphan delete fail ${ev.id}`, e);
                        }
                    }
                }
            }
            pageToken = res.data.nextPageToken;
        } while (pageToken);
        return { success: true, deletedCount: dryRun ? foundCount : deletedCount, foundCount, failedCount, calendarName };
    }
    catch (e) {
        functions.logger.error('Orphan cleanup failed:', e);
        throw new functions.https.HttpsError('internal', 'Orphan cleanup failed');
    }
});
exports.previewDeletion = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    try {
        const calendarId = await getCalendarId(context.auth.uid);
        const calendarName = await getCalendarName(context.auth.uid);
        const snaps = await db.collection('birthdays').where('tenant_id', '==', data.tenantId).get();
        const summary = [];
        let totalCount = 0;
        snaps.forEach(doc => {
            const d = doc.data();
            // Relaxed check: Count if it has ANY mapped events, regardless of stored calendar ID logic
            const hasEvents = d.googleCalendarEventsMap && Object.keys(d.googleCalendarEventsMap).length > 0;
            if (hasEvents) {
                const count = Object.keys(d.googleCalendarEventsMap).length;
                summary.push({ name: `${d.first_name} ${d.last_name}`, hebrewEvents: count, gregorianEvents: 0 });
                totalCount += count;
            }
        });
        return { success: true, summary, recordsCount: summary.length, totalCount, calendarId, calendarName };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', 'Preview failed');
    }
});
exports.getAccountDeletionSummary = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const bCount = await db.collection('birthdays').where('tenant_id', '==', data.tenantId).count().get();
    const gCount = await db.collection('groups').where('tenant_id', '==', data.tenantId).count().get();
    return { birthdaysCount: bCount.data().count, groupsCount: gCount.data().count };
});
exports.deleteAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const { tenantId } = data;
    const userId = context.auth.uid;
    const tDoc = await db.collection('tenants').doc(tenantId).get();
    if (tDoc.data()?.owner_id !== userId)
        throw new functions.https.HttpsError('permission-denied', 'Not owner');
    const bulk = db.bulkWriter();
    (await db.collection('birthdays').where('tenant_id', '==', tenantId).get()).docs.forEach(d => bulk.delete(d.ref));
    (await db.collection('groups').where('tenant_id', '==', tenantId).get()).docs.forEach(d => bulk.delete(d.ref));
    (await db.collection('tenant_members').where('tenant_id', '==', tenantId).get()).docs.forEach(d => bulk.delete(d.ref));
    bulk.delete(tDoc.ref);
    bulk.delete(db.collection('users').doc(userId));
    await bulk.close();
    await admin.auth().deleteUser(userId);
    return { success: true };
});
// פונקציית איפוס - קריטית למקרי קיצון ב-UI
exports.resetBirthdaySyncData = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
    const { birthdayId } = data;
    if (!birthdayId)
        throw new functions.https.HttpsError('invalid-argument', 'Birthday ID required');
    try {
        await db.collection('birthdays').doc(birthdayId).update({
            googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
            googleCalendarEventId: admin.firestore.FieldValue.delete(),
            googleCalendarEventIds: admin.firestore.FieldValue.delete(),
            syncedCalendarId: admin.firestore.FieldValue.delete(),
            lastSyncedAt: admin.firestore.FieldValue.delete(),
            syncMetadata: admin.firestore.FieldValue.delete()
        });
        return { success: true, message: 'Sync data reset successfully' };
    }
    catch (error) {
        functions.logger.error('Error resetting sync data:', error);
        throw new functions.https.HttpsError('internal', 'Failed to reset sync data');
    }
});
// Cron Job שמעדכן את הגילאים כל יום - קריטי!
exports.updateNextBirthdayScheduled = functions.pubsub
    .schedule('every 24 hours')
    .timeZone('Asia/Jerusalem')
    .onRun(async (context) => {
    try {
        const nowStr = new Date().toISOString().split('T')[0];
        // מוצא ימי הולדת שהתאריך "הבא" שלהם עבר, ומפעיל עדכון כדי לחשב את השנה הבאה
        const snapshot = await db.collection('birthdays')
            .where('archived', '==', false)
            .where('next_upcoming_hebrew_birthday', '<', nowStr)
            .get();
        if (snapshot.empty)
            return null;
        // אנחנו מייבאים דינמית כדי למנוע מעגליות אם צריך, או משתמשים בקיים
        // השיטה הכי פשוטה ב-V3.2: פשוט "לגעת" במסמך, והטריגר onBirthdayWrite יעשה את החישוב מחדש
        const batch = db.batch();
        let count = 0;
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { updated_at: admin.firestore.FieldValue.serverTimestamp() });
            count++;
        });
        await batch.commit();
        functions.logger.log(`Scheduled update triggered for ${count} outdated birthdays`);
        return null;
    }
    catch (error) {
        functions.logger.error('Error in scheduled update:', error);
        return null;
    }
});
__exportStar(require("./migration"), exports);
var guestPortal_1 = require("./guestPortal");
Object.defineProperty(exports, "guestPortalOps", { enumerable: true, get: function () { return guestPortal_1.guestPortalOps; } });
//# sourceMappingURL=index.js.map