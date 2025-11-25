import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { google } from 'googleapis';
import { SyncEvent, generateEventKey, rateLimitExecutor, withRetry } from './utils/calendar-utils';
import { CloudTasksClient } from '@google-cloud/tasks';

admin.initializeApp();

const db = admin.firestore();

const PROJECT_ID = JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId;
const LOCATION = 'us-central1'; // Adjust if your functions are in a different region
const QUEUE = 'calendar-sync'; // Ensure this queue is created in Google Cloud Console

// Google Client Credentials from Firebase Config
const GOOGLE_CLIENT_ID = functions.config().google?.client_id || '';
const GOOGLE_CLIENT_SECRET = functions.config().google?.client_secret || '';
const GOOGLE_REDIRECT_URI = functions.config().google?.redirect_uri || 'postmessage';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    functions.logger.warn('Missing Google Client Credentials in functions.config()!');
}

const tasksClient = new CloudTasksClient();

interface HebcalEvent {
  date: string;
  hebrew: string;
}

interface HebcalResponse {
  hebrew: string;
  hy: number;
  hm: string;
  hd: number;
  events?: HebcalEvent[];
}

async function fetchHebcalData(
  gregorianDate: Date,
  afterSunset: boolean
): Promise<HebcalResponse> {
  const year = gregorianDate.getFullYear();
  const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
  const day = String(gregorianDate.getDate()).padStart(2, '0');

  const params = new URLSearchParams({
    cfg: 'json',
    gy: year.toString(),
    gm: month,
    gd: day,
    g2h: '1',
    lg: 's',
  });

  if (afterSunset) {
    params.append('gs', 'on');
  }

  const url = `https://www.hebcal.com/converter?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Hebcal API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as HebcalResponse;
  } catch (error) {
    functions.logger.error('Error fetching Hebcal data:', error);
    throw error;
  }
}

async function getCurrentHebrewYear(): Promise<number> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  const params = new URLSearchParams({
    cfg: 'json',
    gy: year.toString(),
    gm: month,
    gd: day,
    g2h: '1',
    lg: 's',
  });

  try {
    const response = await fetch(`https://www.hebcal.com/converter?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to get current Hebrew year');
    }
    const data = await response.json();
    return data.hy;
  } catch (error) {
    functions.logger.error('Error getting current Hebrew year:', error);
    throw error;
  }
}

function getGregorianZodiacSign(date: Date): string | null {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces';

  return null;
}

function getHebrewZodiacSign(hebrewMonth: string): string | null {
  if (!hebrewMonth) return null;
  
  switch (hebrewMonth) {
    case 'Nisan': return 'aries';
    case 'Iyyar': return 'taurus';
    case 'Sivan': return 'gemini';
    case 'Tamuz': return 'cancer';
    case 'Av': return 'leo';
    case 'Elul': return 'virgo';
    case 'Tishrei': return 'libra';
    case 'Cheshvan': return 'scorpio';
    case 'Kislev': return 'sagittarius';
    case 'Tevet': return 'capricorn';
    case 'Sh\'vat': return 'aquarius';
    case 'Adar':
    case 'Adar I':
    case 'Adar II':
      return 'pisces';
    default: return null;
  }
}

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

interface HebrewBirthdayDate {
  gregorianDate: Date;
  hebrewYear: number;
}

async function fetchNextHebrewBirthdays(
  startHebrewYear: number,
  hebrewMonth: string,
  hebrewDay: number,
  yearsAhead: number = 10
): Promise<HebrewBirthdayDate[]> {
  const futureDates: HebrewBirthdayDate[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  functions.logger.log(`Fetching future dates starting from Hebrew year: ${startHebrewYear}, month: ${hebrewMonth}, day: ${hebrewDay}`);

  const fetchPromises = [];
  for (let i = 0; i <= yearsAhead; i++) {
    const yearToFetch = startHebrewYear + i;
    const params = new URLSearchParams({
      cfg: 'json',
      hy: yearToFetch.toString(),
      hm: hebrewMonth,
      hd: hebrewDay.toString(),
      h2g: '1',
    });

    const url = `https://www.hebcal.com/converter?${params.toString()}`;
    fetchPromises.push(
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            functions.logger.warn(`Response not OK for year ${yearToFetch}: ${response.status}`);
            return null;
          }
          return response.json();
        })
        .then((data) => {
          if (data && data.gy && data.gm && data.gd) {
            const date = new Date(data.gy, data.gm - 1, data.gd);
            date.setHours(0, 0, 0, 0);
            functions.logger.log(`Year ${yearToFetch} -> ${date.toISOString().split('T')[0]} (${date >= today ? 'FUTURE' : 'PAST'})`);
            if (date >= today) {
              return { gregorianDate: date, hebrewYear: yearToFetch };
            }
          }
          return null;
        })
        .catch((error) => {
          functions.logger.error(`Error fetching Hebrew year ${yearToFetch}:`, error);
          return null;
        })
    );
  }

  const results = await Promise.all(fetchPromises);
  futureDates.push(...results.filter((date): date is HebrewBirthdayDate => date !== null));

  functions.logger.log(`Total future dates found: ${futureDates.length}`);
  return futureDates.sort((a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime());
}

export const onBirthdayWrite = functions.firestore
  .document('birthdays/{birthdayId}')
  .onWrite(async (change, context) => {
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    if (!afterData) {
      return null;
    }

    if (!afterData.birth_date_gregorian) {
      functions.logger.warn('No birth_date_gregorian found, skipping');
      return null;
    }

    const hasHebrewData =
      afterData.birth_date_hebrew_string &&
      afterData.birth_date_hebrew_year &&
      afterData.birth_date_hebrew_month &&
      afterData.birth_date_hebrew_day &&
      afterData.next_upcoming_hebrew_birthday &&
      afterData.future_hebrew_birthdays &&
      afterData.future_hebrew_birthdays.length > 0;

    if (beforeData) {
      const birthDateChanged = beforeData.birth_date_gregorian !== afterData.birth_date_gregorian;
      const afterSunsetChanged = beforeData.after_sunset !== afterData.after_sunset;

      if (!birthDateChanged && !afterSunsetChanged) {
        functions.logger.log('No relevant changes detected, skipping calculation');
        return null;
      }

      if (hasHebrewData && !birthDateChanged && !afterSunsetChanged) {
        functions.logger.log('Birthday already has Hebrew data and no changes, skipping calculation');
        return null;
      }
    }

    if (hasHebrewData && !beforeData) {
      functions.logger.log('New birthday already has Hebrew data, skipping calculation');
      return null;
    }

    try {
      const birthDateStr = afterData.birth_date_gregorian;
      const birthDate = new Date(birthDateStr);
      const afterSunset = afterData.after_sunset || false;

      functions.logger.log(`Processing birthday ${context.params.birthdayId}: ${birthDateStr}, afterSunset: ${afterSunset}`);

      const hebcalData = await fetchHebcalData(birthDate, afterSunset);
      functions.logger.log(`Hebcal data received:`, JSON.stringify(hebcalData));

      if (!hebcalData.hebrew) {
        throw new Error('No Hebrew date returned from Hebcal');
      }

      const currentHebrewYear = await getCurrentHebrewYear();
      functions.logger.log(`Current Hebrew year: ${currentHebrewYear}`);
      functions.logger.log(`Birth Hebrew date: year=${hebcalData.hy}, month=${hebcalData.hm}, day=${hebcalData.hd}`);
      functions.logger.log(`Fetching next birthdays starting from year ${currentHebrewYear}`);

      const futureDates = await fetchNextHebrewBirthdays(
        currentHebrewYear,
        hebcalData.hm,
        hebcalData.hd,
        10
      );

      functions.logger.log(`Future dates returned: ${futureDates.length} dates`);

      const updateData: any = {
        birth_date_hebrew_string: hebcalData.hebrew,
        birth_date_hebrew_year: hebcalData.hy,
        birth_date_hebrew_month: hebcalData.hm,
        birth_date_hebrew_day: hebcalData.hd,
        gregorian_year: birthDate.getFullYear(),
        gregorian_month: birthDate.getMonth() + 1,
        gregorian_day: birthDate.getDate(),
        hebrew_year: hebcalData.hy,
        hebrew_month: hebcalData.hm,
        hebrew_day: hebcalData.hd,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (futureDates.length > 0) {
        const nextDate = futureDates[0];
        const gregorianDate = nextDate.gregorianDate;
        updateData.next_upcoming_hebrew_birthday = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;
        updateData.next_upcoming_hebrew_year = nextDate.hebrewYear;
        updateData.future_hebrew_birthdays = futureDates.map((item) => ({
          gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
          hebrewYear: item.hebrewYear
        }));
      } else {
        functions.logger.warn('No future dates found, setting empty array');
        updateData.future_hebrew_birthdays = [];
        updateData.next_upcoming_hebrew_year = null;
      }

      const docSnapshot = await change.after.ref.get();
      if (!docSnapshot.exists) {
        functions.logger.warn('Document was deleted during processing, skipping update');
        return null;
      }

      await change.after.ref.update(updateData);

      functions.logger.log(`Successfully calculated Hebrew dates for birthday ${context.params.birthdayId}`);

      return null;
    } catch (error: any) {
      if (error.code === 5 || error.message?.includes('No document to update')) {
        functions.logger.warn('Document no longer exists, skipping update');
        return null;
      }
      functions.logger.error('Error calculating Hebrew dates:', error);
      throw error;
    }
  });

export const refreshBirthdayHebrewData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const birthdayId = data.birthdayId;
  if (!birthdayId) {
    throw new functions.https.HttpsError('invalid-argument', 'Birthday ID is required');
  }

  const rateLimitRef = db.collection('rate_limits').doc(`${context.auth.uid}_refresh`);
  const rateLimitDoc = await rateLimitRef.get();

  const now = Date.now();
  const windowMs = 30000; // 30 seconds
  const maxRequests = 3;

  if (rateLimitDoc.exists) {
    const data = rateLimitDoc.data();
    const requests = data?.requests || [];

    const recentRequests = requests.filter((timestamp: number) => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many refresh requests. Please wait 30 seconds.'
      );
    }

    await rateLimitRef.update({
      requests: [...recentRequests, now],
    });
  } else {
    await rateLimitRef.set({
      requests: [now],
    });
  }

  try {
    const birthdayRef = db.collection('birthdays').doc(birthdayId);
    const birthdayDoc = await birthdayRef.get();

    if (!birthdayDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Birthday not found');
    }

    const birthdayData = birthdayDoc.data();

    if (birthdayData?.tenant_id !== data.tenantId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    const birthDateStr = birthdayData?.birth_date_gregorian;
    if (!birthDateStr) {
      throw new functions.https.HttpsError('failed-precondition', 'No birth date found');
    }

    const birthDate = new Date(birthDateStr);
    const afterSunset = birthdayData?.after_sunset || false;

    const hebcalData = await fetchHebcalData(birthDate, afterSunset);

    if (!hebcalData.hebrew) {
      throw new functions.https.HttpsError('internal', 'Failed to fetch Hebrew date');
    }

    const currentHebrewYear = await getCurrentHebrewYear();
    functions.logger.log(`Current Hebrew year: ${currentHebrewYear}`);

    const futureDates = await fetchNextHebrewBirthdays(
      currentHebrewYear,
      hebcalData.hm,
      hebcalData.hd,
      10
    );

    const updateData: any = {
      birth_date_hebrew_string: hebcalData.hebrew,
      birth_date_hebrew_year: hebcalData.hy,
      birth_date_hebrew_month: hebcalData.hm,
      birth_date_hebrew_day: hebcalData.hd,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (futureDates.length > 0) {
      const nextDate = futureDates[0];
      const gregorianDate = nextDate.gregorianDate;
      updateData.next_upcoming_hebrew_birthday = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;
      updateData.next_upcoming_hebrew_year = nextDate.hebrewYear;
      updateData.future_hebrew_birthdays = futureDates.map((item) => ({
        gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
        hebrewYear: item.hebrewYear
      }));
    }

    await birthdayRef.update(updateData);

    functions.logger.log(`Successfully refreshed Hebrew dates for birthday ${birthdayId}`);

    return { success: true, message: 'Hebrew dates refreshed successfully' };
  } catch (error) {
    functions.logger.error('Error refreshing Hebrew dates:', error);
    throw new functions.https.HttpsError('internal', 'Failed to refresh Hebrew dates');
  }
});

