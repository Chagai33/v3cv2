import React, { createContext, useContext } from 'react';

interface LayoutContextType {
  openAboutModal: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayoutContext = () => {
  const context = useContext(LayoutContext);
  // אם אנחנו מחוץ ל-Layout, זה יחזיר undefined. במקרה זה, הפונקציה לא תעשה כלום או תזרוק שגיאה.
  // כדי למנוע קריסות במקרי קצה, נחזיר פונקציה ריקה אם אין קונטקסט, או שנוודא שהשימוש הוא תמיד בתוך Layout.
  // Header תמיד בתוך Layout. FloatingDock תמיד בתוך Layout.
  if (!context) {
    throw new Error('useLayoutContext must be used within a Layout component');
  }
  return context;
};

export const LayoutProvider = LayoutContext.Provider;

