"use strict";
// Entry Point - Export all Cloud Functions
// כל ה-exports נשארים זהים לחלוטין, רק הלוגיקה עברה למודולים
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
exports.guestPortalOps = exports.onUserCreate = exports.updateNextBirthdayScheduled = exports.retryFailedSyncs = exports.deleteAccount = exports.getAccountDeletionSummary = exports.deleteAllSyncedEventsFromGoogleCalendar = exports.triggerDeleteAllEvents = exports.processDeletionJob = exports.processCalendarSyncJob = exports.updateGoogleCalendarSelection = exports.listGoogleCalendars = exports.deleteGoogleCalendar = exports.createGoogleCalendar = exports.getGoogleAccountInfo = exports.getGoogleCalendarStatus = exports.disconnectGoogleCalendar = exports.exchangeGoogleAuthCode = exports.previewDeletion = exports.resetBirthdaySyncData = exports.refreshBirthdayHebrewData = exports.cleanupOrphanEvents = exports.removeBirthdayFromGoogleCalendar = exports.syncMultipleBirthdaysToGoogleCalendar = exports.syncBirthdayToGoogleCalendar = exports.onBirthdayWrite = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin (once)
admin.initializeApp();
// Birthday Triggers
var birthday_triggers_1 = require("./interfaces/http/birthday-triggers");
Object.defineProperty(exports, "onBirthdayWrite", { enumerable: true, get: function () { return birthday_triggers_1.onBirthdayWriteFn; } });
// Calendar Functions
var calendar_functions_1 = require("./interfaces/http/calendar-functions");
Object.defineProperty(exports, "syncBirthdayToGoogleCalendar", { enumerable: true, get: function () { return calendar_functions_1.syncBirthdayFn; } });
Object.defineProperty(exports, "syncMultipleBirthdaysToGoogleCalendar", { enumerable: true, get: function () { return calendar_functions_1.syncMultipleFn; } });
Object.defineProperty(exports, "removeBirthdayFromGoogleCalendar", { enumerable: true, get: function () { return calendar_functions_1.removeBirthdayFn; } });
Object.defineProperty(exports, "cleanupOrphanEvents", { enumerable: true, get: function () { return calendar_functions_1.cleanupOrphanFn; } });
Object.defineProperty(exports, "refreshBirthdayHebrewData", { enumerable: true, get: function () { return calendar_functions_1.refreshHebrewDataFn; } });
Object.defineProperty(exports, "resetBirthdaySyncData", { enumerable: true, get: function () { return calendar_functions_1.resetSyncDataFn; } });
Object.defineProperty(exports, "previewDeletion", { enumerable: true, get: function () { return calendar_functions_1.previewDeletionFn; } });
// Auth Functions
var auth_functions_1 = require("./interfaces/http/auth-functions");
Object.defineProperty(exports, "exchangeGoogleAuthCode", { enumerable: true, get: function () { return auth_functions_1.exchangeGoogleAuthCodeFn; } });
Object.defineProperty(exports, "disconnectGoogleCalendar", { enumerable: true, get: function () { return auth_functions_1.disconnectGoogleCalendarFn; } });
Object.defineProperty(exports, "getGoogleCalendarStatus", { enumerable: true, get: function () { return auth_functions_1.getGoogleCalendarStatusFn; } });
Object.defineProperty(exports, "getGoogleAccountInfo", { enumerable: true, get: function () { return auth_functions_1.getGoogleAccountInfoFn; } });
Object.defineProperty(exports, "createGoogleCalendar", { enumerable: true, get: function () { return auth_functions_1.createGoogleCalendarFn; } });
Object.defineProperty(exports, "deleteGoogleCalendar", { enumerable: true, get: function () { return auth_functions_1.deleteGoogleCalendarFn; } });
Object.defineProperty(exports, "listGoogleCalendars", { enumerable: true, get: function () { return auth_functions_1.listGoogleCalendarsFn; } });
Object.defineProperty(exports, "updateGoogleCalendarSelection", { enumerable: true, get: function () { return auth_functions_1.updateGoogleCalendarSelectionFn; } });
// Job Processors
var job_processors_1 = require("./interfaces/http/job-processors");
Object.defineProperty(exports, "processCalendarSyncJob", { enumerable: true, get: function () { return job_processors_1.processCalendarSyncJobFn; } });
Object.defineProperty(exports, "processDeletionJob", { enumerable: true, get: function () { return job_processors_1.processDeletionJobFn; } });
Object.defineProperty(exports, "triggerDeleteAllEvents", { enumerable: true, get: function () { return job_processors_1.triggerDeleteAllEventsFn; } });
Object.defineProperty(exports, "deleteAllSyncedEventsFromGoogleCalendar", { enumerable: true, get: function () { return job_processors_1.deleteAllSyncedEventsFn; } });
// Management Functions
var management_functions_1 = require("./interfaces/http/management-functions");
Object.defineProperty(exports, "getAccountDeletionSummary", { enumerable: true, get: function () { return management_functions_1.getAccountDeletionSummaryFn; } });
Object.defineProperty(exports, "deleteAccount", { enumerable: true, get: function () { return management_functions_1.deleteAccountFn; } });
// Scheduled Functions
var retry_syncs_1 = require("./interfaces/scheduled/retry-syncs");
Object.defineProperty(exports, "retryFailedSyncs", { enumerable: true, get: function () { return retry_syncs_1.retryFailedSyncsFn; } });
var update_birthdays_1 = require("./interfaces/scheduled/update-birthdays");
Object.defineProperty(exports, "updateNextBirthdayScheduled", { enumerable: true, get: function () { return update_birthdays_1.updateNextBirthdayScheduledFn; } });
// User Triggers
var user_triggers_1 = require("./interfaces/triggers/user-triggers");
Object.defineProperty(exports, "onUserCreate", { enumerable: true, get: function () { return user_triggers_1.onUserCreateFn; } });
// Legacy/External Functions (keep as-is)
__exportStar(require("./migration"), exports);
var guestPortal_1 = require("./guestPortal");
Object.defineProperty(exports, "guestPortalOps", { enumerable: true, get: function () { return guestPortal_1.guestPortalOps; } });
//# sourceMappingURL=index.js.map