import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Mail, 
  Loader,
  Calendar,
  UserPlus,
  AlertTriangle,
  Globe,
  X
} from 'lucide-react';
import { birthdayService } from '../../services/birthday.service';
import { analyticsService } from '../../services/analytics.service';
import { groupService } from '../../services/group.service';
import { Birthday, BirthdayFormData } from '../../types';
import { Footer } from '../common/Footer';
import { HDate, gematriya, Locale } from '@hebcal/core';

// Hebrew date constants
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
  return letters[num] || String(num);
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

const currentHebrewYear = new HDate().getFullYear();
const HEBREW_YEAR_RANGE = Array.from({ length: 121 }, (_, i) => currentHebrewYear - i);

// Hebrew months mapping to English
const hebrewMonthsToEnglish: Record<string, string> = {
  'ניסן': 'Nisan',
  'אייר': 'Iyyar',
  'סיון': 'Sivan',
  'סיוון': 'Sivan',
  'תמוז': 'Tamuz',
  'אב': 'Av',
  'אלול': 'Elul',
  'תשרי': 'Tishrei',
  'חשון': 'Cheshvan',
  'חשוון': 'Cheshvan',
  'כסלו': 'Kislev',
  'כִּסְלֵו': 'Kislev',
  'טבת': 'Tevet',
  'טֵבֵת': 'Tevet',
  'שבט': 'Shvat',
  'שְׁבָט': 'Shvat',
  'אדר': 'Adar',
  'אדר א': 'Adar I',
  'אדר א׳': 'Adar I',
  'אדר ב': 'Adar II',
  'אדר ב׳': 'Adar II',
};


interface GuestAccessPageState {
  loading: boolean;
  error: string | null;
  errorType: 'invalid_token' | 'access_disabled' | 'rate_limit' | 'network' | 'unknown' | null;
  group: { id: string; name: string; color: string; tenant_id: string } | null;
  birthdays: Birthday[];
}