export const updateNextBirthdayScheduled = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    try {
      const now = new Date();
      const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const snapshot = await db
        .collection('birthdays')
        .where('archived', '==', false)
        .get();

      const bulkWriter = db.bulkWriter();
      let updateCount = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const nextBirthday = data.next_upcoming_hebrew_birthday;

        if (!nextBirthday || nextBirthday < nowStr) {
          const futureDates = data.future_hebrew_birthdays || [];

          const upcomingDates = futureDates.filter((item: any) => {
            const dateStr = typeof item === 'string' ? item : item.gregorian;
            return dateStr >= nowStr;
          });

          if (upcomingDates.length > 0) {
            const nextItem = upcomingDates[0];
            const nextGregorian = typeof nextItem === 'string' ? nextItem : nextItem.gregorian;
            const nextHebrewYear = typeof nextItem === 'string' ? null : nextItem.hebrewYear;

            // If nextHebrewYear is null (old data structure), refresh from API
            if (!nextHebrewYear && data.birth_date_hebrew_year && data.birth_date_hebrew_month && data.birth_date_hebrew_day) {
              try {
                const currentHebrewYear = await getCurrentHebrewYear();
                const newFutureDates = await fetchNextHebrewBirthdays(
                  currentHebrewYear,
                  data.birth_date_hebrew_month,
                  data.birth_date_hebrew_day,
                  501
                );
                if (newFutureDates.length > 0) {
                  const nextDate = newFutureDates[0];
                  const gregorianDate = nextDate.gregorianDate;
                  bulkWriter.update(doc.ref, {
                    next_upcoming_hebrew_birthday: `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`,
                    next_upcoming_hebrew_year: nextDate.hebrewYear,
                    future_hebrew_birthdays: newFutureDates.map((item) => ({
                      gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                      hebrewYear: item.hebrewYear
                    })),
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  updateCount++;
                }
              } catch (error) {
                functions.logger.warn(`Failed to refresh birthday ${doc.id} with missing hebrewYear:`, error);
              }
            } else {
              bulkWriter.update(doc.ref, {
                next_upcoming_hebrew_birthday: nextGregorian,
                next_upcoming_hebrew_year: nextHebrewYear,
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
              });
              updateCount++;
            }
          } else {
            try {
              const hebrewYear = data.birth_date_hebrew_year;
              const hebrewMonth = data.birth_date_hebrew_month;
              const hebrewDay = data.birth_date_hebrew_day;
              if (hebrewYear && hebrewMonth && hebrewDay) {
                const currentHebrewYear = await getCurrentHebrewYear();
                const newFutureDates = await fetchNextHebrewBirthdays(
                  currentHebrewYear,
                  hebrewMonth,
                  hebrewDay,
                  10
                );
                if (newFutureDates.length > 0) {
                  const nextDate = newFutureDates[0];
                  const gregorianDate = nextDate.gregorianDate;
                  bulkWriter.update(doc.ref, {
                    next_upcoming_hebrew_birthday: `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`,
                    next_upcoming_hebrew_year: nextDate.hebrewYear,
                    future_hebrew_birthdays: newFutureDates.map((item) => ({
                      gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                      hebrewYear: item.hebrewYear
                    })),
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  updateCount++;
                }
              }
            } catch (error) {
              functions.logger.warn(`Failed to update birthday ${doc.id}:`, error);
            }
          }
        }
      }

      if (updateCount > 0) {
        await bulkWriter.close();
        functions.logger.log(`Updated ${updateCount} birthdays with new upcoming dates`);
      } else {
        functions.logger.log('No birthdays needed updating');
      }

      return null;
    } catch (error) {
      functions.logger.error('Error in scheduled birthday update:', error);
      throw error;
    }
  });

export const fixExistingBirthdays = functions.https.onRequest(async (req, res) => {
  const snapshot = await db.collection('birthdays').get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.birth_date_hebrew_string && !data.next_upcoming_hebrew_birthday) {
      await doc.ref.update({
        birth_date_hebrew_string: null,
      });
    }
  }

  res.send('Done');
});

