import { logger } from "../../utils/logger";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Birthday } from '../../types';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useDeleteBirthday, useRefreshHebrewData } from '../../hooks/useBirthdays';
import { useGroups } from '../../hooks/useGroups';
import { useGroupFilter } from '../../contexts/GroupFilterContext';
import { useTenant } from '../../contexts/TenantContext';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import { Edit, Trash2, Calendar, Search, CalendarDays, RefreshCw, Filter, Gift, Download, Users, X, UploadCloud, CloudOff, Sparkles, Copy, AlertCircle, Check } from 'lucide-react';
import { FutureBirthdaysModal } from '../modals/FutureBirthdaysModal';
import { UpcomingGregorianBirthdaysModal } from '../modals/UpcomingGregorianBirthdaysModal';
import { WishlistModal } from '../modals/WishlistModal';
import { Tooltip } from '../common/Tooltip';
import { birthdayCalculationsService } from '../../services/birthdayCalculations.service';
import { calendarPreferenceService } from '../../services/calendarPreference.service';
import { exportBirthdaysToCSV } from '../../utils/csvExport';
import { useToast } from '../../contexts/ToastContext';

interface BirthdayListProps {
  birthdays: Birthday[];
  onEdit: (birthday: Birthday) => void;
  onAddToCalendar?: (birthday: Birthday) => void;
  duplicateIds?: Set<string>;
  onOpenCalendarSettings?: () => void;
}

