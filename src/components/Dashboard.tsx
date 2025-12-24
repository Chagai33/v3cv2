import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { BirthdayList } from './birthdays/BirthdayList';
import { BirthdayForm } from './birthdays/BirthdayForm';
import { GoogleCalendarButton } from './calendar/GoogleCalendarButton';
import { FloatingDock } from './layout/FloatingDock';
import { GoogleCalendarModal } from './modals/GoogleCalendarModal';
import { useBirthdays } from '../hooks/useBirthdays';
import { useTenant } from '../contexts/TenantContext';
import { useGroupFilter } from '../contexts/GroupFilterContext';
import { useAuth } from '../contexts/AuthContext';
import { useRootGroups, useInitializeRootGroups, useGroups } from '../hooks/useGroups';
import { Birthday, DashboardStats } from '../types';
import { Plus, Users, Calendar, TrendingUp, Cake, Upload, Info, ChevronDown, ChevronUp, BarChart3, FileText } from 'lucide-react';
import { isWithinInterval, addWeeks, addMonths } from 'date-fns';
import { openGoogleCalendarForBirthday } from '../utils/googleCalendar';
import { wishlistService } from '../services/wishlist.service';
import { groupService } from '../services/group.service';
import { parseCSVFile } from '../utils/csvExport';
import { birthdayService } from '../services/birthday.service';
import { validateAndEnrichCSVData } from '../utils/csvValidation';
import { CSVImportPreviewModal } from './modals/CSVImportPreviewModal';
import { TextImportModal } from './modals/TextImportModal';
import { ZodiacStatsModal } from './modals/ZodiacStatsModal';
import { CSVBirthdayRow } from '../types';
import { logger } from '../utils/logger';
import { useToast } from '../contexts/ToastContext';

