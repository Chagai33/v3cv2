# 📘 Development Notes - HebBirthday Project

> **מטרה:** מסמך זה מתעד בעיות נפוצות, פתרונות, ו-gotchas שנתקלנו בהם במהלך הפיתוח.
> **קרא את זה לפני שמתחיל לעבוד על הפרויקט!**

---

## 🚨 דברים קריטיים - אל תשנה!

### 1. Module System בפונקציות
```typescript
// ✅ CORRECT - CommonJS (functions/)
module.exports = { ... }
const admin = require('firebase-admin');

// ❌ WRONG - לא ESM!
export default { ... }
import admin from 'firebase-admin';
```
**למה:** Firebase Functions Gen 1 דורש CommonJS. אל תשנה את `"module": "commonjs"` ב-`tsconfig.json`!

### 2. אתחול Firebase Admin
```typescript
// ✅ CORRECT - רק פעם אחת ב-index.ts
admin.initializeApp();

// ❌ WRONG - לא באמצע הקוד
const db = admin.firestore(); // ברמת המודול - לא יעבוד!

// ✅ CORRECT - בתוך פונקציה
export const myFunction = functions.https.onCall(async () => {
  const db = admin.firestore(); // בתוך הפונקציה
});
```

### 3. functions.config() - Timing
```typescript
// ❌ WRONG - ברמת המודול (גורם ל-timeout!)
const GOOGLE_CLIENT_ID = functions.config().google?.client_id;

// ✅ CORRECT - בתוך פונקציה או lazy initialization
export function createDependencies() {
  const GOOGLE_CLIENT_ID = functions.config().google?.client_id;
}
```

---

## 🔥 תיקונים קריטיים - 16 דצמבר 2024

### ⚠️ לולאה אינסופית ב-Firestore Triggers

**הבעיה:**
```typescript
// onBirthdayWrite trigger
await birthdayRepo.update(id, { syncMetadata: {...} });
// ↓ זה מפעיל את onBirthdayWrite שוב!
// ↓ לולאה אינסופית → מאות instances → Rate Limit → 💥
```

**הפתרון:**
```typescript
// ✅ STEP 1: הוסף דגל _systemUpdate
await birthdayRepo.update(id, { 
  syncMetadata: {...},
  _systemUpdate: true  // ← זה!
});

// ✅ STEP 2: דלג על system updates
export const onBirthdayWriteFn = functions.firestore
  .document('birthdays/{birthdayId}')
  .onWrite(async (change, context) => {
    const afterData = change.after.data();
    
    // דלג!
    if (afterData?._systemUpdate) {
      functions.logger.log('Skipping sync - system update');
      return null;
    }
    
    // המשך לסנכרון...
  });
```

**קבצים:**
- `application/use-cases/sync/SyncBirthdayUseCase.ts:302`
- `interfaces/http/birthday-triggers.ts:60-64`
- `domain/entities/types.ts:66`

**איך לזהות:**
```bash
# בלוגים תראה:
onBirthdayWrite... Function execution started
onBirthdayWrite... Function execution started  # ← זהה!
onBirthdayWrite... Function execution started  # ← זהה!
# מאות פעמים ברצף → לולאה!
```

---

### ⚠️ Rate Limit ב-Bulk Sync

**הבעיה:**
```typescript
// ❌ WRONG - force=true מתעלם מ-Hash Check
await syncUseCase.execute(id, data, tenantId, true);
// ↓ סנכרון מחדש של הכל
// ↓ כל אירוע קיים → 409 Conflict → 2 API calls
// ↓ 50 birthdays × 20 events × 2 = 2000 API calls
// ↓ Google Quota: 60/min → 💥
```

**הפתרון:**
```typescript
// ✅ CORRECT - force=false מכבד Hash Check
await syncUseCase.execute(id, data, tenantId, false);
// ↓ בודק Hash
// ↓ אם זהה → Idempotent skip → 0 API calls
// ↓ אם שונה → סנכרון רק מה שהשתנה
```