export const fixAllBirthdaysHebrewYear = functions.https.onRequest(async (req, res) => {
  try {
    const snapshot = await db.collection('birthdays').get();
    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    functions.logger.log(`Processing ${snapshot.size} birthdays...`);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // בדוק אם next_upcoming_hebrew_year חסר או null
      if (!data.next_upcoming_hebrew_year && data.birth_date_gregorian) {
        try {
          functions.logger.log(`Fixing birthday ${doc.id}...`);

          const birthDate = new Date(data.birth_date_gregorian);
          const afterSunset = data.after_sunset || false;

          const hebcalData = await fetchHebcalData(birthDate, afterSunset);
          const currentHebrewYear = await getCurrentHebrewYear();
          const futureDates = await fetchNextHebrewBirthdays(
            currentHebrewYear,
            hebcalData.hm,
            hebcalData.hd,
            10
          );

          if (futureDates.length > 0) {
            const nextDate = futureDates[0];
            const gregorianDate = nextDate.gregorianDate;

            await doc.ref.update({
              birth_date_hebrew_year: hebcalData.hy,
              birth_date_hebrew_month: hebcalData.hm,
              birth_date_hebrew_day: hebcalData.hd,
              hebrew_year: hebcalData.hy,
              hebrew_month: hebcalData.hm,
              hebrew_day: hebcalData.hd,
              next_upcoming_hebrew_year: nextDate.hebrewYear,
              next_upcoming_hebrew_birthday: `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`,
              future_hebrew_birthdays: futureDates.map((item) => ({
                gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
                hebrewYear: item.hebrewYear
              })),
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            fixed++;
            functions.logger.log(`✅ Fixed birthday ${doc.id}`);
          } else {
            skipped++;
            functions.logger.warn(`⚠️ No future dates for birthday ${doc.id}`);
          }

          // המתן 100ms בין בקשות כדי לא להציף את Hebcal API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          errors++;
          functions.logger.error(`❌ Failed to fix birthday ${doc.id}:`, error);
        }
      } else {
        skipped++;
      }
    }

    const message = `Fixed ${fixed} birthdays, skipped ${skipped}, errors ${errors}`;
    functions.logger.log(message);

    res.json({
      success: true,
      message,
      fixed,
      skipped,
      errors,
      total: snapshot.size
    });
  } catch (error) {
    functions.logger.error('Error in fixAllBirthdaysHebrewYear:', error);
    res.status(500).json({
      success: false,
      error: String(error)
    });
  }
});

export const migrateExistingUsers = functions.https.onRequest(async (req, res) => {
  try {
    const membersSnapshot = await db.collection('tenant_members').get();
    const updates: Promise<void>[] = [];

    for (const doc of membersSnapshot.docs) {
      const data = doc.data();
      const userId = data.user_id;
      const tenantId = data.tenant_id;
      const role = data.role || 'member';

      updates.push(
        admin.auth().setCustomUserClaims(userId, {
          tenantId: tenantId,
          role: role
        }).then(() => {
          functions.logger.log(`Set custom claims for user ${userId}: tenantId=${tenantId}, role=${role}`);
        }).catch((error) => {
          functions.logger.error(`Failed to set custom claims for user ${userId}:`, error);
        })
      );
    }

    await Promise.all(updates);

    res.json({
      success: true,
      message: `Migrated ${updates.length} users`,
      usersProcessed: updates.length
    });
  } catch (error) {
    functions.logger.error('Error in migrateExistingUsers:', error);
    res.status(500).json({
      success: false,
      error: String(error)
    });
  }
});

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const userId = user.uid;
  const email = user.email || '';
  const displayName = user.displayName || email.split('@')[0];

  try {
    functions.logger.log(`New user created: ${userId}, creating tenant...`);

    const batch = db.batch();

    const tenantRef = db.collection('tenants').doc();
    const tenantId = tenantRef.id;

    batch.set(tenantRef, {
      name: `${displayName}'s Organization`,
      owner_id: userId,
      default_language: 'he',
      timezone: 'Asia/Jerusalem',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const memberRef = db.collection('tenant_members').doc();
    batch.set(memberRef, {
      tenant_id: tenantId,
      user_id: userId,
      role: 'owner',
      joined_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const maleGroupRef = db.collection('groups').doc();
    batch.set(maleGroupRef, {
      tenant_id: tenantId,
      name: 'גברים',
      name_en: 'Men',
      is_gender_group: true,
      gender_type: 'male',
      parent_group_id: null,
      created_by: userId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const femaleGroupRef = db.collection('groups').doc();
    batch.set(femaleGroupRef, {
      tenant_id: tenantId,
      name: 'נשים',
      name_en: 'Women',
      is_gender_group: true,
      gender_type: 'female',
      parent_group_id: null,
      created_by: userId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.auth().setCustomUserClaims(userId, {
      tenantId: tenantId,
      role: 'owner'
    });

    functions.logger.log(`Custom claims set for user ${userId}, tenantId: ${tenantId}`);

    await batch.commit();

    functions.logger.log(`Successfully created tenant ${tenantId} with groups for user ${userId}`);

    return null;
  } catch (error) {
    functions.logger.error(`Error in onUserCreate for user ${userId}:`, error);

    try {
      await admin.auth().deleteUser(userId);
      functions.logger.log(`Rolled back: deleted user ${userId}`);
    } catch (rollbackError) {
      functions.logger.error(`Failed to rollback user ${userId}:`, rollbackError);
    }

    throw error;
  }
});

// --- New Auth & Token Management ---

export const exchangeGoogleAuthCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
    }
    const { code } = data;
    if (!code) {
        throw new functions.https.HttpsError('invalid-argument', 'Authorization code required');
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        
        // Save tokens to Firestore
        const userId = context.auth.uid;

        // Fetch existing token data to preserve preferences (calendarId, createdCalendars, etc.)
        const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
        const existingData = tokenDoc.exists ? tokenDoc.data() : {};
        
        const tokenData: any = {
            userId,
            accessToken: tokens.access_token,
            expiresAt: tokens.expiry_date || (Date.now() + 3600 * 1000),
            scope: tokens.scope,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Explicitly preserve these fields if they exist
            calendarId: existingData?.calendarId,
            calendarName: existingData?.calendarName,
            createdCalendars: existingData?.createdCalendars
        };

        // Remove undefined fields to avoid Firestore errors or unintended behavior
        Object.keys(tokenData).forEach(key => tokenData[key] === undefined && delete tokenData[key]);

        // Only save refresh token if we got one (we should if access_type=offline)
        if (tokens.refresh_token) {
            tokenData.refreshToken = tokens.refresh_token;
        }

        // Update or Set (merge to keep other fields like calendarId)
        await db.collection('googleCalendarTokens').doc(userId).set(tokenData, { merge: true });

        functions.logger.log(`Exchanged code for tokens for user ${userId}. Got Refresh Token: ${!!tokens.refresh_token}`);

        return {
            accessToken: tokens.access_token,
            expiresIn: 3600 // Approximate, client uses it for basic state
        };

    } catch (error: any) {
        functions.logger.error('Error exchanging auth code:', error);
        throw new functions.https.HttpsError('internal', 'Failed to exchange authorization code');
  }
});

async function getValidAccessToken(userId: string, minValidityMillis: number = 60000): Promise<string> {
  const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();

  if (!tokenDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'googleCalendar.connectFirst');
  }

  const tokenData = tokenDoc.data();
  if (!tokenData) {
    throw new functions.https.HttpsError('not-found', 'googleCalendar.syncError');
  }

  const now = Date.now();
  // Add buffer based on minValidityMillis parameter
  const expiresAt = tokenData.expiresAt || 0;

  // If token is valid (with buffer), return it
  if (now < expiresAt - minValidityMillis) {
      return tokenData.accessToken;
  }

  // If expired, try to refresh
  functions.logger.log(`Token for user ${userId} expired, attempting refresh...`);
  
  if (!tokenData.refreshToken) {
      functions.logger.warn(`No refresh token found for user ${userId}, forcing re-auth`);
    throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
  }

  try {
      const oauth2Client = new google.auth.OAuth2(
          GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET,
          GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
          refresh_token: tokenData.refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      const newExpiresAt = credentials.expiry_date || (Date.now() + 3600 * 1000);
      
      await tokenDoc.ref.update({
          accessToken: credentials.access_token,
          expiresAt: newExpiresAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      functions.logger.log(`Successfully refreshed access token for user ${userId}`);
      
      return credentials.access_token!;

  } catch (error: any) {
      functions.logger.error(`Failed to refresh access token for user ${userId}:`, error);
      // If refresh fails (e.g. revoked), we must ask user to re-connect
      throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
  }
}

async function getCalendarId(userId: string): Promise<string> {
  const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();

  if (!tokenDoc.exists) {
    return 'primary';
  }

  const tokenData = tokenDoc.data();
  return tokenData?.calendarId || 'primary';
}

async function getCalendarName(userId: string): Promise<string> {
    const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
    if (!tokenDoc.exists) {
        return 'Unknown Calendar'; // Should ideally be localized on client
    }
    const tokenData = tokenDoc.data();
    return tokenData?.calendarName || 'Primary Calendar'; // Fallback
}

async function checkUserQuota(userId: string, newEventsCount: number): Promise<boolean> {
    // Stub: Always return true for now.
    // Future implementation: Check user plan and current usage.
    return true;
}

// --- Job Status Helpers ---

async function createSyncJob(userId: string, totalItems: number): Promise<string> {
    const jobRef = db.collection('calendar_sync_jobs').doc();
    await jobRef.set({
        userId,
        status: 'pending',
        totalItems,
        processedItems: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        errors: []
    });
    return jobRef.id;
}

async function updateSyncJob(jobId: string, increment: number, error?: { message: string, itemId?: string, itemName?: string }) {
    const jobRef = db.collection('calendar_sync_jobs').doc(jobId);
    const updateData: any = {
        processedItems: admin.firestore.FieldValue.increment(increment),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (error) {
        updateData.errors = admin.firestore.FieldValue.arrayUnion({
            message: error.message,
            itemId: error.itemId || null,
            itemName: error.itemName || 'Unknown',
            timestamp: new Date().toISOString()
        });
    }

    await jobRef.update(updateData);
}

async function completeSyncJob(jobId: string) {
    const jobRef = db.collection('calendar_sync_jobs').doc(jobId);
    await jobRef.update({
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

async function failSyncJob(jobId: string, error: string) {
    const jobRef = db.collection('calendar_sync_jobs').doc(jobId);
    await jobRef.update({
        status: 'failed',
        failureReason: error,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

// New Task Handler Function
export const processCalendarSyncJob = functions.runWith({
  timeoutSeconds: 540,
  memory: '256MB'
}).https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const payload = req.body;
    const { birthdayIds, userId, jobId } = payload; // jobId added

    if (!birthdayIds || !Array.isArray(birthdayIds) || !userId) {
      res.status(400).send('Invalid Payload');
      return;
    }

    functions.logger.log(`Processing batch of ${birthdayIds.length} birthdays for user ${userId} (Job: ${jobId || 'none'})`);

    let successes = 0;
    let failures = 0;

    // Process birthdays SEQUENTIALLY to avoid Rate Limit Exceeded on per-user quota
    for (const birthdayId of birthdayIds) {
        try {
            await performSmartSync(birthdayId, userId);
            successes++;
            
            // Update Job Status (Progress)
            if (jobId) {
                await updateSyncJob(jobId, 1); 
            }
        } catch (error: any) {
            failures++;
            functions.logger.error(`Error syncing birthday ${birthdayId}:`, error);
            
            // Try to get name for error log
            let itemName = 'Unknown';
            try {
                const doc = await db.collection('birthdays').doc(birthdayId).get();
                if (doc.exists) {
                    const d = doc.data();
                    itemName = `${d?.first_name || ''} ${d?.last_name || ''}`.trim() || 'Unknown';
                }
            } catch (e) { /* ignore */ }

            // Update Job Status (Error)
            if (jobId) {
                await updateSyncJob(jobId, 1, { 
                    message: error.message || String(error),
                    itemId: birthdayId,
                    itemName
                });
            }
        }
    }

    functions.logger.log(`Batch processed: ${successes} succeeded, ${failures} failed`);
    
    if (jobId) {
        const jobDoc = await db.collection('calendar_sync_jobs').doc(jobId).get();
        const jobData = jobDoc.data();
        
        if (jobData && jobData.processedItems >= jobData.totalItems) {
             await completeSyncJob(jobId);
             
             // LOG HISTORY
             const errors = jobData.errors || [];
             const total = jobData.totalItems;
             const failedCount = errors.length;
             const successCount = total - failedCount;
             
             await db.collection('users').doc(userId).collection('sync_history').add({
                 type: 'BATCH',
                 status: failedCount === 0 ? 'SUCCESS' : (successCount > 0 ? 'PARTIAL' : 'FAILED'),
                 timestamp: admin.firestore.FieldValue.serverTimestamp(),
                 total,
                 successCount,
                 failedCount,
                 failedItems: errors.map((e: any) => ({
                     name: e.itemName || 'Unknown',
                     reason: e.message
                 })).slice(0, 20) // Limit to 20 errors to prevent huge docs
             });
             
             // Update Token Status
             await db.collection('googleCalendarTokens').doc(userId).set({
                 syncStatus: 'IDLE'
             }, { merge: true });
        }
    }

    res.status(200).send({ success: true, successes, failures });

  } catch (error: any) {
    functions.logger.error('Error processing calendar sync job:', error);
    res.status(500).send(error.message);
  }
});

// Updated Sync Function (Enqueuer)
export const syncMultipleBirthdaysToGoogleCalendar = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { birthdayIds } = data;
  if (!birthdayIds || !Array.isArray(birthdayIds) || birthdayIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  // Rate limiting / Quota check
  const userId = context.auth.uid;

  // Preemptive Token Refresh:
  // Ensure token is valid for at least 10 minutes (600,000ms) before starting the batch.
  // This prevents multiple workers from trying to refresh the token simultaneously (Race Condition).
  try {
    await getValidAccessToken(userId, 600000);
  } catch (error) {
    functions.logger.warn(`Preemptive token refresh failed for user ${userId}`, error);
    // We throw a user-friendly error so they know they need to re-authenticate.
    throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
  }

  // STRICT MODE: Block syncing to Primary Calendar
  const calendarId = await getCalendarId(userId);
  if (calendarId === 'primary') {
      throw new functions.https.HttpsError('failed-precondition', 'googleCalendar.primaryNotAllowed');
  }

  const hasQuota = await checkUserQuota(userId, birthdayIds.length);
  if (!hasQuota) {
      throw new functions.https.HttpsError('resource-exhausted', 'Quota exceeded');
  }

  // Create Job Status Document
  const jobId = await createSyncJob(userId, birthdayIds.length);

  // Update Token Status to IN_PROGRESS
  await db.collection('googleCalendarTokens').doc(userId).set({
      syncStatus: 'IN_PROGRESS',
      lastSyncStart: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const project = PROJECT_ID;
  const queue = QUEUE;
  const location = LOCATION;
  const url = `https://${location}-${project}.cloudfunctions.net/processCalendarSyncJob`;
  const serviceAccountEmail = `${project}@appspot.gserviceaccount.com`;
  
  const parent = tasksClient.queuePath(project, location, queue);

  // Split into batches of 5 for Cloud Tasks
  const CHUNK_SIZE = 5;
  const chunks = [];
  for (let i = 0; i < birthdayIds.length; i += CHUNK_SIZE) {
    chunks.push(birthdayIds.slice(i, i + CHUNK_SIZE));
  }

  try {
      const promises = chunks.map(async (chunk) => {
          const payload = { birthdayIds: chunk, userId, jobId }; // Pass jobId
          const task: any = {
              httpRequest: {
                  httpMethod: 'POST' as const,
                  url,
                  body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  oidcToken: {
                      serviceAccountEmail,
                  },
              },
          };

          const [response] = await tasksClient.createTask({ parent, task });
          return response.name;
      });

      await Promise.all(promises);
      
      functions.logger.log(`Enqueued ${chunks.length} tasks for ${birthdayIds.length} birthdays. Job ID: ${jobId}`);
      
      return {
          success: true,
          message: 'Sync started in background',
          totalQueued: birthdayIds.length,
          jobId // Return Job ID to client
      };

  } catch (error: any) {
      functions.logger.error('Failed to enqueue tasks:', error);
      await failSyncJob(jobId, error.message || 'Failed to enqueue tasks'); // Update job status
      throw new functions.https.HttpsError('internal', 'Failed to start background sync');
  }
});

// Single Sync (Direct call for immediate feedback, or reuse logic)
export const syncBirthdayToGoogleCalendar = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
    }
    const { birthdayId } = data;
    
    // STRICT MODE: Block syncing to Primary Calendar
    const userId = context.auth.uid;
    const calendarId = await getCalendarId(userId);
    if (calendarId === 'primary') {
        throw new functions.https.HttpsError('failed-precondition', 'googleCalendar.primaryNotAllowed');
    }

    try {
        const { stats } = await performSmartSync(birthdayId, userId);
        
        // LOG HISTORY for Single Sync
        await db.collection('users').doc(userId).collection('sync_history').add({
             type: 'SINGLE',
             status: 'SUCCESS',
             timestamp: admin.firestore.FieldValue.serverTimestamp(),
             total: 1,
             successCount: 1,
             failedCount: 0,
             failedItems: []
        });

        return { success: true, stats };
    } catch (error: any) {
        // LOG HISTORY for Single Sync Failure
        // Need to fetch name if possible, but performSmartSync failed.
        let itemName = 'Unknown';
        try {
            const doc = await db.collection('birthdays').doc(birthdayId).get();
            if (doc.exists) { 
                const d = doc.data(); 
                itemName = `${d?.first_name || ''} ${d?.last_name || ''}`.trim() || 'Unknown';
            }
        } catch(e) {}

        await db.collection('users').doc(userId).collection('sync_history').add({
             type: 'SINGLE',
             status: 'FAILED',
             timestamp: admin.firestore.FieldValue.serverTimestamp(),
             total: 1,
             successCount: 0,
             failedCount: 1,
             failedItems: [{ name: itemName, reason: error.message }]
        });

        throw new functions.https.HttpsError('internal', error.message);
    }
});

async function performSmartSync(birthdayId: string, userId: string) {
    const accessToken = await getValidAccessToken(userId);
    const calendarId = await getCalendarId(userId);
    
    // STRICT MODE: Absolute block on Primary Calendar
    if (calendarId === 'primary') {
        throw new Error('Strict Mode: Syncing to Primary Calendar is not allowed. Please create a dedicated calendar.');
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const birthdayRef = db.collection('birthdays').doc(birthdayId);
    
    // Read snapshot first
    const docSnap = await birthdayRef.get();
    if (!docSnap.exists) throw new Error('Birthday not found');
    const birthdayData = docSnap.data()!;
    const birthday = { id: birthdayId, ...birthdayData, syncedCalendarId: birthdayData.syncedCalendarId };

    // STRICT MODE CHECK: Ensure we are syncing to the SAME calendar as before
    if (birthday.syncedCalendarId && birthday.syncedCalendarId !== calendarId) {
        throw new Error(`Mismatch: This birthday is synced to calendar ${birthday.syncedCalendarId}, but current selection is ${calendarId}. Please reset sync or switch calendar.`);
    }

    // 1. Calculate Expected Events
    const eventsToSync = await calculateExpectedEvents(birthday);
    const expectedMap = new Map<string, SyncEvent>();
    eventsToSync.forEach(event => {
        const key = generateEventKey(event._type, event._year || 0);
        expectedMap.set(key, event);
    });

    // 2. Fetch Actual Events (Snapshot)
    // We fetch ALL events tagged with this birthdayId to ensure we see everything.
    const actualEventsMap = new Map<string, string>(); // Key -> EventId
    
    let pageToken: string | undefined = undefined;
    do {
        const response: any = await withRetry(() => calendar.events.list({
            calendarId,
            privateExtendedProperty: [`birthdayId=${birthdayId}`, 'createdByApp=hebbirthday'],
            maxResults: 250, // Max allowed by Google
            pageToken,
            singleEvents: true
        }));
        
        const items = response.data.items || [];
        for (const item of items) {
             // Try to deduce key from extended properties or title/date if missing
             // Ideally, we should store the key in extendedProperties too, but let's assume we can reconstruct it or rely on existing map if needed.
             // Actually, we can't easily reconstruct "hebrew_5785" just from date without re-running hebrew logic.
             // So we'll try to match by approximate date and content, OR better:
             // We can assume if we found it via birthdayId, it belongs to this person.
             // We need to know WHICH event it is (Hebrew 2025 vs Gregorian 2026).
             
             // Strategy: Match against Expected Events by Date and Type (Implicit Matching)
             // If an event from Google matches an Expected Event's Date + Type, we map it.
             // If it doesn't match ANY expected event, it's an Orphan -> Delete.
             
             // Let's try to find a match in expectedMap
             let matchedKey: string | null = null;
             
             for (const [key, expected] of expectedMap.entries()) {
                 if (item.start?.date === expected.start.date && 
                     item.summary === expected.summary) {
                     matchedKey = key;
                     break;
                 }
             }
             
             if (matchedKey) {
                 if (actualEventsMap.has(matchedKey)) {
                     // Duplicate found! Mark for deletion (the one we just found)
                     // This handles the double-entry bug automatically.
                     // We keep the one already in map, delete this new one.
                     // OR better: keep the one that matches Hash better? No, simple is better.
                     // We'll add to a "toDelete" list immediately.
                     // But we can't modify 'deletes' array here easily.
                     // Let's just overwrite? No, that hides the duplicate.
                     // We will treat this as an "extra" event to delete.
                     // For simplicity in this loop: If key already taken, this is a duplicate.
                 } else {
                    actualEventsMap.set(matchedKey, item.id!);
                    // Calculate hash of ACTUAL event to see if update needed
                    // We need to construct a SyncEvent from the Google Event to hash it, 
                    // or just compare fields directly.
                    // Easier: We just assume we need to update if we don't know the hash.
                    // Optimization: Check simple fields
                    // For now, we will Force Update if mapped, to ensure consistency, 
                    // OR use the extendedProperty hash if we stored it (we didn't).
                 }
             } else {
                 // Orphan (Old year, or changed logic) -> Will be deleted because it's not in expectedMap
                 // We add it to actualEventsMap with a unique fake key so it gets processed in the Diff phase?
                 // No, Diff logic is: 
                 // Iterate Expected -> if not in Actual -> Create
                 // Iterate Actual -> if not in Expected -> Delete
                 
                 // So we need to store it in a way that we know it exists but matches nothing.
                 actualEventsMap.set(`orphan_${item.id}`, item.id!);
             }
        }
        pageToken = response.data.nextPageToken;
    } while (pageToken);


    // 3. Compute Diff
    const creates: { key: string, resource: any }[] = [];
    const updates: { key: string, eventId: string, resource: any }[] = [];
    const deletes: string[] = [];
    const finalMap: { [key: string]: string } = {}; // Map to save to DB

    // A. Check Expected (Creates & Updates)
    for (const [key, event] of expectedMap.entries()) {
        const existingEventId = actualEventsMap.get(key);
        const { _type, _year, ...resource } = event;
        
        if (existingEventId) {
            // Exists -> Update
            updates.push({ key, eventId: existingEventId, resource });
            finalMap[key] = existingEventId; // Keep existing ID
            
            // Remove from actualEventsMap to mark as "Handled"
            actualEventsMap.delete(key);
        } else {
            // Missing -> Create
            creates.push({ key, resource });
            // ID will be added after creation
        }
    }

    // B. Check Remaining Actuals (Deletes)
    for (const eventId of actualEventsMap.values()) {
        deletes.push(eventId);
    }

    // 4. Execute
    const stats = { created: 0, updated: 0, deleted: 0 };
    
    // Deletes first
    if (deletes.length > 0) {
        await rateLimitExecutor(deletes.map(id => async () => {
            await withRetry(async () => {
                try { 
                    await calendar.events.delete({ calendarId, eventId: id }); 
                    stats.deleted++; 
                } catch (e: any) { 
                    if(e.code!==404 && e.code!==410) throw e; 
                }
            });
        }), 1, 500); // Concurrency 1, Delay 500ms
    }

    // Updates
    if (updates.length > 0) {
        await rateLimitExecutor(updates.map(item => async () => {
            await withRetry(async () => {
                try { 
                    await calendar.events.patch({ calendarId, eventId: item.eventId, requestBody: item.resource }); 
                    stats.updated++; 
                } catch (e: any) {
                    if (e.code === 404) {
                        // Fallback to insert
                        try {
                            const res = await calendar.events.insert({ calendarId, requestBody: item.resource });
                            if (res.data.id) { 
                                finalMap[item.key] = res.data.id; 
                                stats.created++; 
                            }
                        } catch (e2) { throw e2; }
                    } else {
                        throw e;
                    }
                }
            });
        }), 1, 500); // Concurrency 1, Delay 500ms
    }

    // Creates
    if (creates.length > 0) {
        await rateLimitExecutor(creates.map(item => async () => {
            await withRetry(async () => {
                const res = await calendar.events.insert({ calendarId, requestBody: item.resource });
                if (res.data.id) { 
                    finalMap[item.key] = res.data.id; 
                    stats.created++; 
                }
            });
        }), 1, 500); // Concurrency 1, Delay 500ms
    }

    // 5. Update DB Map
    await db.collection('birthdays').doc(birthdayId).update({
        googleCalendarEventsMap: finalMap, // Save the CORRECT map
        googleCalendarEventIds: admin.firestore.FieldValue.delete(),
        syncedCalendarId: calendarId, // STRICT MODE: Save the calendar ID this was synced to
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { stats, name: `${birthdayData.first_name} ${birthdayData.last_name}` };
}

async function calculateExpectedEvents(birthday: any): Promise<SyncEvent[]> {
     const events: SyncEvent[] = [];
     const tenantDoc = await db.collection('tenants').doc(birthday.tenant_id).get();
     const tenant = tenantDoc.data();
     const language = (tenant?.default_language || 'he') as 'he' | 'en';
     
     let group: any = null;
     let parentGroup: any = null;
     if (birthday.group_id) {
         const g = await db.collection('groups').doc(birthday.group_id).get();
         if (g.exists) {
             group = g.data();
             if (group?.parent_id) {
                 const p = await db.collection('groups').doc(group.parent_id).get();
                 if (p.exists) parentGroup = p.data();
             }
         }
     }

     // --- Enhanced Description Logic ---
     let description = '';
     
     // Fetch Wishlist Items
     let wishlistText = '';
     try {
         const wishlistSnapshot = await db.collection('wishlist_items')
             .where('birthday_id', '==', birthday.id)
             .get();
         
         if (!wishlistSnapshot.empty) {
             // Sort by priority: high > medium > low
             const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
             
             const items = wishlistSnapshot.docs
                 .map(doc => doc.data())
                 .sort((a, b) => {
                     const pA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
                     const pB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
                     return pB - pA; // Descending
                 })
                 .map((item, index) => `${index + 1}. ${item.item_name}`); // Numbered list

             if (items.length > 0) {
                 wishlistText = language === 'en' ? '🎁 Wishlist:\n' : '🎁 רשימת משאלות:\n';
                 wishlistText += items.join('\n') + '\n\n';
             }
         }
     } catch (error) {
         functions.logger.warn(`Failed to fetch wishlist for birthday ${birthday.id}`, error);
     }

     if (language === 'en') {
         description += wishlistText;
         description += `Gregorian Birth Date: ${birthday.birth_date_gregorian}\n`;
         description += `Hebrew Birth Date: ${birthday.birth_date_hebrew_string || ''}\n`;
     } else {
         description += wishlistText;
         description += `תאריך לידה לועזי: ${birthday.birth_date_gregorian}\n`;
         description += `תאריך לידה עברי: ${birthday.birth_date_hebrew_string || ''}\n`;
     }
     
     if (birthday.after_sunset) {
         description += language === 'en' ? '⚠️ After Sunset\n' : '⚠️ לאחר השקיעה\n';
     }
     
     if (group) {
         description += parentGroup ? `\n(${parentGroup.name}: ${group.name})` : `\n(${group.name})`;
     }
     if (birthday.notes) {
         description += language === 'en' ? `\n\nNotes: ${birthday.notes}` : `\n\nהערות: ${birthday.notes}`;
     }

     const extendedProperties = {
        private: {
            createdByApp: 'hebbirthday',
            tenantId: birthday.tenant_id,
            birthdayId: birthday.id || 'unknown'
        }
     };
     
     // Zodiacs
     const gregorianSign = getGregorianZodiacSign(new Date(birthday.birth_date_gregorian));
     const hebrewSign = birthday.birth_date_hebrew_month ? getHebrewZodiacSign(birthday.birth_date_hebrew_month) : null;

     const prefs = birthday.calendar_preference_override || tenant?.default_calendar_preference || 'both';
     const doHeb = prefs === 'hebrew' || prefs === 'both';
     const doGreg = prefs === 'gregorian' || prefs === 'both';

     // Helper for Event Object
     const createEvent = (title: string, date: Date, type: 'gregorian' | 'hebrew', year: number, desc: string): SyncEvent => {
        const start = new Date(date);
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return {
            summary: title,
            description: desc,
            start: { date: start.toISOString().split('T')[0] },
            end: { date: end.toISOString().split('T')[0] },
            extendedProperties,
            reminders: { useDefault: false, overrides: [{method:'popup', minutes: 1440}, {method:'popup', minutes: 60}]},
            _type: type,
            _year: year
        }
     };

     if (doGreg) {
         const bDate = new Date(birthday.birth_date_gregorian);
         const curYear = new Date().getFullYear();
         
         let gregDesc = description;
         if (gregorianSign) {
             const signName = language === 'en' ? getZodiacSignNameEn(gregorianSign) : getZodiacSignNameHe(gregorianSign);
             gregDesc += language === 'en' ? `\n\nZodiac Sign: ${signName}` : `\n\nמזל: ${signName}`;
         }

         for (let i=0; i<=10; i++) {
             const y = curYear + i;
             const d = new Date(y, bDate.getMonth(), bDate.getDate());
             const age = y - bDate.getFullYear();
             const title = language === 'en' 
                ? `${birthday.first_name} ${birthday.last_name} | ${age} | Birthday 🎂`
                : `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת לועזי 🎂`;
             
             events.push(createEvent(title, d, 'gregorian', y, gregDesc));
         }
     }

     if (doHeb && birthday.future_hebrew_birthdays) {
         let hebDesc = description;
         if (hebrewSign) {
             const signName = language === 'en' ? getZodiacSignNameEn(hebrewSign) : getZodiacSignNameHe(hebrewSign);
             hebDesc += language === 'en' ? `\n\nZodiac Sign: ${signName}` : `\n\nמזל: ${signName}`;
         }

         birthday.future_hebrew_birthdays.slice(0,10).forEach((item: any) => {
             const dStr = typeof item === 'string' ? item : item.gregorian;
             const hYear = typeof item === 'string' ? 0 : item.hebrewYear;
             const d = new Date(dStr);
             const age = (hYear && birthday.hebrew_year) ? hYear - birthday.hebrew_year : 0;
             const title = language === 'en' 
                ? `${birthday.first_name} ${birthday.last_name} | ${age} | Hebrew Birthday 🎂`
                : `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת עברי 🎂`;

             events.push(createEvent(title, d, 'hebrew', hYear, hebDesc));
         });
     }
     
     return events;
}

export const removeBirthdayFromGoogleCalendar = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { birthdayId } = data;
  if (!birthdayId) {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  const rateLimitRef = db.collection('rate_limits').doc(`${context.auth.uid}_calendar_remove`);
  const rateLimitDoc = await rateLimitRef.get();

  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 20;

  if (rateLimitDoc.exists) {
    const rateLimitData = rateLimitDoc.data();
    const requests = rateLimitData?.requests || [];
    const recentRequests = requests.filter((timestamp: number) => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      throw new functions.https.HttpsError('resource-exhausted', 'auth.errors.tooManyRequests');
    }

    await rateLimitRef.update({ requests: [...recentRequests, now] });
  } else {
    await rateLimitRef.set({ requests: [now] });
  }

  try {
    const birthdayDoc = await db.collection('birthdays').doc(birthdayId).get();

    if (!birthdayDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Birthday not found');
    }

    const birthday = birthdayDoc.data();
    if (!birthday || (!birthday.googleCalendarEventId && !birthday.googleCalendarEventIds && !birthday.googleCalendarEventsMap)) {
      throw new functions.https.HttpsError('not-found', 'Birthday not synced');
    }

    const accessToken = await getValidAccessToken(context.auth.uid);
    const calendarId = await getCalendarId(context.auth.uid);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    let deletedCount = 0;
    const deletedEventIds = new Set<string>();

    // New Map Support
    if (birthday.googleCalendarEventsMap) {
        for (const key in birthday.googleCalendarEventsMap) {
            const eid = birthday.googleCalendarEventsMap[key];
            try {
                await calendar.events.delete({ calendarId, eventId: eid });
                deletedCount++;
                deletedEventIds.add(eid);
            } catch (e: any) {
                if (e.code!==404 && e.code!==410) functions.logger.warn('Del fail', eid);
            }
        }
    }

    // Legacy Support
    if (birthday.googleCalendarEventIds) {
      const eventIds = birthday.googleCalendarEventIds;

      if (eventIds.gregorian && Array.isArray(eventIds.gregorian)) {
        for (const eventId of eventIds.gregorian) {
          try {
            await calendar.events.delete({ calendarId: calendarId, eventId });
            deletedCount++;
            deletedEventIds.add(eventId);
            functions.logger.log(`Deleted gregorian event ${eventId} from calendar ${calendarId}`);
          } catch (err: any) {
            if (err.code !== 404) {
              functions.logger.warn(`Failed to delete gregorian event ${eventId}:`, err);
            }
          }
        }
      }

      if (eventIds.hebrew && Array.isArray(eventIds.hebrew)) {
        for (const eventId of eventIds.hebrew) {
          try {
            await calendar.events.delete({ calendarId: calendarId, eventId });
            deletedCount++;
            deletedEventIds.add(eventId);
            functions.logger.log(`Deleted hebrew event ${eventId} from calendar ${calendarId}`);
          } catch (err: any) {
            if (err.code !== 404) {
              functions.logger.warn(`Failed to delete hebrew event ${eventId}:`, err);
            }
          }
        }
      }
    } else if (birthday.googleCalendarEventId) {
      // מחיקה רק אם eventId קיים במסמך
      try {
        await calendar.events.delete({ calendarId: calendarId, eventId: birthday.googleCalendarEventId });
        deletedCount++;
        deletedEventIds.add(birthday.googleCalendarEventId);
        functions.logger.log(`Deleted event ${birthday.googleCalendarEventId} from calendar ${calendarId}`);
      } catch (err: any) {
        if (err.code !== 404) {
          throw err;
        }
      }
    }

    // חיפוש נוסף לפי privateExtendedProperty למציאת אירועים שלא נשמרו ב-Firestore
    let pageToken: string | undefined = undefined;
    do {
      try {
        const response: any = await calendar.events.list({
          calendarId,
          privateExtendedProperty: [
            'createdByApp=hebbirthday',
            `birthdayId=${birthdayId}`
          ],
          maxResults: 250,
          pageToken,
          singleEvents: true
        });

        const events = response.data.items || [];
        
        for (const event of events) {
          if (event.id && !deletedEventIds.has(event.id)) {
            try {
              await calendar.events.delete({ calendarId, eventId: event.id });
              deletedCount++;
              deletedEventIds.add(event.id);
              functions.logger.log(`Deleted orphan event ${event.id} from calendar ${calendarId}`);
            } catch (err: any) {
              if (err.code !== 404 && err.code !== 410) {
                functions.logger.warn(`Failed to delete orphan event ${event.id}:`, err);
              }
            }
          }
        }

        pageToken = response.data.nextPageToken || undefined;
      } catch (err: any) {
        functions.logger.warn(`Error searching for orphan events:`, err);
        break;
      }
    } while (pageToken);

    await db.collection('birthdays').doc(birthdayId).update({
      googleCalendarEventId: admin.firestore.FieldValue.delete(),
      googleCalendarEventIds: admin.firestore.FieldValue.delete(),
      googleCalendarEventsMap: admin.firestore.FieldValue.delete(), // Cleanup map too
      lastSyncedAt: admin.firestore.FieldValue.delete()
    });

    functions.logger.log(`Removed ${deletedCount} events for birthday ${birthdayId} from Google Calendar`);

    return { success: true, message: 'googleCalendar.syncSuccess' };
  } catch (error: any) {
    functions.logger.error(`Error removing birthday ${birthdayId}:`, error);

    if (error.code === 404) {
      await db.collection('birthdays').doc(birthdayId).update({
        googleCalendarEventId: admin.firestore.FieldValue.delete(),
        googleCalendarEventIds: admin.firestore.FieldValue.delete(),
        googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
        lastSyncedAt: admin.firestore.FieldValue.delete()
      });

      return { success: true, message: 'googleCalendar.syncSuccess' };
    }

    if (error.code === 401 || error.code === 403) {
      throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }

    throw new functions.https.HttpsError('internal', 'googleCalendar.syncError');
  }
});

export const resetBirthdaySyncData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
    }
    const { birthdayId } = data;
    if (!birthdayId) {
        throw new functions.https.HttpsError('invalid-argument', 'Birthday ID required');
    }

    try {
        await db.collection('birthdays').doc(birthdayId).update({
            googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
            googleCalendarEventId: admin.firestore.FieldValue.delete(),
            googleCalendarEventIds: admin.firestore.FieldValue.delete(),
            syncedCalendarId: admin.firestore.FieldValue.delete(),
            lastSyncedAt: admin.firestore.FieldValue.delete()
        });
        return { success: true, message: 'Sync data reset successfully' };
    } catch (error: any) {
        functions.logger.error('Error resetting sync data:', error);
        throw new functions.https.HttpsError('internal', 'Failed to reset sync data');
    }
});

export const deleteAllSyncedEventsFromGoogleCalendar = functions.runWith({
    timeoutSeconds: 540,
    memory: '256MB'
}).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { tenantId, forceDBOnly } = data; // Add forceDBOnly param
  if (!tenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  try {
    const accessToken = await getValidAccessToken(context.auth.uid);
    const calendarId = await getCalendarId(context.auth.uid);
    const calendarName = await getCalendarName(context.auth.uid); // Get name

    const birthdaysSnapshot = await db.collection('birthdays')
      .where('tenant_id', '==', tenantId)
      .get();

    // Strict Mode: Filter birthdays to only those synced to the current calendar
    const docsToProcess = birthdaysSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.syncedCalendarId && data.syncedCalendarId === calendarId;
    });

    // If forceDBOnly is true, we just clean the DB (Reset Mode for Tenant)
    if (forceDBOnly) {
        const batch = db.batch();
        docsToProcess.forEach(doc => {
            batch.update(doc.ref, {
                googleCalendarEventIds: admin.firestore.FieldValue.delete(),
                googleCalendarEventId: admin.firestore.FieldValue.delete(),
                googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
                syncedCalendarId: admin.firestore.FieldValue.delete(),
                lastSyncedAt: admin.firestore.FieldValue.delete()
            });
        });
        await batch.commit();
        functions.logger.log(`Force DB Clean performed for tenant ${tenantId} on calendar ${calendarId}`);
        return { success: true, message: 'DB Sync data cleared', totalDeleted: 0, calendarName };
    }

    // Regular deletion flow continues...
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // ... rest of the function ...

    // איסוף כל ה-Event IDs למחיקה
    const allEventIdsToDelete: { eventId: string, birthdayId: string }[] = [];

    for (const doc of docsToProcess) {
      const birthday = doc.data();
      // Collect from Map
      if (birthday.googleCalendarEventsMap) {
          Object.values(birthday.googleCalendarEventsMap).forEach((eventId: any) => {
              allEventIdsToDelete.push({ eventId, birthdayId: doc.id });
          });
      }
      // Legacy
      if (birthday.googleCalendarEventIds) {
        const eventIds = birthday.googleCalendarEventIds;
        if (eventIds.gregorian && Array.isArray(eventIds.gregorian)) {
          eventIds.gregorian.forEach((eventId: string) => {
            allEventIdsToDelete.push({ eventId, birthdayId: doc.id });
          });
        }
        if (eventIds.hebrew && Array.isArray(eventIds.hebrew)) {
          eventIds.hebrew.forEach((eventId: string) => {
            allEventIdsToDelete.push({ eventId, birthdayId: doc.id });
          });
        }
      } else if (birthday.googleCalendarEventId) {
        allEventIdsToDelete.push({ eventId: birthday.googleCalendarEventId, birthdayId: doc.id });
      }
    }

    let totalDeleted = 0;
    let failedCount = 0;
    const deletedEventIds = new Set<string>();

    // Chunking + Parallel Processing + Throttling
    const CHUNK_SIZE = 10;
    const DELAY_BETWEEN_CHUNKS = 1000; // 1 second

    for (let i = 0; i < allEventIdsToDelete.length; i += CHUNK_SIZE) {
      const chunk = allEventIdsToDelete.slice(i, i + CHUNK_SIZE);
      
      const deletePromises = chunk.map(async ({ eventId }) => {
        try {
          await calendar.events.delete({ calendarId, eventId });
          deletedEventIds.add(eventId);
          return { success: true };
        } catch (err: any) {
          if (err.code !== 404 && err.code !== 410) {
            functions.logger.warn(`Failed to delete event ${eventId}:`, err);
            return { success: false };
          }
          deletedEventIds.add(eventId); // Count as deleted if not found
          return { success: true };
        }
      });

      const results = await Promise.all(deletePromises);
      results.forEach(result => {
        if (result.success) {
          totalDeleted++;
        } else {
          failedCount++;
        }
      });

      // Delay between chunks (except for the last one)
      if (i + CHUNK_SIZE < allEventIdsToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
      }
    }

    // עדכון Firestore בבת אחת
    const batch = db.batch();
    for (const doc of docsToProcess) {
      const birthday = doc.data();
      if (birthday.googleCalendarEventIds || birthday.googleCalendarEventId || birthday.googleCalendarEventsMap || birthday.syncedCalendarId) {
        batch.update(doc.ref, {
          googleCalendarEventIds: admin.firestore.FieldValue.delete(),
          googleCalendarEventId: admin.firestore.FieldValue.delete(),
          googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
          syncedCalendarId: admin.firestore.FieldValue.delete(), // Clear syncedCalendarId too
          lastSyncedAt: admin.firestore.FieldValue.delete()
        });
      }
    }
    await batch.commit();

    // חיפוש נוסף לפי privateExtendedProperty למציאת כל האירועים שנוצרו על ידי האפליקציה (Orphans)
    let pageToken: string | undefined = undefined;
    do {
      try {
        const response: any = await calendar.events.list({
          calendarId,
          privateExtendedProperty: [
            'createdByApp=hebbirthday'
          ],
          maxResults: 250,
          pageToken,
          singleEvents: true
        });

        const events = response.data.items || [];
        const orphanEvents = events.filter((e: any) => e.id && !deletedEventIds.has(e.id));
        
        // מחיקת אירועים יתומים ב-Chunks
        for (let i = 0; i < orphanEvents.length; i += CHUNK_SIZE) {
            const chunk = orphanEvents.slice(i, i + CHUNK_SIZE);
            const deletePromises = chunk.map(async (event: any) => {
                try {
                    await calendar.events.delete({ calendarId, eventId: event.id });
                    totalDeleted++;
                    deletedEventIds.add(event.id);
                    functions.logger.log(`Deleted orphan event ${event.id}`);
                } catch (err: any) {
                    if (err.code !== 404 && err.code !== 410) {
                        failedCount++;
                        functions.logger.warn(`Failed to delete orphan event ${event.id}:`, err);
                    }
                }
            });
            await Promise.all(deletePromises);
            if (i + CHUNK_SIZE < orphanEvents.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
            }
        }

        pageToken = response.data.nextPageToken || undefined;
      } catch (err: any) {
        functions.logger.warn(`Error searching for orphan events:`, err);
        break;
      }
    } while (pageToken);

    functions.logger.log(`Deleted ${totalDeleted} events from Google Calendar for tenant ${tenantId}. Failed: ${failedCount}`);

    return {
      success: true,
      totalDeleted,
      failedCount,
      calendarName, // Return calendar name
      message: 'googleCalendar.deleteAllSummary'
    };
  } catch (error: any) {
    functions.logger.error('Error deleting all synced events:', error);

    if (error.code === 401 || error.code === 403) {
      throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }

    throw new functions.https.HttpsError('internal', 'googleCalendar.syncError');
  }
});

export const disconnectGoogleCalendar = functions.runWith({
    timeoutSeconds: 540,
    memory: '256MB'
}).https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  try {
    // Delete only the token document, preserving birthday data for safe reconnect
    await db.collection('googleCalendarTokens').doc(context.auth.uid).delete();

    functions.logger.log(`Disconnected Google Calendar for user ${context.auth.uid}`);

    return { success: true, message: 'googleCalendar.disconnect' };
  } catch (error) {
    functions.logger.error('Error disconnecting Google Calendar:', error);
    throw new functions.https.HttpsError('internal', 'googleCalendar.syncError');
  }
});

export const getGoogleCalendarStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const userId = context.auth.uid;

  try {
    // 1. Check Token Existence & Validity
    const tokenDoc = await db.collection('googleCalendarTokens').doc(userId).get();
    if (!tokenDoc.exists) {
        return { isConnected: false };
    }
    const tokenData = tokenDoc.data();
    if (!tokenData || !tokenData.accessToken) {
        return { isConnected: false };
    }

    // 2. Get Account Info (Email, etc.) from Google
    // We use the stored token (refresh if needed via getValidAccessToken)
    let email = '';
    let name = '';
    let picture = '';
    
    try {
        const accessToken = await getValidAccessToken(userId);
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        email = userInfo.data.email || '';
        name = userInfo.data.name || '';
        picture = userInfo.data.picture || '';
    } catch (e) {
        functions.logger.warn(`Failed to fetch Google User Info for ${userId}`, e);
        // Don't fail the whole status check, just mark as potentially disconnected if token invalid
        // But getValidAccessToken should have thrown if invalid.
    }

    // 3. Get Sync History
    const historySnapshot = await db.collection('users').doc(userId).collection('sync_history')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
    
    const recentActivity = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toMillis() || 0
    }));

    return {
        isConnected: true,
        email,
        name,
        picture,
        calendarId: tokenData.calendarId || 'primary',
        calendarName: tokenData.calendarName || 'Primary Calendar',
        syncStatus: tokenData.syncStatus || 'IDLE',
        lastSyncStart: tokenData.lastSyncStart?.toMillis() || 0,
        recentActivity
    };

  } catch (error: any) {
    functions.logger.error('Error getting calendar status:', error);
    if (error.code === 401 || error.code === 403 || error.message === 'googleCalendar.connectFirst') {
        return { isConnected: false };
    }
    throw new functions.https.HttpsError('internal', 'Failed to get status');
  }
});

