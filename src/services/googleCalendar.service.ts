import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db, auth } from '../config/firebase';
import { SyncResult, BulkSyncResult, GoogleCalendarSyncStatus } from '../types';
import { logger } from '../utils/logger';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const googleCalendarService = {
  initiateGoogleOAuth(): Promise<{ accessToken: string; expiresIn: number }> {
    return new Promise((resolve, reject) => {
      try {
        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
          reject(new Error('Google API טרם נטען. אנא רענן את הדף ונסה שוב'));
          return;
        }

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          callback: (response: any) => {
            if (response.access_token) {
              resolve({
                accessToken: response.access_token,
                expiresIn: response.expires_in || 3600
              });
            } else if (response.error) {
              reject(new Error(`שגיאת Google: ${response.error}`));
            } else {
              reject(new Error('לא התקבל טוקן גישה מ-Google'));
            }
          },
          error_callback: (error: any) => {
            logger.error('Google OAuth error:', error);
            reject(new Error('שגיאה באימות Google'));
          }
        });

        // Request access token synchronously, immediately after user interaction
        client.requestAccessToken();
      } catch (error) {
        logger.error('Error initiating Google OAuth:', error);
        reject(error);
      }
    });
  },

  async saveAccessToken(accessToken: string, expiresIn: number): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('משתמש לא מחובר');
      }

      const expiresAt = Date.now() + (expiresIn * 1000);

      await setDoc(doc(db, 'googleCalendarTokens', user.uid), {
        userId: user.uid,
        accessToken: accessToken,
        expiresAt: expiresAt,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      logger.log('Successfully saved access token to Firestore');
    } catch (error: any) {
      logger.error('Error saving access token:', error);
      throw new Error(error.message || 'שגיאה בשמירת הטוקן');
    }
  },

  async syncBirthdayToCalendar(birthdayId: string): Promise<SyncResult> {
    try {
      const syncFunction = httpsCallable<
        { birthdayId: string },
        { success: boolean; eventId: string; birthdayId: string; message: string }
      >(functions, 'syncBirthdayToGoogleCalendar');

      const result = await syncFunction({ birthdayId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה בסנכרון');
      }

      return {
        success: true,
        eventId: result.data.eventId,
        birthdayId: result.data.birthdayId
      };
    } catch (error: any) {
      logger.error('Error syncing birthday:', error);
      return {
        success: false,
        error: error.message || 'שגיאה בסנכרון ליומן',
        birthdayId
      };
    }
  },

  async syncMultipleBirthdays(birthdayIds: string[]): Promise<BulkSyncResult> {
    try {
      const syncFunction = httpsCallable<
        { birthdayIds: string[] },
        { totalAttempted: number; successCount: number; failureCount: number; results: any[]; message: string }
      >(functions, 'syncMultipleBirthdaysToGoogleCalendar');

      const result = await syncFunction({ birthdayIds });

      return {
        totalAttempted: result.data.totalAttempted,
        successCount: result.data.successCount,
        failureCount: result.data.failureCount,
        results: result.data.results
      };
    } catch (error: any) {
      logger.error('Error syncing multiple birthdays:', error);
      throw new Error(error.message || 'שגיאה בסנכרון מרובה');
    }
  },

  async removeBirthdayFromCalendar(birthdayId: string): Promise<void> {
    try {
      const removeFunction = httpsCallable<{ birthdayId: string }, { success: boolean; message: string }>(
        functions,
        'removeBirthdayFromGoogleCalendar'
      );

      const result = await removeFunction({ birthdayId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה בהסרה');
      }

      logger.log('Successfully removed birthday from Google Calendar');
    } catch (error: any) {
      logger.error('Error removing birthday:', error);
      throw new Error(error.message || 'שגיאה בהסרת יום ההולדת מהיומן');
    }
  },

  async deleteAllSyncedEvents(tenantId: string): Promise<{ totalDeleted: number; failedCount: number; message: string }> {
    try {
      const deleteFunction = httpsCallable<
        { tenantId: string },
        { success: boolean; totalDeleted: number; failedCount: number; message: string }
      >(functions, 'deleteAllSyncedEventsFromGoogleCalendar');

      const result = await deleteFunction({ tenantId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה במחיקה');
      }

      logger.log(`Successfully deleted ${result.data.totalDeleted} events from Google Calendar`);
      return result.data;
    } catch (error: any) {
      logger.error('Error deleting all synced events:', error);
      throw new Error(error.message || 'שגיאה במחיקת האירועים מיומן Google');
    }
  },

  async disconnectCalendar(): Promise<void> {
    try {
      const disconnectFunction = httpsCallable<void, { success: boolean; message: string }>(
        functions,
        'disconnectGoogleCalendar'
      );

      const result = await disconnectFunction();

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה בניתוק');
      }

      logger.log('Successfully disconnected from Google Calendar');
    } catch (error: any) {
      logger.error('Error disconnecting calendar:', error);
      throw new Error(error.message || 'שגיאה בניתוק מיומן Google');
    }
  },

  async getTokenStatus(userId: string): Promise<GoogleCalendarSyncStatus> {
    try {
      if (!userId) {
        return {
          isConnected: false,
          lastSyncTime: null,
          syncedBirthdaysCount: 0
        };
      }

      const tokenDoc = await getDoc(doc(db, 'googleCalendarTokens', userId));

      if (!tokenDoc.exists()) {
        return {
          isConnected: false,
          lastSyncTime: null,
          syncedBirthdaysCount: 0
        };
      }

      const tokenData = tokenDoc.data();
      const createdAt = tokenData.createdAt?.toDate?.()?.toISOString() || null;
      const expiresAt = tokenData.expiresAt || 0;
      const now = Date.now();

      if (now >= expiresAt) {
        return {
          isConnected: false,
          lastSyncTime: null,
          syncedBirthdaysCount: 0
        };
      }

      return {
        isConnected: true,
        lastSyncTime: createdAt,
        syncedBirthdaysCount: 0
      };
    } catch (error: any) {
      logger.warn('Could not get token status (may not exist yet):', error?.message);
      return {
        isConnected: false,
        lastSyncTime: null,
        syncedBirthdaysCount: 0
      };
    }
  }
};
