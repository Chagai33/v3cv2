import { logger } from "../../utils/logger";
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { BirthdayFormData, Gender, Birthday } from '../../types';
import { useCreateBirthday, useUpdateBirthday, useCheckDuplicates } from '../../hooks/useBirthdays';
import { useGroups, useCreateGroup } from '../../hooks/useGroups';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { DuplicateVerificationModal } from '../modals/DuplicateVerificationModal';
import { SunsetVerificationModal } from '../modals/SunsetVerificationModal';
import { GenderVerificationModal } from '../modals/GenderVerificationModal';
import { MultiSelectGroups, GroupOption } from '../common/MultiSelectGroups';
import { X, Save, Plus, Info, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Toast } from '../common/Toast';
import { useToast } from '../../hooks/useToast';
import { HDate } from '@hebcal/core';

// --- Hebrew Format Helpers ---
const HEBREW_MONTHS_HE = [
  'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר א', 'אדר ב',
  'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'
];

const HEBREW_MONTHS_EN = [
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar I', 'Adar II',
  'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul'
];

const numberToHebrewLetter = (num: number): string => {
  if (num <= 0) return '';
  const letters = [
    '', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
    'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
    'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'
  ];
  return letters[num] || num.toString();
};

const numberToHebrewYear = (year: number): string => {
  const shortYear = year % 1000;
  const hundreds = Math.floor(shortYear / 100);
  const tens = Math.floor((shortYear % 100) / 10);
  const units = shortYear % 10;

  const hundredsMap = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
  const tensMap = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const unitsMap = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

  let res = hundredsMap[hundreds] + tensMap[tens] + unitsMap[units];
  
  if (res.length > 1) {
    res = res.slice(0, -1) + '"' + res.slice(-1);
  } else {
    res += "'";
  }
  return res;
};

// Generate Hebrew year range: Current year down to 1900 equivalent (roughly 120 years)
const currentHebrewYear = new HDate().getFullYear();
const HEBREW_YEAR_RANGE = Array.from({ length: 121 }, (_, i) => currentHebrewYear - i);

interface BirthdayFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editBirthday?: Birthday | null;
  defaultGroupId?: string;
}