export const getGoogleAccountInfo = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  try {
    const accessToken = await getValidAccessToken(context.auth.uid);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      success: true,
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture
    };
  } catch (error: any) {
    functions.logger.error('Error getting Google account info:', error);

    if (error.code === 401 || error.code === 403) {
      throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }

    throw new functions.https.HttpsError('internal', 'common.error');
  }
});

export const createGoogleCalendar = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { name } = data;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  try {
    const accessToken = await getValidAccessToken(context.auth.uid);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // יצירת יומן חדש וקריאת נתונים במקביל
    const [calendarResponse, tokenDoc] = await Promise.all([
      calendar.calendars.insert({
        requestBody: {
          summary: name.trim(),
          description: 'Birthday Calendar - Created by Hebrew Birthday App / יומן ימי הולדת - נוצר על ידי אפליקציית ימי הולדת עבריים'
        }
      }),
      db.collection('googleCalendarTokens').doc(context.auth.uid).get()
    ]);

    if (!calendarResponse.data.id) {
      throw new Error('No calendar ID returned');
    }

    const calendarId = calendarResponse.data.id;
    const calendarName = calendarResponse.data.summary || name.trim();

    // קריאת המסמך הנוכחי כדי לקבל את createdCalendars הקיים
    // const tokenDoc = await db.collection('googleCalendarTokens').doc(context.auth.uid).get(); // Fetched in parallel above
    const tokenData = tokenDoc.data();
    const existingCreatedCalendars = tokenData?.createdCalendars || [];

    // בדיקה שהיומן לא קיים כבר ברשימה
    const calendarExists = existingCreatedCalendars.some((cal: any) => cal.calendarId === calendarId);
    if (calendarExists) {
      functions.logger.warn(`Calendar ${calendarId} already exists in createdCalendars`);
    }

    // הוספת היומן החדש לרשימה
    const newCalendarEntry = {
      calendarId: calendarId,
      calendarName: calendarName,
      createdAt: new Date().toISOString()
    };

    const updatedCreatedCalendars = [...existingCreatedCalendars, newCalendarEntry];

    // עדכון הטוקן עם פרטי היומן החדש והוספה ל-createdCalendars
    await db.collection('googleCalendarTokens').doc(context.auth.uid).update({
      calendarId: calendarId,
      calendarName: calendarName,
      createdCalendars: updatedCreatedCalendars,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.log(`Created Google Calendar ${calendarId} for user ${context.auth.uid}`);

    return {
      success: true,
      calendarId: calendarId,
      calendarName: calendarName,
      message: 'googleCalendar.createCalendar'
    };
  } catch (error: any) {
    functions.logger.error('Error creating Google Calendar:', error);

    if (error.code === 401 || error.code === 403) {
      throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }

    throw new functions.https.HttpsError('internal', 'common.error');
  }
});

