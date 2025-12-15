// Auth Functions - Google OAuth & Calendar Management

import * as functions from 'firebase-functions';
import { createDependencies } from '../dependencies';

const deps = createDependencies();

// Exchange Google auth code
export const exchangeGoogleAuthCodeFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const result = await deps.googleOAuthUseCase.exchangeCode(data.code, context.auth.uid);
  return result;
});

// Disconnect Google Calendar
export const disconnectGoogleCalendarFn = functions
  .runWith({ timeoutSeconds: 540, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }

    try {
      await deps.googleOAuthUseCase.disconnect(context.auth.uid);
      functions.logger.log(`Disconnected Google Calendar for user ${context.auth.uid}`);
      return { success: true };
    } catch (error) {
      functions.logger.error('Error disconnecting:', error);
      throw new functions.https.HttpsError('internal', 'Error disconnecting');
    }
  });

// Get calendar status
export const getGoogleCalendarStatusFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  try {
    return await deps.googleOAuthUseCase.getStatus(context.auth.uid);
  } catch (error) {
    return { isConnected: false };
  }
});

// Get Google account info
export const getGoogleAccountInfoFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  try {
    const result = await deps.googleOAuthUseCase.getAccountInfo(context.auth.uid);
    return { success: true, ...result };
  } catch (e) {
    throw new functions.https.HttpsError('internal', 'Error fetching info');
  }
});

// Create Google Calendar
export const createGoogleCalendarFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const result = await deps.manageCalendarUseCase.createCalendar(
    context.auth.uid,
    data.name
  );
  return { success: true, ...result };
});

// Delete Google Calendar
export const deleteGoogleCalendarFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  await deps.manageCalendarUseCase.deleteCalendar(context.auth.uid, data.calendarId);
  return { success: true };
});

// List Google Calendars
export const listGoogleCalendarsFn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  try {
    const calendars = await deps.manageCalendarUseCase.listCalendars(context.auth.uid);
    return {
      success: true,
      calendars: calendars.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary,
        accessRole: cal.accessRole,
        extendedProperties: cal.extendedProperties
      }))
    };
  } catch (e) {
    throw new functions.https.HttpsError('internal', 'Error listing calendars');
  }
});

// Update calendar selection
export const updateGoogleCalendarSelectionFn = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }

    if (data.calendarId === 'primary') {
      throw new functions.https.HttpsError('failed-precondition', 'Primary not allowed');
    }

    await deps.manageCalendarUseCase.updateSelection(
      context.auth.uid,
      data.calendarId,
      data.calendarName || 'Custom Calendar'
    );

    return { success: true };
  }
);