export const BirthdayForm = ({
  onClose,
  onSuccess,
  editBirthday,
  defaultGroupId,
}: BirthdayFormProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const createBirthday = useCreateBirthday();
  const updateBirthday = useUpdateBirthday();
  const checkDuplicates = useCheckDuplicates();
  const { data: allGroups = [], refetch: refetchGroups } = useGroups();
  const createGroup = useCreateGroup();
  const { toasts, hideToast, success: showSuccess, error: showError } = useToast();

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSunsetModal, setShowSunsetModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedParentGroup, setSelectedParentGroup] = useState('');
  const [duplicates, setDuplicates] = useState<Birthday[]>([]);
  const [pendingData, setPendingData] = useState<BirthdayFormData | null>(null);
  const [newGroupNames, setNewGroupNames] = useState<string[]>([]);
  const [newGroupIds, setNewGroupIds] = useState<string[]>([]);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [showSunsetTooltip, setShowSunsetTooltip] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // בדיקת שינויים לא מסונכרנים
  useEffect(() => {
    if (editBirthday && (editBirthday.googleCalendarEventIds || editBirthday.googleCalendarEventId)) {
      import('../../utils/syncStatus').then(({ hasUnsyncedChanges: checkUnsynced }) => {
        checkUnsynced(editBirthday).then(setHasUnsyncedChanges);
      });
    } else {
      setHasUnsyncedChanges(false);
    }
  }, [editBirthday?.syncedDataHash, editBirthday?.googleCalendarEventIds, editBirthday?.first_name, editBirthday?.last_name, editBirthday?.notes, editBirthday?.group_ids, editBirthday?.group_id, editBirthday?.calendar_preference_override]);

  const formatDateForInput = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateString = (dateString: string | undefined): { day: number; month: number; year: number } | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return {
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  };

  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month, 0).getDate();
  };

  // יצירת תאריך בפורמט YYYY-MM-DD
  const getDateString = (day: number | string, month: number | string, year: number | string): string => {
    if (!day || !month || !year) return '';
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const formattedYear = date.getFullYear();
    const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(date.getDate()).padStart(2, '0');
    return `${formattedYear}-${formattedMonth}-${formattedDay}`;
  };

  const [selectedDay, setSelectedDay] = useState<number | string>(() => {
    const parsed = parseDateString(editBirthday?.birth_date_gregorian);
    return parsed?.day || '';
  });
  const [selectedMonth, setSelectedMonth] = useState<number | string>(() => {
    const parsed = parseDateString(editBirthday?.birth_date_gregorian);
    return parsed?.month || '';
  });
  const [selectedYear, setSelectedYear] = useState<number | string>(() => {
    const parsed = parseDateString(editBirthday?.birth_date_gregorian);
    return parsed?.year || '';
  });

  // Hebrew Input State
  const [inputType, setInputType] = useState<'gregorian' | 'hebrew'>('gregorian');
  const [hebrewDay, setHebrewDay] = useState<number>(1);
  const [hebrewMonth, setHebrewMonth] = useState<string>('Nisan');
  const [hebrewYear, setHebrewYear] = useState<number>(currentHebrewYear);

  // Sync Hebrew -> Gregorian
  useEffect(() => {
    if (inputType === 'hebrew') {
       try {
           const hd = new HDate(hebrewDay, hebrewMonth, hebrewYear);
           const greg = hd.greg();
           const dateString = formatDateForInput(greg.toISOString());
           
           // Update Form
           // Note: setValue is available from useForm hook which is initialized below.
           // However, this useEffect is placed BEFORE useForm initialization in the current code structure
           // which causes the "Cannot access 'setValue' before initialization" error.
           // The fix is to move this useEffect AFTER useForm initialization.
       } catch (e) {
           console.error('Invalid Hebrew Date', e);
       }
    }
  }, [hebrewDay, hebrewMonth, hebrewYear, inputType]); // Removed setValue from dependency temporarily to explain the fix

  // עדכון מספר הימים כאשר משנים חודש או שנה
  useEffect(() => {
    if (!selectedMonth || !selectedYear || !selectedDay) return;
    const daysInMonth = getDaysInMonth(Number(selectedMonth), Number(selectedYear));
    if (Number(selectedDay) > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [selectedMonth, selectedYear, selectedDay]);

  // יצירת רשימת שנים (משנת 1900 עד השנה הנוכחית)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsList: number[] = [];
    for (let year = 1900; year <= currentYear; year++) {
      yearsList.push(year);
    }
    return yearsList.reverse(); // מהחדש לישן
  }, []);

  // יצירת רשימת חודשים
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  // יצירת רשימת ימים לפי החודש והשנה הנבחרים
  const days = useMemo(() => {
    if (!selectedMonth || !selectedYear) return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = getDaysInMonth(Number(selectedMonth), Number(selectedYear));
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedMonth, selectedYear]);

  // חישוב הערך הראשוני של התאריך
  const initialDateString = useMemo(() => {
    if (editBirthday) {
      return formatDateForInput(editBirthday.birth_date_gregorian);
    }
    return '';
  }, [editBirthday, selectedDay, selectedMonth, selectedYear]);

  const initialGroupIds = useMemo(() => {
    if (editBirthday) {
        if (editBirthday.group_ids && editBirthday.group_ids.length > 0) {
            return editBirthday.group_ids;
        }
        if (editBirthday.group_id) {
            return [editBirthday.group_id];
        }
        return [];
    }
    return defaultGroupId ? [defaultGroupId] : [];
  }, [editBirthday, defaultGroupId]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BirthdayFormData>({
    defaultValues: editBirthday
      ? {
          firstName: editBirthday.first_name,
          lastName: editBirthday.last_name,
          birthDateGregorian: formatDateForInput(editBirthday.birth_date_gregorian) as any,
          afterSunset: editBirthday.after_sunset,
          gender: editBirthday.gender,
          groupIds: initialGroupIds,
          calendarPreferenceOverride: editBirthday.calendar_preference_override || undefined,
          notes: editBirthday.notes,
        }
      : {
          groupIds: initialGroupIds,
          birthDateGregorian: initialDateString as any,
        },
  });

  // Sync Hebrew -> Gregorian (Moved here to access setValue)
  useEffect(() => {
    if (inputType === 'hebrew') {
       try {
           const hd = new HDate(hebrewDay, hebrewMonth, hebrewYear);
           const greg = hd.greg();
           const dateString = formatDateForInput(greg.toISOString());
           
           // Update Form
           setValue('birthDateGregorian', dateString as any, { shouldValidate: true });
           
           // Update Gregorian State (so if they switch back, it's consistent)
           const parts = parseDateString(dateString);
           if (parts) {
               setSelectedDay(parts.day);
               setSelectedMonth(parts.month);
               setSelectedYear(parts.year);
           }
       } catch (e) {
           console.error('Invalid Hebrew Date', e);
       }
    }
  }, [hebrewDay, hebrewMonth, hebrewYear, inputType, setValue]);

  // עדכון הערך ב-form כאשר משנים תאריך (רק אחרי שה-form מוכן)
  useEffect(() => {
    const dateString = getDateString(selectedDay, selectedMonth, selectedYear);
    setValue('birthDateGregorian', dateString as any, { shouldValidate: !!dateString });
  }, [selectedDay, selectedMonth, selectedYear, setValue]);

  const rootGroups = allGroups.filter(g => g.is_root);
  const childGroups = allGroups.filter(g => !g.is_root);
  
  // Helper function to get translated root group name
  const getTranslatedRootName = (group: any): string => {
    if (!group.is_root || !group.type) return group.name;
    const translationKeys: Record<string, string> = {
      family: 'groups.family',
      friends: 'groups.friends',
      work: 'groups.work',
    };
    const key = translationKeys[group.type];
    return key ? t(key) : group.name;
  };
  
  // Create a map of root group IDs to translated names for optgroup labels
  const translatedRootNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    rootGroups.forEach(root => {
      map.set(root.id, getTranslatedRootName(root));
    });
    return map;
  }, [rootGroups, t]);

  // Prepare group options for MultiSelect
  // When adding a new birthday (not editing), only show child groups (subgroups)
  // When editing, show all groups (root + child) for flexibility
  const groupOptions = useMemo<GroupOption[]>(() => {
    const options: GroupOption[] = [];
    
    if (editBirthday) {
      // When editing: show all groups (root + child)
      rootGroups.forEach(root => {
        const rootName = translatedRootNamesMap.get(root.id) || root.name;
        
        options.push({
          id: root.id,
          name: rootName,
          isRoot: true
        });

        const children = childGroups.filter(c => c.parent_id === root.id);
        children.forEach(child => {
          options.push({
            id: child.id,
            name: child.name,
            parentName: rootName,
            isRoot: false
          });
        });
      });
    } else {
      // When adding new: only show child groups (subgroups)
      rootGroups.forEach(root => {
        const rootName = translatedRootNamesMap.get(root.id) || root.name;
        const children = childGroups.filter(c => c.parent_id === root.id);
        children.forEach(child => {
          options.push({
            id: child.id,
            name: child.name,
            parentName: rootName,
            isRoot: false
          });
        });
      });
    }
    
    return options;
  }, [rootGroups, childGroups, translatedRootNamesMap, editBirthday]);

  // Helper to get Hebrew month list
  const getHebrewMonths = () => i18n.language === 'he' ? HEBREW_MONTHS_HE : HEBREW_MONTHS_EN;

  const finalSubmit = async (data: BirthdayFormData) => {
    try {
      if (editBirthday) {
        await updateBirthday.mutateAsync({
          birthdayId: editBirthday.id,
          data,
        });
        showSuccess(t('messages.birthdayUpdated'));
      } else {
        await createBirthday.mutateAsync(data);
        showSuccess(t('messages.birthdayAdded'));
      }
      onSuccess();
      onClose();
    } catch (error) {
      showError(t('common.error'));
      logger.error('Error saving birthday:', error);
    }
  };

  const onSubmit = async (data: BirthdayFormData) => {
    if (!data.groupIds || data.groupIds.length === 0) {
      showError(t('birthday.selectGroup'));
      return;
    }

    if (!editBirthday) {
      // Check duplicates with ALL selected groups (or at tenant level)
      const result = await checkDuplicates.mutateAsync({
        groupIds: data.groupIds,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDateGregorian,
      });

      if (result && result.length > 0) {
        setDuplicates(result);
        setPendingData(data);
        // Get names of the new groups being added
        const names = (data.groupIds || [])
          .map(id => {
            const group = allGroups.find(g => g.id === id);
            return group?.name;
          })
          .filter((name): name is string => !!name);
        setNewGroupNames(names);
        setNewGroupIds(data.groupIds || []);
        setShowDuplicateModal(true);
        return;
      }
    }

    if (data.afterSunset === undefined) {
      setPendingData(data);
      setShowSunsetModal(true);
      return;
    }

    if (!data.gender) {
      setPendingData(data);
      setShowGenderModal(true);
      return;
    }

    await finalSubmit(data);
  };

  const handleMerge = async () => {
    setShowDuplicateModal(false);
    if (pendingData && duplicates.length > 0) {
        try {
            const master = duplicates[0];
            const newGroups = pendingData.groupIds || [];
            const existingGroups = master.group_ids || (master.group_id ? [master.group_id] : []);
            
            // Combine unique groups
            const combinedGroups = Array.from(new Set([...existingGroups, ...newGroups]));
            
            // Call update on the existing birthday
            await updateBirthday.mutateAsync({
                birthdayId: master.id,
                data: {
                    groupIds: combinedGroups,
                    // Optionally update other fields if they are newer/better, 
                    // but for a "Merge" action, usually we just add the group.
                }
            });
            
            showSuccess(t('messages.birthdayMerged', 'Person updated with new groups successfully'));
            onSuccess();
            onClose();
        } catch (error) {
            showError(t('common.error'));
            logger.error('Error merging birthday:', error);
        }
    }
  };

  const handleDuplicateConfirm = () => {
      // This is "Create Anyway" logic (Not recommended but maybe needed as fallback?)
      // Actually, based on the plan, we should PREFER merge.
      // But what if it IS a different person? 
      // The modal now should probably offer "Merge" as primary.
      // Let's assume the modal now has a "Merge" button which calls handleMerge.
      // If they close, it cancels.
      // If we want to support "Create New" despite duplicate, we need another button.
      // For now, we'll implement handleMerge as the primary action for the modal's "Confirm".
      handleMerge(); 
  };

  const handleSunsetConfirm = (afterSunset: boolean) => {
    setShowSunsetModal(false);
    if (pendingData) {
      const updatedData = { ...pendingData, afterSunset };
      setPendingData(updatedData);

      if (!updatedData.gender) {
        setShowGenderModal(true);
      } else {
        finalSubmit(updatedData);
      }
    }
  };

  const handleGenderConfirm = (gender: Gender) => {
    setShowGenderModal(false);
    if (pendingData) {
      const updatedData = { ...pendingData, gender };
      finalSubmit(updatedData);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selectedParentGroup || !user || !currentTenant) {
      showError(t('validation.required'));
      return;
    }

    try {
      const parentGroup = rootGroups.find(g => g.id === selectedParentGroup);
      if (!parentGroup) return;

      const groupId = await createGroup.mutateAsync({
        name: newGroupName,
        parentId: selectedParentGroup,
        color: parentGroup.color,
      });

      await refetchGroups();
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setSelectedParentGroup('');
      
      // Automatically select the new group
      const currentIds = watch('groupIds') || [];
      setValue('groupIds', [...currentIds, groupId], { shouldValidate: true });
      
      showSuccess(t('messages.groupCreated', 'Group created successfully'));
    } catch (error) {
      logger.error('Error creating group:', error);
      showError(t('common.error'));
    }
  };

  // Calculate selected groups for display or preference logic
  const selectedGroupIds = watch('groupIds') || [];
  const calendarPreferenceOverride = watch('calendarPreferenceOverride');
  // Use the first selected group for calendar preference hint (or show mixed?)
  const firstSelectedGroupId = selectedGroupIds.length > 0 ? selectedGroupIds[0] : undefined;
  const firstSelectedGroup = allGroups.find(g => g.id === firstSelectedGroupId);

  // Check for conflicting preferences among selected groups
  const conflictingPreferences = useMemo(() => {
    if (selectedGroupIds.length <= 1) return false;
    
    const selectedGroups = allGroups.filter(g => selectedGroupIds.includes(g.id));
    if (selectedGroups.length === 0) return false;

    const preferences = selectedGroups
      .map(g => g.calendar_preference || 'both')
      .filter((v, i, a) => a.indexOf(v) === i); // Unique values
      
    return preferences.length > 1;
  }, [selectedGroupIds, allGroups]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 pt-3 sm:pt-4 pb-20 sm:pb-4 overflow-hidden" onClick={onClose}>
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-2xl w-full p-3 sm:p-6 max-h-[calc(100vh-6rem)] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2 sm:mb-6">
            <h2 className="text-base sm:text-2xl font-bold text-gray-900">
              {editBirthday ? t('birthday.editBirthday') : t('birthday.addBirthday')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 sm:space-y-4">
            {editBirthday && (editBirthday.googleCalendarEventIds || editBirthday.googleCalendarEventId) && hasUnsyncedChanges && (
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg mb-2 sm:mb-4">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-orange-800">
                  {t('birthday.unsyncedChanges')}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                  {t('birthday.firstName')} *
                </label>
                <input
                  {...register('firstName', {
                    required: t('validation.required'),
                  })}
                  className="w-full px-2 sm:px-4 py-1.5 sm:py-2 text-base sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-0.5 sm:mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                  {t('birthday.lastName')} *
                </label>
                <input
                  {...register('lastName', {
                    required: t('validation.required'),
                  })}
                  className="w-full px-2 sm:px-4 py-1.5 sm:py-2 text-base sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-0.5 sm:mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                {t('birthday.birthDate')} *
              </label>

              {/* Tabs */}
              <div className="flex p-1 bg-gray-100 rounded-lg mb-2">
                <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                        inputType === 'gregorian' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setInputType('gregorian')}
                >
                    {t('guest.gregorianDate', 'Gregorian Date')}
                </button>
                <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                        inputType === 'hebrew' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setInputType('hebrew')}
                >
                    {t('guest.hebrewDate', 'Hebrew Date')}
                </button>
              </div>

              {inputType === 'gregorian' ? (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div>
                      <select
                        value={selectedDay}
                        onChange={(e) => {
                          const val = e.target.value;
                          const day = val ? parseInt(val) : '';
                          setSelectedDay(day);
                          const dateString = getDateString(day, selectedMonth, selectedYear);
                          setValue('birthDateGregorian', dateString as any, { shouldValidate: true });
                        }}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">{t('common.day')}</option>
                        {days.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <label className="block text-[10px] sm:text-xs text-gray-500 mt-0.5 text-center">
                        {t('common.day')}
                      </label>
                    </div>
                    <div>
                      <select
                        value={selectedMonth}
                        onChange={(e) => {
                          const val = e.target.value;
                          const month = val ? parseInt(val) : '';
                          setSelectedMonth(month);
                          
                          let day = selectedDay;
                          if (val && selectedYear) {
                            const daysInMonth = getDaysInMonth(month as number, selectedYear as number);
                            if (typeof day === 'number' && day > daysInMonth) {
                              day = daysInMonth;
                              setSelectedDay(day);
                            }
                          }

                          const dateString = getDateString(day, month, selectedYear);
                          setValue('birthDateGregorian', dateString as any, { shouldValidate: true });
                        }}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">{t('common.month')}</option>
                        {months.map((month) => {
                          const date = new Date(2000, month - 1, 1);
                          const monthName = date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', { month: 'long' });
                          return (
                            <option key={month} value={month}>
                              {monthName}
                            </option>
                          );
                        })}
                      </select>
                      <label className="block text-[10px] sm:text-xs text-gray-500 mt-0.5 text-center">
                        {t('common.month')}
                      </label>
                    </div>
                    <div>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          const val = e.target.value;
                          const year = val ? parseInt(val) : '';
                          setSelectedYear(year);
                          
                          let day = selectedDay;
                          if (val && selectedMonth) {
                            const daysInMonth = getDaysInMonth(selectedMonth as number, year as number);
                            if (typeof day === 'number' && day > daysInMonth) {
                              day = daysInMonth;
                              setSelectedDay(day);
                            }
                          }

                          const dateString = getDateString(day, selectedMonth, year);
                          setValue('birthDateGregorian', dateString as any, { shouldValidate: true });
                        }}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">{t('common.year')}</option>
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <label className="block text-[10px] sm:text-xs text-gray-500 mt-0.5 text-center">
                        {t('common.year')}
                      </label>
                    </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* Hebrew Day */}
                    <div>
                        <select 
                            value={hebrewDay} 
                            onChange={(e) => setHebrewDay(Number(e.target.value))}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-center"
                            dir={i18n.language === 'he' ? "rtl" : "ltr"}
                        >
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>
                                    {i18n.language === 'he' ? numberToHebrewLetter(d) : d}
                                </option>
                            ))}
                        </select>
                        <label className="block text-[10px] sm:text-xs text-gray-500 mt-0.5 text-center">
                          {t('common.day')}
                        </label>
                    </div>

                    {/* Hebrew Month */}
                    <div>
                        <select 
                            value={hebrewMonth} 
                            onChange={(e) => setHebrewMonth(e.target.value)}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-center"
                            dir={i18n.language === 'he' ? "rtl" : "ltr"}
                        >
                            {getHebrewMonths().map((m, idx) => (
                                <option key={m} value={HEBREW_MONTHS_EN[idx]}>
                                    {m}
                                </option>
                            ))}
                        </select>
                        <label className="block text-[10px] sm:text-xs text-gray-500 mt-0.5 text-center">
                          {t('common.month')}
                        </label>
                    </div>

                    {/* Hebrew Year */}
                    <div>
                        <select
                            value={hebrewYear}
                            onChange={(e) => setHebrewYear(Number(e.target.value))}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-center"
                            dir="ltr"
                        >
                            {HEBREW_YEAR_RANGE.map(y => (
                                <option key={y} value={y}>
                                    {y} {i18n.language === 'he' ? `(${numberToHebrewYear(y)})` : ''}
                                </option>
                            ))}
                        </select>
                        <label className="block text-[10px] sm:text-xs text-gray-500 mt-0.5 text-center">
                          {t('common.year')}
                        </label>
                    </div>
                  </div>
              )}

              <input
                type="hidden"
                value={getDateString(selectedDay, selectedMonth, selectedYear)}
                {...register('birthDateGregorian', {
                  required: t('validation.required'),
                  validate: (value) => {
                    const date = new Date(value);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    if (date > now) {
                      return t('validation.futureDate', 'Birth date cannot be in the future');
                    }
                    return true;
                  },
                  valueAsDate: true,
                })}
              />
              {errors.birthDateGregorian && (
                <p className="text-red-500 text-xs mt-0.5 sm:mt-1">
                  {errors.birthDateGregorian.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  {t('birthday.gender')} *
                </label>
                <div className="flex gap-1.5 sm:gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 border-2 rounded-lg cursor-pointer transition-colors ${errors.gender ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
                    <input
                      type="radio"
                      value="male"
                      {...register('gender', { required: t('validation.required') })}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600"
                    />
                    <span className="text-xs sm:text-base font-medium">{t('common.male')}</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 border-2 rounded-lg cursor-pointer transition-colors ${errors.gender ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
                    <input
                      type="radio"
                      value="female"
                      {...register('gender', { required: t('validation.required') })}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600"
                    />
                    <span className="text-xs sm:text-base font-medium">{t('common.female')}</span>
                  </label>
                </div>
                {errors.gender && (
                  <p className="text-red-500 text-xs mt-0.5 sm:mt-1">{errors.gender.message}</p>
                )}
              </div>

              <div className="flex items-end pb-0 sm:pb-2 relative">
                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...register('afterSunset')}
                    className="w-3 h-3 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {t('birthday.afterSunset')}
                  </span>
                </label>
                <div className="relative ml-2">
                  <button
                    type="button"
                    onClick={() => setShowSunsetTooltip(!showSunsetTooltip)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {showSunsetTooltip && (
                    <>
                      <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSunsetTooltip(false)}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-gray-900 text-white text-xs rounded p-2 z-20 shadow-lg text-center">
                        {t('birthday.sunsetExplanation')}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2 items-start">
              <div className="flex-1">
                <MultiSelectGroups
                    groups={groupOptions}
                    selectedIds={watch('groupIds')}
                    onChange={(ids) => setValue('groupIds', ids, { shouldValidate: true })}
                    label={t('birthday.group') + ' *'}
                    error={errors.groupIds ? String(errors.groupIds.message) : undefined} // Type check workaround
                    placeholder={t('birthday.selectGroup')}
                />
                {/* Hidden field for validation if needed, but MultiSelect uses setValue */}
                <input type="hidden" {...register('groupIds', { required: t('birthday.selectGroup') })} />
              </div>
              <div className="mt-6 sm:mt-7">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1 text-xs sm:text-sm font-medium h-[38px] sm:h-[42px]"
                  title={t('groups.createSubgroup', 'Create subgroup')}
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-center pt-2 pb-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium bg-blue-50 px-3 py-1.5 rounded-full"
              >
                {showAdvanced ? (
                  <>
                    <span>פחות אפשרויות</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>אפשרויות מתקדמות (לוח שנה, הערות)</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* האזור המוסתר - נפתח רק כש-showAdvanced הוא true */}
            {showAdvanced && (
              <div className="space-y-2 sm:space-y-4 border-t border-gray-100 pt-4 mt-2">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    {t('birthday.calendarPreference')}
                  </label>
              <div className="space-y-1 sm:space-y-2">
                {firstSelectedGroup && firstSelectedGroup.calendar_preference && !conflictingPreferences && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-1.5 sm:p-2 rounded">
                    {t('birthday.groupPreference', 'Group preference')} ({firstSelectedGroup.name}): <span className="font-semibold">{t(`birthday.${firstSelectedGroup.calendar_preference}`)}</span>
                  </div>
                )}
                {conflictingPreferences && !calendarPreferenceOverride && (
                  <div className="text-xs text-red-600 bg-red-50 p-1.5 sm:p-2 rounded border border-red-200">
                    {t('birthday.preferenceConflict', 'Selected groups have conflicting preferences. Please select a manual setting.')}
                  </div>
                )}
                <select
                  {...register('calendarPreferenceOverride', {
                    required: conflictingPreferences ? t('birthday.selectPreferenceRequired') : false
                  })}
                  className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 text-base sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    conflictingPreferences && !calendarPreferenceOverride ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="" disabled={conflictingPreferences}>
                    {conflictingPreferences 
                      ? t('common.select', 'Select') 
                      : t('birthday.useGroupDefault', 'Use group default')}
                  </option>
                  <option value="gregorian">{t('birthday.gregorianOnly')}</option>
                  <option value="hebrew">{t('birthday.hebrewOnly')}</option>
                  <option value="both">{t('birthday.both')}</option>
                </select>
                {errors.calendarPreferenceOverride && (
                  <p className="text-red-500 text-xs mt-0.5 sm:mt-1">{errors.calendarPreferenceOverride.message}</p>
                )}
                {!conflictingPreferences && (
                  <p className="text-xs text-gray-500 leading-tight">
                    {t('birthday.preferenceExplanation', 'This setting overrides the group preference for this person only')}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-0.5 sm:mb-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  {t('birthday.notes')}
                </label>
                <span className={`text-xs ${
                  (watch('notes')?.length || 0) >= 190 ? 'text-red-500 font-medium' : 'text-gray-400'
                }`}>
                  {watch('notes')?.length || 0}/200
                </span>
              </div>
              <textarea
                {...register('notes')}
                rows={1}
                maxLength={200}
                className="w-full px-2 sm:px-4 py-1.5 sm:py-2 text-base sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('birthday.notesSyncHint')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-2 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={createBirthday.isPending || updateBirthday.isPending}
                className="flex-1 px-2 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50"
              >
                <Save className="w-3 h-3 sm:w-5 sm:h-5" />
                {createBirthday.isPending || updateBirthday.isPending
                  ? t('common.loading')
                  : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <DuplicateVerificationModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={handleDuplicateConfirm}
        duplicates={duplicates}
        newGroupNames={newGroupNames}
        newGroupIds={newGroupIds}
      />

      <SunsetVerificationModal
        isOpen={showSunsetModal}
        onClose={() => setShowSunsetModal(false)}
        onConfirm={handleSunsetConfirm}
      />

      <GenderVerificationModal
        isOpen={showGenderModal}
        onClose={() => setShowGenderModal(false)}
        onConfirm={handleGenderConfirm}
      />

      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t('groups.createSubgroup', 'Create Subgroup')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groups.parentGroup', 'Parent Group')} *
                </label>
                <select
                  value={selectedParentGroup}
                  onChange={(e) => setSelectedParentGroup(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('common.select', 'Select')}</option>
                  {rootGroups.map((root) => (
                    <option key={root.id} value={root.id}>
                      {translatedRootNamesMap.get(root.id) || root.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groups.subgroupName', 'Subgroup Name')} *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('groups.enterSubgroupName', 'Enter subgroup name')}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setNewGroupName('');
                    setSelectedParentGroup('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || !selectedParentGroup || createGroup.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createGroup.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </>
  );
};
