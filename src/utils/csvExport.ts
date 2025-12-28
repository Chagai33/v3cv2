import { Birthday, Group, WishlistItem, BirthdayCalculations } from '../types';
import { wishlistService } from '../services/wishlist.service';
import { zodiacService } from '../services/zodiac.service';
import { birthdayCalculationsService } from '../services/birthdayCalculations.service';

// פונקציות תרגום מזלות
function getZodiacSignNameEn(sign: string): string {
  const signNames: { [key: string]: string } = {
    'aries': 'Aries',
    'taurus': 'Taurus',
    'gemini': 'Gemini',
    'cancer': 'Cancer',
    'leo': 'Leo',
    'virgo': 'Virgo',
    'libra': 'Libra',
    'scorpio': 'Scorpio',
    'sagittarius': 'Sagittarius',
    'capricorn': 'Capricorn',
    'aquarius': 'Aquarius',
    'pisces': 'Pisces'
  };
  return signNames[sign] || sign;
}

function getZodiacSignNameHe(sign: string): string {
  const signNames: { [key: string]: string } = {
    'aries': 'טלה',
    'taurus': 'שור',
    'gemini': 'תאומים',
    'cancer': 'סרטן',
    'leo': 'אריה',
    'virgo': 'בתולה',
    'libra': 'מאזניים',
    'scorpio': 'עקרב',
    'sagittarius': 'קשת',
    'capricorn': 'גדי',
    'aquarius': 'דלי',
    'pisces': 'דגים'
  };
  return signNames[sign] || sign;
}

function formatPriority(priority: string, language: string): string {
  if (language === 'he') {
    const priorityMap: { [key: string]: string } = {
      'high': 'גבוהה',
      'medium': 'בינונית',
      'low': 'נמוכה'
    };
    return priorityMap[priority] || priority;
  } else {
    const priorityMap: { [key: string]: string } = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return priorityMap[priority] || priority;
  }
}

function formatWishlist(wishlistItems: WishlistItem[], language: string): string {
  if (!wishlistItems || wishlistItems.length === 0) {
    return '';
  }
  
  const priorityLabel = language === 'he' ? 'עדיפות' : 'Priority';
  return wishlistItems
    .map(item => `${item.item_name} (${priorityLabel}: ${formatPriority(item.priority, language)})`)
    .join('; ');
}

