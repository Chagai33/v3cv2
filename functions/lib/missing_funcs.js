"use strict";
// --- Missing Calendar Management Functions ---
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewDeletionFromGoogleCalendar = exports.removeBirthdayFromGoogleCalendar = exports.updateGoogleCalendarSelection = exports.listGoogleCalendars = exports.getGoogleAccountInfo = exports.getGoogleCalendarStatus = exports.disconnectGoogleCalendar = void 0;
exports.disconnectGoogleCalendar = functions.runWith({
    timeoutSeconds: 60,
    memory: '128MB'
}).https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
    try {
        await db.collection('googleCalendarTokens').doc(context.auth.uid).delete();
        return { success: true };
    }
    catch (error) {
        functions.logger.error('Error disconnecting:', error);
        throw new functions.https.HttpsError('internal', 'googleCalendar.syncError');
    }
});
exports.getGoogleCalendarStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
    const userId = context.auth.uid;
    try {
        const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
        if (!tokenDoc.exists)
            return { isConnected: false };
        const tokenData = tokenDoc.data();
        if (!tokenData?.accessToken)
            return { isConnected: false };
        let email = '', name = '', picture = '';
        try {
            const accessToken = await getValidAccessToken(userId);
            const client = new google.auth.OAuth2();
            client.setCredentials({ access_token: accessToken });
            const service = google.oauth2({ version: 'v2', auth: client });
            const info = await service.userinfo.get();
            email = info.data.email || '';
            name = info.data.name || '';
            picture = info.data.picture || '';
        }
        catch (e) {
            functions.logger.warn('Failed to fetch user info', e);
        }
        const history = await db.collection('users').doc(userId).collection('sync_history').orderBy('timestamp', 'desc').limit(5).get();
        const recentActivity = history.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toMillis() || 0 }));
        return {
            isConnected: true, email, name, picture,
            calendarId: tokenData.calendarId || 'primary',
            calendarName: tokenData.calendarName || 'Primary Calendar',
            syncStatus: tokenData.syncStatus || 'IDLE',
            lastSyncStart: tokenData.lastSyncStart?.toMillis() || 0,
            recentActivity
        };
    }
    catch (e) {
        functions.logger.error('Status error:', e);
        return { isConnected: false };
    }
});
exports.getGoogleAccountInfo = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    try {
        const accessToken = await getValidAccessToken(context.auth.uid);
        const client = new google.auth.OAuth2();
        client.setCredentials({ access_token: accessToken });
        const service = google.oauth2({ version: 'v2', auth: client });
        const info = await service.userinfo.get();
        return { email: info.data.email, name: info.data.name, picture: info.data.picture };
    }
    catch (e) {
        return { email: '', name: '', picture: '' };
    }
});
exports.listGoogleCalendars = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const accessToken = await getValidAccessToken(context.auth.uid);
    const client = new google.auth.OAuth2();
    client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: client });
    try {
        const res = await calendar.calendarList.list({ minAccessRole: 'writer' });
        return { calendars: res.data.items?.map((c) => ({ id: c.id, summary: c.summary, primary: c.primary })) || [] };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', 'Failed to list calendars');
    }
});
exports.updateGoogleCalendarSelection = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const { calendarId, calendarName } = data;
    await db.collection('googleCalendarTokens').doc(context.auth.uid).set({ calendarId, calendarName }, { merge: true });
    return { success: true };
});
exports.removeBirthdayFromGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const { birthdayId } = data;
    const doc = await db.collection('birthdays').doc(birthdayId).get();
    if (!doc.exists)
        throw new functions.https.HttpsError('not-found', 'Not found');
    const bData = doc.data();
    if (bData?.tenant_id) {
        // V3.2 Logic: Simulate archived to trigger deletion
        await processBirthdaySync(birthdayId, { ...bData, archived: true }, bData.tenant_id);
    }
    return { success: true };
});
exports.previewDeletionFromGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    const { tenantId } = data;
    const snap = await db.collection('birthdays').where('tenant_id', '==', tenantId).get();
    const summary = [];
    let total = 0;
    snap.forEach(doc => {
        const d = doc.data();
        const map = d.googleCalendarEventsMap || {};
        const count = Object.keys(map).length;
        if (count > 0) {
            summary.push({ name: `${d.first_name} ${d.last_name}`, count });
            total += count;
        }
    });
    return { success: true, summary, totalCount: total };
});
//# sourceMappingURL=missing_funcs.js.map