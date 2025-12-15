import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Birthday, BirthdayFormData } from '../types';
import { retryFirestoreOperation } from './firestore.retry';

export const birthdayService = {
  async createBirthday(
    tenantId: string,
    data: BirthdayFormData,
    userId: string
  ): Promise<string> {
    return retryFirestoreOperation(async () => {
      const birthDate = data.birthDateGregorian;

      let birthDateString: string;
      let year: number;
      let month: number;
      let day: number;

      if (typeof birthDate === 'string') {
        // Already in YYYY-MM-DD format from CSV
        birthDateString = birthDate;
        const [y, m, d] = birthDate.split('-').map(Number);
        year = y;
        month = m;
        day = d;
      } else {
        // Date object from form
        birthDateString = birthDate.toISOString().split('T')[0];
        year = birthDate.getFullYear();
        month = birthDate.getMonth() + 1;
        day = birthDate.getDate();
      }

      const birthdayRef = await addDoc(collection(db, 'birthdays'), {
        tenant_id: tenantId,
        group_ids: data.groupIds || (data.groupId ? [data.groupId] : []),
        group_id: data.groupId || (data.groupIds && data.groupIds.length > 0 ? data.groupIds[0] : null),
        first_name: data.firstName,
        last_name: data.lastName,
        birth_date_gregorian: birthDateString,
        after_sunset: data.afterSunset ?? false,
        gender: data.gender,
        gregorian_year: year,
        gregorian_month: month,
        gregorian_day: day,
        calendar_preference_override: data.calendarPreferenceOverride || null,
        notes: data.notes || '',
        archived: false,
        created_by: userId,
        updated_by: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        birth_date_hebrew_string: null,
        next_upcoming_hebrew_birthday: null,
        future_hebrew_birthdays: [],
      });

      return birthdayRef.id;
    });
  },

  async updateBirthday(
    birthdayId: string,
    data: Partial<BirthdayFormData>,
    userId: string
  ): Promise<void> {
    const updateData: any = {
      updated_by: userId,
      updated_at: serverTimestamp(),
    };

    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    
    // בדיקה אם התאריך או afterSunset השתנו - אם כן, צריך לאפס את הנתונים העבריים
    let shouldResetHebrewData = false;
    let currentData: any = null;
    
    if (data.birthDateGregorian !== undefined || data.afterSunset !== undefined) {
      // קוראים את המסמך הנוכחי פעם אחת לבדיקת שני השדות
      const currentDoc = await getDoc(doc(db, 'birthdays', birthdayId));
      currentData = currentDoc.data();
    }
    
    if (data.birthDateGregorian !== undefined) {
      const currentBirthDate = currentData?.birth_date_gregorian;
      
      let newBirthDateString: string;
      if (typeof data.birthDateGregorian === 'string') {
        newBirthDateString = data.birthDateGregorian;
      } else {
        newBirthDateString = data.birthDateGregorian.toISOString().split('T')[0];
      }

      // אם התאריך השתנה, עדכן ואפס את הנתונים העבריים
      if (currentBirthDate !== newBirthDateString) {
        const birthDate = data.birthDateGregorian;

        if (typeof birthDate === 'string') {
          // Already in YYYY-MM-DD format
          updateData.birth_date_gregorian = birthDate;
          const [y, m, d] = birthDate.split('-').map(Number);
          updateData.gregorian_year = y;
          updateData.gregorian_month = m;
          updateData.gregorian_day = d;
        } else {
          // Date object from form
          updateData.birth_date_gregorian = birthDate.toISOString().split('T')[0];
          updateData.gregorian_year = birthDate.getFullYear();
          updateData.gregorian_month = birthDate.getMonth() + 1;
          updateData.gregorian_day = birthDate.getDate();
        }

        shouldResetHebrewData = true;
      }
      // אם התאריך לא השתנה, לא נעשה כלום - הנתונים העבריים נשמרים
    }
    
    if (data.afterSunset !== undefined) {
      const currentAfterSunset = currentData?.after_sunset ?? false;
      const newAfterSunset = data.afterSunset ?? false;
      
      // תמיד שלח את הערך המנורמל (כדי למנוע undefined)
      updateData.after_sunset = newAfterSunset;
      
      // אם afterSunset השתנה, צריך לאפס את הנתונים העבריים
      if (currentAfterSunset !== newAfterSunset) {
        shouldResetHebrewData = true;
      }
    }
    
    // אם אחד מהשדות הרלוונטיים השתנה, אפס את הנתונים העבריים
    if (shouldResetHebrewData) {
      updateData.birth_date_hebrew_string = null;
      updateData.next_upcoming_hebrew_birthday = null;
      updateData.future_hebrew_birthdays = [];
    }
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.groupIds !== undefined) {
      updateData.group_ids = data.groupIds;
      // Update backward compatibility field
      updateData.group_id = data.groupIds.length > 0 ? data.groupIds[0] : null;
    } else if (data.groupId !== undefined) {
      // Fallback if only groupId provided (should not happen with new UI)
      updateData.group_id = data.groupId || null;
      if (data.groupId) {
        updateData.group_ids = [data.groupId];
      }
    }
    if (data.calendarPreferenceOverride !== undefined) updateData.calendar_preference_override = data.calendarPreferenceOverride;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await updateDoc(doc(db, 'birthdays', birthdayId), updateData);
  },

  async deleteBirthday(birthdayId: string): Promise<void> {
    await deleteDoc(doc(db, 'birthdays', birthdayId));
  },

  async getBirthday(birthdayId: string): Promise<Birthday | null> {
    const birthdayDoc = await getDoc(doc(db, 'birthdays', birthdayId));
    if (!birthdayDoc.exists()) return null;

    return this.docToBirthday(birthdayDoc.id, birthdayDoc.data());
  },

  async getTenantBirthdays(tenantId: string, includeArchived = false): Promise<Birthday[]> {
    let q = query(
      collection(db, 'birthdays'),
      where('tenant_id', '==', tenantId),
      orderBy('birth_date_gregorian', 'asc')
    );

    if (!includeArchived) {
      q = query(
        collection(db, 'birthdays'),
        where('tenant_id', '==', tenantId),
        where('archived', '==', false),
        orderBy('birth_date_gregorian', 'asc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.docToBirthday(doc.id, doc.data()));
  },

  subscribeToTenantBirthdays(
    tenantId: string,
    includeArchived: boolean,
    callback: (birthdays: Birthday[]) => void
  ): Unsubscribe {
    let q = query(
      collection(db, 'birthdays'),
      where('tenant_id', '==', tenantId),
      orderBy('birth_date_gregorian', 'asc')
    );

    if (!includeArchived) {
      q = query(
        collection(db, 'birthdays'),
        where('tenant_id', '==', tenantId),
        where('archived', '==', false),
        orderBy('birth_date_gregorian', 'asc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const birthdays = snapshot.docs.map((doc) => this.docToBirthday(doc.id, doc.data()));
      callback(birthdays);
    });
  },

  async getUpcomingBirthdays(tenantId: string, days: number = 30): Promise<Birthday[]> {
    const now = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const q = query(
      collection(db, 'birthdays'),
      where('tenant_id', '==', tenantId),
      where('archived', '==', false),
      where('next_upcoming_hebrew_birthday', '>=', now),
      where('next_upcoming_hebrew_birthday', '<=', futureDateStr),
      orderBy('next_upcoming_hebrew_birthday', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.docToBirthday(doc.id, doc.data()));
  },

  async searchBirthdays(tenantId: string, searchTerm: string): Promise<Birthday[]> {
    const allBirthdays = await this.getTenantBirthdays(tenantId);

    const searchLower = searchTerm.toLowerCase();
    return allBirthdays.filter(
      (birthday) =>
        birthday.first_name.toLowerCase().includes(searchLower) ||
        birthday.last_name.toLowerCase().includes(searchLower)
    );
  },

  async checkDuplicates(
    tenantId: string,
    groupIds: string[] | undefined, // Changed from groupId
    firstName: string,
    lastName: string,
    birthDate: string | Date
  ): Promise<Birthday[]> {
    // Normalize date to string YYYY-MM-DD
    let birthDateString: string;
    if (typeof birthDate === 'string') {
      birthDateString = birthDate;
    } else {
      birthDateString = birthDate.toISOString().split('T')[0];
    }

    // Check all birthdays in the tenant, not just the specific group
    // This ensures we find duplicates even if they are in a different group
    const q = query(
      collection(db, 'birthdays'),
      where('tenant_id', '==', tenantId),
      where('archived', '==', false)
    );

    const snapshot = await getDocs(q);
    const tenantBirthdays = snapshot.docs.map((doc) => this.docToBirthday(doc.id, doc.data()));

    return tenantBirthdays.filter(
      (birthday) =>
        birthday.first_name.toLowerCase().trim() === firstName.toLowerCase().trim() &&
        birthday.last_name.toLowerCase().trim() === lastName.toLowerCase().trim() &&
        birthday.birth_date_gregorian === birthDateString
    );
  },

  docToBirthday(id: string, data: any): Birthday {
    const groupIds = data.group_ids || (data.group_id ? [data.group_id] : []);
    return {
      id,
      tenant_id: data.tenant_id,
      group_ids: groupIds,
      group_id: data.group_id || (groupIds.length > 0 ? groupIds[0] : undefined),
      first_name: data.first_name,
      last_name: data.last_name,
      birth_date_gregorian: data.birth_date_gregorian,
      after_sunset: data.after_sunset ?? false,
      gender: data.gender,
      birth_date_hebrew_string: data.birth_date_hebrew_string,
      next_upcoming_hebrew_birthday: data.next_upcoming_hebrew_birthday,
      next_upcoming_hebrew_year: data.next_upcoming_hebrew_year,
      future_hebrew_birthdays: data.future_hebrew_birthdays || [],
      gregorian_year: data.gregorian_year,
      gregorian_month: data.gregorian_month,
      gregorian_day: data.gregorian_day,
      hebrew_year: data.hebrew_year,
      hebrew_month: data.hebrew_month,
      hebrew_day: data.hebrew_day,
      calendar_preference_override: data.calendar_preference_override || null,
      notes: data.notes || '',
      archived: data.archived ?? false,
      googleCalendarEventId: data.googleCalendarEventId || null,
      googleCalendarEventIds: data.googleCalendarEventIds || null,
      lastSyncedAt: data.lastSyncedAt ? this.timestampToString(data.lastSyncedAt) : null,
      googleCalendarEventsMap: data.googleCalendarEventsMap || {},
      isSynced: data.isSynced ?? false,
      syncMetadata: data.syncMetadata || undefined,
      created_at: this.timestampToString(data.created_at),
      created_by: data.created_by,
      updated_at: this.timestampToString(data.updated_at),
      updated_by: data.updated_by,
    };
  },

  timestampToString(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    return new Date().toISOString();
  },
};