**קובץ:** `application/use-cases/sync/BulkSyncUseCase.ts:80`

**Hash Check Logic:**
```typescript
// בתוך SyncBirthdayUseCase
if (
  !force &&  // ← אם false, בודק!
  hasMappedEvents && 
  currentData.syncMetadata?.dataHash === currentDataHash && 
  currentData.syncMetadata?.status === 'SYNCED'
) {
  functions.logger.log(`Idempotent skip for ${birthdayId}`);
  return;  // ← יוצא מיד, אפס API calls!
}
```

**תוצאה:**
- לפני: 40 שניות + Rate Limit
- אחרי: 1 שנייה (skip) ✅

---

### ⚠️ טוקן מת (Token Revoked)

**הבעיה:**
```typescript
// משתמש ניתק את החיבור ליומן Google
// הטוקן בוטל לצמיתות
// אבל... המערכת מנסה לסנכרן כל שעה! 💸
```

**הפתרון:**
```typescript
// ✅ STEP 1: זיהוי בGoogle AuthClient
catch (error) {
  if (error.message?.includes('invalid_grant')) {
    // טוקן מת!
    throw new Error('TOKEN_REVOKED');
  }
}

// ✅ STEP 2: סימון ב-SyncBirthdayUseCase
catch (e) {
  if (e.message === 'TOKEN_REVOKED') {
    await update({
      syncMetadata: {
        status: 'ERROR',
        retryCount: 999,  // ← 999 = "אל תנסה שוב"
        lastErrorMessage: 'החיבור ליומן Google נותק'
      }
    });
  }
}

// ✅ STEP 3: דילוג ב-retryFailedSyncs
if (retryCount === 999 || retryCount >= 3) {
  return null;  // דלג!
}
```

**קבצים:**
- `infrastructure/google/GoogleAuthClient.ts:52-71`
- `application/use-cases/sync/SyncBirthdayUseCase.ts:49-68`
- `interfaces/scheduled/retry-syncs.ts:22-27`

---

### ⚠️ כפילות Toast Notifications

**הבעיה:**
```typescript
// Context מציג Toast:
showToast('סונכרן בהצלחה', 'success');

// Component גם מציג Toast:
showToast('יום ההולדת סונכרן ליומן Google בהצלחה', 'success');

// תוצאה: שתי הודעות! 😵
```

**הפתרון:**
```typescript
// ✅ Context - רק לוגיקה, לא UI
if (result.success) {
  setLastSyncTime(new Date());
  // ✅ לא showToast כאן!
  refreshStatus();
}

// ✅ Component - אחראי על UI
const result = await syncSingleBirthday(id);
if (result.success) {
  showToast('יום ההולדת סונכרן בהצלחה', 'success');
}
```

**קבצים:**
- `contexts/GoogleCalendarContext.tsx:139,251`
- `components/birthdays/BirthdayList.tsx:377,400`

---

## 🐛 בעיות נפוצות ופתרונות

### בעיה #1: onUserCreate לא יוצר tenants/tenant_members

**תסמינים:**
- רק `profiles` נוצר
- Custom Claims לא מוגדרים
- "Waiting for Custom Claims" אינסופי

**פתרונות שנמצאו:**

#### א. Logging
```typescript
// ❌ לא לעשות:
console.log('Creating tenant...');

// ✅ תמיד להשתמש ב:
functions.logger.info('Creating tenant...');
functions.logger.error('Error:', error);
```

#### ב. admin.firestore() מיקום
```typescript
// ❌ לא יעבוד:
const db = admin.firestore(); // ברמת המודול
export const onUserCreate = ...

// ✅ יעבוד:
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore(); // בתוך הפונקציה
});
```

#### ג. serverTimestamp באימולטור
```typescript
// ❌ לא עובד באימולטור:
created_at: admin.firestore.FieldValue.serverTimestamp()

// ✅ Workaround לאימולטור:
created_at: new Date().toISOString()

// ⚠️ חשוב: בפרודקשן תמיד להחזיר ל-serverTimestamp()!
```

