import { CSVBirthdayData } from './csvExport';

/**
 * Text Parser for Free-Text Birthday Lists
 * Supports multiple date formats and Hebrew naming conventions
 * 
 * Supported Date Formats:
 * - DD/MM/YYYY (e.g., 15/03/1990)
 * - DD.MM.YYYY (e.g., 15.03.1990)
 * - DD.MM.YY (e.g., 15.03.90)
 * - YYYY-MM-DD (e.g., 1990-03-15)
 * - DD-MM-YYYY (e.g., 15-03-1990)
 * - DD/MM/YY (e.g., 15/03/90)
 * - YYYY/MM/DD (e.g., 1990/03/15)
 */

interface DateMatch {
  fullMatch: string;
  date: string;
  format: string;
  position: number;
}

// Common Hebrew titles to strip from names
const HEBREW_TITLES = [
  'הרב',
  'רב',
  'מר',
  'מרת',
  'גב\'',
  'גברת',
  'ד"ר',
  'דר\'',
  'פרופ\'',
  'פרופסור',
  'מורה',
  'רבי',
];

// Keywords indicating "after sunset"
const AFTER_SUNSET_KEYWORDS = [
  'בלילה',
  'ערב',
  'שקיעה',
  'אחרי שקיעה',
  'אחה"צ',
  'pm',
  'לילה',
  'אחרי השקיעה',
  'בערב',
  'כן', // "כן" מתייחס ל-afterSunset
  'yes',
];

// Common two-part last name prefixes in Hebrew
const TWO_PART_SURNAME_PREFIXES = [
  'בן',
  'בר',
  'אבן',
  'אבו',
  'אל',
  'דה',
  'די',
  'לה',
  'ון',
  'ולה',
];

// Gender keywords
// Note: "בן"/"בר"/"בת" are NOT gender keywords - they are part of names or patronymics
const GENDER_KEYWORDS = {
  male: [
    'זכר',
    'ז',
    'male',
    'm',
    'boy',
  ],
  female: [
    'נקבה',
    'נ',
    'female',
    'f',
    'girl',
  ],
};

/**
 * Comprehensive date extraction patterns
 * Order matters - more specific patterns should come first
 */