export const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { data: allBirthdays = [], isLoading } = useBirthdays();
  const { selectedGroupIds } = useGroupFilter();
  const { data: rootGroups = [], isLoading: isLoadingGroups } = useRootGroups();
  const { data: allGroups = [] } = useGroups();
  const initializeRootGroups = useInitializeRootGroups();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  
  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editBirthday, setEditBirthday] = useState<Birthday | null>(null);
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [csvData, setCsvData] = useState<CSVBirthdayRow[]>([]);
  const [showZodiacStats, setShowZodiacStats] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [originalPastedText, setOriginalPastedText] = useState<string>('');
  
  const [isStatsExpanded, setIsStatsExpanded] = useState(() => {
    const saved = localStorage.getItem('stats-expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('stats-expanded', JSON.stringify(isStatsExpanded));
  }, [isStatsExpanded]);

  const birthdays = useMemo(() => {
    if (selectedGroupIds.length === 0) return allBirthdays;
    return allBirthdays.filter(b => {
      const bGroupIds = b.group_ids || (b.group_id ? [b.group_id] : []);
      return bGroupIds.length > 0 && selectedGroupIds.some(id => bGroupIds.includes(id));
    });
  }, [allBirthdays, selectedGroupIds]);

  const duplicateIds = useMemo(() => {
    const map = new Map<string, string[]>();
    allBirthdays.forEach(b => {
      const key = `${b.first_name.trim().toLowerCase()}|${b.last_name.trim().toLowerCase()}|${b.birth_date_gregorian}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b.id);
    });
    
    const duplicates = new Set<string>();
    map.forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => duplicates.add(id));
      }
    });
    return duplicates;
  }, [allBirthdays]);

  useEffect(() => {
    if (currentTenant && user && !isLoadingGroups && rootGroups.length === 0 && !initializeRootGroups.isPending) {
      logger.log('Initializing root groups for tenant:', currentTenant.id);
      initializeRootGroups.mutate(currentTenant.default_language || 'he');
    }
  }, [currentTenant?.id, user?.id, isLoadingGroups, rootGroups.length]);

  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const weekLater = addWeeks(now, 1);
    const monthLater = addMonths(now, 1);

    return {
      totalBirthdays: birthdays.length,
      upcomingThisWeek: birthdays.filter((b) => {
        if (!b.next_upcoming_hebrew_birthday) return false;
        const date = new Date(b.next_upcoming_hebrew_birthday);
        return isWithinInterval(date, { start: now, end: weekLater });
      }).length,
      upcomingThisMonth: birthdays.filter((b) => {
        if (!b.next_upcoming_hebrew_birthday) return false;
        const date = new Date(b.next_upcoming_hebrew_birthday);
        return isWithinInterval(date, { start: now, end: monthLater });
      }).length,
      maleCount: birthdays.filter((b) => b.gender === 'male').length,
      femaleCount: birthdays.filter((b) => b.gender === 'female').length,
    };
  }, [birthdays]);

  const handleEdit = (birthday: Birthday) => {
    setEditBirthday(birthday);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditBirthday(null);
  };

  const handleAddToCalendar = async (birthday: Birthday) => {
    try {
      let wishlist: any[] = [];
      try {
        wishlist = await wishlistService.getItemsForBirthday(birthday.id, currentTenant?.id);
      } catch (wishlistError) {
        logger.warn('Could not load wishlist, continuing without it:', wishlistError);
      }

      // טעינת מידע על הקבוצה (לוקח את הקבוצה הראשונה)
      let groupInfo: { parentName?: string; groupName: string } | undefined;
      const groupIds = birthday.group_ids || (birthday.group_id ? [birthday.group_id] : []);
      if (groupIds.length > 0) {
        try {
          const group = await groupService.getGroup(groupIds[0]);
          if (group) {
            if (group.parent_id) {
              const parentGroup = await groupService.getGroup(group.parent_id);
              if (parentGroup) {
                groupInfo = {
                  parentName: parentGroup.name,
                  groupName: group.name
                };
              } else {
                groupInfo = {
                  groupName: group.name
                };
              }
            } else {
              groupInfo = {
                groupName: group.name
              };
            }
          }
        } catch (groupError) {
          logger.warn('Could not load group info, continuing without it:', groupError);
        }
      }

      const language = (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en';
      openGoogleCalendarForBirthday(birthday, language, wishlist, groupInfo);
    } catch (error) {
      logger.error('Error opening Google Calendar:', error);
      showError(t('messages.calendarError'));
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTenant || !user) return;

    try {
      const text = await file.text();
      const parsedData = parseCSVFile(text);

      if (parsedData.length === 0) {
        showError(t('messages.csvEmpty', 'הקובץ ריק או לא תקין'));
        event.target.value = '';
        return;
      }

      const validatedData = validateAndEnrichCSVData(parsedData, allBirthdays, {
        firstNameRequired: t('validation.firstNameRequired', 'שם פרטי הוא שדה חובה'),
        lastNameMissing: t('validation.lastNameMissing', 'שם משפחה חסר'),
        birthDateRequired: t('validation.birthDateRequired', 'תאריך לידה הוא שדה חובה'),
        birthDateInvalid: t('validation.birthDateInvalid', 'תאריך לידה לא תקין'),
        birthDateFuture: t('validation.futureDate', 'תאריך לידה לא יכול להיות בעתיד'),
        birthDateTooOld: t('validation.birthDateTooOld', 'תאריך לידה לא תקין (לפני 1900)'),
      });

      setCsvData(validatedData);
      setShowCSVPreview(true);
    } catch (error) {
      logger.error('Error parsing CSV:', error);
      showError(t('messages.importError', 'שגיאה בקריאת קובץ ה-CSV'));
    } finally {
      event.target.value = '';
    }
  };

  const handleTextImport = (parsedData: any[], originalText: string) => {
    if (!currentTenant || !user) return;

    try {
      if (parsedData.length === 0) {
        showError(t('import.pasteEmpty', 'הטקסט ריק או לא נמצאו תאריכים תקינים'));
        return;
      }

      // Save original text for potential back navigation
      setOriginalPastedText(originalText);

      const validatedData = validateAndEnrichCSVData(parsedData, allBirthdays, {
        firstNameRequired: t('validation.firstNameRequired', 'שם פרטי הוא שדה חובה'),
        lastNameMissing: t('validation.lastNameMissing', 'שם משפחה חסר'),
        birthDateRequired: t('validation.birthDateRequired', 'תאריך לידה הוא שדה חובה'),
        birthDateInvalid: t('validation.birthDateInvalid', 'תאריך לידה לא תקין'),
        birthDateFuture: t('validation.futureDate', 'תאריך לידה לא יכול להיות בעתיד'),
        birthDateTooOld: t('validation.birthDateTooOld', 'תאריך לידה לא תקין (לפני 1900)'),
      });

      setCsvData(validatedData);
      setShowCSVPreview(true);
      success(t('import.textImportSuccess', 'נמצאו {{count}} רשומות תקינות', { count: parsedData.length }));
    } catch (error) {
      logger.error('Error processing text import:', error);
      showError(t('messages.importError', 'שגיאה בעיבוד הטקסט'));
    }
  };

  const handleBackToTextImport = () => {
    setShowCSVPreview(false);
    setShowTextImport(true);
  };

  // פונקציה לפרסור Wishlist
  const parseWishlist = (wishlistStr: string | undefined): Array<{ name: string; priority: 'high' | 'medium' | 'low' }> => {
    if (!wishlistStr || !wishlistStr.trim()) return [];
    
    const items: Array<{ name: string; priority: 'high' | 'medium' | 'low' }> = [];
    const parts = wishlistStr.split(';').map(p => p.trim()).filter(p => p);
    
    for (const part of parts) {
      // פורמט: "שם פריט (עדיפות: X)" או "שם פריט (Priority: X)"
      const priorityMatch = part.match(/\(.*?(?:עדיפות|Priority|priority):\s*([^)]+)\)/i);
      const priorityStr = priorityMatch ? priorityMatch[1].trim().toLowerCase() : 'medium';
      
      // חילוץ שם הפריט (הכל לפני הסוגריים)
      const nameMatch = part.match(/^([^(]+)/);
      const name = nameMatch ? nameMatch[1].trim() : part.trim();
      
      if (!name) continue;
      
      // תרגום עדיפות
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (priorityStr === 'high' || priorityStr === 'גבוהה' || priorityStr === 'גבוה') {
        priority = 'high';
      } else if (priorityStr === 'low' || priorityStr === 'נמוכה' || priorityStr === 'נמוך') {
        priority = 'low';
      }
      
      items.push({ name, priority });
    }
    
    return items;
  };

  // פונקציה לחיפוש קבוצה לפי שם
  const findGroupByName = (groupName: string | undefined): string | undefined => {
    if (!groupName || !groupName.trim()) return undefined;
    
    const normalizedName = groupName.trim().toLowerCase();
    const found = allGroups.find(g => g.name.toLowerCase() === normalizedName);
    return found?.id;
  };

  const handleConfirmImport = async (selectedRows: CSVBirthdayRow[]) => {
    if (!currentTenant || !user) return;

    let imported = 0;
    let failed = 0;

    for (const row of selectedRows) {
      try {
        // חיפוש קבוצה לפי שם או מזהה
        let finalGroupId = row.groupId || '';
        if (!finalGroupId && row.groupName) {
          const foundGroupId = findGroupByName(row.groupName);
          if (foundGroupId) {
            finalGroupId = foundGroupId;
          } else {
            logger.warn(`Group not found by name: ${row.groupName}`);
          }
        }

        const birthdayId = await birthdayService.createBirthday(
          currentTenant.id,
          {
            firstName: row.firstName,
            lastName: row.lastName,
            birthDateGregorian: row.birthDate,
            afterSunset: row.afterSunset,
            gender: row.gender,
            groupId: finalGroupId || '',
            notes: row.notes,
            calendarPreferenceOverride: row.calendarPreference,
          },
          user.id
        );

        // יצירת Wishlist items אם יש
        if (row.wishlist) {
          const wishlistItems = parseWishlist(row.wishlist);
          for (const item of wishlistItems) {
            try {
              await wishlistService.createItem(
                birthdayId,
                currentTenant.id,
                item.name,
                '',
                item.priority
              );
            } catch (wishlistError) {
              logger.warn(`Failed to create wishlist item for ${row.firstName} ${row.lastName}:`, wishlistError);
            }
          }
        }

        imported++;
      } catch (error) {
        logger.error('Failed to import:', row, error);
        failed++;
      }
    }

    // Invalidate React Query cache to refresh the UI
    await queryClient.invalidateQueries({ queryKey: ['birthdays'] });
    await queryClient.invalidateQueries({ queryKey: ['upcomingBirthdays'] });

    // Show appropriate message based on import results
    if (failed === 0) {
      // All succeeded
      success(t('messages.importSuccess', { imported }));
    } else if (imported > 0) {
      // Partial success
      showError(t('messages.importSuccessWithFailures', { imported, failed }));
    } else {
      // All failed
      showError(t('messages.importError', 'שגיאה בייבוא הקובץ'));
    }
    
    setShowCSVPreview(false);
  };

  if (!currentTenant) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-3 sm:space-y-4">
        {/* Divider עדין מעל הסטטיסטיקה */}
        <div className="border-t border-gray-200"></div>
        
        {/* שורה עם חץ קטן וכרטיסי סטטיסטיקה */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStatsExpanded(!isStatsExpanded)}
            className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1 text-gray-500 hover:text-gray-700 transition-colors text-xs"
            title={isStatsExpanded ? t('common.collapse', 'סגור') : t('common.expand', 'פתח')}
          >
            {isStatsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {!isStatsExpanded && (
              <span className="font-medium">{t('dashboard.statistics', 'סטטיסטיקה')}</span>
            )}
          </button>
          
          <div
            className={`flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 transition-all duration-300 ease-in-out overflow-hidden ${
              isStatsExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-1.5 sm:p-2.5 hover:shadow-md transition-all">
              <div className="flex flex-row items-center justify-between gap-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-md flex items-center justify-center shadow-sm flex-shrink-0">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[8px] leading-tight sm:text-xs text-blue-700 font-medium mb-0.5 truncate">
                    {t('dashboard.totalBirthdays')}
                  </p>
                  <p className="text-base sm:text-2xl font-bold text-blue-900">{stats.totalBirthdays}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-1.5 sm:p-2.5 hover:shadow-md transition-all">
              <div className="flex flex-row items-center justify-between gap-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-md flex items-center justify-center shadow-sm flex-shrink-0">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[8px] leading-tight sm:text-xs text-green-700 font-medium mb-0.5 truncate">
                    {t('dashboard.upcomingThisWeek')}
                  </p>
                  <p className="text-base sm:text-2xl font-bold text-green-900">
                    {stats.upcomingThisWeek}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-1.5 sm:p-2.5 hover:shadow-md transition-all">
              <div className="flex flex-row items-center justify-between gap-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-600 rounded-md flex items-center justify-center shadow-sm flex-shrink-0">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[8px] leading-tight sm:text-xs text-orange-700 font-medium mb-0.5 truncate">
                    {t('dashboard.upcomingThisMonth')}
                  </p>
                  <p className="text-base sm:text-2xl font-bold text-orange-900">
                    {stats.upcomingThisMonth}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg shadow-sm border border-pink-200 p-1.5 sm:p-2.5 hover:shadow-md transition-all relative group">
              <button
                onClick={() => setShowZodiacStats(true)}
                className="absolute top-1 left-1 p-0.5 text-pink-400 hover:text-pink-600 hover:bg-pink-200 rounded-full transition-colors"
                title={t('zodiac.statsTitle', 'סטטיסטיקת מזלות')}
              >
                <Info className="w-3 h-3" />
              </button>
              <div className="flex flex-row items-center justify-between gap-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-pink-600 rounded-md flex items-center justify-center shadow-sm flex-shrink-0">
                  <Cake className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[8px] leading-tight sm:text-xs text-pink-700 font-medium mb-0.5 truncate">{t('dashboard.statistics')}</p>
                  <p className="text-sm sm:text-xl font-bold text-pink-900">
                    {stats.maleCount}M / {stats.femaleCount}F
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider עדין מעל אזור הפעולות */}
        <div className="border-t border-gray-200"></div>
        
        {/* Toolbar קומפקטי לכפתורים */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 py-2">
          {i18n.language === 'he' ? (
            <>
              {/* קבוצה 1: פעולות ראשיות */}
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md text-sm"
                title={t('birthday.addBirthday')}
              >
                <Plus className="w-4 h-4" />
                <span>{t('birthday.addBirthday')}</span>
              </button>
              <button
                onClick={() => setShowTextImport(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 shadow-sm rounded-lg font-medium transition-all text-sm"
                title={t('birthday.pasteImport', 'הדבק וייבא')}
              >
                <FileText className="w-4 h-4" />
                <span>{t('birthday.pasteImport', 'הדבק וייבא')}</span>
              </button>
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 shadow-sm rounded-lg font-medium transition-all cursor-pointer text-sm">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                  ref={fileInputRef}
                />
                <Upload className="w-4 h-4" />
                <span>{t('birthday.importCSV', 'Import CSV')}</span>
              </label>
              
              {/* Separator */}
              <div className="h-8 w-px bg-gray-300 mx-1" />
              
              {/* קבוצה 2: Google Calendar */}
              <div className="flex items-center">
                <GoogleCalendarButton isCompact={true} onManageClick={() => setShowCalendarModal(true)} />
              </div>
            </>
          ) : (
            <>
              {/* קבוצה 1: Google Calendar */}
              <div className="flex items-center">
                <GoogleCalendarButton isCompact={true} onManageClick={() => setShowCalendarModal(true)} />
              </div>
              
              {/* Separator */}
              <div className="h-8 w-px bg-gray-300 mx-1" />
              
              {/* קבוצה 2: פעולות ראשיות */}
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 shadow-sm rounded-lg font-medium transition-all cursor-pointer text-sm">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                  ref={fileInputRef}
                />
                <Upload className="w-4 h-4" />
                <span>{t('birthday.importCSV', 'Import CSV')}</span>
              </label>
              <button
                onClick={() => setShowTextImport(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 shadow-sm rounded-lg font-medium transition-all text-sm"
                title={t('birthday.pasteImport', 'Paste & Import')}
              >
                <FileText className="w-4 h-4" />
                <span>{t('birthday.pasteImport', 'Paste & Import')}</span>
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md text-sm"
                title={t('birthday.addBirthday')}
              >
                <Plus className="w-4 h-4" />
                <span>{t('birthday.addBirthday')}</span>
              </button>
            </>
          )}
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <BirthdayList
              birthdays={birthdays}
              onEdit={handleEdit}
              onAddToCalendar={handleAddToCalendar}
              duplicateIds={duplicateIds}
            />
          )}
        </div>
      </div>

      {showForm && (
        <BirthdayForm
          onClose={handleCloseForm}
          onSuccess={() => {}}
          editBirthday={editBirthday}
        />
      )}

      <TextImportModal
        isOpen={showTextImport}
        onClose={() => setShowTextImport(false)}
        onParsedData={handleTextImport}
        initialText={originalPastedText}
      />

      <CSVImportPreviewModal
        isOpen={showCSVPreview}
        onClose={() => setShowCSVPreview(false)}
        data={csvData}
        onConfirm={handleConfirmImport}
        onBack={originalPastedText ? handleBackToTextImport : undefined}
        showBackButton={!!originalPastedText}
      />

      <ZodiacStatsModal
        isOpen={showZodiacStats}
        onClose={() => setShowZodiacStats(false)}
        birthdays={birthdays}
      />

      <FloatingDock
        onAdd={() => setShowForm(true)}
        onImport={() => fileInputRef.current?.click()}
        onTextImport={() => setShowTextImport(true)}
        onCalendar={() => setShowCalendarModal(true)}
        onGroups={() => navigate('/groups')}
        hidden={showForm || showCSVPreview || showCalendarModal || showZodiacStats || showTextImport}
      />

      <GoogleCalendarModal 
        isOpen={showCalendarModal} 
        onClose={() => setShowCalendarModal(false)} 
      />
    </Layout>
  );
};
