import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, Loader, Trash2, User, LogOut, Plus, Settings, ChevronDown, ShieldAlert, RefreshCw, History, X } from 'lucide-react';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { format, isValid } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { CreatedCalendar, PreviewDeletionResult } from '../../types';
import { SyncHistoryModal } from './SyncHistoryModal';

interface CalendarOption {
  id: string;
  summary: string;
  description: string;
  primary: boolean;
}

interface GoogleCalendarButtonProps {
  initialStrictMode?: boolean;
}

export const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({ initialStrictMode = false }) => {
  const { t } = useTranslation();
  const { 
    isConnected, 
    lastSyncTime, 
    isSyncing, 
    userEmail, 
    calendarId, 
    calendarName,
    syncStatus,
    recentActivity,
    connectToGoogle, 
    deleteAllSyncedEvents, 
    disconnect, 
    createCalendar,
    updateCalendarSelection,
    listCalendars,
    deleteCalendar,
    cleanupOrphanEvents,
    previewDeletion
  } = useGoogleCalendar();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCreateCalendar, setShowCreateCalendar] = useState(false);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [availableCalendars, setAvailableCalendars] = useState<CalendarOption[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [createdCalendars, setCreatedCalendars] = useState<CreatedCalendar[]>([]);
  const [calendarToDelete, setCalendarToDelete] = useState<string | null>(null);
  const [calendarToDeleteName, setCalendarToDeleteName] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStrictModeModal, setShowStrictModeModal] = useState(initialStrictMode); 
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false); 
  const [cleanupPreviewData, setCleanupPreviewData] = useState<{ foundCount: number; calendarName: string } | null>(null); 
  const [loadingCleanup, setLoadingCleanup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [previewData, setPreviewData] = useState<PreviewDeletionResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Update showStrictModeModal if initialStrictMode prop changes (e.g. when opening modal from Dashboard)
  useEffect(() => {
    if (initialStrictMode) {
        setShowStrictModeModal(true);
    }
  }, [initialStrictMode]);

  // Reactively show Strict Mode modal when connected to Primary Calendar
  useEffect(() => {
    // Show strict mode modal if:
    // 1. Connected
    // 2. Not currently syncing/loading
    // 3. On Primary Calendar
    // 4. Modal not currently shown (implicit)
    if (isConnected && !isSyncing && calendarId === 'primary') {
       // We could add a check for localStorage here to see if user dismissed it recently,
       // but strictly speaking, we want to encourage them to switch.
       // Check if we haven't already shown it this session or similar logic if needed.
       // For now, we just rely on the state.
       // NOTE: This might re-open if they close it without switching. 
       // To prevent that, we'd need a "dismissed" state. 
       // But let's keep it simple: If they connect and it's primary, show it.
       
       // However, to avoid "fighting" the user closing it, we might want to only trigger this
       // on the *transition* to connected state, or use a separate flag.
       // For this fix, we'll stick to the safe manual trigger + effect for initial load.
       // Actually, let's ONLY rely on this effect for the "auto show" logic 
       // and remove the manual `setShowStrictModeModal(true)` from handleConnect.
       
       // To prevent infinite loop of opening if user closes:
       // We can't easily know if "user just closed it". 
       // Let's just set it if it's NOT open.
       if (!showStrictModeModal) {
          // Only show if we haven't "just" connected? 
          // Let's leave this out for now to avoid the complexity the user complained about.
          // The user said "I don't care if it pops up", so we will just fix the CRASH 
          // by removing the state update from the async handler.
          // We will let this effect handle it if we want auto-popup, 
          // OR we can just set it once.
          
          // BETTER: Let's just rely on the manual trigger in handleConnect but WRAP it in safety?
          // No, useEffect is safer for React state updates.
          
          // Let's use a ref to track if we've shown it? No.
          // Let's just rely on the simple logic:
          // If we just connected (how do we know?), show it.
          
          // Actually, let's just enable it. If the user closes it, they close it.
          // But wait, if calendarId is 'primary', this effect will run again and open it again.
          // So we DO need a "dismissed" flag.
       }
    }
  }, [isConnected, isSyncing, calendarId]); 
  // ^ This is risky without a dismissed flag. 
  // Let's stick to the Plan: Remove from handleConnect, use useEffect. 
  // I'll add a simple ref/state to avoid re-opening.
  
  const [hasShownStrictMode, setHasShownStrictMode] = useState(false);
  
  useEffect(() => {
      if (isConnected && !isSyncing && calendarId === 'primary' && !hasShownStrictMode && !initialStrictMode) {
          setShowStrictModeModal(true);
          setHasShownStrictMode(true);
      }
  }, [isConnected, isSyncing, calendarId, hasShownStrictMode, initialStrictMode]);


  const handleConnect = async () => {
    try {
      await connectToGoogle();
      // Modal trigger moved to useEffect to avoid render-cycle crash
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const handlePreviewDeletion = async () => {
    if (!currentTenant) return;
    try {
        setLoadingPreview(true);
        setShowConfirm(true);
        const result = await previewDeletion(currentTenant.id);
        setPreviewData(result);
    } catch (error) {
        console.error('Error previewing deletion:', error);
        setShowConfirm(false); // Close on error
    } finally {
        setLoadingPreview(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!currentTenant) return;

    try {
      await deleteAllSyncedEvents(currentTenant.id);
      setShowConfirm(false);
      setPreviewData(null);
    } catch (error) {
      console.error('Error deleting all events:', error);
    }
  };

  const handleCleanupOrphans = async () => {
      if (!currentTenant) return;
      try {
          setLoadingCleanup(true);
          setShowCleanupConfirm(true);
          // Run in dry run mode first to get stats and calendar name
          const result = await cleanupOrphanEvents(currentTenant.id, true);
          setCleanupPreviewData({
              foundCount: result.foundCount || result.deletedCount || 0,
              calendarName: result.calendarName || t('googleCalendar.unknownCalendar')
          });
      } catch (error) {
          console.error('Error previewing orphans:', error);
          setShowCleanupConfirm(false); // Close on error
      } finally {
          setLoadingCleanup(false);
      }
  };

  const handleConfirmCleanup = async () => {
      if (!currentTenant) return;
      try {
          await cleanupOrphanEvents(currentTenant.id, false); // Actual delete
          setShowCleanupConfirm(false);
          setCleanupPreviewData(null);
      } catch (error) {
          console.error('Error cleaning orphans:', error);
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
      await updateCalendarSelection('primary', t('googleCalendar.primaryCalendarName'));
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

  // טעינת createdCalendars מ-Firestore
  useEffect(() => {
    const loadCreatedCalendars = async () => {
      if (!user || !isConnected) {
        setCreatedCalendars([]);
        return;
      }

      try {
        const tokenDoc = await getDoc(doc(db, 'googleCalendarTokens', user.id));
        if (tokenDoc.exists()) {
          const tokenData = tokenDoc.data();
          const calendars = tokenData.createdCalendars || [];
          setCreatedCalendars(calendars);
        }
      } catch (error) {
        console.error('Error loading created calendars:', error);
      }
    };

    loadCreatedCalendars();
  }, [user, isConnected, showCalendarSelector]);

  const handleDeleteCalendar = async () => {
    if (!calendarToDelete) return;

    try {
      await deleteCalendar(calendarToDelete);
      setShowDeleteConfirm(false);
      setCalendarToDelete(null);
      setCalendarToDeleteName(null);
      // רענון רשימת היומנים
      await loadAvailableCalendars();
      // רענון createdCalendars
      if (user) {
        const tokenDoc = await getDoc(doc(db, 'googleCalendarTokens', user.id));
        if (tokenDoc.exists()) {
          const tokenData = tokenDoc.data();
          const calendars = tokenData.createdCalendars || [];
          setCreatedCalendars(calendars);
        }
      }
    } catch (error) {
      console.error('Error deleting calendar:', error);
    }
  };

  const isCreatedByApp = (calendarIdToCheck: string, calendarDescription?: string): boolean => {
    // בדיקה ראשונה: האם היומן נמצא ב-createdCalendars (יומנים שנוצרו אחרי הוספת הפיצ'ר)
    if (createdCalendars.some(cal => cal.calendarId === calendarIdToCheck)) {
      return true;
    }
    
    // בדיקה שנייה: האם היומן נוצר על ידי האפליקציה לפי description (יומנים שנוצרו לפני הוספת הפיצ'ר)
    if (calendarDescription && calendarDescription.includes('יומן ימי הולדת - נוצר על ידי אפליקציית ימי הולדת עבריים')) {
      return true;
    }
    
    return false;
  };

  if (isConnected) {
    return (
      <>
        {/* קרד מידע על החיבור - קומפקטי */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm overflow-hidden w-full sm:w-auto">
          <div className="p-2 sm:p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-green-500 rounded-lg flex items-center justify-center shadow-sm">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-green-900 text-xs sm:text-sm mb-0.5">
                  {t('googleCalendar.connected')}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
                  <div className="flex items-center gap-1 text-green-700 bg-green-100/50 px-1.5 py-0.5 rounded">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate font-medium max-w-[120px] sm:max-w-none">
                      {userEmail || (isSyncing ? t('common.loading') : t('googleCalendar.notAvailable'))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-green-700 bg-green-100/50 px-1.5 py-0.5 rounded">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <button
                      onClick={() => setShowCalendarSelector(!showCalendarSelector)}
                      disabled={isSyncing}
                      className="flex items-center gap-1 hover:underline disabled:opacity-50 truncate max-w-[150px] sm:max-w-none font-medium"
                      title={t('googleCalendar.selectCalendar')}
                    >
                      <span className="truncate">{calendarName || t('googleCalendar.primaryCalendar')}</span>
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    </button>
                  </div>
                  <div className="text-green-600 text-xs flex items-center gap-2">
                    {syncStatus === 'IN_PROGRESS' ? (
                        <span className="flex items-center gap-1 font-bold text-blue-600">
                            <Loader className="w-3 h-3 animate-spin" />
                            {t('googleCalendar.syncInProgress')}
                        </span>
                    ) : (
                        <span>
                            {lastSyncTime && isValid(lastSyncTime) ? `${t('googleCalendar.lastSync')}: ${format(lastSyncTime, 'dd/MM/yyyy HH:mm')}` : ''}
                        </span>
                    )}
                    <button 
                        onClick={() => setShowHistory(true)}
                        className="text-blue-600 hover:text-blue-800 underline flex items-center gap-0.5 ml-1"
                        title={t('googleCalendar.showHistory')}
                    >
                        <History className="w-3 h-3" />
                        <span className="hidden sm:inline">{t('googleCalendar.history')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* כפתורי פעולה - קומפקטיים */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 pt-2 border-t border-green-200">
              <button
                onClick={() => setShowCreateCalendar(true)}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 font-medium"
                title={t('googleCalendar.createCalendar')}
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">{t('googleCalendar.createCalendar')}</span>
              </button>
              <button
                onClick={() => setShowCalendarSelector(!showCalendarSelector)}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2 py-1 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded transition-colors disabled:opacity-50 font-medium"
                title={t('googleCalendar.selectCalendar')}
              >
                <Settings className="w-3 h-3" />
                <span className="hidden sm:inline">{t('googleCalendar.selectCalendar')}</span>
              </button>
              <button
                onClick={handleCleanupOrphans}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors disabled:opacity-50 font-medium"
                title={t('googleCalendar.cleanupOrphans')}
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">{t('googleCalendar.cleanupOrphansShort')}</span>
              </button>
              <button
                onClick={handlePreviewDeletion}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50 font-medium"
                title={t('googleCalendar.deleteAllEvents')}
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">{t('googleCalendar.deleteAllEventsShort')}</span>
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 font-medium"
                title={t('googleCalendar.disconnectCalendar')}
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">{t('googleCalendar.disconnectCalendarShort')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* History Modal */}
        <SyncHistoryModal 
            isOpen={showHistory} 
            onClose={() => setShowHistory(false)} 
            history={recentActivity} 
        />

        {/* מודלים - מוצגים מחוץ לקרד הראשי */}
        
        {/* מודל אישור ניקוי יתומים */}
        {showCleanupConfirm && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-amber-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <RefreshCw className="w-5 h-5 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {t('googleCalendar.cleanupOrphans')}
                        </h3>
                    </div>

                    {loadingCleanup ? (
                        <div className="flex flex-col items-center justify-center py-6 space-y-3">
                            <Loader className="w-8 h-8 animate-spin text-amber-500" />
                            <p className="text-sm text-gray-500">{t('googleCalendar.scanningCalendar')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 space-y-3">
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {t('googleCalendar.cleanupConfirmMessage')}
                                </p>
                                {cleanupPreviewData && (
                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm space-y-2">
                                        <div className="flex justify-between items-center border-b border-amber-100 pb-2">
                                            <span className="text-amber-800 font-medium">{t('googleCalendar.account')}:</span>
                                            <span className="text-amber-900 font-bold dir-ltr text-right truncate ml-2">{userEmail}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-amber-800 font-medium">{t('googleCalendar.calendar')}:</span>
                                            <span className="text-amber-900 font-bold truncate ml-2">{cleanupPreviewData.calendarName}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-amber-100">
                                            <span className="text-amber-800 font-medium">{t('googleCalendar.orphansFound')}:</span>
                                            <span className="text-amber-900 font-bold text-lg">{cleanupPreviewData.foundCount}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleConfirmCleanup}
                                    disabled={isSyncing || !cleanupPreviewData || cleanupPreviewData.foundCount === 0}
                                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSyncing ? t('common.processing') : t('googleCalendar.confirmCleanup')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCleanupConfirm(false);
                                        setCleanupPreviewData(null);
                                    }}
                                    disabled={isSyncing}
                                    className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Strict Mode Onboarding Modal */}
        {showStrictModeModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-blue-100 relative">
                    <button 
                        onClick={() => setShowStrictModeModal(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="text-center mb-5">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('googleCalendar.strictModeTitle')}</h2>
                        <p className="text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('googleCalendar.strictModeDescription') }} />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                setShowCreateCalendar(true);
                                setShowStrictModeModal(false); // Temporarily hide to show create modal
                            }}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            {t('googleCalendar.createDedicatedCalendar')}
                        </button>
                        
                        <button
                             onClick={() => {
                                 setShowCalendarSelector(true);
                                 setShowStrictModeModal(false);
                             }}
                             className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {t('googleCalendar.selectExistingCalendar')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* מודל מחיקת יומן - מוצג לפני רשימת היומנים */}
        {showDeleteConfirm && calendarToDelete && (
          <div className="mb-2 w-full sm:w-96 sm:ml-auto bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5 z-50 relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-red-900">
                {t('googleCalendar.deleteCalendar')}
              </h3>
            </div>
            <p className="text-sm text-red-800 font-medium mb-2">
              {t('googleCalendar.deleteCalendarConfirm')} <strong>"{calendarToDeleteName || t('common.this')}"</strong>?
            </p>
            <p className="text-xs sm:text-sm text-red-700 mb-4 leading-relaxed">
              {t('googleCalendar.deleteCalendarWarning')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDeleteCalendar}
                disabled={isSyncing}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
              >
                {isSyncing ? t('googleCalendar.deleting') : t('googleCalendar.yesDelete')}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCalendarToDelete(null);
                  setCalendarToDeleteName(null);
                }}
                disabled={isSyncing}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

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
              {t('googleCalendar.customCalendarDescription')}
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                placeholder={t('googleCalendar.calendarName')}
                className="w-full px-3 py-2.5 border border-blue-300 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <span className="text-sm">{t('googleCalendar.loadingCalendars')}</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {/* יומן ראשי - חסום לתצוגה/בחירה */}
                <div className="opacity-50 cursor-not-allowed relative group">
                    <button
                        disabled={true}
                        className="w-full text-right px-3 py-2.5 rounded-lg text-sm bg-gray-50 text-gray-400 border border-gray-100"
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium">{t('googleCalendar.primaryCalendarName')}</span>
                            <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-500">חסום</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">לא ניתן לסנכרן ליומן הראשי</div>
                    </button>
                </div>

                {/* יומנים מותאמים אישית */}
                {availableCalendars
                  .filter(cal => cal.id !== 'primary' && !cal.primary)
                  .map((calendar) => {
                    const isCreated = isCreatedByApp(calendar.id, calendar.description);
                    const isCurrent = calendarId === calendar.id;
                    const canDelete = isCreated && !isCurrent;
                    
                    // Debug logging
                    if (isCreated) {
                      console.log('Calendar found as created by app:', {
                        id: calendar.id,
                        name: calendar.summary,
                        isCurrent,
                        canDelete,
                        description: calendar.description
                      });
                    }

                    return (
                      <div key={calendar.id} className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectCalendar(calendar)}
                          disabled={isSyncing || isCurrent}
                          className={`flex-1 text-right px-3 py-2.5 rounded-lg text-sm transition-all ${
                            isCurrent
                              ? 'bg-purple-200 text-purple-900 font-medium shadow-sm'
                              : 'bg-white text-purple-800 hover:bg-purple-100 border border-purple-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{calendar.summary}</span>
                            {isCurrent && <Check className="w-4 h-4 text-purple-600" />}
                          </div>
                          {calendar.description && (
                            <div className="text-xs text-purple-600 mt-1 text-right">{calendar.description}</div>
                          )}
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => {
                              setCalendarToDelete(calendar.id);
                              setCalendarToDeleteName(calendar.summary);
                              setShowDeleteConfirm(true);
                              setShowCalendarSelector(false); // סגירת רשימת היומנים כשפותחים את מודל המחיקה
                            }}
                            disabled={isSyncing}
                            className="flex-shrink-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title={t('googleCalendar.deleteCalendar')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
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
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-red-900">
                {t('googleCalendar.deleteAllEvents')}
              </h3>
            </div>
            
            {loadingPreview ? (
                 <div className="flex items-center justify-center py-4">
                    <Loader className="w-6 h-6 animate-spin text-red-600" />
                    <span className="mr-2 text-red-700 text-sm">{t('googleCalendar.calculatingDeletion')}</span>
                 </div>
            ) : (
                <>
                    <p className="text-sm text-red-800 font-medium mb-2">
                    {previewData?.calendarName ? 
                        t('googleCalendar.deleteAllConfirmWithCalendar', { calendarName: previewData.calendarName }) : 
                        t('googleCalendar.deleteAllConfirm')}
                    </p>
                    
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm mb-4 space-y-2">
                        <div className="flex justify-between items-center border-b border-red-100 pb-2">
                            <span className="text-red-800 font-medium">{t('googleCalendar.account')}:</span>
                            <span className="text-red-900 font-bold dir-ltr text-right truncate ml-2">{userEmail}</span>
                        </div>
                        {previewData?.calendarName && (
                            <div className="flex justify-between items-center">
                                <span className="text-red-800 font-medium">{t('googleCalendar.calendar')}:</span>
                                <span className="text-red-900 font-bold truncate ml-2">{previewData.calendarName}</span>
                            </div>
                        )}
                    </div>

                    {previewData && previewData.summary.length > 0 ? (
                        <div className="mb-4 bg-white/50 rounded-lg p-3 max-h-40 overflow-y-auto text-xs border border-red-100">
                             <p className="font-bold text-red-900 mb-1">{t('googleCalendar.deleteAllSummary', { 
                                recordsCount: previewData.recordsCount || previewData.summary.length,
                                eventsCount: previewData.totalCount 
                             })}</p>
                             <ul className="list-disc list-inside space-y-0.5 text-red-800">
                                {previewData.summary.map((item, idx) => (
                                    <li key={idx}>
                                        {item.name}: {item.hebrewEvents + item.gregorianEvents} {t('common.events')}
                                    </li>
                                ))}
                             </ul>
                        </div>
                    ) : (
                        <p className="text-xs sm:text-sm text-red-700 mb-4 leading-relaxed">
                        {t('googleCalendar.noEventsToDelete')}
                        </p>
                    )}

                    <p className="text-xs sm:text-sm text-red-700 mb-4 leading-relaxed">
                    {t('googleCalendar.deleteAllWarning')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={handleDeleteAll}
                        disabled={isSyncing || loadingPreview || (previewData?.totalCount === 0)}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
                    >
                        {isSyncing ? t('googleCalendar.deleting') : t('googleCalendar.yesDeleteAll')}
                    </button>
                    <button
                        onClick={() => {
                             setShowConfirm(false);
                             setPreviewData(null);
                        }}
                        disabled={isSyncing}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    </div>
                </>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isSyncing}
      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-lg font-medium transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSyncing ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <Calendar className="w-4 h-4" />
      )}
      <span>{t('googleCalendar.connect')}</span>
    </button>
  );
};
