import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { googleCalendarService } from '../services/googleCalendar.service';
import { useAuth } from './AuthContext';
import { GoogleCalendarContextType, SyncResult, BulkSyncResult, CleanupOrphansResult, PreviewDeletionResult, SyncHistoryItem } from '../types';
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [isPrimaryCalendar, setIsPrimaryCalendar] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'IN_PROGRESS' | 'DELETING'>('IDLE');
  const [recentActivity, setRecentActivity] = useState<SyncHistoryItem[]>([]);

  useEffect(() => {
    if (user) {
      refreshStatus();
    } else {
      setIsConnected(false);
      setLastSyncTime(null);
      setUserEmail(null);
      setCalendarId(null);
      setCalendarName(null);
      setSyncStatus('IDLE');
      setRecentActivity([]);
    }
  }, [user]);

  const refreshStatus = async () => {
    if (!user) return;

    try {
      const status = await googleCalendarService.getStatus(user.id);
      
      if (!status) {
        logger.warn('Received empty status from Google Calendar service');
        return;
      }

      setIsConnected(!!status.isConnected);
      setSyncStatus(status.syncStatus || 'IDLE');
      setRecentActivity(Array.isArray(status.recentActivity) ? status.recentActivity : []);

      if (status.lastSyncStart) {
        setLastSyncTime(new Date(status.lastSyncStart));
      } else {
        setLastSyncTime(null);
      }

      setUserEmail(status.email || null);
      setCalendarId(status.calendarId || null);
      setCalendarName(status.calendarName || null);
      setIsPrimaryCalendar(!!status.isPrimary);
      
    } catch (error) {
      logger.error('Error refreshing Google Calendar status:', error);
    }
  };

  const connectToGoogle = async () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      showToast(t('googleCalendar.apiError'), 'error');
      return;
    }

    setIsSyncing(true);

    try {
      const tokenResponse = await googleCalendarService.initiateGoogleOAuth();

      if (!tokenResponse.accessToken) {
        throw new Error(t('googleCalendar.noToken'));
      }

      // Removed redundant saveAccessToken call - the server already saves it properly with refresh token.
      // await googleCalendarService.saveAccessToken(tokenResponse.accessToken, tokenResponse.expiresIn);

      await refreshStatus();

      showToast(t('googleCalendar.connected'), 'success');
    } catch (error: any) {
      logger.error('Error connecting to Google Calendar:', error);
      showToast(error.message || t('googleCalendar.syncError'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSingleBirthday = async (birthdayId: string): Promise<SyncResult> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    if (calendarId === 'primary') {
      const msg = t('googleCalendar.cannotSyncToPrimary', 'לא ניתן לסנכרן ליומן הראשי. אנא בחר יומן ייעודי.');
      showToast(msg, 'error');
      throw new Error(msg);
    }

    if (calendarId === 'primary') {
      const msg = t('googleCalendar.cannotSyncToPrimary', 'לא ניתן לסנכרן ליומן הראשי. אנא בחר יומן ייעודי.');
      showToast(msg, 'error');
      throw new Error(msg);
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.syncBirthdayToCalendar(birthdayId);

      if (result.success) {
        setLastSyncTime(new Date());
        // ✅ Toast מוצג בקומפוננטה - אין צורך כאן
        refreshStatus(); // Refresh to update history
      } else {
        showToast(result.error || t('googleCalendar.syncError'), 'error');
      }

      return result;
    } catch (error: any) {
      logger.error('Error syncing birthday:', error);
      showToast(error.message || t('googleCalendar.syncError'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncMultipleBirthdays = async (birthdayIds: string[]): Promise<BulkSyncResult> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    if (calendarId === 'primary') {
      const msg = t('googleCalendar.cannotSyncToPrimary', 'לא ניתן לסנכרן ליומן הראשי. אנא בחר יומן ייעודי.');
      showToast(msg, 'error');
      throw new Error(msg);
    }

    if (calendarId === 'primary') {
      const msg = t('googleCalendar.cannotSyncToPrimary', 'לא ניתן לסנכרן ליומן הראשי. אנא בחר יומן ייעודי.');
      showToast(msg, 'error');
      throw new Error(msg);
    }

    try {
      setIsSyncing(true);
      
      // Pass all IDs to the service which calls the Cloud Function (enqueuer)
      const result = await googleCalendarService.syncMultipleBirthdays(birthdayIds);

      setLastSyncTime(new Date());
      setSyncStatus('IN_PROGRESS'); // Optimistic update
      
      if (result.status === 'queued') {
          showToast(t('googleCalendar.syncStarted', { count: birthdayIds.length }), 'success');
      } else {
          showToast(t('googleCalendar.syncedCount', { count: result.successCount || 0 }), 'success');
      }

      // Schedule a few refreshes to check status update
      setTimeout(refreshStatus, 5000);

      return result;
    } catch (error: any) {
      logger.error('Error syncing multiple birthdays:', error);
      showToast(error.message || t('googleCalendar.syncError'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const cleanupOrphanEvents = async (tenantId: string, dryRun: boolean = false): Promise<CleanupOrphansResult> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.cleanupOrphanEvents(tenantId, dryRun);
      if (!dryRun) {
          showToast(t('googleCalendar.cleanupSuccess', { count: result.deletedCount }), 'success');
      }
      return result;
    } catch (error: any) {
      logger.error('Error cleaning orphans:', error);
      showToast(error.message || t('common.error'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const previewDeletion = async (tenantId: string): Promise<PreviewDeletionResult> => {
     if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }
    
    try {
        setIsSyncing(true);
        const result = await googleCalendarService.previewDeletion(tenantId);
        return result;
    } catch (error: any) {
        logger.error('Error previewing deletion:', error);
        showToast(error.message || t('common.error'), 'error');
        throw error;
    } finally {
        setIsSyncing(false);
    }
  };

  const removeBirthdayFromCalendar = async (birthdayId: string): Promise<void> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    try {
      setIsSyncing(true);
      await googleCalendarService.removeBirthdayFromCalendar(birthdayId);
      // ✅ Toast מוצג בקומפוננטה - אין צורך כאן
    } catch (error: any) {
      logger.error('Error removing birthday:', error);
      showToast(error.message || t('common.error'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteAllSyncedEvents = async (tenantId: string): Promise<{ success: boolean; message: string }> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.deleteAllSyncedEvents(tenantId);
      showToast(result.message || 'Cleanup job started in background', 'success');
      return result;
    } catch (error: any) {
      logger.error('Error deleting all synced events:', error);
      showToast(error.message || t('common.error'), 'error');
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
      setSyncStatus('IDLE');
      setRecentActivity([]);
      showToast(t('googleCalendar.disconnectedSuccess'), 'success');
    } catch (error: any) {
      logger.error('Error disconnecting:', error);
      showToast(error.message || t('common.error'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const createCalendar = async (name: string): Promise<{ calendarId: string; calendarName: string }> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    try {
      setIsSyncing(true);
      const result = await googleCalendarService.createCalendar(name);
      
      setCalendarId(result.calendarId);
      setCalendarName(result.calendarName);
      
      // A newly created calendar is never primary
      setIsPrimaryCalendar(false);
      
      showToast(t('googleCalendar.createdSuccess'), 'success');
      return result;
    } catch (error: any) {
      logger.error('Error creating calendar:', error);
      showToast(error.message || t('common.error'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateCalendarSelection = async (selectedCalendarId: string, selectedCalendarName: string): Promise<void> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    // Save previous state for potential rollback
    const prevId = calendarId;
    const prevName = calendarName;
    const prevIsPrimary = isPrimaryCalendar;

    try {
      // Optimistic Update
      setCalendarId(selectedCalendarId);
      setCalendarName(selectedCalendarName);
      
      // Update isPrimaryCalendar based on selection
      // We assume if it's not explicitly 'primary' (or the user's email), it's a secondary calendar
      const isPrimary = selectedCalendarId === 'primary' || (userEmail && selectedCalendarId === userEmail);
      setIsPrimaryCalendar(!!isPrimary);

      setIsSyncing(true);
      await googleCalendarService.updateCalendarSelection(selectedCalendarId, selectedCalendarName);
      
      showToast(t('googleCalendar.calendarSelectionUpdated'), 'success');
    } catch (error: any) {
      // Rollback on error
      setCalendarId(prevId);
      setCalendarName(prevName);
      setIsPrimaryCalendar(prevIsPrimary);

      logger.error('Error updating calendar selection:', error);
      showToast(error.message || t('common.error'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const listCalendars = async (): Promise<Array<{ id: string; summary: string; description: string; primary: boolean }>> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    try {
      setIsSyncing(true);
      const calendars = await googleCalendarService.listCalendars();
      return calendars;
    } catch (error: any) {
      logger.error('Error listing calendars:', error);
      showToast(error.message || t('common.error'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteCalendar = async (calendarIdToDelete: string): Promise<void> => {
    if (!isConnected) {
      showToast(t('googleCalendar.connectFirst'), 'error');
      throw new Error('Not connected to Google Calendar');
    }

    try {
      setIsSyncing(true);
      await googleCalendarService.deleteCalendar(calendarIdToDelete);
      showToast(t('googleCalendar.deletedSuccess'), 'success');
      
      // רענון רשימת היומנים אחרי מחיקה
      await listCalendars();
    } catch (error: any) {
      logger.error('Error deleting calendar:', error);
      showToast(error.message || t('common.error'), 'error');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const resetBirthdaySyncData = async (birthdayId: string): Promise<void> => {
      if (!isConnected) {
          showToast(t('googleCalendar.connectFirst'), 'error');
          throw new Error('Not connected');
      }
      try {
          await googleCalendarService.resetBirthdaySyncData(birthdayId);
          showToast(t('googleCalendar.syncDataReset'), 'success');
      } catch (error: any) {
          logger.error('Error resetting sync data:', error);
          showToast(error.message, 'error');
          throw error;
      }
  };

  const value: GoogleCalendarContextType = {
    isConnected,
    lastSyncTime,
    isSyncing,
    userEmail,
    calendarId,
    calendarName,
    isPrimaryCalendar,
    syncStatus,
    recentActivity,
    connectToGoogle,
    syncSingleBirthday,
    syncMultipleBirthdays,
    removeBirthdayFromCalendar,
    deleteAllSyncedEvents,
    disconnect,
    refreshStatus,
    createCalendar,
    updateCalendarSelection,
    listCalendars,
    deleteCalendar,
    cleanupOrphanEvents,
    previewDeletion,
    resetBirthdaySyncData
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleCalendarContext.Provider value={value}>{children}</GoogleCalendarContext.Provider>
    </GoogleOAuthProvider>
  );
};