export const updateGoogleCalendarSelection = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { calendarId, calendarName } = data;
  if (!calendarId || typeof calendarId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  // Strict Mode: Block 'primary' selection
  if (calendarId === 'primary') {
      throw new functions.https.HttpsError('failed-precondition', 'googleCalendar.primaryNotAllowed');
  }

  try {
    // עדכון הטוקן עם פרטי היומן הנבחר
    await db.collection('googleCalendarTokens').doc(context.auth.uid).update({
      calendarId: calendarId,
      calendarName: calendarName || 'Custom Calendar',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.log(`Updated calendar selection to ${calendarId} for user ${context.auth.uid}`);

    return {
      success: true,
      message: 'googleCalendar.selectCalendar'
    };
  } catch (error: any) {
    functions.logger.error('Error updating calendar selection:', error);
    throw new functions.https.HttpsError('internal', 'common.error');
  }
});

export const listGoogleCalendars = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  try {
    const accessToken = await getValidAccessToken(context.auth.uid);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // קבלת רשימת יומנים
    const calendarsList = await calendar.calendarList.list({
      minAccessRole: 'writer' // רק יומנים שיש לנו הרשאה לכתוב בהם
    });

    const calendars = calendarsList.data.items || [];
    
    // מיפוי לרשימה פשוטה
    const calendarsListFormatted = calendars.map((cal: any) => ({
      id: cal.id,
      summary: cal.summary || cal.id,
      description: cal.description || '',
      primary: cal.primary || false,
      accessRole: cal.accessRole
    }));

    functions.logger.log(`Listed ${calendarsListFormatted.length} calendars for user ${context.auth.uid}`);

    return {
      success: true,
      calendars: calendarsListFormatted
    };
  } catch (error: any) {
    functions.logger.error('Error listing Google Calendars:', error);

    if (error.code === 401 || error.code === 403) {
      throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }

    throw new functions.https.HttpsError('internal', 'common.error');
  }
});

