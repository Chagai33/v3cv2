"use strict";
// HebcalService - חישובי תאריכים עבריים
// מקור: שורות 79-129 מ-index.ts
// CRITICAL: שורה 90 - renderGematriya() לא render('he')!
Object.defineProperty(exports, "__esModule", { value: true });
exports.HebcalService = void 0;
const core_1 = require("@hebcal/core");
class HebcalService {
    async getCurrentHebrewYear() {
        return new core_1.HDate().getFullYear();
    }
    async fetchHebcalData(date, afterSunset) {
        let hDate = new core_1.HDate(date);
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
    async fetchNextHebrewBirthdays(currentYear, month, day, count) {
        const results = [];
        for (let i = 0; i <= count; i++) {
            const nextYear = currentYear + i;
            try {
                let nextHDate;
                try {
                    nextHDate = new core_1.HDate(day, month, nextYear);
                }
                catch (e) {
                    // Handle Adar/Leap year mismatches and day 30 vs 29
                    if (day === 30) {
                        nextHDate = new core_1.HDate(29, month, nextYear);
                    }
                    else if (month === 'Adar I' && !core_1.HDate.isLeapYear(nextYear)) {
                        nextHDate = new core_1.HDate(day, 'Adar', nextYear);
                    }
                    else if (month === 'Adar II' && !core_1.HDate.isLeapYear(nextYear)) {
                        nextHDate = new core_1.HDate(day, 'Adar', nextYear);
                    }
                    else if (month === 'Adar' && core_1.HDate.isLeapYear(nextYear)) {
                        nextHDate = new core_1.HDate(day, 'Adar II', nextYear);
                    }
                    else {
                        throw e;
                    }
                }
                results.push({
                    gregorianDate: nextHDate.greg(),
                    hebrewYear: nextYear
                });
            }
            catch (e) {
                // Skip invalid calculations silently
            }
        }
        return results;
    }
}
exports.HebcalService = HebcalService;
//# sourceMappingURL=HebcalService.js.map