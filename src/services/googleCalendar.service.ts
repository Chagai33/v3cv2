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

        let callbackCalled = false;
        const timeout = setTimeout(() => {
          if (!callbackCalled) {
            logger.error('Google OAuth timeout - callback not called');
            reject(new Error('תם הזמן לאימות. אנא נסה שוב'));
          }
        }, 120000); // 2 דקות timeout

        // נשתמש ב-popup עם טיפול טוב יותר
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          ux_mode: 'popup',
          prompt: '',
          callback: (response: any) => {
            callbackCalled = true;
            clearTimeout(timeout);
            
            logger.log('Google OAuth callback received:', { 
              hasToken: !!response.access_token, 
              error: response.error,
              errorDescription: response.error_description
            });
            
            if (response.access_token) {
              resolve({
                accessToken: response.access_token,
                expiresIn: response.expires_in || 3600
              });
            } else if (response.error) {
              logger.error('Google OAuth error in callback:', response.error, response.error_description);
              reject(new Error(`שגיאת Google: ${response.error_description || response.error}`));
            } else {
              logger.error('No token and no error in callback');
              reject(new Error('לא התקבל טוקן גישה מ-Google'));
            }
          },
          error_callback: (error: any) => {
            callbackCalled = true;
            clearTimeout(timeout);
            logger.error('Google OAuth error_callback:', error);
            reject(new Error('שגיאה באימות Google'));
          }
        });

        // Request access token synchronously, immediately after user interaction
        logger.log('Requesting Google OAuth token...');
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
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        calendarId: 'primary',
        calendarName: 'יומן ראשי',
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
        syncedBirthdaysCount: 0,
        userEmail: tokenData.userEmail || null,
        calendarId: tokenData.calendarId || 'primary',
        calendarName: tokenData.calendarName || 'יומן ראשי'
      };
    } catch (error: any) {
      logger.warn('Could not get token status (may not exist yet):', error?.message);
      return {
        isConnected: false,
        lastSyncTime: null,
        syncedBirthdaysCount: 0
      };
    }
  },

  async getGoogleAccountInfo(): Promise<{ email: string; name: string; picture: string } | null> {
    try {
      const getInfoFunction = httpsCallable<
        void,
        { success: boolean; email: string; name: string; picture: string }
      >(functions, 'getGoogleAccountInfo');

      const result = await getInfoFunction();

      if (!result.data.success) {
        return null;
      }

      // שמירת המייל ב-Firestore
      const user = auth.currentUser;
      if (user && result.data.email) {
        const tokenDoc = doc(db, 'googleCalendarTokens', user.uid);
        await setDoc(tokenDoc, { userEmail: result.data.email }, { merge: true });
      }

      return {
        email: result.data.email || '',
        name: result.data.name || '',
        picture: result.data.picture || ''
      };
    } catch (error: any) {
      logger.error('Error getting Google account info:', error);
      return null;
    }
  },

  async createCalendar(name: string): Promise<{ calendarId: string; calendarName: string }> {
    try {
      const createFunction = httpsCallable<
        { name: string },
        { success: boolean; calendarId: string; calendarName: string; message?: string }
      >(functions, 'createGoogleCalendar');

      const result = await createFunction({ name });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה ביצירת יומן');
      }

      return {
        calendarId: result.data.calendarId,
        calendarName: result.data.calendarName
      };
    } catch (error: any) {
      logger.error('Error creating calendar:', error);
      throw new Error(error.message || 'שגיאה ביצירת יומן Google');
    }
  },

  async updateCalendarSelection(calendarId: string, calendarName: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('משתמש לא מחובר');
      }

      const tokenDoc = doc(db, 'googleCalendarTokens', user.uid);
      await setDoc(tokenDoc, {
        calendarId: calendarId,
        calendarName: calendarName,
        updatedAt: serverTimestamp()
      }, { merge: true });

      logger.log('Successfully updated calendar selection');
    } catch (error: any) {
      logger.error('Error updating calendar selection:', error);
      throw new Error(error.message || 'שגיאה בעדכון בחירת יומן');
    }
  },

  async listCalendars(): Promise<Array<{ id: string; summary: string; description: string; primary: boolean }>> {
    try {
      const listFunction = httpsCallable<
        void,
        { success: boolean; calendars: Array<{ id: string; summary: string; description: string; primary: boolean; accessRole: string }> }
      >(functions, 'listGoogleCalendars');

      const result = await listFunction();

      if (!result.data.success) {
        throw new Error('שגיאה בקבלת רשימת יומנים');
      }

      return result.data.calendars || [];
    } catch (error: any) {
      logger.error('Error listing calendars:', error);
      throw new Error(error.message || 'שגיאה בקבלת רשימת יומנים');
    }
  },

  async deleteCalendar(calendarId: string): Promise<void> {
    try {
      const deleteFunction = httpsCallable<
        { calendarId: string },
        { success: boolean; message?: string }
      >(functions, 'deleteGoogleCalendar');

      const result = await deleteFunction({ calendarId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה במחיקת יומן');
      }

      logger.log('Successfully deleted Google Calendar');
    } catch (error: any) {
      logger.error('Error deleting calendar:', error);
      throw new Error(error.message || 'שגיאה במחיקת יומן Google');
    }
  }
};