export async function exportBirthdaysToCSV(
  birthdays: Birthday[], 
  groups: Group[],
  tenantId: string,
  filename: string = 'birthdays.csv', 
  language: string = 'en'
) {
  const headers = language === 'he' ? [
    'מזהה רשומה',
    'שם פרטי',
    'שם משפחה',
    'תאריך לידה לועזי',
    'אחרי שקיעה',
    'מגדר',
    'מזל לועזי',
    'תאריך לידה עברי',
    'מזל עברי',
    'שנה עברית',
    'יום הולדת עברי הבא',
    'יום הולדת לועזי הבא',
    'שם קבוצה',
    'מזהה קבוצה',
    'הערות',
    'העדפת לוח שנה - קבוצה',
    'העדפת לוח שנה - רשומה',
    'רשימת משאלות'
  ] : [
    'Record ID',
    'First Name',
    'Last Name',
    'Birth Date (Gregorian)',
    'After Sunset',
    'Gender',
    'Gregorian Zodiac Sign',
    'Hebrew Date',
    'Hebrew Zodiac Sign',
    'Hebrew Year',
    'Next Hebrew Birthday',
    'Next Gregorian Birthday',
    'Group Name',
    'Group ID',
    'Notes',
    'Calendar Preference - Group',
    'Calendar Preference - Record',
    'Wishlist'
  ];

  // טעינת wishlist items לכל הרשומות (מקבילית)
  const wishlistPromises = birthdays.map(birthday => 
    wishlistService.getItemsForBirthday(birthday.id, tenantId).catch(() => [])
  );
  const wishlistsArray = await Promise.all(wishlistPromises);
  const wishlistsMap = new Map<string, WishlistItem[]>();
  birthdays.forEach((birthday, index) => {
    wishlistsMap.set(birthday.id, wishlistsArray[index]);
  });

  // יצירת מפה של groups לפי ID
  const groupsMap = new Map<string, Group>();
  groups.forEach(group => {
    groupsMap.set(group.id, group);
  });

  const rows = await Promise.all(birthdays.map(async (birthday) => {
    // חישוב מזלות - נסה להשתמש ב-calculations אם קיים, אחרת חשב ישירות
    let gregorianSign = '';
    let hebrewSign = '';
    
    // בדיקה אם יש enriched birthday עם calculations
    const enrichedBirthday = birthday as any;
    if (enrichedBirthday.calculations) {
      const calculations = enrichedBirthday.calculations as BirthdayCalculations;
      gregorianSign = calculations.gregorianSign || '';
      hebrewSign = calculations.hebrewSign || '';
    }
    
    // אם אין calculations, חשב ישירות
    if (!gregorianSign) {
      try {
        gregorianSign = zodiacService.getGregorianSign(new Date(birthday.birth_date_gregorian));
      } catch (e) {
        gregorianSign = '';
      }
    }
    
    if (!hebrewSign && birthday.hebrew_month) {
      hebrewSign = zodiacService.getHebrewSign(birthday.hebrew_month);
    }

    // תרגום מזלות לפי שפה
    const gregorianSignName = gregorianSign 
      ? (language === 'he' ? getZodiacSignNameHe(gregorianSign) : getZodiacSignNameEn(gregorianSign))
      : '';
    const hebrewSignName = hebrewSign 
      ? (language === 'he' ? getZodiacSignNameHe(hebrewSign) : getZodiacSignNameEn(hebrewSign))
      : '';

    // חישוב יום הולדת לועזי הבא
    let nextGregorianStr = '';
    if (enrichedBirthday.calculations?.nextGregorianBirthday) {
      const date = enrichedBirthday.calculations.nextGregorianBirthday;
      if (date instanceof Date) {
        nextGregorianStr = date.toISOString().split('T')[0];
      } else if (typeof date === 'string') {
        nextGregorianStr = date.split('T')[0];
      }
    } else {
      // חישוב ישיר אם אין calculations
      const calculations = birthdayCalculationsService.calculateAll(birthday, new Date());
      if (calculations.nextGregorianBirthday) {
        nextGregorianStr = calculations.nextGregorianBirthday.toISOString().split('T')[0];
      }
    }

    // מציאת כל הקבוצות
    const groupIds = birthday.group_ids || (birthday.group_id ? [birthday.group_id] : []);
    const groupNames: string[] = [];
    let groupCalendarPreference = '';
    
    groupIds.forEach(groupId => {
      const group = groupsMap.get(groupId);
      if (group) {
        groupNames.push(group.name);
        // Use first group's calendar preference (or could merge logic)
        if (!groupCalendarPreference) {
          groupCalendarPreference = group.calendar_preference || '';
        }
      }
    });
    
    const groupName = groupNames.join(', '); // Join multiple group names

    // קבלת wishlist
    const wishlistItems = wishlistsMap.get(birthday.id) || [];
    const wishlistStr = formatWishlist(wishlistItems, language);

    // תרגום העדפת לוח שנה
    const translateCalendarPreference = (pref: string | null | undefined): string => {
      if (!pref) return '';
      if (language === 'he') {
        const prefMap: { [key: string]: string } = {
          'gregorian': 'לועזי',
          'hebrew': 'עברי',
          'both': 'שניהם'
        };
        return prefMap[pref] || pref;
      } else {
        return pref;
      }
    };

    return [
      birthday.id || '',
      birthday.first_name || '',
      birthday.last_name || '',
      birthday.birth_date_gregorian || '',
      birthday.after_sunset ? (language === 'he' ? 'כן' : 'Yes') : (language === 'he' ? 'לא' : 'No'),
      birthday.gender || '',
      gregorianSignName,
      (birthday.birth_date_hebrew_string || '').replace(/"/g, '""'),
      hebrewSignName,
      birthday.hebrew_year?.toString() || '',
      birthday.next_upcoming_hebrew_birthday || '',
      nextGregorianStr,
      groupName,
      groupIds.join(', '), // Export all group IDs
      (birthday.notes || '').replace(/"/g, '""'),
      translateCalendarPreference(groupCalendarPreference),
      translateCalendarPreference(birthday.calendar_preference_override),
      wishlistStr.replace(/"/g, '""')
    ];
  }));

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export interface CSVBirthdayData {
  firstName: string;
  lastName: string;
  birthDate: string;
  afterSunset: boolean;
  gender?: 'male' | 'female' | 'other';
  groupId?: string;
  groupName?: string;
  notes?: string;
  calendarPreference?: 'gregorian' | 'hebrew' | 'both';
  wishlist?: string;
  // For text import validation
  warning?: 'no_date' | 'invalid_name' | 'invalid_date';
  warningMessage?: string;
  originalLine?: string;
  lineNumber?: number;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getColumnValue(row: any, ...possibleNames: string[]): string {
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    if (row[normalizedName]) {
      return row[normalizedName];
    }
  }
  return '';
}

export function parseCSVFile(csvText: string): CSVBirthdayData[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => normalizeHeader(h));
  const data: CSVBirthdayData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      row[header] = value;
    });

    const firstName = getColumnValue(
      row,
      'first name',
      'firstname',
      'first',
      'name',
      'שם פרטי',
      'שם'
    );

    const lastName = getColumnValue(
      row,
      'last name',
      'lastname',
      'last',
      'surname',
      'family name',
      'שם משפחה',
      'משפחה'
    );

    const birthDate = getColumnValue(
      row,
      'birth date (gregorian)',
      'birth date',
      'birthdate',
      'birthday',
      'date of birth',
      'dob',
      'date',
      'תאריך לידה',
      'תאריך לידה לועזי',
      'יום הולדת',
      'תאריך'
    );

    if (!firstName || !birthDate) continue;

    const afterSunsetValue = getColumnValue(
      row,
      'after sunset',
      'aftersunset',
      'sunset',
      'אחרי שקיעה',
      'שקיעה'
    ).toLowerCase();

    const genderValue = getColumnValue(
      row,
      'gender',
      'sex',
      'מגדר',
      'מין'
    ).toLowerCase();

    const calPrefValue = getColumnValue(
      row,
      'calendar preference',
      'calendarpreference',
      'calendar',
      'העדפת לוח שנה',
      'לוח שנה'
    ).toLowerCase();

    const notes = getColumnValue(
      row,
      'notes',
      'note',
      'comment',
      'comments',
      'הערות',
      'הערה'
    );

    const groupId = getColumnValue(
      row,
      'group id',
      'groupid',
      'group',
      'קבוצה',
      'מזהה קבוצה'
    );

    const groupName = getColumnValue(
      row,
      'group name',
      'groupname',
      'שם קבוצה'
    );

    const wishlist = getColumnValue(
      row,
      'wishlist',
      'רשימת משאלות',
      'רשימת משאלות'
    );

    data.push({
      firstName,
      lastName,
      birthDate,
      afterSunset: afterSunsetValue === 'yes' ||
                   afterSunsetValue === 'true' ||
                   afterSunsetValue === '1' ||
                   afterSunsetValue === 'כן',
      gender: genderValue === 'male' || genderValue === 'זכר' || genderValue === 'ז'
        ? 'male'
        : genderValue === 'female' || genderValue === 'נקבה' || genderValue === 'נ'
        ? 'female'
        : genderValue === 'other' || genderValue === 'אחר'
        ? 'other'
        : undefined,
      groupId: groupId || undefined,
      groupName: groupName || undefined,
      notes: notes || undefined,
      calendarPreference: calPrefValue === 'gregorian' || calPrefValue === 'לועזי'
        ? 'gregorian'
        : calPrefValue === 'hebrew' || calPrefValue === 'עברי'
        ? 'hebrew'
        : calPrefValue === 'both' || calPrefValue === 'שניהם'
        ? 'both'
        : undefined,
      wishlist: wishlist || undefined
    });
  }

  return data;
}
