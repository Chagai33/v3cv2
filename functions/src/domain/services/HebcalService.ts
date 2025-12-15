// HebcalService - חישובי תאריכים עבריים
// מקור: שורות 79-129 מ-index.ts
// CRITICAL: שורה 90 - renderGematriya() לא render('he')!

import { HDate } from '@hebcal/core';
import { HebcalData, NextHebrewBirthday } from '../entities/types';

export class HebcalService {
  async getCurrentHebrewYear(): Promise<number> {
    return new HDate().getFullYear();
  }

  async fetchHebcalData(date: Date, afterSunset: boolean): Promise<HebcalData> {
    let hDate = new HDate(date);
    
    if (afterSunset) {
      hDate = hDate.next(); // CRITICAL FIX: next() returns a NEW HDate object!
    }
    
    return {
      // CRITICAL: render('he') במקור שורה 90 - renderGematriya()
      // מחזיר מחרוזת עברית מלאה כמו "כ״ו בכסלו תשע״ו"
      hebrew: hDate.renderGematriya(), 
      hy: hDate.getFullYear(),
      hm: hDate.getMonthName(),
      hd: hDate.getDate()
    };
  }

  async fetchNextHebrewBirthdays(
    currentYear: number, 
    month: string, 
    day: number, 
    count: number
  ): Promise<NextHebrewBirthday[]> {
    const results: NextHebrewBirthday[] = [];
    
    for (let i = 0; i <= count; i++) {
      const nextYear = currentYear + i;
      try {
        let nextHDate: HDate;
        try {
          nextHDate = new HDate(day, month, nextYear);
        } catch (e) {
          // Handle Adar/Leap year mismatches and day 30 vs 29
          if (day === 30) {
            nextHDate = new HDate(29, month, nextYear);
          } else if (month === 'Adar I' && !HDate.isLeapYear(nextYear)) {
            nextHDate = new HDate(day, 'Adar', nextYear);
          } else if (month === 'Adar II' && !HDate.isLeapYear(nextYear)) {
            nextHDate = new HDate(day, 'Adar', nextYear);
          } else if (month === 'Adar' && HDate.isLeapYear(nextYear)) {
            nextHDate = new HDate(day, 'Adar II', nextYear);
          } else {
            throw e;
          }
        }
        results.push({
          gregorianDate: nextHDate.greg(),
          hebrewYear: nextYear
        });
      } catch (e) {
        // Skip invalid calculations silently
      }
    }
    return results;
  }
}
