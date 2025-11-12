import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, Loader, Trash2, User, LogOut, Plus, Settings, ChevronDown } from 'lucide-react';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import { useTenant } from '../../contexts/TenantContext';
import { format } from 'date-fns';

interface CalendarOption {
  id: string;
  summary: string;
  description: string;
  primary: boolean;
}

export const GoogleCalendarButton: React.FC = () => {
  const { t } = useTranslation();
  const { 
    isConnected, 
    lastSyncTime, 
    isSyncing, 
    userEmail, 
    calendarId, 
    calendarName,
    connectToGoogle, 
    deleteAllSyncedEvents, 
    disconnect, 
    createCalendar,
    updateCalendarSelection,
    listCalendars
  } = useGoogleCalendar();
  const { currentTenant } = useTenant();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCreateCalendar, setShowCreateCalendar] = useState(false);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [availableCalendars, setAvailableCalendars] = useState<CalendarOption[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

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
      await disconnect(); 
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) {
      return;
    }

    try {
      await createCalendar(newCalendarName.trim());
      setShowCreateCalendar(false);
      setNewCalendarName('');
    } catch (error) {
      console.error('Error creating calendar:', error);
    }
  };

  const handleSwitchToPrimary = async () => {
    try {
      await updateCalendarSelection('primary', 'יומן ראשי');
    } catch (error) {
      console.error('Error switching to primary:', error);
    }
  };

  const loadAvailableCalendars = async () => {
    try {
      setLoadingCalendars(true);
      const calendars = await listCalendars();
      setAvailableCalendars(calendars);
    } catch (error) {
      console.error('Error loading calendars:', error);
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleSelectCalendar = async (selectedCalendar: CalendarOption) => {
    try {
      await updateCalendarSelection(selectedCalendar.id, selectedCalendar.summary);
      setShowCalendarSelector(false);
    } catch (error) {
      console.error('Error selecting calendar:', error);
    }
  };

  useEffect(() => {
    if (isConnected && showCalendarSelector && availableCalendars.length === 0) {
      loadAvailableCalendars();
    }
  }, [isConnected, showCalendarSelector]);

  if (isConnected) {
    return (
      <>
        {/* קרד מידע על החיבור */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden w-full sm:w-auto">
          <div className="p-3 sm:p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg flex items-center justify-center shadow-md">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-green-900 text-sm sm:text-base mb-1">
                  {t('googleCalendar.connected')}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 text-green-700">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">
                      {userEmail || (isSyncing ? 'טוען...' : 'לא זמין')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-green-700">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <button
                      onClick={() => setShowCalendarSelector(!showCalendarSelector)}
                      disabled={isSyncing}
                      className="flex items-center gap-1 hover:underline disabled:opacity-50 truncate max-w-[200px] sm:max-w-none"
                      title={t('googleCalendar.selectCalendar')}
                    >
                      <span className="truncate">{calendarName || t('googleCalendar.primaryCalendar')}</span>
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    </button>
                  </div>
                  {lastSyncTime && (
                    <div className="text-green-600 text-xs">
                      {t('googleCalendar.lastSync')}: {format(lastSyncTime, 'dd/MM/yyyy HH:mm')}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* כפתורי פעולה */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-green-200">
              <button
                onClick={() => setShowCreateCalendar(true)}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 font-medium"
                title={t('googleCalendar.createCalendar')}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('googleCalendar.createCalendar')}</span>
                <span className="sm:hidden">צור יומן</span>
              </button>
              <button
                onClick={() => setShowCalendarSelector(!showCalendarSelector)}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 font-medium"
                title={t('googleCalendar.selectCalendar')}
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('googleCalendar.selectCalendar')}</span>
                <span className="sm:hidden">בחר יומן</span>
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 font-medium"
                title="מחק את כל האירועים המסונכרנים"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">מחק הכל</span>
                <span className="sm:hidden">מחק</span>
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 font-medium"
                title="נתק מיומן Google"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">נתק</span>
                <span className="sm:hidden">נתק</span>
              </button>
            </div>
          </div>
        </div>

        {/* מודלים - מוצגים מחוץ לקרד הראשי */}
        {showCreateCalendar && (
          <div className="mt-2 w-full sm:w-96 sm:ml-auto bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-blue-900">
                {t('googleCalendar.createCalendar')}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-blue-700 mb-4 leading-relaxed">
              יומן מותאם אישית מאפשר לך לשתף את ימי ההולדת עם משפחה וחברים מבלי לחשוף את היומן האישי שלך.
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                placeholder={t('googleCalendar.calendarName')}
                className="w-full px-3 py-2.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCalendar();
                  }
                }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleCreateCalendar}
                disabled={isSyncing || !newCalendarName.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
              >
                {isSyncing ? t('common.creating') : t('common.create')}
              </button>
              <button
                onClick={() => {
                  setShowCreateCalendar(false);
                  setNewCalendarName('');
                }}
                disabled={isSyncing}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {showCalendarSelector && (
          <div className="mt-2 w-full sm:w-96 sm:ml-auto bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-purple-900">
                {t('googleCalendar.selectCalendar')}
              </h3>
            </div>
            {loadingCalendars ? (
              <div className="flex items-center justify-center gap-2 py-8 text-purple-700">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="text-sm">טוען יומנים...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {/* יומן ראשי */}
                <button
                  onClick={() => handleSelectCalendar({ id: 'primary', summary: 'יומן ראשי', description: '', primary: true })}
                  disabled={isSyncing || calendarId === 'primary'}
                  className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all ${
                    calendarId === 'primary'
                      ? 'bg-purple-200 text-purple-900 font-medium shadow-sm'
                      : 'bg-white text-purple-800 hover:bg-purple-100 border border-purple-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">יומן ראשי</span>
                    {calendarId === 'primary' && <Check className="w-4 h-4 text-purple-600" />}
                  </div>
                </button>

                {/* יומנים מותאמים אישית */}
                {availableCalendars
                  .filter(cal => cal.id !== 'primary' && !cal.primary)
                  .map((calendar) => (
                    <button
                      key={calendar.id}
                      onClick={() => handleSelectCalendar(calendar)}
                      disabled={isSyncing || calendarId === calendar.id}
                      className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all ${
                        calendarId === calendar.id
                          ? 'bg-purple-200 text-purple-900 font-medium shadow-sm'
                          : 'bg-white text-purple-800 hover:bg-purple-100 border border-purple-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{calendar.summary}</span>
                        {calendarId === calendar.id && <Check className="w-4 h-4 text-purple-600" />}
                      </div>
                      {calendar.description && (
                        <div className="text-xs text-purple-600 mt-1 text-right">{calendar.description}</div>
                      )}
                    </button>
                  ))}
              </div>
            )}
            <button
              onClick={() => {
                setShowCalendarSelector(false);
                setAvailableCalendars([]);
              }}
              disabled={isSyncing}
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        )}

        {showConfirm && (
          <div className="mt-2 w-full sm:w-96 sm:ml-auto bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-red-900">
                מחיקת כל האירועים
              </h3>
            </div>
            <p className="text-sm text-red-800 font-medium mb-2">
              האם אתה בטוח שברצונך למחוק את <strong>כל האירועים</strong> המסונכרנים מיומן Google?
            </p>
            <p className="text-xs sm:text-sm text-red-700 mb-4 leading-relaxed">
              פעולה זו תמחק את כל ימי ההולדת שנוצרו דרך האפליקציה (עשרות או מאות אירועים). פעולה זו אינה ניתנת לביטול.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDeleteAll}
                disabled={isSyncing}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
              >
                {isSyncing ? 'מוחק...' : 'כן, מחק הכל'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isSyncing}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isSyncing}
      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium text-sm sm:text-base"
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
