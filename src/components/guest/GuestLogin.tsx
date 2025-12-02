import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { guestService, GuestVerificationData } from '../../services/guest.service';
import { Button } from '../common/Button';
import { WishlistItem } from '../../types';
import { Users, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface GuestLoginProps {
  onLoginSuccess: (birthdayId: string, verification: GuestVerificationData, wishlist: WishlistItem[], firstName: string, lastName: string) => void;
  initialValues?: {
    firstName: string;
    lastName: string;
    verification: GuestVerificationData;
  } | null;
}

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
  // Simple gematria for 5700+ years
  // e.g. 5785 -> תשפ"ה
  const shortYear = year % 1000; // 785
  const hundreds = Math.floor(shortYear / 100); // 7
  const tens = Math.floor((shortYear % 100) / 10); // 8
  const units = shortYear % 10; // 5

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

// Generate year range: Current year - 120 to Current year + 5
const currentYear = new Date().getFullYear() + 3760;
const YEAR_RANGE = Array.from({ length: 126 }, (_, i) => currentYear + 5 - i);

// --- Gregorian Helpers ---
const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

const getDateString = (day: number | string, month: number | string, year: number | string): string => {
  if (!day || !month || !year) return '';
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const formattedYear = date.getFullYear();
  const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
  const formattedDay = String(date.getDate()).padStart(2, '0');
  return `${formattedYear}-${formattedMonth}-${formattedDay}`;
};

export const GuestLogin: React.FC<GuestLoginProps> = ({ onLoginSuccess, initialValues }) => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  
  const [firstName, setFirstName] = useState(initialValues?.firstName || '');
  const [lastName, setLastName] = useState(initialValues?.lastName || '');
  
  const [verificationType, setVerificationType] = useState<'gregorian' | 'hebrew'>(initialValues?.verification.type || 'gregorian');
  
  // Helper to parse gregorian date string
  const parseGregorianDate = (dateStr: string | undefined) => {
    if (!dateStr) return { day: '', month: '', year: '' };
    const [year, month, day] = dateStr.split('-');
    return { day: parseInt(day), month: parseInt(month), year: parseInt(year) };
  };

  const initialGregorian = initialValues?.verification.type === 'gregorian' 
    ? parseGregorianDate(initialValues.verification.dateString)
    : { day: '', month: '', year: '' };

  // Gregorian State
  const [gregorianDate, setGregorianDate] = useState(initialValues?.verification.dateString || '');
  const [selectedDay, setSelectedDay] = useState<number | string>(initialGregorian.day);
  const [selectedMonth, setSelectedMonth] = useState<number | string>(initialGregorian.month);
  const [selectedYear, setSelectedYear] = useState<number | string>(initialGregorian.year);
  
  // Hebrew State
  const [hebrewDay, setHebrewDay] = useState(initialValues?.verification.hebrewDay?.toString() || '1');
  const [hebrewMonth, setHebrewMonth] = useState(initialValues?.verification.hebrewMonth || 'Nisan');
  const [hebrewYear, setHebrewYear] = useState(initialValues?.verification.hebrewYear || currentYear);

  // Profiles State
  const [profiles, setProfiles] = useState<Array<{ birthdayId: string; tenantName: string }> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Info Box State
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // --- Gregorian Memos ---
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsList: number[] = [];
    for (let year = 1900; year <= currentYear; year++) {
      yearsList.push(year);
    }
    return yearsList.reverse(); // Newest to oldest
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  const days = useMemo(() => {
    if (!selectedMonth || !selectedYear) return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = getDaysInMonth(Number(selectedMonth), Number(selectedYear));
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedMonth, selectedYear]);

  // Update days when month/year changes
  useEffect(() => {
    if (!selectedMonth || !selectedYear || !selectedDay) return;
    const daysInMonth = getDaysInMonth(Number(selectedMonth), Number(selectedYear));
    if (Number(selectedDay) > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [selectedMonth, selectedYear, selectedDay]);

  // Update gregorianDate string
  useEffect(() => {
    const dateString = getDateString(selectedDay, selectedMonth, selectedYear);
    setGregorianDate(dateString);
  }, [selectedDay, selectedMonth, selectedYear]);

  const getVerificationData = (): GuestVerificationData => {
    return {
        type: verificationType,
        ...(verificationType === 'gregorian' ? {
            dateString: gregorianDate
        } : {
            hebrewDay: parseInt(hebrewDay),
            hebrewMonth: hebrewMonth,
            hebrewYear: Number(hebrewYear)
        })
    };
  };

  // Validation check
  const isValid = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return false;

    if (verificationType === 'gregorian') {
      return !!(selectedDay && selectedMonth && selectedYear);
    } else {
      return !!(hebrewDay && hebrewMonth && hebrewYear);
    }
  }, [firstName, lastName, verificationType, selectedDay, selectedMonth, selectedYear, hebrewDay, hebrewMonth, hebrewYear]);

  const handleLogin = async () => {
    if (!isValid) {
        if (!firstName.trim() || !lastName.trim()) {
            setError(t('guest.missingFields'));
        } else {
            setError(t('guest.incompleteDate'));
        }
        return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const verification = getVerificationData();
      const response = await guestService.login(firstName.trim(), lastName.trim(), verification);
      
      if (response.success) {
        if (response.multiple && response.options) {
            setProfiles(response.options);
        } else if (response.birthdayId && response.wishlist) {
            onLoginSuccess(response.birthdayId, verification, response.wishlist, firstName.trim(), lastName.trim());
        }
      } else {
        setError(t('guest.loginError'));
      }
    } catch (err: any) {
        console.error(err);
        // Handle rate limiting error specially if possible, or generic
        if (err.message?.includes('Too many attempts')) {
             setError(t('guest.rateLimitError') || 'Too many attempts. Please wait.');
        } else {
             setError(t('guest.loginError'));
        }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSelect = async (birthdayId: string) => {
      setIsLoading(true);
      setError('');
      try {
          const verification = getVerificationData();
          const response = await guestService.selectProfile(firstName.trim(), lastName.trim(), verification, birthdayId);
          
          if (response.success && response.birthdayId && response.wishlist) {
              onLoginSuccess(response.birthdayId, verification, response.wishlist, firstName.trim(), lastName.trim());
          } else {
              setError(t('guest.loginError'));
          }
      } catch (err) {
          console.error(err);
          setError(t('guest.loginError'));
      } finally {
          setIsLoading(false);
      }
  };

  const getHebrewMonths = () => isHebrew ? HEBREW_MONTHS_HE : HEBREW_MONTHS_EN;

  // --- Render Profile Selection ---
  if (profiles) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-gray-800">{t('guest.selectProfile') || 'Select Profile'}</h2>
                <p className="text-gray-500">{t('guest.multipleProfilesFound') || 'We found multiple records matching your details. Please select which list you would like to view:'}</p>
            </div>
            <div className="space-y-3">
                {profiles.map(p => (
                    <button
                        key={p.birthdayId}
                        onClick={() => handleProfileSelect(p.birthdayId)}
                        className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-lg transition-all group"
                    >
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="font-medium text-gray-700 group-hover:text-purple-700">{p.tenantName}</span>
                        </div>
                        <span className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {t('common.select')} &rarr;
                        </span>
                    </button>
                ))}
            </div>
            <button 
                onClick={() => setProfiles(null)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
                {t('guest.back') || 'Back'}
            </button>
        </div>
      );
  }

  // --- Render Login Form ---
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">{t('guest.welcome')}</h2>
        <p className="text-gray-500">{t('guest.welcomeSubtitle')}</p>
        
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3 text-start mt-2 transition-all duration-300">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 leading-relaxed">
                <span>
                    {isInfoExpanded ? t('guest.portalInfo') : t('guest.portalInfoShort')}
                </span>
                <button 
                    onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5 transition-colors whitespace-nowrap ms-1.5"
                >
                    {isInfoExpanded ? (
                        <>
                            {t('guest.readLess') || 'Show less'}
                            <ChevronUp className="w-3 h-3" />
                        </>
                    ) : (
                        <>
                            {t('guest.readMore') || 'Read more'}
                            <ChevronDown className="w-3 h-3" />
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">{t('guest.firstName')}</label>
                <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder={t('guest.firstName')}
                />
            </div>
            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">{t('guest.lastName')}</label>
                <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder={t('guest.lastName')}
                />
            </div>
        </div>

        <div className="space-y-2 pt-2">
            <label className="block text-sm font-medium text-gray-700">{t('guest.verificationMethod')}</label>
            <div className="flex p-1 bg-gray-100 rounded-lg">
                <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    verificationType === 'gregorian' ? 'bg-white shadow text-[#304FFE]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setVerificationType('gregorian')}
                >
                {t('guest.gregorianDate')}
                </button>
                <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    verificationType === 'hebrew' ? 'bg-white shadow text-[#8e24aa]' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setVerificationType('hebrew')}
                >
                {t('guest.hebrewDate')}
                </button>
            </div>
        </div>

        {verificationType === 'gregorian' ? (
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('guest.gregorianDate')}</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* Day */}
                    <div className="space-y-1">
                        <label className="block text-xs sm:text-xs text-gray-500 text-center">{t('guest.day')}</label>
                        <select
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            dir="ltr"
                        >
                            <option value="">{t('common.day')}</option>
                            {days.map((day) => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month */}
                    <div className="space-y-1">
                        <label className="block text-xs sm:text-xs text-gray-500 text-center">{t('guest.month')}</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            dir="ltr"
                        >
                            <option value="">{t('common.month')}</option>
                            {months.map((month) => {
                                const date = new Date(2000, month - 1, 1);
                                const monthName = date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', { month: 'long' });
                                return (
                                    <option key={month} value={month}>{monthName}</option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Year */}
                    <div className="space-y-1">
                        <label className="block text-xs sm:text-xs text-gray-500 text-center">{t('guest.year')}</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            dir="ltr"
                        >
                            <option value="">{t('common.year')}</option>
                            {years.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-700">{t('guest.hebrewDate')}</label>
                 <div className="grid grid-cols-3 gap-2">
                    {/* Day */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 text-center block">{t('guest.day')}</label>
                        <select 
                            value={hebrewDay} 
                            onChange={(e) => setHebrewDay(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center appearance-none"
                            dir={isHebrew ? "rtl" : "ltr"}
                        >
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>
                                    {isHebrew ? numberToHebrewLetter(d) : d}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Month */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 text-center block">{t('guest.month')}</label>
                        <select 
                            value={hebrewMonth} 
                            onChange={(e) => setHebrewMonth(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center appearance-none"
                            dir={isHebrew ? "rtl" : "ltr"}
                        >
                            {getHebrewMonths().map((m, idx) => (
                                <option key={m} value={HEBREW_MONTHS_EN[idx]}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Year */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 text-center block">{t('guest.year')}</label>
                        <select
                            value={hebrewYear}
                            onChange={(e) => setHebrewYear(Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center appearance-none"
                            dir="ltr" 
                        >
                            {YEAR_RANGE.map(y => (
                                <option key={y} value={y}>
                                    {y} {isHebrew ? `(${numberToHebrewYear(y)})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        )}

        {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                {error}
            </div>
        )}

        <Button 
            onClick={handleLogin} 
            isLoading={isLoading} 
            variant="outline"
            className="w-full !border-blue-600 !text-blue-600 hover:!bg-blue-50"
        >
            {t('guest.accessButton')}
        </Button>
      </div>
    </div>
  );
};
