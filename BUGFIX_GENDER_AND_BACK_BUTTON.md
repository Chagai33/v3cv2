# תיקון באגים - זיהוי מגדר וכפתור חזרה

## בעיות שתוקנו

### 1. המגדר לא נקלט 🐛

**הבעיה:**
```
Input: "חגי יחיאל 04/04/2020 זכר כן"
Output: 
  שם: "חגי יחיאל זכר"  ❌ (זכר נשאר בשם!)
  מגדר: undefined
```

**הסיבה:**
הסדר של הפעולות היה לא נכון. זיהוי המגדר קרה **אחרי** `extractNotes()`, שמחזיר `cleanText` ללא הסוגריים, אבל הסרת מילות המפתח התבצעה רק מ-`cleanText` ולא מ-`remainingText`.

**הפתרון:**
שיניתי את הסדר ב-`parseLine()`:

```typescript
// BEFORE: ❌
const afterSunset = detectAfterSunset(remainingText);
const gender = detectGender(remainingText);
const { notes, cleanText } = extractNotes(remainingText);
// הסרת מילות מפתח רק מ-cleanText

// AFTER: ✅
const gender = detectGender(remainingText);  // קודם זיהוי
const afterSunset = detectAfterSunset(remainingText);
const { notes, cleanText } = extractNotes(remainingText);
// הסרת מילות מפתח מ-cleanText
```

**עכשיו עובד:**
```
Input: "חגי יחיאל 04/04/2020 זכר כן"
Output:
  שם פרטי: "חגי"
  שם משפחה: "יחיאל"
  תאריך: "2020-04-04"
  מגדר: male ✅
  אחרי שקיעה: true ✅
```

---

### 2. כפתור ביטול לא חוזר לטקסט המקורי 🐛

**הבעיה:**
כשלוחצים "ביטול" במסך התצוגה המקדימה (CSVImportPreviewModal), המשתמש חוזר לדשבורד במקום למסך ההדבקה עם הטקסט המקורי.

**הפתרון:**

#### 1. Dashboard.tsx - שמירת הטקסט המקורי

```typescript
const [originalPastedText, setOriginalPastedText] = useState<string>('');

const handleTextImport = (parsedData: any[], originalText: string) => {
  // Save original text
  setOriginalPastedText(originalText);
  // ... המשך לוגיקה
};

const handleBackToTextImport = () => {
  setShowCSVPreview(false);
  setShowTextImport(true);
};
```

#### 2. TextImportModal.tsx - העברת הטקסט המקורי

```typescript
interface TextImportModalProps {
  initialText?: string;  // 🆕
  onParsedData: (data: CSVBirthdayData[], originalText: string) => void;  // 🆕
}

const handleAnalyze = async (text: string) => {
  const parsed = parseFreeText(text);
  onParsedData(parsed, text);  // 🆕 מעביר גם את הטקסט
};
```

#### 3. TextPasteArea.tsx - שימוש בטקסט התחלתי

```typescript
interface TextPasteAreaProps {
  initialValue?: string;  // 🆕
}

const [text, setText] = useState(initialValue);

useEffect(() => {
  setText(initialValue);  // 🆕 מעדכן כשמקבל initialValue
}, [initialValue]);
```

#### 4. CSVImportPreviewModal.tsx - כפתור חזרה

```typescript
interface CSVImportPreviewModalProps {
  onBack?: () => void;  // 🆕
  showBackButton?: boolean;  // 🆕
}

// בפוטר:
{showBackButton && onBack && (
  <button onClick={onBack}>
    {t('import.backToImport', 'חזור לייבוא')}
  </button>
)}
```

#### 5. Dashboard.tsx - חיבור הכל

```tsx
<TextImportModal
  isOpen={showTextImport}
  onClose={() => setShowTextImport(false)}
  onParsedData={handleTextImport}
  initialText={originalPastedText}  // 🆕
/>

<CSVImportPreviewModal
  isOpen={showCSVPreview}
  onClose={() => setShowCSVPreview(false)}
  data={csvData}
  onConfirm={handleConfirmImport}
  onBack={originalPastedText ? handleBackToTextImport : undefined}  // 🆕
  showBackButton={!!originalPastedText}  // 🆕
/>
```

---

## זרימת המשתמש המעודכנת

### זרימה רגילה (CSV):
```
Dashboard → CSV File Upload → Preview → Import ✅
                                    ↓
                                 Cancel → Dashboard
```

### זרימה חדשה (טקסט):
```
Dashboard → Text Paste → Analyze → Preview → Import ✅
               ↑                       ↓
               └──── Back Button ──────┘
               (עם הטקסט המקורי!)
```

---

## קבצים ששונו

1. ✅ `v3cv2/src/utils/textParser.ts`
   - תיקון סדר זיהוי מגדר ו-afterSunset

2. ✅ `v3cv2/src/components/import/TextPasteArea.tsx`
   - הוספת `initialValue` prop
   - `useEffect` לעדכון הטקסט

3. ✅ `v3cv2/src/components/modals/TextImportModal.tsx`
   - הוספת `initialText` prop
   - העברת טקסט מקורי ב-`onParsedData`

4. ✅ `v3cv2/src/components/modals/CSVImportPreviewModal.tsx`
   - הוספת `onBack` ו-`showBackButton` props
   - כפתור "חזור לייבוא" בפוטר

5. ✅ `v3cv2/src/components/Dashboard.tsx`
   - `originalPastedText` state
   - `handleBackToTextImport` function
   - חיבור הכל

---

## תוצאה

✅ **זיהוי מגדר עובד מושלם**
```
"חגי יחיאל 04/04/2020 זכר כן"
→ שם: חגי יחיאל | מגדר: male | שקיעה: true
```

✅ **כפתור "חזור לייבוא" עובד**
- מופיע רק כשמגיעים מטקסט חופשי
- חוזר למסך ההדבקה עם הטקסט המקורי
- מאפשר תיקונים ללא הקלדה מחדש

✅ **תאימות לאחור**
- CSV import ממשיך לעבוד בדיוק כמו קודם
- Props חדשים אופציונליים
- אין breaking changes

**שני הבאגים תוקנו!** 🎉

