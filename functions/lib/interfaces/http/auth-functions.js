"use strict";
// Auth Functions - Google OAuth & Calendar Management
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
exports.updateGoogleCalendarSelectionFn = exports.listGoogleCalendarsFn = exports.deleteGoogleCalendarFn = exports.createGoogleCalendarFn = exports.getGoogleAccountInfoFn = exports.getGoogleCalendarStatusFn = exports.disconnectGoogleCalendarFn = exports.exchangeGoogleAuthCodeFn = void 0;
const functions = __importStar(require("firebase-functions"));
const dependencies_1 = require("../dependencies");
const deps = (0, dependencies_1.createDependencies)();
// Exchange Google auth code
exports.exchangeGoogleAuthCodeFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const result = await deps.googleOAuthUseCase.exchangeCode(data.code, context.auth.uid);
    return result;
});
// Disconnect Google Calendar
exports.disconnectGoogleCalendarFn = functions
    .runWith({ timeoutSeconds: 540, memory: '256MB' })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    try {
        await deps.googleOAuthUseCase.disconnect(context.auth.uid);
        functions.logger.log(`Disconnected Google Calendar for user ${context.auth.uid}`);
        return { success: true };
    }
    catch (error) {
        functions.logger.error('Error disconnecting:', error);
        throw new functions.https.HttpsError('internal', 'Error disconnecting');
    }
});
// Get calendar status
exports.getGoogleCalendarStatusFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    try {
        return await deps.googleOAuthUseCase.getStatus(context.auth.uid);
    }
    catch (error) {
        return { isConnected: false };
    }
});
// Get Google account info
exports.getGoogleAccountInfoFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    try {
        const result = await deps.googleOAuthUseCase.getAccountInfo(context.auth.uid);
        return { success: true, ...result };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', 'Error fetching info');
    }
});
// Create Google Calendar
exports.createGoogleCalendarFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const result = await deps.manageCalendarUseCase.createCalendar(context.auth.uid, data.name);
    return { success: true, ...result };
});
// Delete Google Calendar
exports.deleteGoogleCalendarFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    await deps.manageCalendarUseCase.deleteCalendar(context.auth.uid, data.calendarId);
    return { success: true };
});
// List Google Calendars
exports.listGoogleCalendarsFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    try {
        const calendars = await deps.manageCalendarUseCase.listCalendars(context.auth.uid);
        return {
            success: true,
            calendars: calendars.map((cal) => ({
                id: cal.id,
                summary: cal.summary,
                description: cal.description,
                primary: cal.primary,
                accessRole: cal.accessRole,
                extendedProperties: cal.extendedProperties
            }))
        };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', 'Error listing calendars');
    }
});
// Update calendar selection
exports.updateGoogleCalendarSelectionFn = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    if (data.calendarId === 'primary') {
        throw new functions.https.HttpsError('failed-precondition', 'Primary not allowed');
    }
    await deps.manageCalendarUseCase.updateSelection(context.auth.uid, data.calendarId, data.calendarName || 'Custom Calendar');
    return { success: true };
});
//# sourceMappingURL=auth-functions.js.map