export const deleteGoogleCalendar = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { calendarId } = data;
  if (!calendarId || typeof calendarId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  try {
    const accessToken = await getValidAccessToken(context.auth.uid);

    // קריאת המסמך כדי לבדוק את createdCalendars וה-calendarId הנוכחי
    const tokenDoc = await db.collection('googleCalendarTokens').doc(context.auth.uid).get();
    if (!tokenDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'googleCalendar.connectFirst');
    }

    const tokenData = tokenDoc.data();
    const createdCalendars = tokenData?.createdCalendars || [];
    const currentCalendarId = tokenData?.calendarId;

    // בדיקה שה-calendarId נמצא ב-createdCalendars (יומנים שנוצרו אחרי הוספת הפיצ'ר)
    let calendarEntry = createdCalendars.find((cal: any) => cal.calendarId === calendarId);
    
    // אם לא נמצא ב-createdCalendars, נבדוק לפי description (יומנים שנוצרו לפני הוספת הפיצ'ר)
    if (!calendarEntry) {
      try {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        // קבלת פרטי היומן מ-Google Calendar API
        const calendarInfo = await calendar.calendars.get({
          calendarId: calendarId
        });
        
        // בדיקה שה-description מכיל את הטקסט שמזהה יומנים שנוצרו על ידי האפליקציה
        const description = calendarInfo.data.description || '';
        if (!description.includes('יומן ימי הולדת - נוצר על ידי אפליקציית ימי הולדת עבריים') &&
            !description.includes('Birthday Calendar - Created by Hebrew Birthday App')) {
          throw new functions.https.HttpsError('permission-denied', 'googleCalendar.deleteCalendarWarning');
        }
        
        // אם הגענו לכאן, היומן נוצר על ידי האפליקציה (לפי description)
        functions.logger.log(`Calendar ${calendarId} verified as created by app via description check`);
      } catch (error: any) {
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        // אם יש שגיאה בקבלת פרטי היומן, נזרוק שגיאה
        if (error.code === 404) {
          throw new functions.https.HttpsError('not-found', 'googleCalendar.syncError');
        }
        throw new functions.https.HttpsError('permission-denied', 'googleCalendar.deleteCalendarWarning');
      }
    }

    // בדיקה שההיומן לא נוכחי
    if (currentCalendarId === calendarId) {
      throw new functions.https.HttpsError('failed-precondition', 'googleCalendar.deleteCalendarWarning');
    }

    // אם היומן נמצא ב-createdCalendars, נסיר אותו מהרשימה אחרי המחיקה
    const shouldRemoveFromCreatedCalendars = !!calendarEntry;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // בדיקה אם יש אירועים ביומן
    const eventsResponse = await calendar.events.list({
      calendarId: calendarId,
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime'
    });

    if (eventsResponse.data.items && eventsResponse.data.items.length > 0) {
      throw new functions.https.HttpsError('failed-precondition', 'googleCalendar.deleteCalendarWarning');
    }

    // מחיקת היומן מ-Google Calendar API
    await calendar.calendars.delete({
      calendarId: calendarId
    });

    // הסרת היומן מ-createdCalendars (רק אם הוא היה שם)
    if (shouldRemoveFromCreatedCalendars) {
      const updatedCreatedCalendars = createdCalendars.filter((cal: any) => cal.calendarId !== calendarId);
      await db.collection('googleCalendarTokens').doc(context.auth.uid).update({
        createdCalendars: updatedCreatedCalendars,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    functions.logger.log(`Deleted Google Calendar ${calendarId} for user ${context.auth.uid}`);

    return {
      success: true,
      message: 'googleCalendar.deleteCalendar'
    };
  } catch (error: any) {
    functions.logger.error('Error deleting Google Calendar:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    if (error.code === 401 || error.code === 403) {
      throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }

    if (error.code === 404) {
      throw new functions.https.HttpsError('not-found', 'googleCalendar.syncError');
    }

    throw new functions.https.HttpsError('internal', 'common.error');
  }
});

export const cleanupOrphanEvents = functions.runWith({
    timeoutSeconds: 540,
    memory: '256MB'
}).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { tenantId, dryRun } = data; // Added dryRun
  // Optional: validate tenantId if we want to restrict user to their tenant. 
  // For now, we rely on the user token to only access their calendar.

  try {
    const accessToken = await getValidAccessToken(context.auth.uid);
    const calendarId = await getCalendarId(context.auth.uid);
    const calendarName = await getCalendarName(context.auth.uid); // Get name

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    let pageToken: string | undefined = undefined;
    let deletedCount = 0;
    let failedCount = 0;
    let foundCount = 0; // For dry run

    do {
        const response: any = await calendar.events.list({
            calendarId,
            privateExtendedProperty: [
                'createdByApp=hebbirthday',
                ...(tenantId ? [`tenantId=${tenantId}`] : [])
            ],
            maxResults: 250,
            pageToken,
            singleEvents: true
        });

        const events = response.data.items || [];
        
        for (const event of events) {
            if (event.id) {
                foundCount++;
                if (!dryRun) {
                    try {
                        await calendar.events.delete({ calendarId, eventId: event.id });
                        deletedCount++;
                    } catch (error) {
                        functions.logger.warn(`Failed to delete orphan event ${event.id}:`, error);
                        failedCount++;
                    }
                }
            }
        }

        pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    functions.logger.log(`Cleanup orphans for tenant ${tenantId || 'unknown'}: Found ${foundCount}, Deleted ${deletedCount}, Failed ${failedCount}`);

    return {
        success: true,
        deletedCount: dryRun ? foundCount : deletedCount, // Return found count as deletedCount in dryRun for simplicity or add separate field
        foundCount, // Explicit count
        failedCount,
        calendarName, // Return calendar name
        message: 'googleCalendar.cleanupOrphans'
    };

  } catch (error: any) {
    functions.logger.error('Error cleaning orphan events:', error);
    if (error.code === 401 || error.code === 403) {
        throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }
    throw new functions.https.HttpsError('internal', 'common.error');
  }
});