#### ד. סדר ביצוע
```typescript
// ✅ הסדר הנכון:
await batch.commit();                    // 1. תחילה commit
await admin.auth().setCustomUserClaims(); // 2. אחר כך claims
```

---

### בעיה #2: Firestore Timestamps - אימולטור vs פרודקשן

**הבעיה:**
```typescript
// באימולטור:
data.expiresAt = "2024-01-15T10:30:00.000Z" // string

// בפרודקשן:
data.expiresAt = Timestamp { _seconds: ..., _nanoseconds: ... } // object
```

**פתרון אוניברסלי:**
```typescript
// ✅ עובד בשניהם:
function getTimestampMillis(value: any): number {
  if (typeof value === 'string') {
    return new Date(value).getTime();
  }
  return value?.toMillis?.() || 0;
}

const now = Date.now();
const expiresAt = getTimestampMillis(data.expiresAt);
if (expiresAt <= now) {
  // Expired
}
```

**קבצים מושפעים:**
- `functions/src/guestPortal.ts`
- `functions/src/interfaces/triggers/user-triggers.ts`

---

### בעיה #3: מחיקת שדות מ-Firestore

**הבעיה:**
```typescript
// ❌ לא עובד - Firestore דוחה undefined:
await birthdayRepo.update(id, {
  syncMetadata: undefined,
  lastSyncedAt: undefined
});

// Error: Cannot use "undefined" as a Firestore value
```

**פתרון:**
```typescript
// ✅ להשתמש ב-FieldValue.delete():
await birthdayRepo.update(id, {
  syncMetadata: admin.firestore.FieldValue.delete(),
  lastSyncedAt: admin.firestore.FieldValue.delete()
});
```

**חוק זהב:** 
- `undefined` = ערך לא חוקי
- `FieldValue.delete()` = מחיקה מפורשת
- `null` = ערך חוקי (אבל לא מוחק את השדה)

---

### בעיה #4: Immutable Objects (Hebcal)

**הבאג:**
```typescript
// ❌ לא עובד - next() מחזיר אובייקט חדש!
const hDate = new HDate(date);
if (afterSunset) {
  hDate.next(); // לא משנה את hDate!
}
return hDate.getDate(); // עדיין התאריך הישן
```

**פתרון:**
```typescript
// ✅ צריך לשמור את הערך המוחזר:
let hDate = new HDate(date);
if (afterSunset) {
  hDate = hDate.next(); // שמירת האובייקט החדש
}
return hDate.getDate(); // עכשיו נכון!
```

**דומה ל:**
```javascript
// JavaScript strings הם immutable:
let str = "hello";
str.toUpperCase(); // ❌ לא משנה את str
str = str.toUpperCase(); // ✅ עובד
```

---

### בעיה #5: Firebase Functions Timeout באתחול

**השגיאה:**
```
Failed to load function definition from source: Timeout after 10000
```

**הסיבה:**
```typescript
// ❌ זה קורה בזמן ייבוא המודול - timeout!
const GOOGLE_CLIENT_ID = functions.config().google?.client_id;

export function createDependencies() {
  // השתמש ב-GOOGLE_CLIENT_ID כאן
}
```

**פתרון:**
```typescript
// ✅ העבר את הקריאה לתוך הפונקציה:
export function createDependencies() {
  const GOOGLE_CLIENT_ID = functions.config().google?.client_id;
  // עכשיו זה יעבוד
}
```

**חל גם על:**
- `functions.config()`
- `admin.firestore()`
- `admin.auth()`
- כל קריאה ל-Firebase APIs

---

## 🔧 אימולטור vs פרודקשן

### שינויים נדרשים בין סביבות:

| תכונה | אימולטור | פרודקשן |
|-------|----------|----------|
| **Timestamps** | `new Date().toISOString()` | `admin.firestore.FieldValue.serverTimestamp()` |
| **Timestamp מילישניות** | `new Date(Date.now() + ms).toISOString()` | `admin.firestore.Timestamp.fromMillis(Date.now() + ms)` |
| **Validation** | `typeof value === 'string'` | `value?.toMillis?.()` |