const DATE_PATTERNS: Array<{ regex: RegExp; format: string }> = [
  // ISO format: YYYY-MM-DD
  {
    regex: /\b(19\d{2}|20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g,
    format: 'YYYY-MM-DD',
  },
  // DD/MM/YYYY or DD.MM.YYYY
  {
    regex: /\b(0[1-9]|[12]\d|3[01])[\/\.](0[1-9]|1[0-2])[\/\.](19\d{2}|20\d{2})\b/g,
    format: 'DD/MM/YYYY',
  },
  // DD-MM-YYYY
  {
    regex: /\b(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-(19\d{2}|20\d{2})\b/g,
    format: 'DD-MM-YYYY',
  },
  // YYYY/MM/DD
  {
    regex: /\b(19\d{2}|20\d{2})\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\b/g,
    format: 'YYYY/MM/DD',
  },
  // DD/MM/YY or DD.MM.YY (2-digit year)
  {
    regex: /\b(0[1-9]|[12]\d|3[01])[\/\.](0[1-9]|1[0-2])[\/\.](\d{2})\b/g,
    format: 'DD/MM/YY',
  },
  // Flexible DD/MM/YYYY (single digit day/month)
  {
    regex: /\b(\d{1,2})[\/\.](\d{1,2})[\/\.](19\d{2}|20\d{2})\b/g,
    format: 'D/M/YYYY',
  },
  // Flexible DD/MM/YY (single digit day/month, 2-digit year)
  {
    regex: /\b(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2})\b/g,
    format: 'D/M/YY',
  },
];

/**
 * Convert 2-digit year to 4-digit year
 * Assumes years 00-30 are 2000-2030, and 31-99 are 1931-1999
 */
function expandTwoDigitYear(year: string): string {
  const yearNum = parseInt(year, 10);
  if (yearNum <= 30) {
    return `20${year.padStart(2, '0')}`;
  }
  return `19${year.padStart(2, '0')}`;
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(match: string, format: string): string {
  try {
    let year: string, month: string, day: string;

    switch (format) {
      case 'YYYY-MM-DD':
        return match; // Already in correct format
      
      case 'DD/MM/YYYY':
      case 'DD-MM-YYYY': {
        const separator = match.includes('/') ? '/' : match.includes('.') ? '.' : '-';
        const parts = match.split(separator);
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = parts[2];
        break;
      }
      
      case 'YYYY/MM/DD': {
        const parts = match.split('/');
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
        break;
      }
      
      case 'DD/MM/YY': {
        const separator = match.includes('/') ? '/' : '.';
        const parts = match.split(separator);
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = expandTwoDigitYear(parts[2]);
        break;
      }
      
      case 'D/M/YYYY': {
        const separator = match.includes('/') ? '/' : '.';
        const parts = match.split(separator);
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = parts[2];
        break;
      }
      
      case 'D/M/YY': {
        const separator = match.includes('/') ? '/' : '.';
        const parts = match.split(separator);
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = expandTwoDigitYear(parts[2]);
        break;
      }
      
      default:
        return match;
    }

    return `${year}-${month}-${day}`;
  } catch (error) {
    return match;
  }
}

/**
 * Extract date from a line of text
 * Returns the date and the remaining text
 */
function extractDate(line: string): DateMatch | null {
  for (const { regex, format } of DATE_PATTERNS) {
    const matches = Array.from(line.matchAll(regex));
    if (matches.length > 0) {
      const match = matches[0];
      return {
        fullMatch: match[0],
        date: normalizeDate(match[0], format),
        format,
        position: match.index || 0,
      };
    }
  }
  return null;
}

/**
 * Extract text in parentheses for notes
 */
function extractNotes(text: string): { notes: string; cleanText: string } {
  const parenthesesPattern = /\(([^)]+)\)/g;
  const matches = Array.from(text.matchAll(parenthesesPattern));
  
  if (matches.length === 0) {
    return { notes: '', cleanText: text };
  }

  const notes = matches.map(m => m[1]).join('; ');
  const cleanText = text.replace(parenthesesPattern, '').trim();
  
  return { notes, cleanText };
}

/**
 * Check if text contains "after sunset" indicators
 */
function detectAfterSunset(text: string): boolean {
  const lowerText = text.toLowerCase();
  return AFTER_SUNSET_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * Detect gender from text
 * Returns 'male', 'female', or undefined if not found
 */
function detectGender(text: string): 'male' | 'female' | undefined {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  // Check for male keywords
  for (const keyword of GENDER_KEYWORDS.male) {
    if (words.includes(keyword.toLowerCase())) {
      return 'male';
    }
  }
  
  // Check for female keywords
  for (const keyword of GENDER_KEYWORDS.female) {
    if (words.includes(keyword.toLowerCase())) {
      return 'female';
    }
  }
  
  return undefined;
}

/**
 * Strip common titles from name
 */
function stripTitles(text: string): string {
  let cleaned = text;
  for (const title of HEBREW_TITLES) {
    // Remove title at the beginning
    const titlePattern = new RegExp(`^${title}\\s+`, 'i');
    cleaned = cleaned.replace(titlePattern, '');
  }
  return cleaned.trim();
}

/**
 * Parse names according to Hebrew naming conventions
 * - If 1 word: firstName only
 * - If 2 words: firstName + lastName
 * - If 3+ words: check for two-part surnames (e.g., "בן ברוך", "אבו חצירה")
 * 
 * Note: We treat "בן"/"בר" as part of names (e.g., "בן ציון", "בר כוכבא")
 * not as patronymics, since we're importing name lists, not genealogies.
 */
function parseNames(text: string): { firstName: string; lastName: string } {
  const cleaned = stripTitles(text).trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (words.length === 1) {
    return { firstName: words[0], lastName: '' };
  }

  if (words.length === 2) {
    return { firstName: words[0], lastName: words[1] };
  }

  // 3+ words: check for two-part surnames
  // If second-to-last word is a known surname prefix (e.g., "בן", "אבו")
  // treat last two words as surname
  if (words.length >= 3) {
    const secondToLast = words[words.length - 2].toLowerCase();
    if (TWO_PART_SURNAME_PREFIXES.includes(secondToLast)) {
      // Two-part surname: "אורית בן ברוך" → firstName: "אורית", lastName: "בן ברוך"
      const lastName = words.slice(-2).join(' ');
      const firstName = words.slice(0, -2).join(' ');
      return { firstName: firstName || words[0], lastName };
    }
  }

  // Default: last word is surname, rest is first name
  const lastName = words[words.length - 1];
  const firstName = words.slice(0, -1).join(' ');
  return { firstName, lastName };
}

/**
 * Parse a single line of text into birthday data
 */
function parseLine(line: string): CSVBirthdayData | null {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return null;
  }

  // Extract date
  const dateMatch = extractDate(trimmedLine);
  if (!dateMatch) {
    // No valid date found, skip this line
    return null;
  }

  // Remove the date from the text
  let remainingText = trimmedLine.substring(0, dateMatch.position) + 
                      trimmedLine.substring(dateMatch.position + dateMatch.fullMatch.length);
  remainingText = remainingText.trim();

  // Detect gender and after sunset BEFORE removing anything
  const gender = detectGender(remainingText);
  const afterSunset = detectAfterSunset(remainingText);

  // Remove multi-word phrases first (like "אחרי שקיעה", "אחרי השקיעה")
  const multiWordKeywords = AFTER_SUNSET_KEYWORDS.filter(k => k.includes(' '));
  for (const keyword of multiWordKeywords) {
    const regex = new RegExp(keyword, 'gi');
    remainingText = remainingText.replace(regex, ' ');
  }
  
  // Split into words and filter out single-word keywords
  let words = remainingText.split(/\s+/).filter(w => w.trim());
  
  // Remove single-word after sunset keywords
  const singleWordAfterSunset = AFTER_SUNSET_KEYWORDS
    .filter(k => !k.includes(' '))
    .map(k => k.toLowerCase());
  words = words.filter(word => !singleWordAfterSunset.includes(word.toLowerCase()));
  
  // Remove gender keywords (זכר, נקבה, male, female, etc.)
  // Note: "בן"/"בר"/"בת" are NOT in gender keywords - they're part of names
  const allGenderKeywords = [...GENDER_KEYWORDS.male, ...GENDER_KEYWORDS.female]
    .map(k => k.toLowerCase());
  words = words.filter(word => !allGenderKeywords.includes(word.toLowerCase()));
  
  remainingText = words.join(' ').trim();

  // Extract notes from parentheses (after removing keywords)
  const { notes, cleanText } = extractNotes(remainingText);

  // Parse names from clean text
  const { firstName, lastName } = parseNames(cleanText);

  if (!firstName) {
    // No name found, skip this line
    return null;
  }

  return {
    firstName,
    lastName,
    birthDate: dateMatch.date,
    afterSunset,
    gender,
    notes: notes || undefined,
  };
}

/**
 * Main function: Parse free-text birthday list
 * @param text - Raw text input (from WhatsApp, notes, etc.)
 * @returns Array of parsed birthday data
 */
export function parseFreeText(text: string): CSVBirthdayData[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const lines = text.split('\n');
  const results: CSVBirthdayData[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Get a report of supported date formats for documentation
 */
export function getDateFormatReport(): Array<{ format: string; example: string; description: string }> {
  return [
    {
      format: 'YYYY-MM-DD',
      example: '1990-03-15',
      description: 'ISO 8601 format (most precise)',
    },
    {
      format: 'DD/MM/YYYY',
      example: '15/03/1990',
      description: 'European format with slashes',
    },
    {
      format: 'DD.MM.YYYY',
      example: '15.03.1990',
      description: 'European format with dots',
    },
    {
      format: 'DD-MM-YYYY',
      example: '15-03-1990',
      description: 'European format with dashes',
    },
    {
      format: 'DD/MM/YY',
      example: '15/03/90',
      description: '2-digit year format (00-30 → 2000-2030, 31-99 → 1931-1999)',
    },
    {
      format: 'DD.MM.YY',
      example: '15.03.90',
      description: '2-digit year format with dots',
    },
    {
      format: 'D/M/YYYY',
      example: '5/3/1990',
      description: 'Flexible format (single digit day/month)',
    },
    {
      format: 'D/M/YY',
      example: '5/3/90',
      description: 'Flexible format with 2-digit year',
    },
  ];
}

