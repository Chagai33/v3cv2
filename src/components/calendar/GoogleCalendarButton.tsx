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
  isCompact?: boolean;
  onManageClick?: () => void;
}

export const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({ initialStrictMode = false, isCompact = false, onManageClick }) => {
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
    } catch (error: any) {
      console.error('Error deleting all events:', error);
      alert(`שגיאה במחיקה: ${error.message || 'שגיאה לא ידועה'}`);
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

    // שמירת השם זמנית לפני הניקוי
    const nameToCreate = newCalendarName.trim();
    
    // סגירת המודל מיד לתחושת תגובתיות
    setShowCreateCalendar(false);
    setNewCalendarName('');

    try {
      // 1. יצירת היומן - הפונקציה ב-Context כבר מעדכנת את ה-State הגלובלי (calendarId/Name)
      const result = await createCalendar(nameToCreate);
      
      // 2. וידוא בחירה (למקרה שה-Context לא תפס)
      if (result?.calendarId) {
          // זה יעדכן את ה-State ב-Context שוב ויבטיח שה-UI מתרנדר
          await updateCalendarSelection(result.calendarId, result.calendarName);
      }
      
      // 3. רענון הרשימה ברקע כדי שהיומן יופיע ב-Dropdown בפעם הבאה
      // אנחנו לא מחכים לזה כדי לא לעכב את ה-UI
      loadAvailableCalendars();
      
    } catch (error) {
      console.error('Error creating calendar:', error);
      // במקרה שגיאה נפתח שוב את המודל (אופציונלי, אבל עדיף למשתמש)
      setNewCalendarName(nameToCreate);
      setShowCreateCalendar(true);
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

  useEffect(() => {
    // If we just created a calendar (createdCalendars length changed), refresh the list
    if (isConnected) {
        loadAvailableCalendars();
    }
  }, [createdCalendars.length, isConnected]);

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
    if (isCompact) {
      return (
        <button
          onClick={onManageClick}
          className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all text-sm group h-[38px]"
          title={t('googleCalendar.title')}
        >
          {/* Icon & Status */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-white"></span>
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-gray-300" />

          {/* Info */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-gray-900 hidden xl:inline">{t('googleCalendar.connected')}</span>
            <span className="text-gray-500 hidden lg:inline">{userEmail}</span>
            <span className="text-gray-400 hidden lg:inline">•</span>
            <span className="text-blue-700 font-medium">{calendarName || t('googleCalendar.primaryCalendar')}</span>
          </div>
        </button>
      );
    }

    return (
      <>
        {/* Main Card Container */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full transition-all hover:shadow-md">
          
          {/* Header Section */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm text-green-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{t('googleCalendar.title')}</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-700 font-medium">{t('googleCalendar.connected')}</span>
                </div>
              </div>
            </div>
            
            {/* Sync Status / History Link */}
            <div className="flex items-center gap-2">
               {syncStatus === 'IN_PROGRESS' ? (
                  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                    <Loader className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">{t('googleCalendar.syncInProgress')}</span>
                  </div>
               ) : (
                  <button 
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-all text-xs font-medium"
                    title={t('googleCalendar.showHistory')}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('googleCalendar.history')}</span>
                  </button>
               )}
            </div>
          </div>

          {/* Body Section */}
          <div className="p-4 space-y-4">
            
            {/* User Info Row */}
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-8 flex justify-center text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 font-medium truncate">
                {userEmail || (isSyncing ? t('common.loading') : t('googleCalendar.notAvailable'))}
              </div>
            </div>

            {/* Calendar Selection Row */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-11">
                {t('googleCalendar.currentCalendar')}
              </label>
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <button
                  onClick={() => setShowCalendarSelector(!showCalendarSelector)}
                  disabled={isSyncing}
                  className="flex-1 flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-sm group text-right"
                >
                  <span className="font-medium text-gray-900 truncate">
                    {calendarName || t('googleCalendar.primaryCalendar')}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </button>
              </div>
            </div>

            {/* Last Sync Info */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
               <div className="w-8 flex justify-center">
                 <RefreshCw className="w-3.5 h-3.5" />
               </div>
               <div>
                 {lastSyncTime && isValid(lastSyncTime) 
                    ? `${t('googleCalendar.lastSync')}: ${format(lastSyncTime, 'dd/MM/yyyy HH:mm')}` 
                    : t('googleCalendar.notSynced')}
               </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 mt-2">
              <button
                onClick={handleCleanupOrphans}
                disabled={isSyncing}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-amber-50 text-gray-600 hover:text-amber-600 transition-colors border border-transparent hover:border-amber-100"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-[10px] font-medium text-center">{t('googleCalendar.cleanupOrphansShort')}</span>
              </button>

              <button
                onClick={handlePreviewDeletion}
                disabled={isSyncing}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-medium text-center">{t('googleCalendar.deleteAllEventsShort')}</span>
              </button>

              <button
                onClick={handleDisconnect}
                disabled={isSyncing}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors border border-transparent hover:border-gray-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-[10px] font-medium text-center">{t('googleCalendar.disconnectCalendarShort')}</span>
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
        
        {/* ... cleanup modals ... */}
        
        {/* Strict Mode Onboarding Modal */}
        {/* ... */}

        {/* מודל מחיקת יומן - מוצג לפני רשימת היומנים */}
        {showDeleteConfirm && calendarToDelete && (
          // ... existing delete confirm ...
          <div className="mb-2 w-full sm:w-96 sm:ml-auto bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5 z-50 relative">
            {/* ... contents unchanged ... */}
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
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]" onClick={(e) => { e.stopPropagation(); setShowCreateCalendar(false); }}>
             <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
             <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-blue-900">
                {t('googleCalendar.createCalendar')}
              </h3>
            </div>
            
            <div className="p-4">
                <p className="text-xs sm:text-sm text-blue-700 mb-4 leading-relaxed">
                {t('googleCalendar.customCalendarDescription')}
                </p>
                <div className="mb-4">
                <input
                    type="text"
                    value={newCalendarName}
                    onChange={(e) => setNewCalendarName(e.target.value)}
                    placeholder={t('googleCalendar.calendarName')}
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/30"
                    onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                        handleCreateCalendar();
                    }
                    }}
                    autoFocus
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
          </div>
          </div>
        )}

        {/* Calendar Selection Modal - Replaced inline with modal overlay */}
        {showCalendarSelector && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]" onClick={(e) => { e.stopPropagation(); setShowCalendarSelector(false); }}>
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                        <Settings className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">
                        {t('googleCalendar.selectCalendar')}
                    </h3>
                </div>
                <button 
                    onClick={() => { setShowCreateCalendar(true); setShowCalendarSelector(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium border border-blue-100 bg-white"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('googleCalendar.createNew')}</span>
                </button>
            </div>
            
            <div className="p-4">
              {loadingCalendars ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                  <Loader className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm">{t('googleCalendar.loadingCalendars')}</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  {/* Primary Calendar - Disabled */}
                  <div className="relative group">
                      <button
                          disabled={true}
                          className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed"
                      >
                          <div className="flex flex-col items-start gap-0.5">
                              <span className="font-medium">{t('googleCalendar.primaryCalendarName')}</span>
                              <span className="text-[10px] text-gray-400">לא ניתן לסנכרן ליומן הראשי</span>
                          </div>
                          <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-medium">חסום</span>
                      </button>
                  </div>
  
                  {/* Custom Calendars */}
                  {availableCalendars
                    .filter(cal => cal.id !== 'primary' && !cal.primary)
                    .map((calendar) => {
                      const isCreated = isCreatedByApp(calendar.id, calendar.description);
                      const isCurrent = calendarId === calendar.id;
                      const canDelete = isCreated && !isCurrent;
                      
                      return (
                      <div key={calendar.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => handleSelectCalendar(calendar)}
                          disabled={isSyncing || isCurrent}
                          className={`flex-1 flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-all border ${
                            isCurrent
                              ? 'bg-blue-50 text-blue-900 border-blue-200 ring-1 ring-blue-200'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                          } disabled:opacity-50`}
                        >
                          <div className="flex flex-col items-start gap-1 text-right min-w-0 flex-1">
                            <span className="font-medium truncate w-full text-right">{calendar.summary}</span>
                            {calendar.description && (
                              <span className="text-[10px] text-gray-500 w-full text-right whitespace-normal break-words leading-snug">
                                {isCreated ? t('googleCalendar.appCreatedCalendarDescription') : calendar.description}
                              </span>
                            )}
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />}
                        </button>
                          
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCalendarToDelete(calendar.id);
                                setCalendarToDeleteName(calendar.summary);
                                setShowDeleteConfirm(true);
                                setShowCalendarSelector(false);
                              }}
                              disabled={isSyncing}
                              className="flex-shrink-0 p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCalendarSelector(false);
                  setAvailableCalendars([]);
                }}
                disabled={isSyncing}
                className="w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
            </div>
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
