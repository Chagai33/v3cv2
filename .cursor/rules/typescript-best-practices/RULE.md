---
description: "TypeScript strict mode, type safety, Hebcal immutability, and code style standards"
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: true
---

# TypeScript Best Practices

## 🔴 CRITICAL: TypeScript & Key Library Versions

**This project uses specific versions. DO NOT suggest code for other versions!**

- **TypeScript:** `^5.3.2` (Backend), `^5.5.3` (Frontend)
- **@hebcal/core:** `^5.10.1` (MUST be identical in backend & frontend)
- **Strict Mode:** Enabled (`"strict": true`)

### ⚠️ @hebcal/core Specific Version Notes:
- This project uses `^5.10.1` - methods and behavior may differ in other versions
- **NEVER suggest** @hebcal v4 or v6 syntax without checking compatibility
- The Hebcal immutability rules below are specific to v5.x

**Always check `DEPENDENCIES.md` before suggesting Hebcal or TypeScript changes!**

---

## 🎯 Type Safety

### Always:
- ✅ Prefer `interface` over `type` for object shapes
- ✅ Use `unknown` over `any` when type is truly unknown
- ✅ Enable strict mode checks in `tsconfig.json`
- ✅ Use proper types from `domain/entities/types.ts` (Backend)
- ✅ Use types from `src/types/index.ts` (Frontend)
- ✅ Add interfaces for new entities

### Never:
- ❌ Don't use `any` unless absolutely necessary
- ❌ Don't disable strict type checking
- ❌ Don't bypass type safety with `as any`

**Example:**
```typescript
// ❌ Bad
const data: any = { ... };

// ✅ Good
interface UserData {
  name: string;
  email: string;
}
const data: UserData = { ... };

// ✅ When truly unknown
const data: unknown = apiResponse;
if (typeof data === 'object' && data !== null) {
  // Type guard
}
```

---

## 🚫 CRITICAL: Hebcal Immutability

**Hebcal objects (HDate, etc.) are immutable!**

All Hebcal methods return **NEW objects** - they do NOT modify the original.

### The Bug:
```typescript
// ❌ NEVER - next() returns a NEW object, doesn't modify hDate!
const hDate = new HDate(date);
if (afterSunset) {
  hDate.next(); // ← זה לא עושה כלום! hDate עדיין ישן
}
return hDate.getDate(); // ← מחזיר תאריך ישן!
```

### The Fix:
```typescript
// ✅ ALWAYS - Assign the return value!
let hDate = new HDate(date);
if (afterSunset) {
  hDate = hDate.next(); // ← שמירת האובייקט החדש
}
return hDate.getDate(); // ← עכשיו נכון!
```

### Why This Happens:
Like JavaScript strings, Hebcal objects are **immutable**:

```javascript
// JavaScript strings analogy:
let str = "hello";
str.toUpperCase(); // ❌ לא משנה את str
console.log(str); // "hello" - לא השתנה!

str = str.toUpperCase(); // ✅ עובד
console.log(str); // "HELLO" - השתנה!
```

### Common Hebcal Methods (ALL return new objects):
- `hDate.next()` → new HDate (next day)
- `hDate.prev()` → new HDate (previous day)
- `hDate.add(days)` → new HDate (days added)
- `hDate.subtract(days)` → new HDate (days subtracted)

**Remember:** Always assign the return value!

---

## 🎨 Code Style & Formatting

### Indentation:
- **2 spaces** (not tabs)
- Configure your editor to use spaces

### Quotes:
- **Single quotes** for strings
- Double quotes only for JSON or when necessary

### Semicolons:
- **Always** use semicolons
- Don't rely on ASI (Automatic Semicolon Insertion)

### Trailing Commas:
- **Yes** - use trailing commas in objects and arrays
- Helps with cleaner git diffs

**Example:**
```typescript
// ✅ Correct style
const config = {
  name: 'HebBirthday',
  version: '3.0.0',
  features: [
    'calendar',
    'sync',
    'gelt',
  ],
};

// ❌ Wrong style
const config = {
	name: "HebBirthday",  // tabs + double quotes
	version: "3.0.0"      // no trailing comma
}                         // no semicolon
```

---

## 📚 Type Definitions Location

### Backend (functions/):
- **All types:** `functions/src/domain/entities/types.ts`
- Import: `import { BirthdayData, TenantData } from '../domain/entities/types';`

### Frontend (src/):
- **All types:** `src/types/index.ts`
- Import: `import { Birthday, AppUser } from '../types';`

### Why Centralized?
- ✅ Single source of truth
- ✅ Easy to find
- ✅ Prevents duplicates
- ✅ Easier to maintain

---

## 🔍 Type Guards

When working with `unknown` types, use type guards:

```typescript
// ✅ Good
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    if ('name' in data && typeof data.name === 'string') {
      console.log(data.name);
    }
  }
}

// ✅ Better - Custom type guard
interface User {
  name: string;
  email: string;
}

function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'email' in obj &&
    typeof (obj as User).name === 'string' &&
    typeof (obj as User).email === 'string'
  );
}

function processUser(data: unknown) {
  if (isUser(data)) {
    console.log(data.name); // TypeScript knows it's User
  }
}
```

---

## ⚠️ Common TypeScript Mistakes

### 1. Using `any` unnecessarily
```typescript
// ❌ Bad
function handleData(data: any) {
  return data.name; // No type safety!
}

// ✅ Good
function handleData(data: { name: string }) {
  return data.name; // Type-safe!
}
```

### 2. Forgetting return types
```typescript
// ❌ Bad - inferred return type
function calculate(a: number, b: number) {
  return a + b;
}

// ✅ Good - explicit return type
function calculate(a: number, b: number): number {
  return a + b;
}
```

### 3. Not checking for null/undefined
```typescript
// ❌ Bad
function getName(user: User | null) {
  return user.name; // Error if user is null!
}

// ✅ Good
function getName(user: User | null): string | null {
  return user?.name ?? null;
}
```

---

## 📖 Resources

- **Project Types:** Always check `types.ts` before creating new interfaces
- **tsconfig.json:** Don't modify without understanding implications
- **Strict Mode:** Keep `"strict": true` - it catches bugs early

---

## ⚠️ React Hooks Dependencies (Frontend)

**CRITICAL: Always include ALL dependencies in useMemo/useCallback/useEffect!**

If you use a variable inside the hook, it MUST be in the dependency array.

**Example:**
```typescript
// ❌ BAD - Missing dependency
const filtered = useMemo(() => {
  return items.filter(item => item.status === statusFilter);
}, [items]);  // ← Missing statusFilter!
// Result: UI won't update when statusFilter changes

// ✅ GOOD - All dependencies included
const filtered = useMemo(() => {
  return items.filter(item => item.status === statusFilter);
}, [items, statusFilter]);  // ← Complete!
```

**Symptoms of missing dependencies:**
- State changes but UI doesn't update
- Need page refresh to see changes
- Inconsistent behavior
- Works after second click

**Always check:** Does the function use this variable? → Add to dependencies!

---

**Last Updated:** December 2024
**For AI Models:** Hebcal immutability is the #1 gotcha - always assign return values!



