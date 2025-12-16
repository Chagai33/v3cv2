# 📦 Dependencies - HebBirthday Project

> **מסמך זה מכיל את כל התלויות, גרסאותיהן, והסיבה לשימוש בהן.**

---

## 🎯 סקירה כללית

| Component | Node Version | Package Manager | Module System |
|-----------|--------------|-----------------|---------------|
| **Frontend** | 20+ | npm | ESM |
| **Backend (Functions)** | 20 | npm | CommonJS |

---

## 🎨 Frontend Dependencies

### ⚙️ Runtime Environment

```json
{
  "engines": {
    "node": ">=20.0.0"
  },
  "type": "module"
}
```

### 📚 Production Dependencies

#### Firebase & Authentication
```json
{
  "firebase": "^12.4.0",
  "@react-oauth/google": "^0.12.2"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `firebase` | `^12.4.0` | Firebase SDK לפרונטאנד | Auth, Firestore, Functions |
| `@react-oauth/google` | `^0.12.2` | Google OAuth login | חיבור ל-Google Calendar |

#### Hebrew & Date Libraries
```json
{
  "@hebcal/core": "^5.10.1",
  "date-fns": "^4.1.0"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `@hebcal/core` | `^5.10.1` | תאריכים עבריים, מזלות | **קריטי** - אל תשנה גרסה בלי בדיקה |
| `date-fns` | `^4.1.0` | פורמט תאריכים, חישובים | חלופה קלה ל-moment.js |

#### React Core
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^7.9.4"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `react` | `^18.3.1` | React framework | React 18 עם Concurrent Features |
| `react-dom` | `^18.3.1` | React DOM rendering | תואם ל-React 18 |
| `react-router-dom` | `^7.9.4` | ניתוב בין דפים | v7 החדש |

#### State Management
```json
{
  "@tanstack/react-query": "^5.90.5",
  "react-hook-form": "^7.65.0"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `@tanstack/react-query` | `^5.90.5` | ניהול state async, caching | החלפנו Redux ב-React Query |
| `react-hook-form` | `^7.65.0` | טפסים עם validation | ביצועים טובים יותר מ-Formik |

#### Internationalization (i18n)
```json
{
  "i18next": "^25.6.0",
  "react-i18next": "^16.2.0"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `i18next` | `^25.6.0` | תרגום עברית/אנגלית | Core library |
| `react-i18next` | `^16.2.0` | React bindings | hooks ו-components |

#### UI Components
```json
{
  "lucide-react": "^0.344.0"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `lucide-react` | `^0.344.0` | אייקונים | חלופה קלה ל-FontAwesome |

#### Utilities
```json
{
  "p-limit": "^7.2.0"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `p-limit` | `^7.2.0` | ניהול concurrency | למניעת race conditions |

### 🛠️ Development Dependencies

#### Build Tools
```json
{
  "vite": "^5.4.2",
  "@vitejs/plugin-react": "^4.3.1"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `vite` | `^5.4.2` | Build tool מהיר | חלופה ל-Webpack |
| `@vitejs/plugin-react` | `^4.3.1` | React support ל-Vite | HMR, JSX transform |

#### TypeScript
```json
{
  "typescript": "^5.5.3",
  "@types/react": "^18.3.5",
  "@types/react-dom": "^18.3.0"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `typescript` | `^5.5.3` | TypeScript compiler | Type safety |
| `@types/react` | `^18.3.5` | Types ל-React | תואם ל-React 18 |
| `@types/react-dom` | `^18.3.0` | Types ל-React DOM | תואם ל-React 18 |

#### Linting
```json
{
  "eslint": "^9.9.1",
  "@eslint/js": "^9.9.1",
  "typescript-eslint": "^8.3.0",
  "eslint-plugin-react-hooks": "^5.1.0-rc.0",
  "eslint-plugin-react-refresh": "^0.4.11"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `eslint` | `^9.9.1` | Linting | Code quality |
| `typescript-eslint` | `^8.3.0` | TypeScript rules | טיפול ב-TS specific issues |

#### CSS
```json
{
  "tailwindcss": "^3.4.1",
  "autoprefixer": "^10.4.18",
  "postcss": "^8.4.35"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `tailwindcss` | `^3.4.1` | Utility-first CSS | עיצוב מהיר |
| `autoprefixer` | `^10.4.18` | CSS vendor prefixes | תאימות דפדפנים |
| `postcss` | `^8.4.35` | CSS transformations | נדרש ל-Tailwind |

---

## ☁️ Backend (Functions) Dependencies

### ⚙️ Runtime Environment

```json
{
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js"
}
```

**⚠️ חשוב:** 
- Firebase Functions Gen 1 תומך רק ב-Node 18/20
- אל תשתמש ב-Node 22+!

### 📚 Production Dependencies

#### Firebase Core
```json
{
  "firebase-admin": "^11.11.0",
  "firebase-functions": "^4.9.0"
}
```

| Package | גרסה | סטטוס | למה צריך את זה | הערות |
|---------|------|-------|----------------|-------|
| `firebase-admin` | `^11.11.0` | ✅ תקין | Admin SDK | Firestore, Auth, Storage |
| `firebase-functions` | `^4.9.0` | ⚠️ ישן | Cloud Functions triggers | **כדאי לשדרג ל-5.1.0+** |

**⚠️ שדרוג מומלץ:**
```bash
npm install --save firebase-functions@latest
```
**למה:** `functions.config()` deprecated במרץ 2026. צריך לעבור ל-`.env` files.

#### Google Cloud Services
```json
{
  "googleapis": "^164.1.0",
  "@google-cloud/tasks": "^6.2.1"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `googleapis` | `^164.1.0` | Google Calendar API | יצירה/מחיקה/עדכון אירועים |
| `@google-cloud/tasks` | `^6.2.1` | Cloud Tasks | Batch jobs, async processing |

#### Hebrew & Date Libraries
```json
{
  "@hebcal/core": "^5.10.1"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `@hebcal/core` | `^5.10.1` | תאריכים עבריים, מזלות | **חייב להיות זהה לפרונטאנד!** |

#### Utilities
```json
{
  "p-limit": "^3.1.0",
  "node-fetch": "^2.7.0"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `p-limit` | `^3.1.0` | ניהול concurrency | **v3 - CommonJS!** (לא v7) |
| `node-fetch` | `^2.7.0` | HTTP requests | **v2 - CommonJS!** (לא v3) |

**⚠️ חשוב - CommonJS vs ESM:**
- Frontend משתמש ב-ESM: `p-limit@7`, `node-fetch@3`
- Backend משתמש ב-CommonJS: `p-limit@3`, `node-fetch@2`

### 🛠️ Development Dependencies

```json
{
  "typescript": "^5.3.2",
  "@types/node": "^20.10.0",
  "@types/node-fetch": "^2.6.9"
}
```

| Package | גרסה | למה צריך את זה | הערות |
|---------|------|----------------|-------|
| `typescript` | `^5.3.2` | TypeScript compiler | Type safety |
| `@types/node` | `^20.10.0` | Types ל-Node.js | תואם ל-Node 20 |
| `@types/node-fetch` | `^2.6.9` | Types ל-node-fetch | תואם ל-v2 |

---

## 🔄 Compatibility Matrix

### Frontend ↔ Backend

| Feature | Frontend Version | Backend Version | תואם? |
|---------|------------------|-----------------|-------|
| **@hebcal/core** | `^5.10.1` | `^5.10.1` | ✅ זהה |
| **p-limit** | `^7.2.0` (ESM) | `^3.1.0` (CJS) | ✅ גרסאות שונות במכוון |
| **node-fetch** | לא נדרש | `^2.7.0` (CJS) | ✅ רק בבקאנד |

### Node.js Versions

| Environment | Node Version | Firebase Support |
|-------------|--------------|------------------|
| **Development** | 20+ | ✅ |
| **Functions (Gen 1)** | 18, 20 | ✅ |
| **Functions (Gen 2)** | 18, 20, 22 | ✅ (אבל עדיין Gen 1) |

---

## ⚠️ שדרוגים קריטיים

### 🔴 עד מרץ 2026:

#### 1. firebase-functions → 5.1.0+
```bash
cd functions
npm install --save firebase-functions@latest
```

**שינויים נדרשים:**
```typescript
// Before:
const GOOGLE_CLIENT_ID = functions.config().google?.client_id;

// After (צור functions/.env):
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
```

**קובץ `.env`:**
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=postmessage
```

### 🟡 מומלץ (לא דחוף):

#### 1. Java SDK (לאימולטור)
```
Java 21+ required soon for firebase-tools@15
```

**התקנה:**
- Windows: [Oracle JDK 21](https://www.oracle.com/java/technologies/downloads/)
- Mac: `brew install openjdk@21`
- Linux: `sudo apt install openjdk-21-jdk`

---

## 📋 פקודות התקנה

### Setup חדש מאפס:

```bash
# Clone הפרויקט
git clone <repo-url>
cd HebBirthdayv3cv2/v3cv2

# Frontend
npm install

# Backend
cd functions
npm install
cd ..

# Global tools
npm install -g firebase-tools

# Login ל-Firebase
firebase login

# בחר project
firebase use hebbirthday2026
```

### Update Dependencies:

```bash
# Frontend
npm update
npm audit fix

# Backend
cd functions
npm update
npm audit fix
```

### בדיקת גרסאות:

```bash
# Frontend
npm list

# Backend
cd functions
npm list

# Global
firebase --version
node --version
npm --version
```

---

## 🔍 בדיקת תאימות

### לפני שדרוג:

```bash
# 1. בדוק התאמה:
npm outdated

# 2. בדוק breaking changes:
# קרא CHANGELOG של החבילה

# 3. בדוק ב-test environment:
npm install <package>@<version>
npm run build
npm run dev

# 4. בדוק שהכל עובד:
# רץ smoke tests

# 5. commit:
git add package.json package-lock.json
git commit -m "chore: update <package> to <version>"
```

---

## 🚫 Packages לא להשתמש בהם

| Package | למה לא | חלופה |
|---------|--------|-------|
| `moment.js` | גדול ומיושן | `date-fns` |
| `lodash` (כולו) | גדול | import specific functions |
| `axios` (בפרונטאנד) | Firebase משתמש ב-fetch | native `fetch` |
| `p-limit@7` (בבקאנד) | ESM only | `p-limit@3` (CommonJS) |
| `node-fetch@3` (בבקאנד) | ESM only | `node-fetch@2` (CommonJS) |

---

## 📦 Package Size Optimization

### Frontend Bundle Analysis:

```bash
npm run build
npx vite-bundle-visualizer
```

### Tips להקטנת Bundle:

1. **Tree Shaking:**
```typescript
// ❌ לא טוב:
import _ from 'lodash';

// ✅ טוב יותר:
import { debounce } from 'lodash';

// ✅ הכי טוב:
import debounce from 'lodash/debounce';
```

2. **Code Splitting:**
```typescript
// ✅ Lazy load routes:
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

3. **Dynamic Imports:**
```typescript
// ✅ רק כשצריך:
const { parseISO } = await import('date-fns');
```

---

## 🔐 Security Updates

### בדיקת vulnerabilities:

```bash
# Frontend
npm audit

# Fix אוטומטי:
npm audit fix

# Fix עם breaking changes:
npm audit fix --force

# Backend
cd functions
npm audit
npm audit fix
```

### Subscribe ל-security alerts:
- GitHub: Settings → Security → Dependabot alerts
- npm: `npm audit --audit-level=high`

---

## 📊 Dependency Graph

```
Frontend (ESM)
├── React 18
│   ├── react
│   ├── react-dom
│   └── react-router-dom
├── Firebase
│   └── firebase (Auth, Firestore, Functions)
├── State
│   ├── @tanstack/react-query
│   └── react-hook-form
├── i18n
│   ├── i18next
│   └── react-i18next
├── Hebrew
│   └── @hebcal/core
└── Build
    └── vite

Backend (CommonJS)
├── Firebase
│   ├── firebase-admin
│   └── firebase-functions
├── Google Cloud
│   ├── googleapis
│   └── @google-cloud/tasks
├── Hebrew
│   └── @hebcal/core
└── Utils
    ├── p-limit@3
    └── node-fetch@2
```

---

## 💾 Backup של package.json

### Frontend (`package.json`):
```json
{
  "name": "hebbirthday-frontend",
  "version": "3.0.0",
  "type": "module",
  "dependencies": {
    "@hebcal/core": "^5.10.1",
    "@react-oauth/google": "^0.12.2",
    "@tanstack/react-query": "^5.90.5",
    "date-fns": "^4.1.0",
    "firebase": "^12.4.0",
    "i18next": "^25.6.0",
    "lucide-react": "^0.344.0",
    "p-limit": "^7.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.65.0",
    "react-i18next": "^16.2.0",
    "react-router-dom": "^7.9.4"
  }
}
```

### Backend (`functions/package.json`):
```json
{
  "name": "hebbirthday-functions",
  "version": "3.0.0",
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "@google-cloud/tasks": "^6.2.1",
    "@hebcal/core": "^5.10.1",
    "firebase-admin": "^11.11.0",
    "firebase-functions": "^4.9.0",
    "googleapis": "^164.1.0",
    "node-fetch": "^2.7.0",
    "p-limit": "^3.1.0"
  }
}
```

---

**עדכון אחרון:** דצמבר 2024  
**גרסה:** 3.0.0


