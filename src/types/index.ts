export type Gender = 'male' | 'female' | 'other';

export type UserRole = 'owner' | 'admin' | 'member';

export type GroupType = 'family' | 'friends' | 'work';

export type WishlistPriority = 'high' | 'medium' | 'low';

export type CalendarPreference = 'gregorian' | 'hebrew' | 'both';

export interface Tenant {
  id: string;
  name: string;
  owner_id: string;
  default_language?: 'he' | 'en';
  timezone?: string;
  default_calendar_preference?: CalendarPreference;
  current_hebrew_year?: number;
  hebrew_year_last_updated?: string;
  is_guest_portal_enabled?: boolean;
  sharedCalendarId?: string | null;
  sharedCalendarName?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserTenantMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: UserRole;
  joined_at: string;
}

export interface AppUser {
  id: string;
  email?: string;
  phone_number?: string;
  display_name?: string;
  photo_url?: string;
  personal_calendar_view?: CalendarPreference;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  tenant_id: string;
  name: string;
  parent_id: string | null;
  is_root: boolean;
  type?: GroupType;
  color: string;
  is_guest_portal_enabled?: boolean;
  guest_access_token?: string | null;
  guest_token_expires_at?: string | null; // ISO string for token expiration (72 hours from generation)
  guest_contribution_limit?: number; // Max number of birthdays allowed per token (default: 50)
  is_guest_access_enabled?: boolean;
  calendar_preference?: CalendarPreference;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface HebrewBirthdayDate {
  gregorian: string;
  hebrewYear: number;
}

export interface Birthday {
  id: string;
  tenant_id: string;
  group_id?: string; // Deprecated: Use group_ids instead
  group_ids?: string[]; // Array of group IDs this birthday belongs to
  first_name: string;
  last_name: string;
  birth_date_gregorian: string;
  after_sunset?: boolean;
  gender?: Gender;
  birth_date_hebrew_string?: string;
  next_upcoming_hebrew_birthday?: string;
  next_upcoming_hebrew_year?: number;
  future_hebrew_birthdays?: (string | HebrewBirthdayDate)[];
  gregorian_year?: number;
  gregorian_month?: number;
  gregorian_day?: number;
  hebrew_year?: number;
  hebrew_month?: string;
  hebrew_day?: number;
  calendar_preference_override?: CalendarPreference | null;
  notes?: string;
  archived: boolean;
  googleCalendarEventId?: string | null;
  googleCalendarEventIds?: {
    gregorian?: string[];
    hebrew?: string[];
  } | null;
  lastSyncedAt?: string | null;
  googleCalendarEventsMap?: { [key: string]: string };
  isSynced?: boolean; // Added for frontend logic
  syncMetadata?: {
    status: 'SYNCED' | 'PARTIAL_SYNC' | 'ERROR' | 'PENDING';
    lastAttemptAt: string;
    failedKeys: string[];
    lastErrorMessage: string | null;
    retryCount: number;
    dataHash: string;
  };
  created_by_guest?: boolean;
  guest_token_used?: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  _systemUpdate?: boolean;  // ✅ דגל למניעת לולאה אינסופית ב-triggers
}

export interface WishlistItem {
  id: string;
  birthday_id: string;
  tenant_id: string;
  item_name: string;
  description?: string;
  priority: WishlistPriority;
  created_at: string;
  updated_at: string;
}

export interface BirthdayFormData {
  firstName: string;
  lastName: string;
  birthDateGregorian: Date | string;
  afterSunset?: boolean;
  gender?: Gender;
  groupId?: string; // Deprecated
  groupIds: string[];
  calendarPreferenceOverride?: CalendarPreference | null;
  notes?: string;
}

export interface HebcalResponse {
  hebrew: string;
  events?: Array<{
    date: string;
    hebrew: string;
  }>;
}

export interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: any) => void;
}

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<AppUser>) => Promise<void>;
}

export interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: Tenant[];
  loading: boolean;
  switchTenant: (tenantId: string) => void;
  createTenant: (name: string) => Promise<string>;
  updateTenant: (tenantId: string, data: Partial<Tenant>) => Promise<void>;
  inviteUserToTenant: (email: string, role: UserRole) => Promise<void>;
}

export interface DashboardStats {
  totalBirthdays: number;
  upcomingThisMonth: number;
  upcomingThisWeek: number;
  maleCount: number;
  femaleCount: number;
  groupCounts?: Record<string, number>;
}

export interface BirthdayFilter {
  searchTerm?: string;
  groupIds?: string[];
  gender?: Gender | 'all';
  sortBy?: 'upcoming' | 'upcoming-latest' | 'name-az' | 'name-za' | 'birthday-oldest' | 'birthday-newest' | 'age-youngest' | 'age-oldest';
}

