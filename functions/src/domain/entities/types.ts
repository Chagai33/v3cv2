// Domain Types - העתקה מדויקת מהקוד המקורי

export interface CalendarEventsMap {
  [key: string]: string; // e.g., "gregorian_2025": "eventId123"
}

export interface SyncEvent {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  extendedProperties?: {
    private: { [key: string]: string };
  };
  reminders?: {
    useDefault: boolean;
    overrides: { method: string; minutes: number }[];
  };
  _type: 'gregorian' | 'hebrew';
  _year?: number; // Used for map key generation
}

export interface BirthdayData {
  id: string;
  tenant_id: string;
  group_ids?: string[];
  group_id?: string;
  first_name: string;
  last_name: string;
  birth_date_gregorian: string;
  after_sunset?: boolean;
  gender?: string;
  birth_date_hebrew_string?: string | null;
  birth_date_hebrew_year?: number;
  birth_date_hebrew_month?: string;
  birth_date_hebrew_day?: number;
  next_upcoming_hebrew_birthday?: string | null;
  next_upcoming_hebrew_year?: number | null;
  future_hebrew_birthdays?: Array<{ gregorian: string; hebrewYear: number }>;
  gregorian_year?: number;
  gregorian_month?: number;
  gregorian_day?: number;
  hebrew_year?: number;
  hebrew_month?: string;
  hebrew_day?: number;
  calendar_preference_override?: string | null;
  notes?: string;
  archived?: boolean;
  googleCalendarEventId?: string | null;
  googleCalendarEventIds?: any | null;
  googleCalendarEventsMap?: CalendarEventsMap;
  isSynced?: boolean;
  syncMetadata?: {
    status?: string;
    lastAttemptAt?: string;
    failedKeys?: string[];
    lastErrorMessage?: string | null;
    retryCount?: number;
    dataHash?: string;
  };
  lastSyncedAt?: any;
  created_at?: any;
  created_by?: string;
  updated_at?: any;
  updated_by?: string;
  _systemUpdate?: boolean;  // ✅ דגל למניעת לולאה אינסופית ב-triggers
}

export interface TenantData {
  owner_id?: string;
  name?: string;
  default_language?: string;
  default_calendar_preference?: string;
  created_at?: any;
  is_guest_portal_enabled?: boolean;
}

export interface GroupData {
  name: string;
  parentName?: string;
  parent_id?: string;
  tenant_id?: string;
  is_guest_portal_enabled?: boolean;
}

export interface WishlistItem {
  id?: string;
  birthday_id: string;
  tenant_id: string;
  item_name: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  created_at?: any;
  updated_at?: any;
}

export interface TokenData {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  calendarId?: string;
  calendarName?: string;
  syncStatus?: string;
  createdCalendars?: Array<{ calendarId: string; calendarName: string; createdAt: string }>;
  lastSyncStart?: any;
  updatedAt?: any;
}

export interface HebcalData {
  hebrew: string;
  hy: number;
  hm: string;
  hd: number;
}

export interface NextHebrewBirthday {
  gregorianDate: Date;
  hebrewYear: number;
}
