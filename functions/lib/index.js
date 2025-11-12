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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGoogleCalendars = exports.updateGoogleCalendarSelection = exports.createGoogleCalendar = exports.getGoogleAccountInfo = exports.disconnectGoogleCalendar = exports.deleteAllSyncedEventsFromGoogleCalendar = exports.removeBirthdayFromGoogleCalendar = exports.syncMultipleBirthdaysToGoogleCalendar = exports.syncBirthdayToGoogleCalendar = exports.onUserCreate = exports.migrateExistingUsers = exports.fixAllBirthdaysHebrewYear = exports.fixExistingBirthdays = exports.updateNextBirthdayScheduled = exports.refreshBirthdayHebrewData = exports.onBirthdayWrite = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const googleapis_1 = require("googleapis");
admin.initializeApp();
const db = admin.firestore();
async function fetchHebcalData(gregorianDate, afterSunset) {
    const year = gregorianDate.getFullYear();
    const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
    const day = String(gregorianDate.getDate()).padStart(2, '0');
    const params = new URLSearchParams({
        cfg: 'json',
        gy: year.toString(),
        gm: month,
        gd: day,
        g2h: '1',
        lg: 's',
    });
    if (afterSunset) {
        params.append('gs', 'on');
    }
    const url = `https://www.hebcal.com/converter?${params.toString()}`;
    try {
        const response = await (0, node_fetch_1.default)(url);
        if (!response.ok) {
            throw new Error(`Hebcal API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        functions.logger.error('Error fetching Hebcal data:', error);
        throw error;
    }
}
async function getCurrentHebrewYear() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const params = new URLSearchParams({
        cfg: 'json',
        gy: year.toString(),
        gm: month,
        gd: day,
        g2h: '1',
    });
    try {
        const response = await (0, node_fetch_1.default)(`https://www.hebcal.com/converter?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to get current Hebrew year');
        }
        const data = await response.json();
        return data.hy;
    }
    catch (error) {
        functions.logger.error('Error getting current Hebrew year:', error);
        throw error;
    }
}
async function fetchNextHebrewBirthdays(startHebrewYear, hebrewMonth, hebrewDay, yearsAhead = 10) {
    const futureDates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    functions.logger.log(`Fetching future dates starting from Hebrew year: ${startHebrewYear}, month: ${hebrewMonth}, day: ${hebrewDay}`);
    const fetchPromises = [];
    for (let i = 0; i <= yearsAhead; i++) {
        const yearToFetch = startHebrewYear + i;
        const params = new URLSearchParams({
            cfg: 'json',
            hy: yearToFetch.toString(),
            hm: hebrewMonth,
            hd: hebrewDay.toString(),
            h2g: '1',
        });
        const url = `https://www.hebcal.com/converter?${params.toString()}`;
        fetchPromises.push((0, node_fetch_1.default)(url)
            .then((response) => {
            if (!response.ok) {
                functions.logger.warn(`Response not OK for year ${yearToFetch}: ${response.status}`);
                return null;
            }
            return response.json();
        })
            .then((data) => {
            if (data && data.gy && data.gm && data.gd) {
                const date = new Date(data.gy, data.gm - 1, data.gd);
                date.setHours(0, 0, 0, 0);
                functions.logger.log(`Year ${yearToFetch} -> ${date.toISOString().split('T')[0]} (${date >= today ? 'FUTURE' : 'PAST'})`);
                if (date >= today) {
                    return { gregorianDate: date, hebrewYear: yearToFetch };
                }
            }
            return null;
        })
            .catch((error) => {
            functions.logger.error(`Error fetching Hebrew year ${yearToFetch}:`, error);
            return null;
        }));
    }
    const results = await Promise.all(fetchPromises);
    futureDates.push(...results.filter((date) => date !== null));
    functions.logger.log(`Total future dates found: ${futureDates.length}`);
    return futureDates.sort((a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime());
}
exports.onBirthdayWrite = functions.firestore
    .document('birthdays/{birthdayId}')
    .onWrite(async (change, context) => {
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;
    if (!afterData) {
        return null;
    }
    if (!afterData.birth_date_gregorian) {
        functions.logger.warn('No birth_date_gregorian found, skipping');
        return null;
    }
    const hasHebrewData = afterData.birth_date_hebrew_string &&
        afterData.birth_date_hebrew_year &&
        afterData.birth_date_hebrew_month &&
        afterData.birth_date_hebrew_day &&
        afterData.next_upcoming_hebrew_birthday &&
        afterData.future_hebrew_birthdays &&
        afterData.future_hebrew_birthdays.length > 0;
    if (beforeData) {
        const birthDateChanged = beforeData.birth_date_gregorian !== afterData.birth_date_gregorian;
        const afterSunsetChanged = beforeData.after_sunset !== afterData.after_sunset;
        if (!birthDateChanged && !afterSunsetChanged) {
            functions.logger.log('No relevant changes detected, skipping calculation');
            return null;
        }
        if (hasHebrewData && !birthDateChanged && !afterSunsetChanged) {
            functions.logger.log('Birthday already has Hebrew data and no changes, skipping calculation');
            return null;
        }
    }
    if (hasHebrewData && !beforeData) {
        functions.logger.log('New birthday already has Hebrew data, skipping calculation');
        return null;
    }
    try {
        const birthDateStr = afterData.birth_date_gregorian;
        const birthDate = new Date(birthDateStr);
        const afterSunset = afterData.after_sunset || false;
        functions.logger.log(`Processing birthday ${context.params.birthdayId}: ${birthDateStr}, afterSunset: ${afterSunset}`);
        const hebcalData = await fetchHebcalData(birthDate, afterSunset);
        functions.logger.log(`Hebcal data received:`, JSON.stringify(hebcalData));
        if (!hebcalData.hebrew) {
            throw new Error('No Hebrew date returned from Hebcal');
        }
        const currentHebrewYear = await getCurrentHebrewYear();
        functions.logger.log(`Current Hebrew year: ${currentHebrewYear}`);
        functions.logger.log(`Birth Hebrew date: year=${hebcalData.hy}, month=${hebcalData.hm}, day=${hebcalData.hd}`);
        functions.logger.log(`Fetching next birthdays starting from year ${currentHebrewYear}`);
        const futureDates = await fetchNextHebrewBirthdays(currentHebrewYear, hebcalData.hm, hebcalData.hd, 10);
        functions.logger.log(`Future dates returned: ${futureDates.length} dates`);
        const updateData = {
            birth_date_hebrew_string: hebcalData.hebrew,
            birth_date_hebrew_year: hebcalData.hy,
            birth_date_hebrew_month: hebcalData.hm,
            birth_date_hebrew_day: hebcalData.hd,
            gregorian_year: birthDate.getFullYear(),
            gregorian_month: birthDate.getMonth() + 1,
            gregorian_day: birthDate.getDate(),
            hebrew_year: hebcalData.hy,
            hebrew_month: hebcalData.hm,
            hebrew_day: hebcalData.hd,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (futureDates.length > 0) {
            const nextDate = futureDates[0];
            const gregorianDate = nextDate.gregorianDate;
            updateData.next_upcoming_hebrew_birthday = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;
            updateData.next_upcoming_hebrew_year = nextDate.hebrewYear;
            updateData.future_hebrew_birthdays = futureDates.map((item) => ({
                gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                hebrewYear: item.hebrewYear
            }));
        }
        else {
            functions.logger.warn('No future dates found, setting empty array');
            updateData.future_hebrew_birthdays = [];
            updateData.next_upcoming_hebrew_year = null;
        }
        const docSnapshot = await change.after.ref.get();
        if (!docSnapshot.exists) {
            functions.logger.warn('Document was deleted during processing, skipping update');
            return null;
        }
        await change.after.ref.update(updateData);
        functions.logger.log(`Successfully calculated Hebrew dates for birthday ${context.params.birthdayId}`);
        return null;
    }
    catch (error) {
        if (error.code === 5 || error.message?.includes('No document to update')) {
            functions.logger.warn('Document no longer exists, skipping update');
            return null;
        }
        functions.logger.error('Error calculating Hebrew dates:', error);
        throw error;
    }
});
exports.refreshBirthdayHebrewData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const birthdayId = data.birthdayId;
    if (!birthdayId) {
        throw new functions.https.HttpsError('invalid-argument', 'Birthday ID is required');
    }
    const rateLimitRef = db.collection('rate_limits').doc(`${context.auth.uid}_refresh`);
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    const windowMs = 30000; // 30 seconds
    const maxRequests = 3;
    if (rateLimitDoc.exists) {
        const data = rateLimitDoc.data();
        const requests = data?.requests || [];
        const recentRequests = requests.filter((timestamp) => now - timestamp < windowMs);
        if (recentRequests.length >= maxRequests) {
            throw new functions.https.HttpsError('resource-exhausted', 'Too many refresh requests. Please wait 30 seconds.');
        }
        await rateLimitRef.update({
            requests: [...recentRequests, now],
        });
    }
    else {
        await rateLimitRef.set({
            requests: [now],
        });
    }
    try {
        const birthdayRef = db.collection('birthdays').doc(birthdayId);
        const birthdayDoc = await birthdayRef.get();
        if (!birthdayDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Birthday not found');
        }
        const birthdayData = birthdayDoc.data();
        if (birthdayData?.tenant_id !== data.tenantId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        const birthDateStr = birthdayData?.birth_date_gregorian;
        if (!birthDateStr) {
            throw new functions.https.HttpsError('failed-precondition', 'No birth date found');
        }
        const birthDate = new Date(birthDateStr);
        const afterSunset = birthdayData?.after_sunset || false;
        const hebcalData = await fetchHebcalData(birthDate, afterSunset);
        if (!hebcalData.hebrew) {
            throw new functions.https.HttpsError('internal', 'Failed to fetch Hebrew date');
        }
        const currentHebrewYear = await getCurrentHebrewYear();
        functions.logger.log(`Current Hebrew year: ${currentHebrewYear}`);
        const futureDates = await fetchNextHebrewBirthdays(currentHebrewYear, hebcalData.hm, hebcalData.hd, 10);
        const updateData = {
            birth_date_hebrew_string: hebcalData.hebrew,
            birth_date_hebrew_year: hebcalData.hy,
            birth_date_hebrew_month: hebcalData.hm,
            birth_date_hebrew_day: hebcalData.hd,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (futureDates.length > 0) {
            const nextDate = futureDates[0];
            const gregorianDate = nextDate.gregorianDate;
            updateData.next_upcoming_hebrew_birthday = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;
            updateData.next_upcoming_hebrew_year = nextDate.hebrewYear;
            updateData.future_hebrew_birthdays = futureDates.map((item) => ({
                gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                hebrewYear: item.hebrewYear
            }));
        }
        await birthdayRef.update(updateData);
        functions.logger.log(`Successfully refreshed Hebrew dates for birthday ${birthdayId}`);
        return { success: true, message: 'Hebrew dates refreshed successfully' };
    }
    catch (error) {
        functions.logger.error('Error refreshing Hebrew dates:', error);
        throw new functions.https.HttpsError('internal', 'Failed to refresh Hebrew dates');
    }
});
exports.updateNextBirthdayScheduled = functions.pubsub
    .schedule('every 24 hours')
    .timeZone('Asia/Jerusalem')
    .onRun(async (context) => {
    try {
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const snapshot = await db
            .collection('birthdays')
            .where('archived', '==', false)
            .get();
        const batch = db.batch();
        let updateCount = 0;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const nextBirthday = data.next_upcoming_hebrew_birthday;
            if (!nextBirthday || nextBirthday < nowStr) {
                const futureDates = data.future_hebrew_birthdays || [];
                const upcomingDates = futureDates.filter((item) => {
                    const dateStr = typeof item === 'string' ? item : item.gregorian;
                    return dateStr >= nowStr;
                });
                if (upcomingDates.length > 0) {
                    const nextItem = upcomingDates[0];
                    const nextGregorian = typeof nextItem === 'string' ? nextItem : nextItem.gregorian;
                    const nextHebrewYear = typeof nextItem === 'string' ? null : nextItem.hebrewYear;
                    // If nextHebrewYear is null (old data structure), refresh from API
                    if (!nextHebrewYear && data.birth_date_hebrew_year && data.birth_date_hebrew_month && data.birth_date_hebrew_day) {
                        try {
                            const currentHebrewYear = await getCurrentHebrewYear();
                            const newFutureDates = await fetchNextHebrewBirthdays(currentHebrewYear, data.birth_date_hebrew_month, data.birth_date_hebrew_day, 10);
                            if (newFutureDates.length > 0) {
                                const nextDate = newFutureDates[0];
                                const gregorianDate = nextDate.gregorianDate;
                                batch.update(doc.ref, {
                                    next_upcoming_hebrew_birthday: `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`,
                                    next_upcoming_hebrew_year: nextDate.hebrewYear,
                                    future_hebrew_birthdays: newFutureDates.map((item) => ({
                                        gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                                        hebrewYear: item.hebrewYear
                                    })),
                                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                                });
                                updateCount++;
                            }
                        }
                        catch (error) {
                            functions.logger.warn(`Failed to refresh birthday ${doc.id} with missing hebrewYear:`, error);
                        }
                    }
                    else {
                        batch.update(doc.ref, {
                            next_upcoming_hebrew_birthday: nextGregorian,
                            next_upcoming_hebrew_year: nextHebrewYear,
                            updated_at: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        updateCount++;
                    }
                }
                else {
                    try {
                        const hebrewYear = data.birth_date_hebrew_year;
                        const hebrewMonth = data.birth_date_hebrew_month;
                        const hebrewDay = data.birth_date_hebrew_day;
                        if (hebrewYear && hebrewMonth && hebrewDay) {
                            const currentHebrewYear = await getCurrentHebrewYear();
                            const newFutureDates = await fetchNextHebrewBirthdays(currentHebrewYear, hebrewMonth, hebrewDay, 10);
                            if (newFutureDates.length > 0) {
                                const nextDate = newFutureDates[0];
                                const gregorianDate = nextDate.gregorianDate;
                                batch.update(doc.ref, {
                                    next_upcoming_hebrew_birthday: `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`,
                                    next_upcoming_hebrew_year: nextDate.hebrewYear,
                                    future_hebrew_birthdays: newFutureDates.map((item) => ({
                                        gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                                        hebrewYear: item.hebrewYear
                                    })),
                                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                                });
                                updateCount++;
                            }
                        }
                    }
                    catch (error) {
                        functions.logger.warn(`Failed to update birthday ${doc.id}:`, error);
                    }
                }
            }
        }
        if (updateCount > 0) {
            await batch.commit();
            functions.logger.log(`Updated ${updateCount} birthdays with new upcoming dates`);
        }
        else {
            functions.logger.log('No birthdays needed updating');
        }
        return null;
    }
    catch (error) {
        functions.logger.error('Error in scheduled birthday update:', error);
        throw error;
    }
});
exports.fixExistingBirthdays = functions.https.onRequest(async (req, res) => {
    const snapshot = await db.collection('birthdays').get();
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.birth_date_hebrew_string && !data.next_upcoming_hebrew_birthday) {
            await doc.ref.update({
                birth_date_hebrew_string: null,
            });
        }
    }
    res.send('Done');
});
exports.fixAllBirthdaysHebrewYear = functions.https.onRequest(async (req, res) => {
    try {
        const snapshot = await db.collection('birthdays').get();
        let fixed = 0;
        let skipped = 0;
        let errors = 0;
        functions.logger.log(`Processing ${snapshot.size} birthdays...`);
        for (const doc of snapshot.docs) {
            const data = doc.data();
            // בדוק אם next_upcoming_hebrew_year חסר או null
            if (!data.next_upcoming_hebrew_year && data.birth_date_gregorian) {
                try {
                    functions.logger.log(`Fixing birthday ${doc.id}...`);
                    const birthDate = new Date(data.birth_date_gregorian);
                    const afterSunset = data.after_sunset || false;
                    const hebcalData = await fetchHebcalData(birthDate, afterSunset);
                    const currentHebrewYear = await getCurrentHebrewYear();
                    const futureDates = await fetchNextHebrewBirthdays(currentHebrewYear, hebcalData.hm, hebcalData.hd, 10);
                    if (futureDates.length > 0) {
                        const nextDate = futureDates[0];
                        const gregorianDate = nextDate.gregorianDate;
                        await doc.ref.update({
                            birth_date_hebrew_year: hebcalData.hy,
                            birth_date_hebrew_month: hebcalData.hm,
                            birth_date_hebrew_day: hebcalData.hd,
                            hebrew_year: hebcalData.hy,
                            hebrew_month: hebcalData.hm,
                            hebrew_day: hebcalData.hd,
                            next_upcoming_hebrew_year: nextDate.hebrewYear,
                            next_upcoming_hebrew_birthday: `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`,
                            future_hebrew_birthdays: futureDates.map((item) => ({
                                gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                                hebrewYear: item.hebrewYear
                            })),
                            updated_at: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        fixed++;
                        functions.logger.log(`✅ Fixed birthday ${doc.id}`);
                    }
                    else {
                        skipped++;
                        functions.logger.warn(`⚠️ No future dates for birthday ${doc.id}`);
                    }
                    // המתן 100ms בין בקשות כדי לא להציף את Hebcal API
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (error) {
                    errors++;
                    functions.logger.error(`❌ Failed to fix birthday ${doc.id}:`, error);
                }
            }
            else {
                skipped++;
            }
        }
        const message = `Fixed ${fixed} birthdays, skipped ${skipped}, errors ${errors}`;
        functions.logger.log(message);
        res.json({
            success: true,
            message,
            fixed,
            skipped,
            errors,
            total: snapshot.size
        });
    }
    catch (error) {
        functions.logger.error('Error in fixAllBirthdaysHebrewYear:', error);
        res.status(500).json({
            success: false,
            error: String(error)
        });
    }
});
exports.migrateExistingUsers = functions.https.onRequest(async (req, res) => {
    try {
        const membersSnapshot = await db.collection('tenant_members').get();
        const updates = [];
        for (const doc of membersSnapshot.docs) {
            const data = doc.data();
            const userId = data.user_id;
            const tenantId = data.tenant_id;
            const role = data.role || 'member';
            updates.push(admin.auth().setCustomUserClaims(userId, {
                tenantId: tenantId,
                role: role
            }).then(() => {
                functions.logger.log(`Set custom claims for user ${userId}: tenantId=${tenantId}, role=${role}`);
            }).catch((error) => {
                functions.logger.error(`Failed to set custom claims for user ${userId}:`, error);
            }));
        }
        await Promise.all(updates);
        res.json({
            success: true,
            message: `Migrated ${updates.length} users`,
            usersProcessed: updates.length
        });
    }
    catch (error) {
        functions.logger.error('Error in migrateExistingUsers:', error);
        res.status(500).json({
            success: false,
            error: String(error)
        });
    }
});
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const userId = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || email.split('@')[0];
    try {
        functions.logger.log(`New user created: ${userId}, creating tenant...`);
        const batch = db.batch();
        const tenantRef = db.collection('tenants').doc();
        const tenantId = tenantRef.id;
        batch.set(tenantRef, {
            name: `${displayName}'s Organization`,
            owner_id: userId,
            default_language: 'he',
            timezone: 'Asia/Jerusalem',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        const memberRef = db.collection('tenant_members').doc();
        batch.set(memberRef, {
            tenant_id: tenantId,
            user_id: userId,
            role: 'owner',
            joined_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        const maleGroupRef = db.collection('groups').doc();
        batch.set(maleGroupRef, {
            tenant_id: tenantId,
            name: 'גברים',
            name_en: 'Men',
            is_gender_group: true,
            gender_type: 'male',
            parent_group_id: null,
            created_by: userId,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        const femaleGroupRef = db.collection('groups').doc();
        batch.set(femaleGroupRef, {
            tenant_id: tenantId,
            name: 'נשים',
            name_en: 'Women',
            is_gender_group: true,
            gender_type: 'female',
            parent_group_id: null,
            created_by: userId,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        await admin.auth().setCustomUserClaims(userId, {
            tenantId: tenantId,
            role: 'owner'
        });
        functions.logger.log(`Custom claims set for user ${userId}, tenantId: ${tenantId}`);
        await batch.commit();
        functions.logger.log(`Successfully created tenant ${tenantId} with groups for user ${userId}`);
        return null;
    }
    catch (error) {
        functions.logger.error(`Error in onUserCreate for user ${userId}:`, error);
        try {
            await admin.auth().deleteUser(userId);
            functions.logger.log(`Rolled back: deleted user ${userId}`);
        }
        catch (rollbackError) {
            functions.logger.error(`Failed to rollback user ${userId}:`, rollbackError);
        }
        throw error;
    }
});
async function getValidAccessToken(userId) {
    const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
    if (!tokenDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'לא נמצא חיבור ליומן Google. אנא התחבר מחדש');
    }
    const tokenData = tokenDoc.data();
    if (!tokenData) {
        throw new functions.https.HttpsError('not-found', 'מידע החיבור ליומן Google לא תקין');
    }
    const now = Date.now();
    const expiresAt = tokenData.expiresAt || 0;
    if (now >= expiresAt) {
        throw new functions.https.HttpsError('permission-denied', 'הטוקן פג תוקף. אנא התחבר מחדש ליומן Google');
    }
    return tokenData.accessToken;
}
async function getCalendarId(userId) {
    const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
    if (!tokenDoc.exists) {
        return 'primary';
    }
    const tokenData = tokenDoc.data();
    return tokenData?.calendarId || 'primary';
}
exports.syncBirthdayToGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    const { birthdayId } = data;
    if (!birthdayId) {
        throw new functions.https.HttpsError('invalid-argument', 'מזהה יום הולדת חסר');
    }
    const rateLimitRef = db.collection('rate_limits').doc(`${context.auth.uid}_calendar_sync`);
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 30;
    if (rateLimitDoc.exists) {
        const rateLimitData = rateLimitDoc.data();
        const requests = rateLimitData?.requests || [];
        const recentRequests = requests.filter((timestamp) => now - timestamp < windowMs);
        if (recentRequests.length >= maxRequests) {
            throw new functions.https.HttpsError('resource-exhausted', 'יותר מדי בקשות. אנא המתן רגע');
        }
        await rateLimitRef.update({ requests: [...recentRequests, now] });
    }
    else {
        await rateLimitRef.set({ requests: [now] });
    }
    try {
        const birthdayDoc = await db.collection('birthdays').doc(birthdayId).get();
        if (!birthdayDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'יום ההולדת לא נמצא');
        }
        const birthday = birthdayDoc.data();
        if (!birthday) {
            throw new functions.https.HttpsError('not-found', 'מידע יום ההולדת לא תקין');
        }
        const accessToken = await getValidAccessToken(context.auth.uid);
        const calendarId = await getCalendarId(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        // מחיקה רק של אירועים שנוצרו על ידי האפליקציה (שנשמרו ב-Firestore)
        if (birthday.googleCalendarEventIds) {
            const oldEventIds = birthday.googleCalendarEventIds;
            if (oldEventIds.gregorian && Array.isArray(oldEventIds.gregorian)) {
                for (const eventId of oldEventIds.gregorian) {
                    try {
                        await calendar.events.delete({ calendarId: calendarId, eventId });
                        functions.logger.log(`Deleted gregorian event ${eventId} from calendar ${calendarId}`);
                    }
                    catch (err) {
                        if (err.code !== 404) {
                            functions.logger.warn(`Failed to delete old gregorian event ${eventId}:`, err);
                        }
                    }
                }
            }
            if (oldEventIds.hebrew && Array.isArray(oldEventIds.hebrew)) {
                for (const eventId of oldEventIds.hebrew) {
                    try {
                        await calendar.events.delete({ calendarId: calendarId, eventId });
                        functions.logger.log(`Deleted hebrew event ${eventId} from calendar ${calendarId}`);
                    }
                    catch (err) {
                        if (err.code !== 404) {
                            functions.logger.warn(`Failed to delete old hebrew event ${eventId}:`, err);
                        }
                    }
                }
            }
        }
        else if (birthday.googleCalendarEventId) {
            // מחיקה רק אם eventId קיים במסמך
            try {
                await calendar.events.delete({ calendarId: calendarId, eventId: birthday.googleCalendarEventId });
                functions.logger.log(`Deleted event ${birthday.googleCalendarEventId} from calendar ${calendarId}`);
            }
            catch (err) {
                if (err.code !== 404) {
                    functions.logger.warn(`Failed to delete old event ${birthday.googleCalendarEventId}:`, err);
                }
            }
        }
        const tenantDoc = await db.collection('tenants').doc(birthday.tenant_id).get();
        const tenant = tenantDoc.data();
        let groupDoc = null;
        let group = null;
        if (birthday.group_id) {
            groupDoc = await db.collection('groups').doc(birthday.group_id).get();
            if (groupDoc.exists) {
                group = groupDoc.data();
            }
        }
        let calendarPreference = birthday.calendar_preference_override ||
            group?.calendar_preference ||
            tenant?.default_calendar_preference ||
            'both';
        const currentYear = new Date().getFullYear();
        const gregorianEventIds = [];
        const hebrewEventIds = [];
        let description = `תאריך לידה לועזי: ${birthday.birth_date_gregorian}\n`;
        description += `תאריך לידה עברי: ${birthday.birth_date_hebrew_string || ''}\n`;
        if (birthday.after_sunset) {
            description += '⚠️ לאחר השקיעה\n';
        }
        if (birthday.notes) {
            description += `\nהערות: ${birthday.notes}`;
        }
        if (calendarPreference === 'gregorian' || calendarPreference === 'both') {
            const birthDate = new Date(birthday.birth_date_gregorian);
            const birthYear = birthDate.getFullYear();
            for (let year = currentYear; year <= currentYear + 10; year++) {
                const eventDate = new Date(year, birthDate.getMonth(), birthDate.getDate());
                const age = year - birthYear;
                const startDate = new Date(eventDate);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
                const title = `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת 🎂`;
                const event = {
                    summary: title,
                    description: description,
                    start: { date: startDate.toISOString().split('T')[0] },
                    end: { date: endDate.toISOString().split('T')[0] },
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'popup', minutes: 24 * 60 },
                            { method: 'popup', minutes: 60 }
                        ]
                    }
                };
                const response = await calendar.events.insert({
                    calendarId: calendarId,
                    requestBody: event
                });
                if (response.data.id) {
                    gregorianEventIds.push(response.data.id);
                }
            }
        }
        if ((calendarPreference === 'hebrew' || calendarPreference === 'both') && birthday.future_hebrew_birthdays) {
            const futureBirthdays = birthday.future_hebrew_birthdays.slice(0, 10);
            for (const hebrewBirthday of futureBirthdays) {
                let hebrewDate;
                let hebrewYear;
                if (typeof hebrewBirthday === 'string') {
                    hebrewDate = hebrewBirthday;
                    hebrewYear = 0;
                }
                else {
                    hebrewDate = hebrewBirthday.gregorian;
                    hebrewYear = hebrewBirthday.hebrewYear;
                }
                const startDate = new Date(hebrewDate);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
                const age = hebrewYear && birthday.hebrew_year ? hebrewYear - birthday.hebrew_year : 0;
                const title = `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת עברי 🎂`;
                const event = {
                    summary: title,
                    description: description,
                    start: { date: startDate.toISOString().split('T')[0] },
                    end: { date: endDate.toISOString().split('T')[0] },
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'popup', minutes: 24 * 60 },
                            { method: 'popup', minutes: 60 }
                        ]
                    }
                };
                const response = await calendar.events.insert({
                    calendarId: calendarId,
                    requestBody: event
                });
                if (response.data.id) {
                    hebrewEventIds.push(response.data.id);
                }
            }
        }
        const eventIds = {};
        if (gregorianEventIds.length > 0) {
            eventIds.gregorian = gregorianEventIds;
        }
        if (hebrewEventIds.length > 0) {
            eventIds.hebrew = hebrewEventIds;
        }
        await db.collection('birthdays').doc(birthdayId).update({
            googleCalendarEventIds: eventIds,
            googleCalendarEventId: admin.firestore.FieldValue.delete(),
            lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        functions.logger.log(`Synced birthday ${birthdayId} to Google Calendar. Gregorian: ${gregorianEventIds.length}, Hebrew: ${hebrewEventIds.length}`);
        return {
            success: true,
            eventIds: eventIds,
            birthdayId: birthdayId,
            message: `נוספו ${gregorianEventIds.length + hebrewEventIds.length} אירועים ליומן Google`
        };
    }
    catch (error) {
        functions.logger.error(`Error syncing birthday ${birthdayId}:`, error);
        if (error.code === 401 || error.code === 403) {
            throw new functions.https.HttpsError('permission-denied', 'אין הרשאת גישה ליומן Google. אנא התחבר מחדש');
        }
        throw new functions.https.HttpsError('internal', 'שגיאה בסנכרון ליומן Google. אנא נסה שנית');
    }
});
exports.syncMultipleBirthdaysToGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    const { birthdayIds } = data;
    if (!birthdayIds || !Array.isArray(birthdayIds) || birthdayIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'רשימת ימי הולדת חסרה או ריקה');
    }
    if (birthdayIds.length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'ניתן לסנכרן עד 50 ימי הולדת בו-זמנית');
    }
    const rateLimitRef = db.collection('rate_limits').doc(`${context.auth.uid}_bulk_sync`);
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    const windowMs = 300000;
    const maxRequests = 3;
    if (rateLimitDoc.exists) {
        const rateLimitData = rateLimitDoc.data();
        const requests = rateLimitData?.requests || [];
        const recentRequests = requests.filter((timestamp) => now - timestamp < windowMs);
        if (recentRequests.length >= maxRequests) {
            throw new functions.https.HttpsError('resource-exhausted', 'יותר מדי בקשות סנכרון מרובות. אנא המתן 5 דקות');
        }
        await rateLimitRef.update({ requests: [...recentRequests, now] });
    }
    else {
        await rateLimitRef.set({ requests: [now] });
    }
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    for (const birthdayId of birthdayIds) {
        try {
            const result = await exports.syncBirthdayToGoogleCalendar.run({ birthdayId }, context);
            results.push({
                success: true,
                eventId: result.eventId,
                birthdayId: birthdayId
            });
            successCount++;
        }
        catch (error) {
            results.push({
                success: false,
                error: error.message || 'שגיאה לא ידועה',
                birthdayId: birthdayId
            });
            failureCount++;
            functions.logger.warn(`Failed to sync birthday ${birthdayId}:`, error);
        }
    }
    functions.logger.log(`Bulk sync completed: ${successCount} succeeded, ${failureCount} failed`);
    return {
        totalAttempted: birthdayIds.length,
        successCount,
        failureCount,
        results,
        message: `סונכרנו ${successCount} ימי הולדת ליומן Google`
    };
});
exports.removeBirthdayFromGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    const { birthdayId } = data;
    if (!birthdayId) {
        throw new functions.https.HttpsError('invalid-argument', 'מזהה יום הולדת חסר');
    }
    const rateLimitRef = db.collection('rate_limits').doc(`${context.auth.uid}_calendar_remove`);
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 20;
    if (rateLimitDoc.exists) {
        const rateLimitData = rateLimitDoc.data();
        const requests = rateLimitData?.requests || [];
        const recentRequests = requests.filter((timestamp) => now - timestamp < windowMs);
        if (recentRequests.length >= maxRequests) {
            throw new functions.https.HttpsError('resource-exhausted', 'יותר מדי בקשות. אנא המתן רגע');
        }
        await rateLimitRef.update({ requests: [...recentRequests, now] });
    }
    else {
        await rateLimitRef.set({ requests: [now] });
    }
    try {
        const birthdayDoc = await db.collection('birthdays').doc(birthdayId).get();
        if (!birthdayDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'יום ההולדת לא נמצא');
        }
        const birthday = birthdayDoc.data();
        if (!birthday || (!birthday.googleCalendarEventId && !birthday.googleCalendarEventIds)) {
            throw new functions.https.HttpsError('not-found', 'יום ההולדת לא מסונכרן ליומן Google');
        }
        const accessToken = await getValidAccessToken(context.auth.uid);
        const calendarId = await getCalendarId(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        let deletedCount = 0;
        // מחיקה רק של אירועים שנוצרו על ידי האפליקציה (שנשמרו ב-Firestore)
        if (birthday.googleCalendarEventIds) {
            const eventIds = birthday.googleCalendarEventIds;
            if (eventIds.gregorian && Array.isArray(eventIds.gregorian)) {
                for (const eventId of eventIds.gregorian) {
                    try {
                        await calendar.events.delete({ calendarId: calendarId, eventId });
                        deletedCount++;
                        functions.logger.log(`Deleted gregorian event ${eventId} from calendar ${calendarId}`);
                    }
                    catch (err) {
                        if (err.code !== 404) {
                            functions.logger.warn(`Failed to delete gregorian event ${eventId}:`, err);
                        }
                    }
                }
            }
            if (eventIds.hebrew && Array.isArray(eventIds.hebrew)) {
                for (const eventId of eventIds.hebrew) {
                    try {
                        await calendar.events.delete({ calendarId: calendarId, eventId });
                        deletedCount++;
                        functions.logger.log(`Deleted hebrew event ${eventId} from calendar ${calendarId}`);
                    }
                    catch (err) {
                        if (err.code !== 404) {
                            functions.logger.warn(`Failed to delete hebrew event ${eventId}:`, err);
                        }
                    }
                }
            }
        }
        else if (birthday.googleCalendarEventId) {
            // מחיקה רק אם eventId קיים במסמך
            try {
                await calendar.events.delete({ calendarId: calendarId, eventId: birthday.googleCalendarEventId });
                deletedCount++;
                functions.logger.log(`Deleted event ${birthday.googleCalendarEventId} from calendar ${calendarId}`);
            }
            catch (err) {
                if (err.code !== 404) {
                    throw err;
                }
            }
        }
        await db.collection('birthdays').doc(birthdayId).update({
            googleCalendarEventId: admin.firestore.FieldValue.delete(),
            googleCalendarEventIds: admin.firestore.FieldValue.delete(),
            lastSyncedAt: admin.firestore.FieldValue.delete()
        });
        functions.logger.log(`Removed ${deletedCount} events for birthday ${birthdayId} from Google Calendar`);
        return { success: true, message: `הוסרו ${deletedCount} אירועים מיומן Google בהצלחה` };
    }
    catch (error) {
        functions.logger.error(`Error removing birthday ${birthdayId}:`, error);
        if (error.code === 404) {
            await db.collection('birthdays').doc(birthdayId).update({
                googleCalendarEventId: admin.firestore.FieldValue.delete(),
                googleCalendarEventIds: admin.firestore.FieldValue.delete(),
                lastSyncedAt: admin.firestore.FieldValue.delete()
            });
            return { success: true, message: 'האירועים כבר לא קיימים ביומן Google' };
        }
        if (error.code === 401 || error.code === 403) {
            throw new functions.https.HttpsError('permission-denied', 'אין הרשאת גישה ליומן Google. אנא התחבר מחדש');
        }
        throw new functions.https.HttpsError('internal', 'שגיאה בהסרת האירועים מיומן Google');
    }
});
exports.deleteAllSyncedEventsFromGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    const { tenantId } = data;
    if (!tenantId) {
        throw new functions.https.HttpsError('invalid-argument', 'מזהה Tenant חסר');
    }
    try {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const calendarId = await getCalendarId(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        const birthdaysSnapshot = await db.collection('birthdays')
            .where('tenant_id', '==', tenantId)
            .get();
        let totalDeleted = 0;
        let failedCount = 0;
        const batch = db.batch();
        for (const doc of birthdaysSnapshot.docs) {
            const birthday = doc.data();
            // מחיקה רק של אירועים שנוצרו על ידי האפליקציה (שנשמרו ב-Firestore)
            if (birthday.googleCalendarEventIds) {
                const eventIds = birthday.googleCalendarEventIds;
                if (eventIds.gregorian && Array.isArray(eventIds.gregorian)) {
                    for (const eventId of eventIds.gregorian) {
                        try {
                            await calendar.events.delete({ calendarId: calendarId, eventId });
                            totalDeleted++;
                            functions.logger.log(`Deleted gregorian event ${eventId} from calendar ${calendarId}`);
                        }
                        catch (err) {
                            if (err.code !== 404) {
                                failedCount++;
                                functions.logger.warn(`Failed to delete gregorian event ${eventId}:`, err);
                            }
                        }
                    }
                }
                if (eventIds.hebrew && Array.isArray(eventIds.hebrew)) {
                    for (const eventId of eventIds.hebrew) {
                        try {
                            await calendar.events.delete({ calendarId: calendarId, eventId });
                            totalDeleted++;
                            functions.logger.log(`Deleted hebrew event ${eventId} from calendar ${calendarId}`);
                        }
                        catch (err) {
                            if (err.code !== 404) {
                                failedCount++;
                                functions.logger.warn(`Failed to delete hebrew event ${eventId}:`, err);
                            }
                        }
                    }
                }
                batch.update(doc.ref, {
                    googleCalendarEventIds: admin.firestore.FieldValue.delete(),
                    googleCalendarEventId: admin.firestore.FieldValue.delete(),
                    lastSyncedAt: admin.firestore.FieldValue.delete()
                });
            }
            else if (birthday.googleCalendarEventId) {
                // מחיקה רק אם eventId קיים במסמך
                try {
                    await calendar.events.delete({ calendarId: calendarId, eventId: birthday.googleCalendarEventId });
                    totalDeleted++;
                    functions.logger.log(`Deleted event ${birthday.googleCalendarEventId} from calendar ${calendarId}`);
                }
                catch (err) {
                    if (err.code !== 404) {
                        failedCount++;
                        functions.logger.warn(`Failed to delete event ${birthday.googleCalendarEventId}:`, err);
                    }
                }
                batch.update(doc.ref, {
                    googleCalendarEventId: admin.firestore.FieldValue.delete(),
                    lastSyncedAt: admin.firestore.FieldValue.delete()
                });
            }
        }
        await batch.commit();
        functions.logger.log(`Deleted ${totalDeleted} events from Google Calendar for tenant ${tenantId}. Failed: ${failedCount}`);
        return {
            success: true,
            totalDeleted,
            failedCount,
            message: `נמחקו ${totalDeleted} אירועים מיומן Google${failedCount > 0 ? `. ${failedCount} נכשלו` : ''}`
        };
    }
    catch (error) {
        functions.logger.error('Error deleting all synced events:', error);
        if (error.code === 401 || error.code === 403) {
            throw new functions.https.HttpsError('permission-denied', 'אין הרשאת גישה ליומן Google. אנא התחבר מחדש');
        }
        throw new functions.https.HttpsError('internal', 'שגיאה במחיקת האירועים מיומן Google');
    }
});
exports.disconnectGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    try {
        await db.collection('googleCalendarTokens').doc(context.auth.uid).delete();
        const birthdaysSnapshot = await db.collection('birthdays')
            .where('created_by', '==', context.auth.uid)
            .get();
        const batch = db.batch();
        birthdaysSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                googleCalendarEventId: admin.firestore.FieldValue.delete(),
                googleCalendarEventIds: admin.firestore.FieldValue.delete(),
                lastSyncedAt: admin.firestore.FieldValue.delete()
            });
        });
        await batch.commit();
        functions.logger.log(`Disconnected Google Calendar for user ${context.auth.uid}`);
        return { success: true, message: 'החיבור ליומן Google נותק בהצלחה' };
    }
    catch (error) {
        functions.logger.error('Error disconnecting Google Calendar:', error);
        throw new functions.https.HttpsError('internal', 'שגיאה בניתוק החיבור ליומן Google');
    }
});
exports.getGoogleAccountInfo = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    try {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        return {
            success: true,
            email: userInfo.data.email,
            name: userInfo.data.name,
            picture: userInfo.data.picture
        };
    }
    catch (error) {
        functions.logger.error('Error getting Google account info:', error);
        if (error.code === 401 || error.code === 403) {
            throw new functions.https.HttpsError('permission-denied', 'אין הרשאת גישה. אנא התחבר מחדש');
        }
        throw new functions.https.HttpsError('internal', 'שגיאה בקבלת מידע על חשבון Google');
    }
});
exports.createGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    const { name } = data;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'שם יומן חסר או לא תקין');
    }
    try {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        // יצירת יומן חדש
        const calendarResponse = await calendar.calendars.insert({
            requestBody: {
                summary: name.trim(),
                description: 'יומן ימי הולדת - נוצר על ידי אפליקציית ימי הולדת עבריים'
            }
        });
        if (!calendarResponse.data.id) {
            throw new Error('לא התקבל מזהה יומן מ-Google');
        }
        const calendarId = calendarResponse.data.id;
        const calendarName = calendarResponse.data.summary || name.trim();
        // עדכון הטוקן עם פרטי היומן החדש
        await db.collection('googleCalendarTokens').doc(context.auth.uid).update({
            calendarId: calendarId,
            calendarName: calendarName,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        functions.logger.log(`Created Google Calendar ${calendarId} for user ${context.auth.uid}`);
        return {
            success: true,
            calendarId: calendarId,
            calendarName: calendarName,
            message: 'יומן נוצר בהצלחה'
        };
    }
    catch (error) {
        functions.logger.error('Error creating Google Calendar:', error);
        if (error.code === 401 || error.code === 403) {
            throw new functions.https.HttpsError('permission-denied', 'אין הרשאת גישה. אנא התחבר מחדש');
        }
        throw new functions.https.HttpsError('internal', 'שגיאה ביצירת יומן Google. אנא נסה שנית');
    }
});
exports.updateGoogleCalendarSelection = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    const { calendarId, calendarName } = data;
    if (!calendarId || typeof calendarId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'מזהה יומן חסר או לא תקין');
    }
    try {
        // עדכון הטוקן עם פרטי היומן הנבחר
        await db.collection('googleCalendarTokens').doc(context.auth.uid).update({
            calendarId: calendarId,
            calendarName: calendarName || (calendarId === 'primary' ? 'יומן ראשי' : 'יומן מותאם אישית'),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        functions.logger.log(`Updated calendar selection to ${calendarId} for user ${context.auth.uid}`);
        return {
            success: true,
            message: 'בחירת יומן עודכנה בהצלחה'
        };
    }
    catch (error) {
        functions.logger.error('Error updating calendar selection:', error);
        throw new functions.https.HttpsError('internal', 'שגיאה בעדכון בחירת יומן. אנא נסה שנית');
    }
});
exports.listGoogleCalendars = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'חובה להיות מחובר למערכת');
    }
    try {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        // קבלת רשימת יומנים
        const calendarsList = await calendar.calendarList.list({
            minAccessRole: 'writer' // רק יומנים שיש לנו הרשאה לכתוב בהם
        });
        const calendars = calendarsList.data.items || [];
        // מיפוי לרשימה פשוטה
        const calendarsListFormatted = calendars.map((cal) => ({
            id: cal.id,
            summary: cal.summary || cal.id,
            description: cal.description || '',
            primary: cal.primary || false,
            accessRole: cal.accessRole
        }));
        functions.logger.log(`Listed ${calendarsListFormatted.length} calendars for user ${context.auth.uid}`);
        return {
            success: true,
            calendars: calendarsListFormatted
        };
    }
    catch (error) {
        functions.logger.error('Error listing Google Calendars:', error);
        if (error.code === 401 || error.code === 403) {
            throw new functions.https.HttpsError('permission-denied', 'אין הרשאת גישה. אנא התחבר מחדש');
        }
        throw new functions.https.HttpsError('internal', 'שגיאה בקבלת רשימת יומנים. אנא נסה שנית');
    }
});
//# sourceMappingURL=index.js.map