### קבצים שצריכים שינוי לפני דפלוי:
1. ✅ `functions/src/interfaces/triggers/user-triggers.ts` (שורה 13)
2. ✅ `functions/src/guestPortal.ts` (שורות 88, 99-100, 412-413, 435)

### איך לזהות:
חפש בקוד:
```bash
grep -r "new Date().toISOString()" functions/src/
grep -r "Workaround for emulator" functions/src/
```

---

## ⚙️ תצורה קריטית

### TypeScript Config (functions/tsconfig.json)
```json
{
  "compilerOptions": {
    "module": "commonjs",      // ⚠️ אל תשנה ל-ESNext!
    "target": "es2020",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### Package.json (functions/)
```json
{
  "engines": {
    "node": "20"                // ⚠️ Firebase תומך רק ב-Node 18/20
  },
  "main": "lib/index.js"
}
```

### Firebase.json
```json
{
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"  // ⚠️ תמיד build לפני deploy
    ]
  }
}
```

---

## 📝 Best Practices שלמדנו

### 1. Logging
```typescript
// ✅ תמיד:
functions.logger.info('Starting operation', { userId, data });
functions.logger.error('Operation failed', { error: error.message });

// ❌ לעולם לא:
console.log('Something happened');
```

### 2. Error Handling
```typescript
// ✅ תמיד תפוס שגיאות:
try {
  await someOperation();
  functions.logger.info('✅ Operation succeeded');
} catch (error) {
  functions.logger.error('❌ Operation failed:', error);
  throw new functions.https.HttpsError('internal', error.message);
}
```

### 3. Async/Await
```typescript
// ✅ תמיד השתמש ב-async/await:
export const myFunction = functions.https.onCall(async (data, context) => {
  await db.collection('users').doc(userId).update({ ... });
  return { success: true };
});

// ❌ לא promises ישירות:
export const myFunction = functions.https.onCall((data, context) => {
  return db.collection('users').doc(userId).update({ ... })
    .then(() => ({ success: true }));
});
```

### 4. Type Safety
```typescript
// ✅ השתמש ב-TypeScript types:
interface UserData {
  name: string;
  email: string;
  createdAt: admin.firestore.FieldValue;
}

