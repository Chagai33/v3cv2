import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db, auth } from '../config/firebase';
import { SyncResult, BulkSyncResult, GoogleCalendarSyncStatus } from '../types';
import { logger } from '../utils/logger';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

import { CleanupOrphansResult, PreviewDeletionResult } from '../types';

// ... existing imports

export const googleCalendarService = {
  // ... existing methods

  async cleanupOrphanEvents(tenantId: string, dryRun: boolean = false): Promise<CleanupOrphansResult> {
    try {
      const cleanupFunction = httpsCallable<
        { tenantId: string; dryRun: boolean },
        CleanupOrphansResult
      >(functions, 'cleanupOrphanEvents', { timeout: 540000 }); // 9 minutes timeout

      const result = await cleanupFunction({ tenantId, dryRun });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה בניקוי אירועים יתומים');
      }

      if (dryRun) {
          logger.log(`Dry run cleanup: Found ${result.data.foundCount} orphan events in calendar ${result.data.calendarName}`);
      } else {
          logger.log(`Successfully cleaned up ${result.data.deletedCount} orphan events from calendar ${result.data.calendarName}`);
      }
      
      return result.data;
    } catch (error: any) {
      logger.error('Error cleaning up orphan events:', error);
      throw new Error(error.message || 'שגיאה בניקוי אירועים יתומים');
    }
  },

  async previewDeletion(tenantId: string): Promise<PreviewDeletionResult> {
    try {
      const previewFunction = httpsCallable<
        { tenantId: string },
        PreviewDeletionResult
      >(functions, 'previewDeletion', { timeout: 540000 }); // 9 minutes timeout

      const result = await previewFunction({ tenantId });

      if (!result.data.success) {
         throw new Error('שגיאה בטעינת תצוגה מקדימה למחיקה');
      }

      logger.log(`Deletion preview loaded: ${result.data.totalCount} events`);
      return result.data;
    } catch (error: any) {
      logger.error('Error loading deletion preview:', error);
      throw new Error(error.message || 'שגיאה בטעינת תצוגה מקדימה');
    }
  },

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

        // נשתמש ב-code flow כדי לקבל refresh token
        const client = window.google.accounts.oauth2.initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          ux_mode: 'popup',
          access_type: 'offline', // קריטי לקבלת refresh_token
          prompt: 'consent',      // מכריח את גוגל לשלוח refresh_token מחדש
          callback: async (response: any) => {
            callbackCalled = true;
            clearTimeout(timeout);
            
            logger.log('Google OAuth code received:', { 
              hasCode: !!response.code, 
              error: response.error,
              errorDescription: response.error_description
            });
            
            if (response.code) {
              // אנחנו צריכים להחליף את ה-code ב-tokens בשרת
              // אבל כדי לשמור על תאימות לזרימה הנוכחית, נבצע את ההחלפה כאן או בשרת.
              // גישה מומלצת: לשלוח את ה-code לפונקציה בשרת שתבצע את ההחלפה ותשמור את הטוקנים.
              
              try {
                // נקרא לפונקציה חדשה שתטפל בהחלפת הקוד
                const exchangeFunction = httpsCallable<
                  { code: string },
                  { accessToken: string; expiresIn: number }
                >(functions, 'exchangeGoogleAuthCode');

                const result = await exchangeFunction({ code: response.code });
                
                resolve({
                  accessToken: result.data.accessToken,
                  expiresIn: result.data.expiresIn
                });
              } catch (err: any) {
                logger.error('Error exchanging code for tokens:', err);
                reject(new Error('שגיאה בהחלפת קוד אימות'));
              }

            } else if (response.error) {
              logger.error('Google OAuth error in callback:', response.error, response.error_description);
              reject(new Error(`שגיאת Google: ${response.error_description || response.error}`));
            } else {
              logger.error('No code and no error in callback');
              reject(new Error('לא התקבל קוד אימות מ-Google'));
            }
          },
          error_callback: (error: any) => {
            callbackCalled = true;
            clearTimeout(timeout);
            logger.error('Google OAuth error_callback:', error);
            reject(new Error('שגיאה באימות Google'));
          }
        });

        // Request auth code
        logger.log('Requesting Google OAuth code...');
        client.requestCode();
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
        // Removed calendarId overwrite to respect existing preference or server logic
        updatedAt: serverTimestamp()
      }, { merge: true }); // Added merge: true

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
        { success: boolean; message: string; totalQueued: number }
      >(functions, 'syncMultipleBirthdaysToGoogleCalendar', { timeout: 540000 }); // 9 minutes timeout

      const result = await syncFunction({ birthdayIds });

      if (!result.data.success) {
          throw new Error(result.data.message || 'Failed to start sync');
      }

      return {
        totalAttempted: birthdayIds.length,
        status: 'queued',
        message: result.data.message || 'Sync started',
        successCount: 0, // Not available yet
        failureCount: 0, // Not available yet
        results: []      // Not available yet
      };
    } catch (error: any) {
      logger.error('Error syncing multiple birthdays:', error);
      // Handle strict mode error specifically
      if (error.message?.includes('googleCalendar.primaryNotAllowed')) {
          throw new Error('Strict Mode: Syncing to Primary Calendar is not allowed. Please create a dedicated calendar in settings.');
      }
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

  async deleteAllSyncedEvents(tenantId: string): Promise<{ totalDeleted: number; failedCount: number; message: string; calendarName?: string }> {
    try {
      const deleteFunction = httpsCallable<
        { tenantId: string },
        { success: boolean; totalDeleted: number; failedCount: number; message: string; calendarName?: string }
      >(functions, 'deleteAllSyncedEventsFromGoogleCalendar', { timeout: 540000 }); // 9 minutes timeout

      const result = await deleteFunction({ tenantId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'שגיאה במחיקה');
      }

      logger.log(`Successfully deleted ${result.data.totalDeleted} events from Google Calendar (${result.data.calendarName})`);
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
        'disconnectGoogleCalendar',
        { timeout: 540000 } // 9 minutes timeout
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

  async resetBirthdaySyncData(birthdayId: string): Promise<void> {
    try {
        const resetFunction = httpsCallable<{ birthdayId: string }, { success: boolean; message: string }>(
            functions,
            'resetBirthdaySyncData'
        );
        await resetFunction({ birthdayId });
    } catch (error: any) {
        logger.error('Error resetting sync data:', error);
        throw new Error(error.message || 'Failed to reset sync data');
    }
  },

  async getStatus(userId: string): Promise<GoogleCalendarStatus> {
    try {
      if (!userId) {
          throw new Error('User ID required');
      }

      const statusFunction = httpsCallable<void, GoogleCalendarStatus>(
          functions,
          'getGoogleCalendarStatus'
      );
      
      const result = await statusFunction();
      return result.data;
    } catch (error: any) {
      // logger.warn('Could not get status:', error); // Suppress detailed log for common connect check
      return {
        isConnected: false,
        email: '',
        name: '',
        picture: '',
        calendarId: 'primary',
        calendarName: 'יומן ראשי',
        syncStatus: 'IDLE',
        lastSyncStart: 0,
        recentActivity: []
      };
    }
  },

  // Deprecated: Use getStatus instead
  async getTokenStatus(userId: string): Promise<GoogleCalendarSyncStatus> {
      const status = await this.getStatus(userId);
      return {
          isConnected: status.isConnected,
          lastSyncTime: status.lastSyncStart ? new Date(status.lastSyncStart).toISOString() : null,
          syncedBirthdaysCount: 0,
          userEmail: status.email,
          calendarId: status.calendarId,
          calendarName: status.calendarName
      };
  },

  async getGoogleAccountInfo(): Promise<{ email: string; name: string; picture: string } | null> {
    const status = await this.getStatus(auth.currentUser?.uid || '');
    if (!status.isConnected) return null;
    return {
        email: status.email,
        name: status.name,
        picture: status.picture
    };
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
