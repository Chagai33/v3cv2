import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { googleCalendarService } from '../services/googleCalendar.service';
import { useAuth } from './AuthContext';
import { GoogleCalendarContextType, SyncResult, BulkSyncResult } from '../types';
import { logger } from '../utils/logger';
import { useToast } from './ToastContext';

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

export const useGoogleCalendar = () => {
  const context = useContext(GoogleCalendarContext);
  if (!context) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
};

interface GoogleCalendarProviderProps {
  children: ReactNode;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const GoogleCalendarProvider: React.FC<GoogleCalendarProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [calendarName, setCalendarName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      refreshStatus();
    } else {
      setIsConnected(false);
      setLastSyncTime(null);
      setUserEmail(null);
      setCalendarId(null);
      setCalendarName(null);
    }
  }, [user]);

  const refreshStatus = async () => {
    if (!user) return;

    try {
      const status = await googleCalendarService.getTokenStatus(user.id);
      setIsConnected(status.isConnected);

      if (status.lastSyncTime) {
        setLastSyncTime(new Date(status.lastSyncTime));
      }

      if (status.userEmail) {
        setUserEmail(status.userEmail);
      }

      if (status.calendarId) {
        setCalendarId(status.calendarId);
      }

      if (status.calendarName) {
        setCalendarName(status.calendarName);
      }

      // אם יש מייל ב-status, נשתמש בו
      if (status.isConnected && status.userEmail && !userEmail) {
        setUserEmail(status.userEmail);
      }
      
      // אם מחובר אבל אין מייל, נטען את פרטי המשתמש - קריטי!
      if (status.isConnected && !userEmail) {
        try {
          const accountInfo = await googleCalendarService.getGoogleAccountInfo();
          if (accountInfo?.email) {
            setUserEmail(accountInfo.email);
            logger.log('User email loaded in refreshStatus:', accountInfo.email);
          }
        } catch (emailError: any) {
          logger.error('Error loading user email in refreshStatus:', emailError);
          
          // אם הטוקן פג תוקף, ננתק את החיבור
          if (emailError.message?.includes('פג תוקף') || emailError.message?.includes('permission-denied')) {
            logger.warn('Token expired, disconnecting Google Calendar');
            setIsConnected(false);
            setUserEmail(null);
            setCalendarId(null);
            setCalendarName(null);
            showToast('הטוקן פג תוקף. אנא התחבר מחדש ליומן Google', 'warning');
            return;
          }
          
          // ננסה שוב אחרי רגע רק אם זו לא שגיאת הרשאה
          setTimeout(async () => {
            try {
              const accountInfo = await googleCalendarService.getGoogleAccountInfo();
              if (accountInfo?.email) {
                setUserEmail(accountInfo.email);
              }
            } catch (retryError) {
              logger.error('Retry failed to load user email:', retryError);
            }
          }, 2000);
        }
      }
    } catch (error) {
      logger.error('Error refreshing Google Calendar status:', error);
    }
  };

  const connectToGoogle = async () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      showToast('Google API טרם נטען. אנא רענן את הדף ונסה שוב', 'error');
      return;
    }

    setIsSyncing(true);

    try {
      const tokenResponse = await googleCalendarService.initiateGoogleOAuth();

      if (!tokenResponse.accessToken) {
        throw new Error('לא התקבל טוקן גישה מ-Google');
      }

      await googleCalendarService.saveAccessToken(tokenResponse.accessToken, tokenResponse.expiresIn);

      // טעינת פרטי משתמש אחרי חיבור - קריטי!
      try {
        const accountInfo = await googleCalendarService.getGoogleAccountInfo();
        if (accountInfo?.email) {
          setUserEmail(accountInfo.email);
          logger.log('User email loaded:', accountInfo.email);
        } else {
          logger.warn('No email received from Google account info');
        }
      } catch (emailError: any) {
        logger.error('Error loading user email:', emailError);
        // לא נזרוק שגיאה כאן, רק נוודא שהמייל יטען ב-refreshStatus
      }

      await refreshStatus();

      // אם עדיין אין מייל אחרי refreshStatus, ננסה שוב
      // נבדוק את ה-state אחרי refreshStatus
      const currentStatus = await googleCalendarService.getTokenStatus(user!.id);
      if (currentStatus.isConnected && !currentStatus.userEmail) {
        try {
          const accountInfo = await googleCalendarService.getGoogleAccountInfo();
          if (accountInfo?.email) {
            setUserEmail(accountInfo.email);
            logger.log('User email loaded in retry:', accountInfo.email);
          }
        } catch (retryError) {
          logger.error('Retry failed to load user email:', retryError);
        }
      }

      showToast('החיבור ליומן Google הושלם בהצלחה', 'success');
    } catch (error: any) {
      logger.error('Error connecting to Google Calendar:', error);
      showToast(error.message || 'שגיאה בחיבור ליומן Google', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSingleBirthday = async (birthdayId: string): Promise<SyncResult> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.syncBirthdayToCalendar(birthdayId);

      if (result.success) {
        setLastSyncTime(new Date());
        showToast('יום ההולדת נוסף ליומן Google בהצלחה', 'success');
      } else {
        showToast(result.error || 'שגיאה בסנכרון', 'error');
      }

      return result;
    } catch (error: any) {
      logger.error('Error syncing birthday:', error);
      showToast(error.message || 'שגיאה בסנכרון', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncMultipleBirthdays = async (birthdayIds: string[]): Promise<BulkSyncResult> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.syncMultipleBirthdays(birthdayIds);

      setLastSyncTime(new Date());
      showToast(`סונכרנו ${result.successCount} ימי הולדת בהצלחה`, 'success');

      return result;
    } catch (error: any) {
      logger.error('Error syncing multiple birthdays:', error);
      showToast(error.message || 'שגיאה בסנכרון מרובה', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const removeBirthdayFromCalendar = async (birthdayId: string): Promise<void> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      await googleCalendarService.removeBirthdayFromCalendar(birthdayId);
      showToast('יום ההולדת הוסר מיומן Google', 'success');
    } catch (error: any) {
      logger.error('Error removing birthday:', error);
      showToast(error.message || 'שגיאה בהסרת יום ההולדת', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteAllSyncedEvents = async (tenantId: string): Promise<{ totalDeleted: number; failedCount: number }> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.deleteAllSyncedEvents(tenantId);
      showToast(result.message || `נמחקו ${result.totalDeleted} אירועים מיומן Google`, 'success');
      return result;
    } catch (error: any) {
      logger.error('Error deleting all synced events:', error);
      showToast(error.message || 'שגיאה במחיקת האירועים', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      setIsSyncing(true);
      await googleCalendarService.disconnectCalendar();

      setIsConnected(false);
      setLastSyncTime(null);
      setUserEmail(null);
      setCalendarId(null);
      setCalendarName(null);
      showToast('החיבור ליומן Google נותק בהצלחה', 'success');
    } catch (error: any) {
      logger.error('Error disconnecting:', error);
      showToast(error.message || 'שגיאה בניתוק החיבור', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const createCalendar = async (name: string): Promise<{ calendarId: string; calendarName: string }> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.createCalendar(name);
      
      setCalendarId(result.calendarId);
      setCalendarName(result.calendarName);
      
      showToast('יומן נוצר בהצלחה', 'success');
      return result;
    } catch (error: any) {
      logger.error('Error creating calendar:', error);
      showToast(error.message || 'שגיאה ביצירת יומן', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateCalendarSelection = async (selectedCalendarId: string, selectedCalendarName: string): Promise<void> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      await googleCalendarService.updateCalendarSelection(selectedCalendarId, selectedCalendarName);
      
      setCalendarId(selectedCalendarId);
      setCalendarName(selectedCalendarName);
      
      showToast('בחירת יומן עודכנה בהצלחה', 'success');
    } catch (error: any) {
      logger.error('Error updating calendar selection:', error);
      showToast(error.message || 'שגיאה בעדכון בחירת יומן', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const listCalendars = async (): Promise<Array<{ id: string; summary: string; description: string; primary: boolean }>> => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      throw new Error('לא מחובר ליומן Google');
    }

    try {
      setIsSyncing(true);
      const calendars = await googleCalendarService.listCalendars();
      return calendars;
    } catch (error: any) {
      logger.error('Error listing calendars:', error);
      showToast(error.message || 'שגיאה בקבלת רשימת יומנים', 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const value: GoogleCalendarContextType = {
    isConnected,
    lastSyncTime,
    isSyncing,
    userEmail,
    calendarId,
    calendarName,
    connectToGoogle,
    syncSingleBirthday,
    syncMultipleBirthdays,
    removeBirthdayFromCalendar,
    deleteAllSyncedEvents,
    disconnect,
    refreshStatus,
    createCalendar,
    updateCalendarSelection,
    listCalendars
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleCalendarContext.Provider value={value}>{children}</GoogleCalendarContext.Provider>
    </GoogleOAuthProvider>
  );
};
