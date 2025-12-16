# 🚀 START HERE - Quick Guide

> **חדש בפרויקט? קרא את זה קודם!**

---

## 📚 תיעוד - סדר קריאה

קרא במקביל לעבודה (לא חייב הכל מראש):

1. **[README.md](./README.md)** ⏱️ 5 דק'
   - מה זה הפרויקט
   - איך מתקינים
   - פקודות בסיסיות

2. **[DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md)** ⏱️ 15 דק' - **קריטי!**
   - בעיות נפוצות ופתרונות
   - דברים שאסור לעשות
   - Best practices

3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** ⏱️ 10 דק'
   - מבנה הקוד (Clean Architecture)
   - איפה כל דבר נמצא
   - איך להוסיף פיצ'רים

4. **[DEPENDENCIES.md](./DEPENDENCIES.md)** ⏱️ 5 דק'
   - איזה גרסאות להשתמש
   - מה לא לשדרג
   - תאימות

5. **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** ⏱️ 3 דק'
   - מה עובד
   - מה לא עובד
   - Roadmap

---

## 🎯 Setup מהיר (10 דקות)

```bash
# 1. Clone
git clone <repo>
cd HebBirthdayv3cv2/v3cv2

# 2. Install
npm install
cd functions && npm install && cd ..

# 3. Firebase
npm install -g firebase-tools
firebase login
firebase use hebbirthday2026

# 4. Run
firebase emulators:start  # Terminal 1
npm run dev              # Terminal 2

# 5. Open browser
# http://localhost:5173 (app)
# http://localhost:4000 (emulator UI)
```

---

## ⚠️ דברים קריטיים - תזכור!

### 1. אימולטור ≠ פרודקשן

**באימולטור:**
```typescript
created_at: new Date().toISOString()  // Workaround
```

**בפרודקשן:**
```typescript
created_at: admin.firestore.FieldValue.serverTimestamp()
```

**לפני דפלוי:** `grep -r "Workaround" functions/src/`

### 2. CommonJS במקום ESM

**Backend (functions/):**
```typescript
const admin = require('firebase-admin');  // ✅
module.exports = { ... };                 // ✅
```

```typescript
import admin from 'firebase-admin';  // ❌ לא!
export default { ... };              // ❌ לא!
```

### 3. לא להשתמש ב-undefined

```typescript
// ❌ שגיאה!
await update({ field: undefined });

// ✅ נכון
await update({ field: admin.firestore.FieldValue.delete() });
```

### 4. functions.config() רק בתוך פונקציות

```typescript
// ❌ ברמת המודול - timeout!
const config = functions.config().google;

// ✅ בתוך פונקציה
function createDeps() {
  const config = functions.config().google;
}
```

---

## 🗂️ מבנה מהיר

```
v3cv2/
├── src/                 # Frontend (React)
├── functions/src/       # Backend (Firebase Functions)
│   ├── domain/          # לוגיקה עסקית טהורה
│   ├── application/     # Use cases
│   ├── infrastructure/  # DB, APIs
│   └── interfaces/      # Entry points
├── DEVELOPMENT_NOTES.md # ⭐ קרא את זה!
├── ARCHITECTURE.md
├── DEPENDENCIES.md
└── README.md
```

---

## 🐛 נתקעת? עזרה מהירה

### שגיאה: "Failed to load function definition"
➡️ [DEVELOPMENT_NOTES.md - בעיה #5](./DEVELOPMENT_NOTES.md#בעיה-5-firebase-functions-timeout-באתחול)

### שגיאה: "Cannot use undefined"
➡️ [DEVELOPMENT_NOTES.md - בעיה #3](./DEVELOPMENT_NOTES.md#בעיה-3-מחיקת-שדות-מ-firestore)

### onUserCreate לא יוצר tenants
➡️ [DEVELOPMENT_NOTES.md - בעיה #1](./DEVELOPMENT_NOTES.md#בעיה-1-onusercreate-לא-יוצר-tenantstenant_members)

### after_sunset לא עובד
➡️ [DEVELOPMENT_NOTES.md - בעיה #4](./DEVELOPMENT_NOTES.md#בעיה-4-immutable-objects-hebcal)

---

## 📋 Checklist יומי

**לפני שמתחיל לעבוד:**
- [ ] `git pull` - עדכון אחרון
- [ ] אימולטור רץ?
- [ ] Frontend dev server רץ?

**לפני commit:**
- [ ] `npm run build` עובד
- [ ] `cd functions && npm run build` עובד
- [ ] בדקתי שלא שברתי משהו באימולטור

**לפני דפלוי:**
- [ ] החלפתי workarounds (`grep -r "Workaround"`)
- [ ] `serverTimestamp()` במקום `new Date()`
- [ ] עדכנתי `CHANGELOG.md`
- [ ] בדקתי logs לאחר deploy

---

## 💡 Tips

1. **השתמש בלוגים:**
```typescript
functions.logger.info('מתחיל תהליך', { userId, data });
functions.logger.error('שגיאה:', error);
```

2. **בדוק תמיד את DEVELOPMENT_NOTES.md:**
   - רוב הבעיות כבר תועדו שם
   - חסוך זמן!

3. **אל תשנה legacy code:**
   - `guestPortal.ts` - אל תגע!
   - `migration.ts` - אל תגע!
   - אם חייב, תהיה זהיר מאוד

4. **שמור על Clean Architecture:**
   - Domain לא תלוי באף אחד
   - Use DI Container
   - אל תעקוף את השכבות

---

## 🎯 משימות נפוצות

### הוספת פונקציה חדשה:
1. Use Case ב-`application/use-cases/`
2. הוסף ל-DI Container (`interfaces/dependencies.ts`)
3. Entry point ב-`interfaces/http/`
4. Export ב-`index.ts`

### תיקון באג:
1. בדוק `DEVELOPMENT_NOTES.md`
2. הוסף logs
3. תקן
4. עדכן `DEVELOPMENT_NOTES.md`
5. עדכן `CHANGELOG.md`

### שדרוג תלויות:
1. בדוק `DEPENDENCIES.md`
2. `npm outdated`
3. קרא CHANGELOG של החבילה
4. test באימולטור
5. commit

---

## 🚨 Emergency

### הכל קרס? אימולטור לא עובד?

```bash
# 1. נקה הכל
rm -rf node_modules
rm -rf functions/node_modules
rm -rf functions/lib
rm -rf dist

# 2. התקן מחדש
npm install
cd functions && npm install && cd ..

# 3. Build
npm run build
cd functions && npm run build && cd ..

# 4. Restart
firebase emulators:start
```

### דיפלוי קרס?

```bash
# 1. בדוק logs
firebase functions:log

# 2. Roll back
firebase deploy --only functions:oldVersion

# 3. בדוק מה השתנה
git diff HEAD~1

# 4. תקן ודפלוי שוב
```

---

## 📞 עזרה נוספת

1. **קרא את המסמכים** - כל התשובות שם
2. **בדוק Firebase Console logs**
3. **בדוק Git history** - `git log --oneline`
4. **שאל בצ'אט** - אל תשאר תקוע

---

## ✨ Success Checklist

אתה מוכן לעבוד כשאתה יכול ל:
- [ ] להריץ אימולטור בלי שגיאות
- [ ] ליצור משתמש חדש
- [ ] להוסיף יום הולדת
- [ ] לראות המרה לתאריך עברי
- [ ] להבין איפה כל דבר נמצא בקוד

**יש לך את כל אלה? מעולה! צא לדרך! 🚀**

---

**זכור: DEVELOPMENT_NOTES.md הוא החבר הכי טוב שלך!** 📘

**בהצלחה! 💪**