// ⚠️ אל תשתמש ב-any אלא אם חייב:
const data: any = { ... }; // רק אם באמת צריך
```

---

## 🚀 תהליך דפלוי

### Checklist לפני דפלוי:

- [ ] **Build עובר בלי שגיאות:**
  ```bash
  cd functions
  npm run build
  ```

- [ ] **החלפת workarounds לפרודקשן:**
  ```bash
  # חפש:
  grep -r "Workaround for emulator" functions/src/
  grep -r "new Date().toISOString()" functions/src/
  
  # החלף ל:
  # admin.firestore.FieldValue.serverTimestamp()
  ```

- [ ] **בדיקת functions.config():**
  ```bash
  firebase functions:config:get
  ```

- [ ] **בדיקת indexes:**
  ```bash
  # אם שואלים על מחיקת indexes, ענה N אם לא בטוח
  ```

- [ ] **Deploy:**
  ```bash
  firebase deploy --only functions
  # או ספציפי:
  firebase deploy --only functions:myFunctionName
  ```

### לאחר דפלוי:
- [ ] בדוק logs ב-Firebase Console
- [ ] בדוק שכל הפונקציות עלו
- [ ] בצע smoke test על פונקציות קריטיות

---

## 📊 מבנה הפרויקט לאחר רפקטורינג

```
functions/src/
├── index.ts                          # Entry point - exports only
├── domain/
│   ├── entities/
│   │   └── types.ts                  # TypeScript interfaces
│   └── services/
│       ├── HebcalService.ts          # תאריכים עבריים
│       ├── ZodiacService.ts          # מזלות
│       └── EventBuilderService.ts    # בניית אירועי יומן
├── application/
│   └── use-cases/
│       ├── sync/
│       │   ├── SyncBirthdayUseCase.ts
│       │   ├── RemoveSyncUseCase.ts
│       │   └── BulkSyncUseCase.ts
│       ├── birthday/
│       │   └── CalculateHebrewDataUseCase.ts
│       └── calendar/
│           ├── CleanupOrphanEventsUseCase.ts
│           └── ManageCalendarUseCase.ts
├── infrastructure/
│   ├── database/
│   │   └── repositories/
│   │       ├── BirthdayRepository.ts
│   │       ├── TenantRepository.ts
│   │       ├── TokenRepository.ts
│   │       └── WishlistRepository.ts
│   ├── google/
│   │   ├── GoogleAuthClient.ts
│   │   └── GoogleCalendarClient.ts
│   └── tasks/
│       └── CloudTasksClient.ts
├── interfaces/
│   ├── dependencies.ts               # DI Container
│   ├── http/
│   │   ├── calendar-functions.ts
│   │   ├── auth-functions.ts
│   │   ├── birthday-triggers.ts
│   │   ├── job-processors.ts
│   │   └── management-functions.ts
│   ├── scheduled/
│   │   ├── retry-syncs.ts
│   │   └── update-birthdays.ts
│   └── triggers/
│       └── user-triggers.ts
├── shared/
│   ├── constants/
│   │   └── index.ts
│   └── utils/
│       └── calendar-utils.ts
├── guestPortal.ts                    # ⚠️ לא שונה - legacy
└── migration.ts                       # ⚠️ לא שונה - legacy
```

**קבצים שלא שונו:**
- `guestPortal.ts` - עובד כמו שהוא
- `migration.ts` - עובד כמו שהוא
- `index.ts.backup` - גיבוי של הקוד המקורי

---

## 🔐 Secrets & Config

### Firebase Functions Config (Deprecated במרץ 2026!)
```bash
# קריאה:
firebase functions:config:get

# הגדרה:
firebase functions:config:set \
  google.client_id="YOUR_CLIENT_ID" \
  google.client_secret="YOUR_CLIENT_SECRET" \
  google.redirect_uri="postmessage"
```

### העתיד: .env Files
```bash
# צור functions/.env:
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="postmessage"

# בקוד:
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
```

---

## 🆘 דיבאגינג

### לוגים באימולטור:
```bash
# הפעל אימולטור עם logs:
firebase emulators:start

# הלוגים יופיעו בטרמינל
```

### לוגים בפרודקשן:
```bash
# צפה בלוגים live:
firebase functions:log

# לוגים ספציפיים:
firebase functions:log --only myFunctionName

# או ב-Firebase Console:
# https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs
```

### בדיקת שגיאות נפוצות:
```bash
# 1. Functions לא נטענו:
grep "Failed to load" functions-debug.log

# 2. Timeout באתחול:
grep "Timeout" functions-debug.log

# 3. Undefined values:
grep "undefined" functions-debug.log
```

---

## 📞 תמיכה

אם נתקעת:

1. **בדוק logs קודם:** `functions.logger` הוא החבר הכי טוב שלך
2. **חפש במסמך הזה:** רוב הבעיות מתועדות כאן
3. **בדוק את `DEPENDENCIES.md`:** אולי זה בעיית גרסה
4. **קרא את `ARCHITECTURE.md`:** הבנת המבנה עוזרת

---

## ⏱️ Timeline

| תאריך | שינוי | סיבה |
|-------|-------|------|
| דצמבר 2024 | רפקטורינג מלא ל-Clean Architecture | שיפור maintainability |
| דצמבר 2024 | תיקון באג `after_sunset` | `hDate.next()` לא החזיר ערך |
| דצמבר 2024 | תיקון `undefined` ב-Firestore | שימוש ב-`FieldValue.delete()` |
| דצמבר 2024 | תיקון timeout באתחול | העברת `functions.config()` לתוך פונקציות |

---

**עדכון אחרון:** דצמבר 2024  
**גרסה:** 3.0.0 (לאחר רפקטורינג)


