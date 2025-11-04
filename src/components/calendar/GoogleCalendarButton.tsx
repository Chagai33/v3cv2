import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, Loader, Trash2, User, LogOut } from 'lucide-react';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import { useTenant } from '../../contexts/TenantContext';
import { format } from 'date-fns';
import { googleCalendarService } from '../../services/googleCalendar.service';

export const GoogleCalendarButton: React.FC = () => {
  const { t } = useTranslation();
  // [FIX] שימוש בפונקציות הנכונות: disconnect ו-refreshStatus
  const { isConnected, lastSyncTime, isSyncing, connectToGoogle, deleteAllSyncedEvents, disconnect, refreshStatus } = useGoogleCalendar();
  const { currentTenant } = useTenant();
  const [showConfirm, setShowConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [calendarName, setCalendarName] = useState<string>('Primary');

  useEffect(() => {
    if (isConnected) {
      // טעינת פרטי המשתמש מתבצעת רק אם מחובר, אך נדרשת טיפול בשגיאת 403 (טוקן פג תוקף)
      import('../../services/googleCalendar.service').then(({ googleCalendarService }) => {
        googleCalendarService.getGoogleAccountInfo().then((info) => {
          if (info?.email) setUserEmail(info.email);
        }).catch((error) => {
          // אם הטוקן פג, הקריאה הזו נכשלת. נשתמש ב-refreshStatus
          // כדי לאלץ את ה-Context לנקות את סטטוס החיבור.
          console.warn('Could not fetch Google user info (token may be expired):', error);
          refreshStatus(); 
        });
      });
    }
  }, [isConnected, refreshStatus]); // הוספת refreshStatus כתלות

  const handleConnect = () => {
    // Call connectToGoogle synchronously from user click event
    // This ensures the popup is opened immediately in response to user interaction
    connectToGoogle().catch((error) => {
      console.error('Error connecting:', error);
    });
  };

  const handleDeleteAll = async () => {
    if (!currentTenant) return;

    try {
      await deleteAllSyncedEvents(currentTenant.id);
      setShowConfirm(false);
    } catch (error) {
      console.error('Error deleting all events:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      // [FIX] קריאה לפונקציית הניתוק הנכונה מה-Context
      await disconnect(); 
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  if (isConnected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-600" />
          <div className="text-sm flex-1">
            <div className="font-medium text-green-900">{t('googleCalendar.connected')}</div>
            {userEmail && (
              <div className="flex items-center gap-1 text-green-700">
                <User className="w-3 h-3" />
                <span className="text-xs">{userEmail}</span>
              </div>
            )}
            <div className="text-green-700 text-xs">
              יומן: {calendarName}
            </div>
            {lastSyncTime && (
              <div className="text-green-700 text-xs">
                {t('googleCalendar.lastSync')}: {format(lastSyncTime, 'dd/MM/yyyy HH:mm')}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="מחק את כל האירועים המסונכרנים"
            >
              <Trash2 className="w-4 h-4" />
              <span>מחק הכל</span>
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="נתק מיומן Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900 font-medium mb-3">
              האם אתה בטוח שברצונך למחוק את **כל האירועים** המסונכרנים מיומן Google?
            </p>
            <p className="text-xs text-red-700 mb-3">
              פעולה זו תמחק את כל ימי ההולדת שנוצרו דרך האפליקציה (עשרות או מאות אירועים).
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAll}
                disabled={isSyncing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {isSyncing ? 'מוחק...' : 'כן, מחק הכל'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isSyncing}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isSyncing}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isSyncing ? (
        <Loader className="w-5 h-5 animate-spin" />
      ) : (
        <Calendar className="w-5 h-5" />
      )}
      <span>{t('googleCalendar.connect')}</span>
    </button>
  );
};
