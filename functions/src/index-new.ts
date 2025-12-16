// Entry Point - Export all Cloud Functions
// כל ה-exports נשארים זהים לחלוטין, רק הלוגיקה עברה למודולים

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (once)
admin.initializeApp();

// Birthday Triggers
export { onBirthdayWriteFn as onBirthdayWrite } from './interfaces/http/birthday-triggers';

// Calendar Functions
export {
  syncBirthdayFn as syncBirthdayToGoogleCalendar,
  syncMultipleFn as syncMultipleBirthdaysToGoogleCalendar,
  removeBirthdayFn as removeBirthdayFromGoogleCalendar,
  cleanupOrphanFn as cleanupOrphanEvents,
  refreshHebrewDataFn as refreshBirthdayHebrewData,
  resetSyncDataFn as resetBirthdaySyncData,
  previewDeletionFn as previewDeletion
} from './interfaces/http/calendar-functions';

// Auth Functions
export {
  exchangeGoogleAuthCodeFn as exchangeGoogleAuthCode,
  disconnectGoogleCalendarFn as disconnectGoogleCalendar,
  getGoogleCalendarStatusFn as getGoogleCalendarStatus,
  getGoogleAccountInfoFn as getGoogleAccountInfo,
  createGoogleCalendarFn as createGoogleCalendar,
  deleteGoogleCalendarFn as deleteGoogleCalendar,
  listGoogleCalendarsFn as listGoogleCalendars,
  updateGoogleCalendarSelectionFn as updateGoogleCalendarSelection
} from './interfaces/http/auth-functions';

// Job Processors
export {
  processCalendarSyncJobFn as processCalendarSyncJob,
  processDeletionJobFn as processDeletionJob,
  triggerDeleteAllEventsFn as triggerDeleteAllEvents,
  deleteAllSyncedEventsFn as deleteAllSyncedEventsFromGoogleCalendar
} from './interfaces/http/job-processors';

// Management Functions
export {
  getAccountDeletionSummaryFn as getAccountDeletionSummary,
  deleteAccountFn as deleteAccount
} from './interfaces/http/management-functions';

// Scheduled Functions
export { retryFailedSyncsFn as retryFailedSyncs } from './interfaces/scheduled/retry-syncs';
export { updateNextBirthdayScheduledFn as updateNextBirthdayScheduled } from './interfaces/scheduled/update-birthdays';

// User Triggers
export { onUserCreateFn as onUserCreate } from './interfaces/triggers/user-triggers';

// Legacy/External Functions (keep as-is)
export * from './migration';
export { guestPortalOps } from './guestPortal';