export const previewDeletion = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { tenantId } = data;
  if (!tenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  try {
    const calendarId = await getCalendarId(context.auth.uid);
    const calendarName = await getCalendarName(context.auth.uid);

    const birthdaysSnapshot = await db.collection('birthdays')
      .where('tenant_id', '==', tenantId)
      .get();

    const summary: { name: string, hebrewEvents: number, gregorianEvents: number }[] = [];
    let totalCount = 0;

    for (const doc of birthdaysSnapshot.docs) {
       const birthday = doc.data();
       
       // Strict Mode: Check syncedCalendarId
       if (!birthday.syncedCalendarId || birthday.syncedCalendarId !== calendarId) {
           continue;
       }

       // Support Map
       if (birthday.googleCalendarEventsMap) {
           const count = Object.keys(birthday.googleCalendarEventsMap).length;
           if (count > 0) {
               summary.push({
                   name: `${birthday.first_name} ${birthday.last_name}`,
                   hebrewEvents: count, // Simplified for summary
                   gregorianEvents: 0
               });
               totalCount += count;
           }
           continue; // Skip legacy check if map exists
       }

       const eventIds = birthday.googleCalendarEventIds;
       let hebrewCount = 0;
       let gregorianCount = 0;

       if (eventIds) {
           if (eventIds.hebrew && Array.isArray(eventIds.hebrew)) {
               hebrewCount = eventIds.hebrew.length;
           }
           if (eventIds.gregorian && Array.isArray(eventIds.gregorian)) {
               gregorianCount = eventIds.gregorian.length;
           }
       } else if (birthday.googleCalendarEventId) {
           // Legacy single event
           gregorianCount = 1; 
       }

       if (hebrewCount > 0 || gregorianCount > 0) {
           summary.push({
               name: `${birthday.first_name} ${birthday.last_name}`,
               hebrewEvents: hebrewCount,
               gregorianEvents: gregorianCount
           });
           totalCount += hebrewCount + gregorianCount;
       }
    }

    return {
        success: true,
        summary,
        totalCount,
        calendarId,   // Return calendar ID
        calendarName  // Return calendar name
    };

  } catch (error: any) {
    functions.logger.error('Error previewing deletion:', error);
    throw new functions.https.HttpsError('internal', 'common.error');
  }
});

