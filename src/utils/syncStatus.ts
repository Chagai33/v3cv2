import { Birthday } from '../types';
import { useState, useEffect } from 'react';

/**
 * מחשב hash של הנתונים הרלוונטיים לסנכרון (SHA-256 - זהה ל-backend)
 */
export async function calculateDataHash(birthday: Birthday): Promise<string> {
  // Include all group_ids in hash (sorted for consistency)
  const groupIds = birthday.group_ids || (birthday.group_id ? [birthday.group_id] : []);
  const groupIdsStr = groupIds.sort().join(',');
  const hashData = `${birthday.first_name}|${birthday.last_name}|${birthday.notes || ''}|${groupIdsStr}|${birthday.calendar_preference_override || ''}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * בודק אם יש שינויים לא מסונכרנים (async)
 */
export async function hasUnsyncedChanges(birthday: Birthday): Promise<boolean> {
  // אם אין hash, אין סנכרון קודם - לא נציג אזהרה
  if (!birthday.syncedDataHash) {
    return false;
  }

  // אם אין eventIds, הרשומה לא מסונכרנת - לא נציג אזהרה
  if (!birthday.googleCalendarEventIds) {
    return false;
  }

  // חשב hash נוכחי והשווה ל-hash המסונכרן
  const currentHash = await calculateDataHash(birthday);
  return currentHash !== birthday.syncedDataHash;
}

/**
 * Hook לבדיקת שינויים לא מסונכרנים
 */
export function useHasUnsyncedChanges(birthday: Birthday): boolean {
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    hasUnsyncedChanges(birthday).then(setHasChanges);
  }, [birthday.syncedDataHash, birthday.googleCalendarEventIds, birthday.first_name, birthday.last_name, birthday.notes, birthday.group_ids, birthday.group_id, birthday.calendar_preference_override]);
  
  return hasChanges;
}