export const BirthdayList: React.FC<BirthdayListProps> = ({
  birthdays,
  onEdit,
  onAddToCalendar,
  duplicateIds,
  onOpenCalendarSettings,
}) => {
  const { t, i18n } = useTranslation();
  const deleteBirthday = useDeleteBirthday();
  const refreshHebrewData = useRefreshHebrewData();
  const { data: groups = [] } = useGroups();
  const { currentTenant } = useTenant();
  const { selectedGroupIds, toggleGroupFilter, clearGroupFilters } = useGroupFilter();
  const { isConnected, syncSingleBirthday, syncMultipleBirthdays, removeBirthdayFromCalendar, isSyncing, calendarId } = useGoogleCalendar();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('birthday-search') || '');
  const [sortBy, setSortBy] = useState<'upcoming' | 'upcoming-latest' | 'upcoming-hebrew' | 'upcoming-hebrew-latest' | 'name-az' | 'name-za' | 'age-youngest' | 'age-oldest'>(() => (localStorage.getItem('birthday-sort') as any) || 'upcoming');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>(() => (localStorage.getItem('birthday-gender') as any) || 'all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // עדכון הזמן כל 5 שניות כדי לעדכן את הטקסט "מחשב..." לרשומות חדשות
  useEffect(() => {
    // בדיקה אם יש רשומות חדשות ללא תאריך עברי
    const hasRecentWithoutHebrew = birthdays.some(b => {
      if (b.birth_date_hebrew_string) return false;
      const createdAt = new Date(b.created_at).getTime();
      return (Date.now() - createdAt) < 30000; // 30 שניות
    });

    if (!hasRecentWithoutHebrew) return; // אין רשומות חדשות, לא צריך לעדכן

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000); // עדכון כל 5 שניות

    return () => clearInterval(interval);
  }, [birthdays]);

  // Strict Global Visibility Logic
  // We determine visibility solely based on the Tenant Preference (Strict Mode).
  // Individual overrides are ignored for the main table layout to ensure consistency.
  const tenantPref = currentTenant?.default_calendar_preference || 'both';
  
  // Show Hebrew if preference is Hebrew OR Both
  const showHebrewColumn = tenantPref === 'hebrew' || tenantPref === 'both';
  // Show Gregorian if preference is Gregorian OR Both
  const showGregorianColumn = tenantPref === 'gregorian' || tenantPref === 'both';

  // Filter available sort options based on strict visibility
  // If Strict Hebrew -> Hide Gregorian sorts
  // If Strict Gregorian -> Hide Hebrew sorts
  const availableSortOptions = [
    { value: 'upcoming', label: t('sort.upcomingSoonest', 'Next Birthday (Gregorian - Soonest)'), show: showGregorianColumn },
    { value: 'upcoming-latest', label: t('sort.upcomingLatest', 'Next Birthday (Gregorian - Latest)'), show: showGregorianColumn },
    { value: 'upcoming-hebrew', label: t('sort.upcomingHebrewSoonest', 'Next Birthday (Hebrew - Soonest)'), show: showHebrewColumn },
    { value: 'upcoming-hebrew-latest', label: t('sort.upcomingHebrewLatest', 'Next Birthday (Hebrew - Latest)'), show: showHebrewColumn },
    { value: 'name-az', label: t('sort.nameAZ', 'Name (A-Z)'), show: true },
    { value: 'name-za', label: t('sort.nameZA', 'Name (Z-A)'), show: true },
    { value: 'age-youngest', label: t('sort.ageYoungest', 'Age (Youngest)'), show: true },
    { value: 'age-oldest', label: t('sort.ageOldest', 'Age (Oldest)'), show: true },
  ].filter(opt => opt.show);

  // NOTE: This effect sets the default sorting based on the tenant's calendar preference
  // ONLY if the user hasn't manually selected a sort order (checked via localStorage).
  const prevTenantPref = useRef<string | undefined>(undefined);

  useEffect(() => {
    const savedSort = localStorage.getItem('birthday-sort');
    const currentPref = currentTenant?.default_calendar_preference;
    const prevPref = prevTenantPref.current;
    
    // If there is no saved sort manually by the user, we apply the tenant default.
    if (!savedSort && currentPref) {
      if (currentPref === 'gregorian') {
        setSortBy('upcoming');
      } else {
        // For 'hebrew' or 'both', we default to Hebrew upcoming as per user request
        setSortBy('upcoming-hebrew');
      }
    }
    
    // Self-Correction Logic:
    // If the current sort is hidden by the new preference, we must switch it.
    if (currentPref) {
        // If we just switched TO 'both' from another setting (transition event),
        // we want to reset to the default Hebrew view for 'both'.
        // We use prevPref check to ensure this only happens on the transition, not on every render.
        if (currentPref === 'both' && prevPref && prevPref !== 'both') {
            setSortBy('upcoming-hebrew');
        }
        // If Strict Hebrew, and current sort is Gregorian -> Force Hebrew
        else if (currentPref === 'hebrew' && (sortBy === 'upcoming' || sortBy === 'upcoming-latest')) {
            setSortBy('upcoming-hebrew');
        }
        // If Strict Gregorian, and current sort is Hebrew -> Force Gregorian
        else if (currentPref === 'gregorian' && (sortBy.startsWith('upcoming-hebrew'))) {
            setSortBy('upcoming');
        }
    }

    // Update the ref for the next run
    prevTenantPref.current = currentPref;
  }, [currentTenant, sortBy]); // Added sortBy to deps to ensure immediate correction if it becomes invalid

  const [showFutureModal, setShowFutureModal] = useState(false);
  const [showGregorianModal, setShowGregorianModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null);
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('birthday-search', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('birthday-sort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('birthday-gender', genderFilter);
  }, [genderFilter]);

  const locale = i18n.language === 'he' ? he : enUS;

  // חישוב hasUnsyncedChanges לכל הרשומות
  const [unsyncedMap, setUnsyncedMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    const checkUnsynced = async () => {
      const newMap = new Map<string, boolean>();
      for (const birthday of birthdays) {
        if (birthday.syncedDataHash && birthday.googleCalendarEventIds) {
          const { hasUnsyncedChanges } = await import('../../utils/syncStatus');
          const hasUnsynced = await hasUnsyncedChanges(birthday);
          newMap.set(birthday.id, hasUnsynced);
        }
      }
      setUnsyncedMap(newMap);
    };
    checkUnsynced();
  }, [birthdays]);

  const enrichedBirthdays = useMemo(() => {
    return birthdays.map((birthday) => {
      const calculations = birthdayCalculationsService.calculateAll(
        birthday,
        new Date()
      );
      // Get first group for preference calculation (or find best match)
      const groupIds = birthday.group_ids || (birthday.group_id ? [birthday.group_id] : []);
      const group = groupIds.length > 0 ? groups.find((g) => g.id === groupIds[0]) : null;
      const effectivePreference = currentTenant
        ? calendarPreferenceService.resolvePreference(birthday, group, currentTenant)
        : 'both';

      return {
        ...birthday,
        calculations,
        effectivePreference,
        group,
      };
    });
  }, [birthdays, groups, currentTenant]);

  const filteredAndSortedBirthdays = useMemo(() => {
    let filtered = enrichedBirthdays;

    if (selectedGroupIds.length > 0) {
      filtered = filtered.filter((b) => {
        const bGroupIds = b.group_ids || (b.group_id ? [b.group_id] : []);
        
        if (selectedGroupIds.includes('unassigned')) {
          return bGroupIds.length === 0 || selectedGroupIds.some(id => bGroupIds.includes(id));
        }
        
        // Check if any of the selected groups match any of the birthday's groups
        return bGroupIds.length > 0 && selectedGroupIds.some(id => bGroupIds.includes(id));
      });
    }

    if (genderFilter !== 'all') {
      filtered = filtered.filter((b) => b.gender === genderFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.first_name.toLowerCase().includes(search) ||
          b.last_name.toLowerCase().includes(search)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-az':
          return `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`
          );
        case 'name-za':
          return `${b.first_name} ${b.last_name}`.localeCompare(
            `${a.first_name} ${a.last_name}`
          );
        case 'age-youngest':
          return new Date(b.birth_date_gregorian).getTime() - new Date(a.birth_date_gregorian).getTime();
        case 'age-oldest':
          return new Date(a.birth_date_gregorian).getTime() - new Date(b.birth_date_gregorian).getTime();
        case 'upcoming':
          return a.calculations.daysUntilGregorianBirthday - b.calculations.daysUntilGregorianBirthday;
        case 'upcoming-latest':
          return b.calculations.daysUntilGregorianBirthday - a.calculations.daysUntilGregorianBirthday;
        case 'upcoming-hebrew':
          const aHeb = a.calculations.daysUntilHebrewBirthday ?? 9999;
          const bHeb = b.calculations.daysUntilHebrewBirthday ?? 9999;
          return aHeb - bHeb;
        case 'upcoming-hebrew-latest':
          // For reverse sort, we still want nulls at the end (or beginning depending on UX, but typically 'latest' implies furthest away, so null/infinity might be last).
          // Let's treat null as -1 so it appears at the very end if we are sorting descending by days?
          // Wait, "Latest" usually means "furthest in the future".
          // Days: 5, 10, 300.
          // Soonest: 5, 10, 300.
          // Latest: 300, 10, 5.
          // Null means unknown/error.
          // If we use -1 for null in descending sort: 300, 10, 5, -1.
          const aHebLat = a.calculations.daysUntilHebrewBirthday ?? -1;
          const bHebLat = b.calculations.daysUntilHebrewBirthday ?? -1;
          return bHebLat - aHebLat;
        default:
          return 0;
      }
    });

    return sorted;
  }, [enrichedBirthdays, searchTerm, sortBy, selectedGroupIds, genderFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.confirmDelete', 'Are you sure?'))) {
      await deleteBirthday.mutateAsync(id);
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      await refreshHebrewData.mutateAsync(id);
    } catch (error: any) {
      if (error.code === 'functions/resource-exhausted') {
        alert(t('birthday.refreshLimitReached', 'יותר מדי רענונים. המתן 30 שניות.'));
      } else {
        alert(t('birthday.refreshError', 'שגיאה ברענון הנתונים'));
      }
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedBirthdays.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedBirthdays.map((b) => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    const deletePromises = Array.from(selectedIds).map((id) =>
      deleteBirthday.mutateAsync(id)
    );

    try {
      await Promise.all(deletePromises);
      setSelectedIds(new Set());
    } catch (error) {
      logger.error('Error deleting birthdays:', error);
    }
  };

  const handleBulkRefresh = async () => {
    const birthdaysToRefresh = birthdays.filter((b) => selectedIds.has(b.id));

    for (const birthday of birthdaysToRefresh) {
      try {
        await refreshHebrewData.mutateAsync({
          birthdayId: birthday.id,
          birthDate: birthday.birth_date_gregorian,
          afterSunset: birthday.after_sunset,
          gender: birthday.gender,
        });
      } catch (error) {
        logger.error('Error refreshing birthday:', birthday.id, error);
      }
    }

    setSelectedIds(new Set());
  };

  const handleSyncToCalendar = async (birthdayId: string) => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      return;
    }

    // Strict Mode Check
    if (calendarId === 'primary' || !calendarId) {
      if (onOpenCalendarSettings) {
        onOpenCalendarSettings();
      }
      return;
    }

    try {
      const result = await syncSingleBirthday(birthdayId);
      if (result.success) {
        showToast('יום ההולדת סונכרן ליומן Google בהצלחה', 'success');
      } else {
        showToast(result.error || 'שגיאה בסנכרון ליומן Google', 'error');
      }
    } catch (error: any) {
      logger.error('Error syncing birthday:', error);
      showToast(error.message || 'שגיאה בסנכרון ליומן Google', 'error');
    }
  };

  const handleRemoveFromCalendar = async (birthdayId: string) => {
    try {
      await removeBirthdayFromCalendar(birthdayId);
      showToast('יום ההולדת הוסר מיומן Google', 'success');
    } catch (error: any) {
      logger.error('Error removing birthday from calendar:', error);
      showToast(error.message || 'שגיאה בהסרת יום ההולדת מיומן Google', 'error');
    }
  };

  const handleBulkSyncToCalendar = async () => {
    if (!isConnected) {
      showToast('יש להתחבר ליומן Google תחילה', 'error');
      return;
    }

    // Strict Mode Check
    if (calendarId === 'primary' || !calendarId) {
      if (onOpenCalendarSettings) {
        onOpenCalendarSettings();
      }
      return;
    }

    const birthdaysToSync = Array.from(selectedIds);

    try {
      const result = await syncMultipleBirthdays(birthdaysToSync);
      if (result.status !== 'queued') {
        showToast(
          `${result.successCount} מתוך ${result.totalAttempted} ימי הולדת סונכרנו בהצלחה`,
          result.successCount > 0 ? 'success' : 'error'
        );
      }
      setSelectedIds(new Set());
    } catch (error: any) {
      logger.error('Error bulk syncing birthdays:', error);
      showToast(error.message || 'שגיאה בסנכרון המרובה', 'error');
    }
  };

  const handleCopyToClipboard = async () => {
    const selectedBirthdays = filteredAndSortedBirthdays.filter(b => selectedIds.has(b.id));

    if (selectedBirthdays.length === 0) {
      showToast(t('birthday.noSelection', 'לא נבחרו רשומות'), 'warning');
      return;
    }

    const textParts = selectedBirthdays.map(birthday => {
      const calculations = birthday.calculations;
      const nextHebrewDate = calculations.nextHebrewBirthday;
      
      const formattedDate = nextHebrewDate 
          ? format(nextHebrewDate, 'd MMMM yyyy', { locale: he }) 
          : '';

      const zodiacSign = calculations.hebrewSign ? t(`zodiac.${calculations.hebrewSign}`) : '';

      return `*${birthday.first_name} ${birthday.last_name}*
*תאריך לידה:* ${birthday.birth_date_hebrew_string || ''}
*מזל:* ${zodiacSign}
*יום הולדת עברי:* ${formattedDate}
*גיל:* ${calculations.ageAtNextHebrewBirthday}`;
    });

    const fullText = textParts.join('\n--\n');

    try {
      await navigator.clipboard.writeText(fullText);
      showToast('התאריכים העבריים והמזלות הועתקו ללוח', 'success');
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        setSelectedIds(new Set());
      }, 2000);
    } catch (err) {
      logger.error('Failed to copy to clipboard', err);
      showToast('שגיאה בהעתקה ללוח', 'error');
    }
  };

  const getSortSelectColor = () => {
    if (sortBy.startsWith('upcoming-hebrew')) return 'text-[#8e24aa]';
    if (sortBy.startsWith('upcoming')) return 'text-blue-600';
    return 'text-gray-900';
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-9 sm:ps-10 pe-8 sm:pe-10 py-1.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowGroupFilter(!showGroupFilter)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 border rounded-lg font-medium transition-colors flex items-center gap-1.5 sm:gap-2 text-sm whitespace-nowrap ${
              selectedGroupIds.length > 0 || genderFilter !== 'all'
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.filters', 'Filters')}</span>
            {(selectedGroupIds.length > 0 || genderFilter !== 'all') && (
              <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-xs font-bold">
                {selectedGroupIds.length + (genderFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getSortSelectColor()} font-medium`}
          >
            {availableSortOptions.map(option => (
              <option 
                key={option.value} 
                value={option.value}
                className={
                  option.value.startsWith('upcoming-hebrew') ? 'text-[#8e24aa] font-medium' :
                  option.value.startsWith('upcoming') ? 'text-blue-600 font-medium' :
                  'text-gray-900'
                }
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-14 sm:top-16 z-10 bg-white border border-slate-200 rounded-lg p-2.5 sm:p-4 shadow-lg">
          <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 ${i18n.language === 'he' ? 'justify-start' : 'justify-start'}`}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 text-sm">
                {selectedIds.size} {t('common.selected')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {i18n.language === 'he' ? (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const selectedBirthdays = filteredAndSortedBirthdays.filter(b => selectedIds.has(b.id));
                        if (selectedBirthdays.length === 0) {
                          showToast(t('birthday.noSelection', 'לא נבחרו רשומות לייצוא'), 'warning');
                          return;
                        }
                        if (!currentTenant) {
                          showToast(t('messages.error', 'שגיאה'), 'error');
                          return;
                        }
                        await exportBirthdaysToCSV(
                          selectedBirthdays, 
                          groups, 
                          currentTenant.id,
                          `birthdays-${new Date().toISOString().split('T')[0]}.csv`, 
                          i18n.language
                        );
                        showToast(t('birthday.exportSuccess', 'הייצוא הושלם בהצלחה'), 'success');
                      } catch (error) {
                        logger.error('Error exporting CSV:', error);
                        showToast(t('messages.exportError', 'שגיאה בייצוא הקובץ'), 'error');
                      }
                    }}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('birthday.exportSelected')}</span>
                  </button>
                  {showHebrewColumn && (
                  <button
                    onClick={handleCopyToClipboard}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 border shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 ${
                      isCopied 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                    }`}
                    title="העתק רשימת ימי הולדת (עברי)"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    )}
                    <span className="hidden sm:inline">{isCopied ? 'הועתק!' : 'העתק לוואטסאפ'}</span>
                  </button>
                  )}
                  <button
                    onClick={() => handleBulkRefresh()}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('birthday.refresh')}</span>
                  </button>
                  <button
                    onClick={() => handleBulkDelete()}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('common.delete')}</span>
                  </button>
                  {isConnected && (
                    <button
                      onClick={handleBulkSyncToCalendar}
                      disabled={isSyncing}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('googleCalendar.syncToCalendar')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className={`text-xs sm:text-sm text-slate-500 hover:text-slate-700 underline ${i18n.language === 'he' ? 'mr-2 sm:mr-3' : 'ml-2 sm:ml-3'}`}
                  >
                    {t('common.clear')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleBulkDelete()}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('common.delete')}</span>
                  </button>
                  <button
                    onClick={() => handleBulkRefresh()}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('birthday.refresh')}</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const selectedBirthdays = filteredAndSortedBirthdays.filter(b => selectedIds.has(b.id));
                        if (selectedBirthdays.length === 0) {
                          showToast(t('birthday.noSelection', 'לא נבחרו רשומות לייצוא'), 'warning');
                          return;
                        }
                        if (!currentTenant) {
                          showToast(t('messages.error', 'שגיאה'), 'error');
                          return;
                        }
                        await exportBirthdaysToCSV(
                          selectedBirthdays, 
                          groups, 
                          currentTenant.id,
                          `birthdays-${new Date().toISOString().split('T')[0]}.csv`, 
                          i18n.language
                        );
                        showToast(t('birthday.exportSuccess', 'הייצוא הושלם בהצלחה'), 'success');
                      } catch (error) {
                        logger.error('Error exporting CSV:', error);
                        showToast(t('messages.exportError', 'שגיאה בייצוא הקובץ'), 'error');
                      }
                    }}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('birthday.exportSelected')}</span>
                  </button>
                  {showHebrewColumn && (
                  <button
                    onClick={handleCopyToClipboard}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 border shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 ${
                      isCopied 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                    }`}
                    title="העתק רשימת ימי הולדת (עברי)"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    )}
                    <span className="hidden sm:inline">{isCopied ? 'הועתק!' : 'העתק לוואטסאפ'}</span>
                  </button>
                  )}
                  {isConnected && (
                    <button
                      onClick={handleBulkSyncToCalendar}
                      disabled={isSyncing}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 shadow-sm rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('googleCalendar.syncToCalendar')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className={`text-xs sm:text-sm text-slate-500 hover:text-slate-700 underline ${i18n.language === 'he' ? 'mr-2 sm:mr-3' : 'ml-2 sm:ml-3'}`}
                  >
                    {t('common.clear')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showGroupFilter && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[60vh] sm:max-h-none overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('filter.gender', 'Gender')}
              </h3>
              {genderFilter !== 'all' && (
                <button
                  onClick={() => setGenderFilter('all')}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('common.clear', 'Clear')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setGenderFilter('all')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                  genderFilter === 'all'
                    ? 'bg-gray-600 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {t('filter.all', 'All')}
              </button>
              <button
                onClick={() => setGenderFilter(genderFilter === 'male' ? 'all' : 'male')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                  genderFilter === 'male'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-blue-300 text-blue-600 hover:border-blue-400'
                }`}
              >
                {t('filter.male', 'Male')}
              </button>
              <button
                onClick={() => setGenderFilter(genderFilter === 'female' ? 'all' : 'female')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                  genderFilter === 'female'
                    ? 'bg-pink-600 border-pink-600 text-white'
                    : 'bg-white border-pink-300 text-pink-600 hover:border-pink-400'
                }`}
              >
                {t('filter.female', 'Female')}
              </button>
            </div>
          </div>

          {groups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('groups.filterByGroup')}</h3>
                {selectedGroupIds.length > 0 && (
                  <button
                    onClick={clearGroupFilters}
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('common.clear', 'Clear')}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  onClick={clearGroupFilters}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                    selectedGroupIds.length === 0
                      ? 'bg-gray-600 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {t('filter.all', 'All')}
                </button>
                <button
                  onClick={() => toggleGroupFilter('unassigned')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 border-2 ${
                    selectedGroupIds.includes('unassigned')
                      ? 'bg-gray-200 border-gray-400 text-gray-900'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-dashed border-gray-400" />
                  {t('birthday.unassigned', 'ללא שיוך')}
                </button>
                {groups.filter(g => !g.is_root).map((group) => (
                  <button
                    key={group.id}
                    onClick={() => toggleGroupFilter(group.id)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                      selectedGroupIds.includes(group.id)
                        ? 'ring-2 ring-offset-1'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: selectedGroupIds.includes(group.id) ? group.color : group.color + '40',
                      color: selectedGroupIds.includes(group.id) ? 'white' : group.color,
                      ringColor: group.color,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                      style={{ backgroundColor: selectedGroupIds.includes(group.id) ? 'white' : group.color }}
                    />
                    {group.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-2 sm:px-6 py-2 sm:py-4 text-start">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filteredAndSortedBirthdays.length &&
                      filteredAndSortedBirthdays.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-4 text-start text-xs sm:text-sm font-bold text-gray-900">
                  {t('birthday.fullName')}
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-4 text-start text-xs sm:text-sm font-bold text-gray-900">
                  {t('birthday.birthDate')}
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-4 text-start text-xs sm:text-sm font-bold text-gray-900">
                  {t('birthday.ageColumn')}
                </th>
                {showGregorianColumn && (
                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-start text-xs sm:text-sm font-bold text-gray-900">
                    {t('birthday.nextGregorianBirthday')}
                  </th>
                )}
                {showHebrewColumn && (
                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-start text-xs sm:text-sm font-bold text-gray-900">
                    {t('birthday.nextHebrewBirthday')}
                  </th>
                )}
                <th className="px-2 sm:px-6 py-2 sm:py-4 text-end text-xs sm:text-sm font-bold text-gray-900 min-w-[140px]">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedBirthdays.length === 0 ? (
                <tr>
                  <td colSpan={showGregorianColumn && showHebrewColumn ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm
                      ? t('common.noResults', 'No results found')
                      : t('birthday.noBirthdays', 'No birthdays yet')}
                  </td>
                </tr>
              ) : (
                filteredAndSortedBirthdays.map((birthday) => {
                  // We use strict global visibility for columns structure, but local preference for "content emphasis" if needed,
                  // or we just render based on strict columns.
                  // Actually, if strict mode is ON (e.g. Hebrew Only), we just show Hebrew data.
                  
                  return (
                    <tr
                      key={birthday.id}
                      className="hover:bg-blue-50 transition-all group"
                      style={{
                        borderRight: birthday.group ? `4px solid ${birthday.group.color}` : undefined,
                      }}
                    >
                      <td className="px-2 sm:px-6 py-2 sm:py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(birthday.id)}
                          onChange={() => toggleSelect(birthday.id)}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4">
                        <div className="flex items-center gap-1.5 sm:gap-3">
                          <span className="text-xs sm:text-sm font-medium text-gray-900">
                            {birthday.first_name} {birthday.last_name}
                          </span>
                          {duplicateIds?.has(birthday.id) && (
                            <div className="relative group/tooltip">
                              <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                              <div className="absolute bottom-full start-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                                {t('birthday.possibleDuplicate', 'כפילות אפשרית')}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-700">
                      <div className="flex flex-col gap-0.5 sm:gap-1">
                        {showGregorianColumn && (
                          <span>{format(new Date(birthday.birth_date_gregorian), 'dd/MM/yyyy', { locale })}</span>
                        )}
                        {showHebrewColumn && (
                          <span className={showGregorianColumn ? "text-[10px] sm:text-xs text-gray-500" : ""}>
                            {(() => {
                              if (birthday.birth_date_hebrew_string) {
                                return birthday.birth_date_hebrew_string;
                              }
                              // בדיקה אם זו רשומה חדשה (נוצרה ב-30 שניות האחרונות)
                              const createdAt = new Date(birthday.created_at).getTime();
                              const isRecent = (currentTime - createdAt) < 30000; // 30 שניות
                              
                              return isRecent 
                                ? (i18n.language === 'he' ? 'מחשב...' : 'Calculating...')
                                : (i18n.language === 'he' ? 'לא זמין' : 'Not available');
                            })()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-semibold">
                        <div className="flex flex-col gap-1">
                          {showGregorianColumn && (
                            <Tooltip
                              theme="blue"
                              content={
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">
                                    {t('birthday.currentGregorianAge')}: {birthday.calculations.currentGregorianAge}
                                  </span>
                                  {birthday.calculations.gregorianSign && (
                                    <span className="text-blue-700/70">
                                      {t(`zodiac.${birthday.calculations.gregorianSign}`)}
                                    </span>
                                  )}
                                </div>
                              }
                            >
                              <div className="flex items-center gap-1.5 cursor-pointer">
                                <span className="text-blue-600">{birthday.calculations.currentGregorianAge}</span>
                                {birthday.calculations.gregorianSign && (
                                  <span className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 font-normal">
                                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                                    {t(`zodiac.${birthday.calculations.gregorianSign}`)}
                                  </span>
                                )}
                              </div>
                            </Tooltip>
                          )}
                          {showHebrewColumn && (
                            <Tooltip
                              theme="purple"
                              content={
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">
                                    {t('birthday.currentHebrewAge')}: {birthday.calculations.currentHebrewAge}
                                  </span>
                                  {birthday.calculations.hebrewSign && (
                                    <span className="text-purple-700/70">
                                      {t(`zodiac.${birthday.calculations.hebrewSign}`)}
                                    </span>
                                  )}
                                </div>
                              }
                            >
                              <div className="flex items-center gap-1.5 cursor-pointer">
                                <span className="text-purple-600">{birthday.calculations.currentHebrewAge}</span>
                                {birthday.calculations.hebrewSign && (
                                  <span className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 font-normal">
                                    <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                    {t(`zodiac.${birthday.calculations.hebrewSign}`)}
                                  </span>
                                )}
                              </div>
                            </Tooltip>
                          )}
                        </div>
                    </td>
                    {showGregorianColumn && (
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-700">
                        <button
                          onClick={() => {
                            setSelectedBirthday(birthday);
                            setShowGregorianModal(true);
                          }}
                          className="flex flex-col gap-0.5 sm:gap-1 text-start hover:bg-blue-50 p-1 sm:p-2 rounded transition-colors"
                        >
                          <div className="flex items-center gap-1 sm:gap-2">
                            <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                            <span className="font-medium">
                              {format(birthday.calculations.nextGregorianBirthday, 'dd/MM/yyyy', { locale })}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-blue-600">
                            {t('birthday.ageAtNextGregorian')}: {birthday.calculations.ageAtNextGregorianBirthday}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-500">
                            ({birthday.calculations.daysUntilGregorianBirthday} {t('birthday.days')})
                          </span>
                        </button>
                    </td>
                    )}
                    {showHebrewColumn && (
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-700">
                      {birthday.calculations.nextHebrewBirthday ? (
                        <button
                          onClick={() => {
                            setSelectedBirthday(birthday);
                            setShowFutureModal(true);
                          }}
                          className="flex flex-col gap-0.5 sm:gap-1 text-start hover:bg-[#8e24aa]/10 p-1 sm:p-2 rounded transition-colors"
                        >
                          <div className="flex items-center gap-1 sm:gap-2">
                            <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 text-[#8e24aa]" />
                            <span className="font-medium">
                              {format(birthday.calculations.nextHebrewBirthday, 'dd/MM/yyyy', { locale })}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-[#8e24aa]">
                            {t('birthday.ageAtNextHebrew')}: {birthday.calculations.ageAtNextHebrewBirthday}
                          </span>
                          {birthday.calculations.daysUntilHebrewBirthday !== null && (
                            <span className="text-[10px] sm:text-xs text-gray-500">
                              ({birthday.calculations.daysUntilHebrewBirthday} {t('birthday.days', 'days')})
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    )}
                    <td className="px-2 sm:px-6 py-2 sm:py-4 min-w-[140px]">
                      <div className="flex items-center justify-end gap-0.5 sm:gap-1 opacity-70 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedBirthday(birthday);
                            setShowWishlistModal(true);
                          }}
                          className="p-1 sm:p-2 text-pink-600 hover:bg-pink-100 rounded-lg transition-all hover:scale-110"
                          title={t('wishlist.title')}
                        >
                          <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleRefresh(birthday.id)}
                          disabled={refreshHebrewData.isPending}
                          className="p-1 sm:p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('birthday.refresh')}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshHebrewData.isPending ? 'animate-spin' : ''}`} />
                        </button>
                        {isConnected && (
                          (birthday.googleCalendarEventId || birthday.googleCalendarEventIds) ? (
                            <>
                              {unsyncedMap.get(birthday.id) && (
                                <div className="relative">
                                  <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" title={t('birthday.unsyncedChanges')} />
                                </div>
                              )}
                              <button
                                onClick={() => handleRemoveFromCalendar(birthday.id)}
                                disabled={isSyncing}
                                className="p-1 sm:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('googleCalendar.remove')}
                              >
                                <CloudOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                              {unsyncedMap.get(birthday.id) && (
                                <button
                                  onClick={() => handleSyncToCalendar(birthday.id)}
                                  disabled={isSyncing}
                                  className="p-1 sm:p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={t('googleCalendar.updateToCalendar')}
                                >
                                  <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => handleSyncToCalendar(birthday.id)}
                              disabled={isSyncing}
                              className="p-1 sm:p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t('googleCalendar.syncToCalendar')}
                            >
                              <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )
                        )}
                        {onAddToCalendar && (
                          <button
                            onClick={() => onAddToCalendar(birthday)}
                            className="p-1 sm:p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all hover:scale-110"
                            title={t('birthday.addToCalendar')}
                          >
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        {(!birthday.group_ids || birthday.group_ids.length === 0) && (
                          <button
                            onClick={() => onEdit(birthday)}
                            className="p-1 sm:p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-all hover:scale-110 animate-pulse"
                            title={t('birthday.reassign')}
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        {birthday.group_ids && birthday.group_ids.length > 0 && (
                          <button
                            onClick={() => onEdit(birthday)}
                            className="p-1 sm:p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110"
                            title={t('common.edit')}
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(birthday.id)}
                          className="p-1 sm:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all hover:scale-110"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FutureBirthdaysModal
        isOpen={showFutureModal}
        onClose={() => setShowFutureModal(false)}
        name={selectedBirthday ? `${selectedBirthday.first_name} ${selectedBirthday.last_name}` : ''}
        futureDates={selectedBirthday?.future_hebrew_birthdays || []}
        birthHebrewYear={selectedBirthday?.hebrew_year}
      />

      {selectedBirthday && (
        <UpcomingGregorianBirthdaysModal
          isOpen={showGregorianModal}
          onClose={() => setShowGregorianModal(false)}
          birthday={selectedBirthday}
        />
      )}

      {selectedBirthday && (
        <WishlistModal
          isOpen={showWishlistModal}
          onClose={() => {
            setShowWishlistModal(false);
            setSelectedBirthday(null);
          }}
          birthday={selectedBirthday}
        />
      )}
    </div>
  );
};