export const getAccountDeletionSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { tenantId } = data;
  if (!tenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  try {
    const birthdaysCount = await db.collection('birthdays')
      .where('tenant_id', '==', tenantId)
      .count()
      .get();

    const groupsCount = await db.collection('groups')
      .where('tenant_id', '==', tenantId)
      .count()
      .get();

    return {
      birthdaysCount: birthdaysCount.data().count,
      groupsCount: groupsCount.data().count
    };
  } catch (error) {
    functions.logger.error('Error getting account deletion summary:', error);
    throw new functions.https.HttpsError('internal', 'common.error');
  }
});

export const deleteAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'auth.signIn');
  }

  const { tenantId } = data;
  const userId = context.auth.uid;

  if (!tenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'validation.required');
  }

  // Verify tenant ownership
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Tenant not found');
  }

  const tenantData = tenantDoc.data();
  if (tenantData?.owner_id !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Only the owner can delete the account');
  }

  try {
    const bulkWriter = db.bulkWriter();

    // 1. Delete Birthdays
    const birthdaysSnapshot = await db.collection('birthdays')
      .where('tenant_id', '==', tenantId)
      .get();
    
    birthdaysSnapshot.docs.forEach(doc => {
      bulkWriter.delete(doc.ref);
    });

    // 2. Delete Groups
    const groupsSnapshot = await db.collection('groups')
      .where('tenant_id', '==', tenantId)
      .get();

    groupsSnapshot.docs.forEach(doc => {
      bulkWriter.delete(doc.ref);
    });

    // 3. Delete Tenant Members
    const membersSnapshot = await db.collection('tenant_members')
      .where('tenant_id', '==', tenantId)
      .get();

    membersSnapshot.docs.forEach(doc => {
      bulkWriter.delete(doc.ref);
    });

    // 4. Delete Tenant
    bulkWriter.delete(tenantDoc.ref);

    // 5. Delete User Document (if exists)
    // Note: The user document ID is the same as the Auth UID
    const userRef = db.collection('users').doc(userId);
    bulkWriter.delete(userRef);

    // Execute all Firestore deletions
    await bulkWriter.close();

    // 6. Delete User from Authentication
    await admin.auth().deleteUser(userId);

    functions.logger.log(`Successfully deleted account for user ${userId} and tenant ${tenantId}`);

    return { success: true };
  } catch (error) {
    functions.logger.error('Error deleting account:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete account');
  }
});
