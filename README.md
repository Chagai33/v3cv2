# 🎂 HebBirthday - Hebrew Birthday Management System

> מערכת לניהול ימי הולדת עבריים ולועזיים עם סנכרון ליומן גוגל

**גרסה:** 3.0.0  
**עדכון אחרון:** דצמבר 2024

---

## 📚 תיעוד

📖 **קרא את המסמכים הבאים לפני שמתחיל:**

1. **[USER_GUIDE.md](./USER_GUIDE.md)** - 📘 המדריך המלא למשתמש
2. **[DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md)** - בעיות נפוצות, פתרונות, gotchas
3. **[DEPENDENCIES.md](./DEPENDENCIES.md)** - כל התלויות והגרסאות
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - מבנה הפרויקט (Clean Architecture)

---

## ✨ תכונות עיקריות

### 📥 איסוף נתונים חכם
- ✅ **לינק שיתוף חכם** - איסוף מהמשפחה (72 שעות, 50 הוספות)
- ✅ **Paste & Import** - זיהוי אוטומטי של שמות ותאריכים (7 פורמטים)
- ✅ **CSV Import** - ייבוא מאקסל עם תצוגה מקדימה

### 📅 ניהול ימי הולדת
- ✅ **חישוב אוטומטי** - המרה לתאריך עברי
- ✅ **תמיכה ב"אחרי שקיעה"** - דיוק מלא
- ✅ **סנכרון ליומן Google** - יומן ייעודי ונפרד, 10 שנים קדימה
- ✅ **סטטוסי סנכרון** - מעקב ויזואלי

### 👥 קבוצות וארגון
- ✅ **היררכיה** - 4 קטגוריות + תתי-קבוצות
- ✅ **צבעים** - לזיהוי קל
- ✅ **העדפות לוח שנה** - לכל קבוצה

### 🎁 משאלות ואורחים
- ✅ **רשימת משאלות** - עם עדיפויות (גבוהה/בינונית/נמוכה)
- ✅ **Guest Portal** - אורחים יכולים לערוך משאלות
- ✅ **התראות אורחים** - מעקב אחר הוספות

### 💰 פיצ'רים מתקדמים
- ✅ **מחשבון דמי חנוכה/פורים** - חישוב תקציב חכם
- ✅ **פרופילי תקציב** - שמירה ל-10 פרופילים
- ✅ **כפתור וואטסאפ** - רשימה מסודרת לקבוצה
- ✅ **מזלות** - לועזי ועברי + סטטיסטיקות

### 🌍 נוספים
- ✅ **Multi-tenant** - תמיכה במספר ארגונים
- ✅ **i18n** - עברית ואנגלית מלאה (RTL/LTR)
- ✅ **מדריך אינטראקטיבי** - במערכת עצמה

---

## 🚀 Quick Start

### דרישות מקדימות:

- Node.js 20+
- npm
- Firebase CLI
- Java 11+ (לאימולטור)

### התקנה:

```bash
# 1. Clone הפרויקט
git clone <repo-url>
cd HebBirthdayv3cv2/v3cv2

# 2. התקן dependencies - Frontend
npm install

# 3. התקן dependencies - Backend
cd functions
npm install
cd ..

# 4. התקן Firebase CLI (אם עוד לא)
npm install -g firebase-tools

# 5. Login ל-Firebase
firebase login

# 6. בחר project
firebase use hebbirthday2026
```

### Development:

```bash
# Terminal 1 - אימולטור
firebase emulators:start

# Terminal 2 - Frontend
npm run dev

# פתח דפדפן:
# Frontend: http://localhost:5173
# Emulator UI: http://localhost:4000
```

---

## 🏗️ מבנה הפרויקט

```
v3cv2/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # React components
│   ├── services/           # API calls
│   ├── hooks/              # Custom hooks
│   ├── config/             # Firebase config
│   └── i18n/               # Translations
│
├── functions/              # Backend (Firebase Functions)
│   └── src/
│       ├── domain/         # Business logic
│       ├── application/    # Use cases
│       ├── infrastructure/ # External services
│       ├── interfaces/     # Entry points
│       └── shared/         # Utils
│
├── public/                 # Static files
├── dist/                   # Build output
│
├── firebase.json           # Firebase config
├── firestore.rules         # Security rules
├── firestore.indexes.json  # Firestore indexes
│
├── DEVELOPMENT_NOTES.md    # 📘 בעיות ופתרונות
├── DEPENDENCIES.md         # 📦 תלויות וגרסאות
└── ARCHITECTURE.md         # 🏗️ ארכיטקטורה
```

---

## 🛠️ פקודות שימושיות

### Development:

```bash
# Frontend dev server
npm run dev

# Backend dev (emulator)
firebase emulators:start

# Build frontend
npm run build

# Build backend
cd functions && npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

### Deployment:

```bash
# Deploy הכל
firebase deploy

# Deploy רק functions
firebase deploy --only functions

# Deploy רק hosting
firebase deploy --only hosting

# Deploy פונקציה ספציפית
firebase deploy --only functions:syncBirthdayToGoogleCalendar
```

### Logs:

```bash
# Logs live
firebase functions:log

# Logs ספציפיים
firebase functions:log --only myFunctionName

