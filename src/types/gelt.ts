export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  originalAge?: number; // שמירת הגיל המקורי כשמשנים גיל ידנית
}

export interface AgeGroup {
  id: string;
  name: string;           // למשל "18-21"
  minAge: number;         // גיל מינימלי (כולל)
  maxAge: number;         // גיל מקסימלי (כולל)
  amountPerChild: number;  // סכום לכל ילד בקבוצה
  isIncluded: boolean;    // האם הקבוצה כלולה בחישוב
}

export interface BudgetConfig {
  participants: number;              // מספר המשתתפים
  allowedOverflowPercentage: number; // אחוז חריגה מותרת (למשל 10%)
  customBudget?: number;              // תקציב מותאם אישית (אופציונלי)
}

export interface BudgetCalculation {
  totalRequired: number;          // התקציב הכולל הדרוש
  amountPerParticipant: number;    // הסכום לכל משתתף (מעוגל למעלה)
  maxAllowed: number;              // התקציב המקסימלי המותר (כולל חריגה)
  groupTotals: Record<string, {    // סיכום לכל קבוצת גיל
    childrenCount: number;          // מספר הילדים בקבוצה
    total: number;                 // סכום כולל לקבוצה
    calculatedAmountPerChild?: number; // סכום לכל ילד מחושב (למקרה של תקציב מותאם)
  }>;
  isCustomBudget?: boolean;        // האם משתמשים בתקציב מותאם
}

export interface GeltState {
  children: Child[];                    // רשימת כל הילדים
  ageGroups: AgeGroup[];                // קבוצות הגיל
  budgetConfig: BudgetConfig;           // הגדרות תקציב
  calculation: BudgetCalculation;       // תוצאות החישוב
  customGroupSettings: AgeGroup[] | null; // הגדרות מותאמות אישית (לשמירה)
  includedChildren: string[];           // Array של ID-ים של ילדים שכלולים בחישוב (ב-Firestore)
}

export interface ExportData {
  budget: {
    total: number;
    perParticipant: number;
    participants: number;
    allowedOverflow: number;
  };
  ageGroups: (AgeGroup & {
    childCount: number;
    total: number;
  })[];
  children: {
    name: string;
    age: number;
    ageModified: boolean;
    originalAge?: number;
  }[];
}

// פרופיל תקציב - קבוצות גיל והגדרות תקציב
export interface GeltTemplate {
  id: string;
  tenant_id: string;
  name: string;                    // שם הפרופיל
  description?: string;             // תיאור (אופציונלי)
  ageGroups: AgeGroup[];           // קבוצות הגיל
  budgetConfig: BudgetConfig;      // הגדרות תקציב
  customGroupSettings: AgeGroup[] | null; // הגדרות מותאמות אישית (אם יש תקציב מותאם)
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  is_default?: boolean;            // האם זה הפרופיל ברירת המחדל
}