export interface BirthdayCalculations {
  currentGregorianAge: number;
  currentHebrewAge: number;
  nextGregorianBirthday: Date;
  ageAtNextGregorianBirthday: number;
  nextHebrewBirthday: Date | null;
  ageAtNextHebrewBirthday: number;
  daysUntilGregorianBirthday: number;
  daysUntilHebrewBirthday: number | null;
  nextBirthdayType: 'gregorian' | 'hebrew' | 'same';
}

export interface EnrichedBirthday extends Birthday {
  calculations: BirthdayCalculations;
  effectivePreference: CalendarPreference;
}

export interface CSVBirthdayRow {
  firstName: string;
  lastName: string;
  birthDate: string;
  afterSunset: boolean;
  gender?: Gender;
  groupId?: string;
  groupIds?: string[];
  notes?: string;
  calendarPreference?: CalendarPreference;
  validationErrors?: string[];
  warnings?: string[];
  isDuplicate?: boolean;
  // For text import - preserve original line info
  originalLine?: string;
  lineNumber?: number;
}

export interface ValidationResult {
  index: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

export interface CreatedCalendar {
  calendarId: string;
  calendarName: string;
  createdAt: string;
}

export interface GoogleCalendarToken {
  id: string;
  userId: string;
  accessToken: string;
  expiresAt: number;
  scope: string;
  userEmail?: string;
  calendarId?: string;
  calendarName?: string;
  createdCalendars?: CreatedCalendar[];
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendarSyncStatus {
  isConnected: boolean;
  lastSyncTime: string | null;
  syncedBirthdaysCount: number;
  userEmail?: string;
  calendarId?: string;
  calendarName?: string;
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  eventIds?: {
    gregorian?: string[];
    hebrew?: string[];
  };
  error?: string;
  birthdayId: string;
}

export interface BulkSyncResult {
  totalAttempted: number;
  successCount?: number;
  failureCount?: number;
  results?: SyncResult[];
  status?: 'queued' | 'completed';
  message?: string;
}

export interface PreviewDeletionSummary {
  name: string;
  hebrewEvents: number;
  gregorianEvents: number;
}

export interface PreviewDeletionResult {
  success: boolean;
  summary: PreviewDeletionSummary[];
  recordsCount?: number;
  totalCount: number;
  calendarId?: string;   // Added
  calendarName?: string; // Added
}

export interface CleanupOrphansResult {
  success: boolean;
  deletedCount: number;
  foundCount?: number; // Added
  failedCount: number;
  calendarName?: string; // Added
  message: string;
}

export interface SyncHistoryItem {
  id?: string;
  type: 'BATCH' | 'SINGLE';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  timestamp: number;
  total: number;
  successCount: number;
  failedCount: number;
  failedItems: Array<{ name: string; reason: string }>;
}

export interface GoogleCalendarStatus {
  isConnected: boolean;
  email: string;
  name: string;
  picture: string;
  calendarId: string;
  calendarName: string;
  syncStatus: 'IDLE' | 'IN_PROGRESS' | 'DELETING';
  lastSyncStart: number;
  recentActivity: SyncHistoryItem[];
}

export interface GoogleCalendarContextType {
  isConnected: boolean;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  userEmail: string | null;
  calendarId: string | null;
  calendarName: string | null;
  isPrimaryCalendar: boolean; // Added
  syncStatus: 'IDLE' | 'IN_PROGRESS' | 'DELETING'; // Added
  recentActivity: SyncHistoryItem[]; // Added
  connectToGoogle: () => Promise<void>;
  syncSingleBirthday: (birthdayId: string) => Promise<SyncResult>;
  syncMultipleBirthdays: (birthdayIds: string[]) => Promise<BulkSyncResult>;
  removeBirthdayFromCalendar: (birthdayId: string) => Promise<void>;
  deleteAllSyncedEvents: (tenantId: string, forceDBOnly?: boolean) => Promise<{ success: boolean; message: string }>; // Updated to async job response
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  createCalendar: (name: string) => Promise<{ calendarId: string; calendarName: string }>;
  updateCalendarSelection: (calendarId: string, calendarName: string) => Promise<void>;
  listCalendars: () => Promise<Array<{ id: string; summary: string; description: string; primary: boolean }>>;
  deleteCalendar: (calendarId: string) => Promise<void>;
  cleanupOrphanEvents: (tenantId: string, dryRun?: boolean) => Promise<CleanupOrphansResult>;
  previewDeletion: (tenantId: string) => Promise<PreviewDeletionResult>;
  resetBirthdaySyncData: (birthdayId: string) => Promise<void>; // Added
}

// Export GELT types
export * from './gelt';