# Logs באימולטור
# מופיעים ישירות בטרמינל
```

---

## 🔧 Configuration

### Firebase Config (`firebase.json`):

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions"
  },
  "hosting": {
    "public": "dist"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "ui": { "port": 4000 }
  }
}
```

### Environment Variables:

**Frontend (`.env.local`):**
```env
VITE_USE_FIREBASE_EMULATOR=true  # לאימולטור
```

**Backend (לעתיד - `.env`):**
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=postmessage
```

**Backend (כרגע - Firebase Config):**
```bash
firebase functions:config:set \
  google.client_id="YOUR_CLIENT_ID" \
  google.client_secret="YOUR_CLIENT_SECRET" \
  google.redirect_uri="postmessage"
```

---

## 🐛 Troubleshooting

### בעיות נפוצות:

#### 1. "Failed to load function definition"
```bash
# בדוק שפונקציות נבנות:
cd functions
npm run build

# בדוק logs:
cat functions-debug.log
```

**פתרון:** קרא [DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md#בעיה-5)

#### 2. "onUserCreate לא יוצר tenants"
```bash
# ודא שהאימולטור רץ:
firebase emulators:start

# נקה נתונים:
# פתח http://localhost:4000
# Authentication → Clear all data
```

**פתרון:** קרא [DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md#בעיה-1)

#### 3. "Cannot use undefined as Firestore value"
```typescript
// ❌ לא לעשות:
await update({ field: undefined });

// ✅ לעשות:
await update({ field: admin.firestore.FieldValue.delete() });
```

**פתרון:** קרא [DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md#בעיה-3)

---

## 📊 Tech Stack

### Frontend:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - State management
- **React Router v7** - Routing
- **Tailwind CSS** - Styling
- **i18next** - i18n
- **Firebase SDK** - Auth, Firestore, Functions

### Backend:
- **Firebase Functions** - Serverless
- **TypeScript** - Type safety
- **Firebase Admin** - Backend SDK
- **Google APIs** - Calendar API
- **Cloud Tasks** - Batch jobs
- **Hebcal** - Hebrew dates

---

## 🧪 Testing

### Manual Testing Checklist:

**אימולטור:**
- [ ] הרשמה/התחברות
- [ ] יצירת יום הולדת
- [ ] עריכת יום הולדת + after_sunset
- [ ] Guest Portal - כניסה
- [ ] Guest Portal - רשימת משאלות

**פרודקשן:**
- [ ] כל מה שבאימולטור
- [ ] חיבור ל-Google Calendar
- [ ] סנכרון יום הולדת
- [ ] ביטול סנכרון
- [ ] סנכרון מרובה

---

## 🔐 Security

### Firestore Rules:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User must be authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // User belongs to tenant
    function belongsToTenant(tenantId) {
      return isSignedIn() && 
        request.auth.token.tenantId == tenantId;
    }
    
    match /birthdays/{birthdayId} {
      allow read, write: if belongsToTenant(resource.data.tenant_id);
    }
    
    // ... more rules
  }
}
```

---

## 🚢 Deployment

### Pre-deployment Checklist:

- [ ] **Build עובד:** `npm run build` (frontend & functions)
- [ ] **Tests עוברים** (כשיהיו)
- [ ] **Linter נקי:** `npm run lint`
- [ ] **החלפת workarounds:** בדוק `grep -r "Workaround" functions/src/`
- [ ] **Google Config קיים:** `firebase functions:config:get`
- [ ] **Firestore indexes:** ענה N אם לא בטוח

### Deployment:

```bash
# 1. Build frontend
npm run build

# 2. Build functions
cd functions
npm run build
cd ..

# 3. Deploy
firebase deploy

# 4. בדוק logs
firebase functions:log
```

---

## 📈 Roadmap

### v3.1 (הבא):
- [ ] Unit tests (Jest)
- [ ] Integration tests (Emulator)
- [ ] CI/CD (GitHub Actions)

### v3.2:
- [ ] Migration ל-firebase-functions v5
- [ ] .env files במקום functions.config()
- [ ] Monitoring & Analytics

### v4.0:
- [ ] Firebase Functions Gen 2
- [ ] Performance optimization
- [ ] PWA support

---

## 🤝 Contributing

### Code Style:

- **TypeScript** - strict mode
- **ESLint** - airbnb config
- **Prettier** - 2 spaces, single quotes
- **Comments** - עברית בתוך הקוד

### Commit Messages:

```
feat: add birthday export feature
fix: resolve sync timeout issue
docs: update DEVELOPMENT_NOTES
chore: update dependencies
```

---

## 📞 Support

### בעיה? בדוק:

1. **[DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md)** - רוב הבעיות מתועדות שם
2. **[DEPENDENCIES.md](./DEPENDENCIES.md)** - אולי זה בעיית גרסה
3. **Firebase Console Logs** - בדוק שגיאות
4. **Emulator Logs** - הלוגים בטרמינל

---

## 📄 License

Private project - All rights reserved

---

## 👥 Team

**Developer:** [Your Name]  
**Architecture:** Clean Architecture (Uncle Bob)  
**Version:** 3.0.0

---

**Built with ❤️ in Israel 🇮🇱**