export const GuestAccessPage: React.FC = () => {
  const { groupId, token } = useParams<{ groupId: string; token: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'he' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const currentLangLabel = i18n.language === 'en' ? 'עברית' : 'English';

  const [state, setState] = useState<GuestAccessPageState>({
    loading: true,
    error: null,
    errorType: null,
    group: null,
    birthdays: [],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [dateInputType, setDateInputType] = useState<'gregorian' | 'hebrew'>('gregorian');
  const [formData, setFormData] = useState<Partial<BirthdayFormData>>({
    firstName: '',
    lastName: '',
    birthDateGregorian: new Date(),
    gender: 'male',
    afterSunset: false,
  });
  
  // Date picker state
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthYear, setBirthYear] = useState<number>(new Date().getFullYear() - 30);
  
  // Hebrew date input state
  const [hebrewDay, setHebrewDay] = useState<number>(1);
  const [hebrewMonth, setHebrewMonth] = useState<string>('Nisan');
  const [hebrewYear, setHebrewYear] = useState<number>(currentHebrewYear);
  
  const [honeyPot, setHoneyPot] = useState(''); // Honey pot for bot detection
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Hebrew date display
  const [hebrewDateDisplay, setHebrewDateDisplay] = useState<string>('');
  const [dateWasChanged, setDateWasChanged] = useState<boolean>(false);
  const [hebrewDateWasChanged, setHebrewDateWasChanged] = useState<boolean>(false);

  // Fetch group and birthdays on mount
  useEffect(() => {
    if (!groupId || !token) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: t('guestAccess.invalidLink', 'קישור לא חוקי או פג תוקף'),
        errorType: 'invalid_token',
      }));
      return;
    }

    const fetchData = async () => {
      try {
        const result = await birthdayService.getGroupBirthdaysForGuest(groupId, token);
        
        setState({
          loading: false,
          error: null,
          errorType: null,
          group: result.group,
          birthdays: result.birthdays,
        });
      } catch (error: any) {
        console.error('Error fetching guest data:', error);
        
        let errorType: GuestAccessPageState['errorType'] = 'unknown';
        let errorMessage = t('guestAccess.errorFetching', 'שגיאה בטעינת הנתונים');

        // Parse error type from message
        if (error.message?.includes('permission-denied') || error.message?.includes('Invalid token')) {
          errorType = 'invalid_token';
          errorMessage = t('guestAccess.invalidLink', 'קישור לא חוקי או פג תוקף');
        } else if (error.message?.includes('disabled')) {
          errorType = 'access_disabled';
          errorMessage = t('guestAccess.groupNotEnabled', 'גישת אורחים אינה מופעלת עבור קבוצה זו');
        } else if (error.message?.includes('Too many attempts') || error.message?.includes('resource-exhausted')) {
          errorType = 'rate_limit';
          errorMessage = t('guestAccess.rateLimitError', 'יותר מדי ניסיונות. אנא נסה שוב מאוחר יותר.');
        } else if (error.message?.includes('network') || error.message?.includes('offline')) {
          errorType = 'network';
          errorMessage = t('guestAccess.networkError', 'שגיאת רשת. אנא בדוק את החיבור שלך.');
        }

        setState({
          loading: false,
          error: errorMessage,
          errorType,
          group: null,
          birthdays: [],
        });
      }
    };

    fetchData();
  }, [groupId, token, t]);
  
  // Calculate Hebrew date when form opens
  useEffect(() => {
    if (showAddForm && formData.birthDateGregorian) {
      const date = formData.birthDateGregorian instanceof Date 
        ? formData.birthDateGregorian 
        : new Date(formData.birthDateGregorian);
      const hebrewDate = calculateHebrewDate(date, formData.afterSunset || false);
      setHebrewDateDisplay(hebrewDate);
    }
  }, [showAddForm]);
  
  // Sync Hebrew -> Gregorian when using Hebrew input
  useEffect(() => {
    if (dateInputType === 'hebrew') {
      // Reset afterSunset when switching to Hebrew mode (not relevant)
      if (formData.afterSunset) {
        handleFormChange('afterSunset', false);
      }
      
      try {
        const hd = new HDate(hebrewDay, hebrewMonth, hebrewYear);
        const greg = hd.greg();
        const date = new Date(greg.getFullYear(), greg.getMonth(), greg.getDate());
        
        // Update form data
        handleFormChange('birthDateGregorian', date);
        
        // Update the selectors for Gregorian date
        setBirthDay(date.getDate());
        setBirthMonth(date.getMonth() + 1);
        setBirthYear(date.getFullYear());
        
        // Update Hebrew date display
        const hebrewDateStr = calculateHebrewDate(date, false); // afterSunset is always false for Hebrew input
        setHebrewDateDisplay(hebrewDateStr);
      } catch (e) {
        console.error('Invalid Hebrew Date', e);
      }
    }
  }, [hebrewDay, hebrewMonth, hebrewYear, dateInputType]);
  
  // Track when Hebrew date fields are manually changed
  useEffect(() => {
    if (dateInputType === 'hebrew') {
      setHebrewDateWasChanged(true);
    }
  }, [hebrewDay, hebrewMonth, hebrewYear]);

  // Filter birthdays by search term
  const filteredBirthdays = useMemo(() => {
    if (!searchTerm.trim()) return state.birthdays;

    const term = searchTerm.toLowerCase();
    return state.birthdays.filter(
      b =>
        b.first_name.toLowerCase().includes(term) ||
        b.last_name.toLowerCase().includes(term)
    );
  }, [state.birthdays, searchTerm]);
  
  // Get Hebrew months based on language
  const getHebrewMonths = () => i18n.language === 'he' ? HEBREW_MONTHS_HE : HEBREW_MONTHS_EN;

  // Check for duplicates before submission
  const checkForDuplicates = () => {
    if (!formData.firstName || !formData.lastName) return null;

    const duplicate = state.birthdays.find(
      b =>
        b.first_name.toLowerCase() === formData.firstName!.toLowerCase() &&
        b.last_name.toLowerCase() === formData.lastName!.toLowerCase()
    );

    return duplicate;
  };
  
  // Calculate and format Hebrew date
  const calculateHebrewDate = (date: Date, afterSunset: boolean) => {
    try {
      // If after sunset, add one day to the date for Hebrew calculation
      const adjustedDate = new Date(date);
      if (afterSunset) {
        adjustedDate.setDate(adjustedDate.getDate() + 1);
      }
      
      const hd = new HDate(adjustedDate);
      
      if (i18n.language === 'he') {
        // Hebrew format: ו׳ טֵבֵת תשפ״ה
        const day = gematriya(hd.getDate());
        const month = Locale.gettext(hd.getMonthName(), 'he');
        const year = gematriya(hd.getFullYear());
        return `${day} ${month} ${year}`;
      } else {
        // English format: 6 Tevet 5785
        const day = hd.getDate();
        const monthHebrew = Locale.gettext(hd.getMonthName(), 'he');
        const monthEnglish = hebrewMonthsToEnglish[monthHebrew] || monthHebrew.replace(/[׳״]/g, ''); // Remove Hebrew punctuation as fallback
        const year = hd.getFullYear();
        return `${day} ${monthEnglish} ${year}`;
      }
    } catch (error) {
      console.error('Error calculating Hebrew date:', error);
      return '';
    }
  };

  // Handle form field changes
  const handleFormChange = (field: keyof BirthdayFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Recalculate Hebrew date when afterSunset changes
      if (field === 'afterSunset' && newData.birthDateGregorian) {
        const date = newData.birthDateGregorian instanceof Date 
          ? newData.birthDateGregorian 
          : new Date(newData.birthDateGregorian);
        const hebrewDate = calculateHebrewDate(date, value);
        setHebrewDateDisplay(hebrewDate);
        
        // Mark that date display was changed
        if (dateWasChanged) {
          setDateWasChanged(true);
        }
      }
      
      return newData;
    });
    setDuplicateWarning(null); // Clear warning on edit
  };
  
  // Update date from day/month/year selectors
  const updateDateFromSelectors = (day: number, month: number, year: number) => {
    const date = new Date(year, month - 1, day);
    handleFormChange('birthDateGregorian', date);
    
    // Mark that user has changed the date
    setDateWasChanged(true);
    
    // Update Hebrew date display
    const hebrewDate = calculateHebrewDate(date, formData.afterSunset || false);
    setHebrewDateDisplay(hebrewDate);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.birthDateGregorian) {
      alert(t('guestAccess.fillRequired', 'אנא מלא את כל השדות הנדרשים'));
      return;
    }

    // Check for duplicates
    const duplicate = checkForDuplicates();
    if (duplicate) {
      const confirm = window.confirm(
        t(
          'guestAccess.duplicateConfirm',
          'נמצא רשומה דומה: {{name}}. האם להוסיף בכל זאת?',
          { name: `${duplicate.first_name} ${duplicate.last_name}` }
        )
      );
      if (!confirm) return;
    }

    setIsSubmitting(true);
    setDuplicateWarning(null);

    try {
      // Call Cloud Function to add birthday with Honey Pot check
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const addBirthdayFn = httpsCallable(functions, 'guestAccessOps');

      await addBirthdayFn({
        mode: 'add_birthday',
        groupId: groupId!,
        token: token!,
        birthdayData: {
          firstName: formData.firstName || '',
          lastName: formData.lastName || '',
          birthDateGregorian: formData.birthDateGregorian instanceof Date
            ? formData.birthDateGregorian.toISOString().split('T')[0]
            : formData.birthDateGregorian || '',
          gender: formData.gender || 'male',
          afterSunset: formData.afterSunset || false,
          notes: formData.notes || '',
          honeyPot: honeyPot, // Include honey pot field
        },
      });

      setSubmitSuccess(true);
      setShowAddForm(false);
      
      // Track guest contribution (critical event)
      analyticsService.trackEvent('Guest', 'Contribution', groupId, { critical: true });
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        birthDateGregorian: new Date(),
        gender: 'male',
        afterSunset: false,
      });
      setBirthDay(1);
      setBirthMonth(1);
      setBirthYear(new Date().getFullYear() - 30);
      setHoneyPot(''); // Reset honey pot
      setDateWasChanged(false); // Reset date changed flag
      setHebrewDateWasChanged(false); // Reset Hebrew date changed flag
      setHebrewDateDisplay(''); // Clear Hebrew date display

      // Refresh data
      const result = await birthdayService.getGroupBirthdaysForGuest(groupId!, token!);
      setState(prev => ({
        ...prev,
        birthdays: result.birthdays,
      }));

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error creating birthday:', error);
      
      let errorMessage = t('guestAccess.addError', 'שגיאה בהוספת יום ההולדת');
      
      // Parse specific error messages
      if (error.message?.includes('Bot detected')) {
        errorMessage = t('guestAccess.botDetected', 'נתגלתה פעילות חשודה. אנא נסה שוב.');
      } else if (error.message?.includes('limit') || error.message?.includes('resource-exhausted')) {
        errorMessage = t('guestAccess.limitReached', 'הגעת למגבלת ההוספות לקישור זה. אנא צור קשר עם מנהל הקבוצה.');
      } else if (error.message?.includes('expired') || error.message?.includes('72-hour')) {
        errorMessage = t('guestAccess.tokenExpired', 'קישור זה פג תוקף (72 שעות). אנא צור קשר עם מנהל הקבוצה לקבלת קישור חדש.');
      }
      
      alert(errorMessage + (error.message ? ': ' + error.message : ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-purple-50 to-blue-50 overflow-x-hidden max-w-full">
        <div className="flex flex-col items-center animate-pulse">
          <div className="text-5xl font-black tracking-tight leading-none relative inline-flex items-baseline" dir="ltr">
            <span className="text-[#8e24aa]">Heb</span>
            <span className="text-[#304FFE]">Birthday</span>
            <span className="text-gray-400 text-xl ml-[2px]">.app</span>
          </div>
          <span className="text-base text-gray-500 font-medium mt-3">
            {t('app.taglinePart1')} <span className="text-[#8e24aa]">{t('app.taglineHebrew')}</span> {t('app.taglineOr')} <span className="text-[#304FFE]">{t('app.taglineGregorian')}</span>
          </span>
        </div>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600/50"></div>
      </div>
    );
  }

  // Error states
  if (state.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex flex-col overflow-x-hidden max-w-full">
        {/* Logo Header */}
        <div className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200 py-4 overflow-x-hidden">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-between overflow-x-hidden">
            <a 
              href={`${window.location.origin}/`}
              className="flex flex-col items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity flex-shrink min-w-0"
            >
              <div className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-none inline-flex items-baseline" dir="ltr">
                <span className="text-[#8e24aa]">Heb</span>
                <span className="text-[#304FFE]">Birthday</span>
                <span className="text-gray-400 text-base sm:text-lg md:text-xl ml-[1px]">.app</span>
              </div>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 text-center">
                {t('app.taglinePart1')} <span className="text-[#8e24aa]">{t('app.taglineHebrew')}</span> {t('app.taglineOr')} <span className="text-[#304FFE]">{t('app.taglineGregorian')}</span>
              </p>
            </a>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:border-purple-400 hover:text-purple-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex-shrink-0"
              title={currentLangLabel}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{currentLangLabel}</span>
            </button>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 flex items-center justify-center p-3 sm:p-4 overflow-x-hidden">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          {state.errorType === 'invalid_token' && (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('guestAccess.linkExpired', 'קישור לא תקף')}
              </h2>
              <p className="text-gray-600 mb-6">{state.error}</p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  {t('guestAccess.contactAdmin', 'אנא צור קשר עם מנהל הקבוצה לקבלת קישור חדש')}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {t('common.backToHome', 'חזור לדף הבית')}
                </button>
              </div>
            </>
          )}

          {state.errorType === 'access_disabled' && (
            <>
              <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('guestAccess.accessRestricted', 'גישה מוגבלת')}
              </h2>
              <p className="text-gray-600 mb-6">{state.error}</p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  {t('guestAccess.accessDisabledExplain', 'מנהל הקבוצה השבית את הגישה לאורחים')}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {t('common.backToHome', 'חזור לדף הבית')}
                </button>
              </div>
            </>
          )}

          {state.errorType === 'rate_limit' && (
            <>
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('guestAccess.tooManyAttempts', 'יותר מדי ניסיונות')}
              </h2>
              <p className="text-gray-600 mb-6">{state.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {t('common.retry', 'נסה שוב')}
              </button>
            </>
          )}

          {(state.errorType === 'network' || state.errorType === 'unknown') && (
            <>
              <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('common.error', 'שגיאה')}
              </h2>
              <p className="text-gray-600 mb-6">{state.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {t('common.retry', 'נסה שוב')}
              </button>
            </>
          )}
        </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    );
  }

  // Success state - Main guest portal
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col overflow-x-hidden max-w-full">
      {/* Logo Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200 py-4 overflow-x-hidden">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-between overflow-x-hidden">
          <a 
            href={`${window.location.origin}/`}
            className="flex flex-col items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity flex-shrink min-w-0"
          >
            <div className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-none inline-flex items-baseline" dir="ltr">
              <span className="text-[#8e24aa]">Heb</span>
              <span className="text-[#304FFE]">Birthday</span>
              <span className="text-gray-400 text-base sm:text-lg md:text-xl ml-[1px]">.app</span>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 text-center">
              {t('app.taglinePart1')} <span className="text-[#8e24aa]">{t('app.taglineHebrew')}</span> {t('app.taglineOr')} <span className="text-[#304FFE]">{t('app.taglineGregorian')}</span>
            </p>
          </a>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:border-purple-400 hover:text-purple-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex-shrink-0"
            title={currentLangLabel}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{currentLangLabel}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 sm:p-4 overflow-x-hidden max-w-full">
        <div className="max-w-4xl mx-auto py-4 sm:py-8 overflow-x-hidden">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: state.group?.color || '#8b5cf6' }}
              >
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5">
                  {t('guestAccess.welcomeToGroup', 'ברוכים הבאים לקבוצת {{name}}', {
                    name: state.group?.name || '',
                  })}
                </h1>
                <p className="text-gray-600 text-xs">
                  {t('guestAccess.portalInfo', 'הוסף ימי הולדת חדשים ותצפה ברשימה הקיימת')}
                </p>
              </div>
            </div>

            {/* Success Message */}
            {submitSuccess && (
              <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-xs sm:text-sm mt-3">
                <CheckCircle className="w-4 h-4" />
                <span>{t('guestAccess.addSuccess', 'יום ההולדת נוסף בהצלחה!')}</span>
              </div>
            )}
          </div>

          {/* Add Birthday Button/Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 overflow-x-hidden max-w-full">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg hover:bg-purple-50 transition-all font-semibold text-sm sm:text-base"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('guestAccess.addBirthday', 'הוסף יום הולדת חדש')}
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  {t('guestAccess.addBirthday', 'הוסף יום הולדת חדש')}
                </h3>
              </div>

              {/* Name Fields - First and Last Name in one row */}
              <div className="grid grid-cols-2 gap-3">
                {/* First Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t('birthday.firstName', 'שם פרטי')} *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={e => handleFormChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t('birthday.lastName', 'שם משפחה')} *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={e => handleFormChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('birthday.birthDate', 'תאריך לידה')} *
                </label>
                
                {/* Toggle between Gregorian and Hebrew */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-2">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                      dateInputType === 'gregorian' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setDateInputType('gregorian')}
                  >
                    {t('birthday.gregorianDate', 'תאריך לועזי')}
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                      dateInputType === 'hebrew' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setDateInputType('hebrew')}
                  >
                    {t('birthday.hebrewDate', 'תאריך עברי')}
                  </button>
                </div>
                
                {dateInputType === 'gregorian' ? (
                  <div className="grid grid-cols-3 gap-2">
                    {/* Day */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('common.day', 'יום')}</label>
                      <select
                        value={birthDay}
                        onChange={e => {
                          const day = parseInt(e.target.value);
                          setBirthDay(day);
                          updateDateFromSelectors(day, birthMonth, birthYear);
                        }}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Month */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('common.month', 'חודש')}</label>
                      <select
                        value={birthMonth}
                        onChange={e => {
                          const month = parseInt(e.target.value);
                          setBirthMonth(month);
                          updateDateFromSelectors(birthDay, month, birthYear);
                        }}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      >
                        {[
                          'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                          'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
                        ].map((monthName, index) => (
                          <option key={index + 1} value={index + 1}>{monthName} ({index + 1})</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Year */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('common.year', 'שנה')}</label>
                      <select
                        value={birthYear}
                        onChange={e => {
                          const year = parseInt(e.target.value);
                          setBirthYear(year);
                          updateDateFromSelectors(birthDay, birthMonth, year);
                        }}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      >
                        {Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {/* Hebrew Day */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('common.day', 'יום')}</label>
                      <select
                        value={hebrewDay}
                        onChange={e => setHebrewDay(Number(e.target.value))}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                        dir={i18n.language === 'he' ? "rtl" : "ltr"}
                      >
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>
                            {i18n.language === 'he' ? numberToHebrewLetter(d) : d}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Hebrew Month */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('common.month', 'חודש')}</label>
                      <select
                        value={hebrewMonth}
                        onChange={e => setHebrewMonth(e.target.value)}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                        dir={i18n.language === 'he' ? "rtl" : "ltr"}
                      >
                        {getHebrewMonths().map((m, idx) => (
                          <option key={m} value={HEBREW_MONTHS_EN[idx]}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Hebrew Year */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('common.year', 'שנה')}</label>
                      <select
                        value={hebrewYear}
                        onChange={e => setHebrewYear(Number(e.target.value))}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                        dir="ltr"
                      >
                        {HEBREW_YEAR_RANGE.map(y => (
                          <option key={y} value={y}>
                            {y} {i18n.language === 'he' ? `(${numberToHebrewYear(y)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Hebrew Date Display - Only show when in Gregorian mode and date was changed */}
              {hebrewDateDisplay && dateInputType === 'gregorian' && dateWasChanged && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-xs sm:text-sm font-medium text-purple-900">
                      {t('birthday.hebrewDate', 'תאריך עברי')}: 
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-purple-700 mt-1" dir="rtl">
                    {hebrewDateDisplay}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {t('guestAccess.verifyHebrewDate', 'אנא ודא שהתאריך העברי נכון. אם לא, שנה את "אחרי השקיעה" למטה.')}
                  </p>
                </div>
              )}
              
              {/* Gregorian Date Display - Only show when in Hebrew mode and date was changed */}
              {dateInputType === 'hebrew' && formData.birthDateGregorian && hebrewDateWasChanged && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-blue-900">
                      {t('birthday.gregorianDate', 'תאריך לועזי')}: 
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-blue-700 mt-1">
                    {new Date(formData.birthDateGregorian).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {t('guestAccess.verifyGregorianDate', 'ודא שהתאריך הלועזי המתאים נכון')}
                  </p>
                </div>
              )}

              {/* Gender */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('birthday.gender', 'מגדר')}
                </label>
                <select
                  value={formData.gender || 'male'}
                  onChange={e => handleFormChange('gender', e.target.value as 'male' | 'female')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="male">{t('birthday.male', 'זכר')}</option>
                  <option value="female">{t('birthday.female', 'נקבה')}</option>
                </select>
              </div>

              {/* After Sunset - Only relevant for Gregorian dates */}
              {dateInputType === 'gregorian' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="afterSunset"
                    checked={formData.afterSunset || false}
                    onChange={e => handleFormChange('afterSunset', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="afterSunset" className="text-xs sm:text-sm text-gray-700">
                    {t('birthday.afterSunset', 'נולד אחרי השקיעה')}
                  </label>
                </div>
              )}

              {/* Duplicate Warning */}
              {duplicateWarning && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {/* Honey Pot Field - Hidden from humans, visible to bots */}
              <input
                type="text"
                name="website"
                value={honeyPot}
                onChange={(e) => setHoneyPot(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSubmitting ? t('common.saving', 'שומר...') : t('common.save', 'שמור')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setDuplicateWarning(null);
                    setFormData({
                      firstName: '',
                      lastName: '',
                      birthDateGregorian: new Date(),
                      gender: 'male',
                      afterSunset: false,
                    });
                    setBirthDay(1);
                    setBirthMonth(1);
                    setBirthYear(new Date().getFullYear() - 30);
                    setHoneyPot('');
                    setDateWasChanged(false); // Reset date changed flag
                    setHebrewDateWasChanged(false); // Reset Hebrew date changed flag
                    setHebrewDateDisplay(''); // Clear Hebrew date display
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  {t('common.cancel', 'ביטול')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Existing Birthdays */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-x-hidden max-w-full">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            {t('guestAccess.existingBirthdays', 'ימי הולדת קיימים בקבוצה')} ({state.birthdays.length})
          </h2>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('guestAccess.searchPlaceholder', 'חפש שם...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Birthday List */}
          {filteredBirthdays.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {searchTerm
                ? t('guestAccess.noSearchResults', 'לא נמצאו תוצאות')
                : t('guestAccess.noBirthdaysFound', 'לא נמצאו ימי הולדת בקבוצה זו')}
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredBirthdays.map(birthday => (
                <div
                  key={birthday.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        birthday.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'
                      }`}
                    >
                      <span className="text-lg">
                        {birthday.gender === 'male' ? '👨' : '👩'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {birthday.first_name} {birthday.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(birthday.birth_date_gregorian).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-purple-600" dir="rtl">
                        {calculateHebrewDate(new Date(birthday.birth_date_gregorian), birthday.after_sunset || false)}
                      </p>
                    </div>
                  </div>
                  {birthday.created_by_guest && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      {t('guestAccess.guestAdded', 'נוסף על ידי אורח')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

