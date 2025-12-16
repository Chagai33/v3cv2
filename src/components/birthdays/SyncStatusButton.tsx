import React from 'react';
import { useTranslation } from 'react-i18next';
import { Birthday } from '../../types';
import { Tooltip } from '../common/Tooltip';
import { 
  Cloud, 
  Loader2, 
  Check,
  AlertCircle
} from 'lucide-react';

interface SyncStatusButtonProps {
  birthday: Birthday;
  isPendingChange?: boolean;
  isLoading?: boolean; // מציג ספינר (עבור הרשומה הספציפית)
  isDisabled?: boolean; // נועל את הכפתור (עבור מצב סנכרון גלובלי)
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
}

export const SyncStatusButton: React.FC<SyncStatusButtonProps> = ({
  birthday,
  isPendingChange = false,
  isLoading = false,
  isDisabled = false,
  onSync,
  onRemove,
}) => {
  const { t } = useTranslation();

  // Determine Sync State
  const hasEvents = birthday.googleCalendarEventsMap && Object.keys(birthday.googleCalendarEventsMap).length > 0;
  // Fallback to legacy fields if map is missing but flags are present (migration support)
  const isLegacySynced = !!(birthday.googleCalendarEventId || birthday.googleCalendarEventIds);
  
  // CRITICAL FIX: Only consider it "Synced" if the user explicitly wants it synced (isSynced flag)
  // OR if there are actual events on the calendar (hasEvents).
  // If the user turned it off (isSynced=false) and there are no events, we should show Gray (Idle),
  // regardless of what the old syncMetadata says.
  const isSynced = (birthday.isSynced === true) || hasEvents || isLegacySynced;

  const status = birthday.syncMetadata?.status;

  // Visual Configuration
  let icon = <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />;
  let colorClass = "text-gray-400 hover:text-gray-600 hover:bg-gray-50";
  let tooltipContent = t('googleCalendar.startSyncing', 'לחץ לסנכרון');
  let onClickAction = () => onSync(birthday.id);

  // LOGIC PRIORITY:
  
  // 0. Loading / Syncing (Top Priority)
  if (isLoading) {
    icon = <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />; // Spinner
    colorClass = "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 cursor-wait"; // Yellow
    tooltipContent = t('googleCalendar.syncing', 'מסנכרן...');
    onClickAction = () => {}; // No action while syncing
  }
  // 1. Error / Partial (Red)
  else if (isSynced && (status === 'ERROR' || status === 'PARTIAL_SYNC')) {
    icon = <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />; // Error Icon
    colorClass = "text-red-500 hover:text-red-600 hover:bg-red-50"; // Red
    tooltipContent = status === 'ERROR' 
        ? t('googleCalendar.syncError', 'שגיאה בסנכרון (כל הניסיונות נכשלו)')
        : t('googleCalendar.partialSync', 'סנכרון חלקי (חלק מהאירועים לא עברו)');
    onClickAction = () => onSync(birthday.id); // Retry
  }
  // 2. Pending Changes (Yellow)
  else if (isSynced && (status === 'PENDING' || isPendingChange)) {
    icon = <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />; // Spinner
    colorClass = "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"; // Yellow
    tooltipContent = t('googleCalendar.unsyncedChanges', 'יש שינויים הממתינים לסנכרון');
    onClickAction = () => onSync(birthday.id); // Update/Refresh
  }
  // 3. Synced (Green)
  else if (isSynced) {
    icon = <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />; // Bold Check
    colorClass = "text-green-500 hover:text-green-600 hover:bg-green-50"; // Green
    tooltipContent = t('googleCalendar.stopSyncing', 'מסונכרן ותקין. לחץ להסרה');
    
    // Safety Confirmation
    onClickAction = () => {
      // Custom confirmation logic
      if (window.confirm(t('googleCalendar.confirmRemove', 'האם להסיר את יום ההולדת מיומן Google?'))) {
        onRemove(birthday.id);
      }
    };
  }
  // 4. Idle (Gray) - Default
  else {
      // Already set defaults
  }

  return (
    <Tooltip content={tooltipContent}>
      <button
        onClick={onClickAction}
        disabled={isLoading || isDisabled}
        className={`p-1 sm:p-2 rounded-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
        aria-label={tooltipContent}
      >
        {icon}
      </button>
    </Tooltip>
  );
};


