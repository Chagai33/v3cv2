"use strict";
// CalculateHebrewDataUseCase - חישוב נתונים עבריים ליום הולדת
// מקור: לוגיקת Hebcal מתוך onBirthdayWrite שורות 505-549
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculateHebrewDataUseCase = void 0;
const functions = __importStar(require("firebase-functions"));
class CalculateHebrewDataUseCase {
    constructor(hebcalService, birthdayRepo) {
        this.hebcalService = hebcalService;
        this.birthdayRepo = birthdayRepo;
    }
    async execute(birthdayId, birthDateGregorian, afterSunset) {
        try {
            functions.logger.log(`Calculating Hebrew data for ${birthdayId}`);
            const dateParts = birthDateGregorian.split('-');
            const bDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            const hebcal = await this.hebcalService.fetchHebcalData(bDate, afterSunset);
            const currHy = await this.hebcalService.getCurrentHebrewYear();
            const futures = await this.hebcalService.fetchNextHebrewBirthdays(currHy, hebcal.hm, hebcal.hd, 10);
            const updateData = {
                birth_date_hebrew_string: hebcal.hebrew,
                birth_date_hebrew_year: hebcal.hy,
                birth_date_hebrew_month: hebcal.hm,
                birth_date_hebrew_day: hebcal.hd,
                gregorian_year: bDate.getFullYear(),
                gregorian_month: bDate.getMonth() + 1,
                gregorian_day: bDate.getDate(),
                hebrew_year: hebcal.hy,
                hebrew_month: hebcal.hm,
                hebrew_day: hebcal.hd,
                updated_at: new Date(),
                _systemUpdate: true
            };
            if (futures.length > 0) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const next = futures.find(f => f.gregorianDate >= now) || futures[0];
                updateData.next_upcoming_hebrew_birthday = next.gregorianDate.toISOString().split('T')[0];
                updateData.next_upcoming_hebrew_year = next.hebrewYear;
                updateData.future_hebrew_birthdays = futures.map(f => ({
                    gregorian: f.gregorianDate.toISOString().split('T')[0],
                    hebrewYear: f.hebrewYear
                }));
            }
            else {
                updateData.future_hebrew_birthdays = [];
                updateData.next_upcoming_hebrew_year = null;
            }
            await this.birthdayRepo.update(birthdayId, updateData);
            return updateData;
        }
        catch (e) {
            functions.logger.error('Hebcal error:', e);
            throw e;
        }
    }
    shouldCalculate(beforeData, afterData) {
        // אם זה system update שזה עתה בוצע (הדגל קיים עכשיו אבל לא היה קודם) - דלג
        // כך נמנע לופ אינסופי, אבל נאפשר עדכונים עתידיים של המשתמש
        if (afterData._systemUpdate && !beforeData?._systemUpdate) {
            return false;
        }
        const hasHebrew = afterData.birth_date_hebrew_string && afterData.future_hebrew_birthdays?.length;
        // אם זה יום הולדת חדש לגמרי (אין beforeData)
        if (!beforeData) {
            return !hasHebrew;
        }
        // אם זה עדכון - בדוק אם התאריך השתנה
        const gregorianChanged = beforeData.birth_date_gregorian !== afterData.birth_date_gregorian;
        const sunsetChanged = beforeData.after_sunset !== afterData.after_sunset;
        const dateChanged = gregorianChanged || sunsetChanged;
        if (dateChanged) {
            // התאריך השתנה - חייב לחשב מחדש!
            return true;
        }
        // התאריך לא השתנה - חשב רק אם אין תאריך עברי
        return !hasHebrew;
    }
}
exports.CalculateHebrewDataUseCase = CalculateHebrewDataUseCase;
//# sourceMappingURL=CalculateHebrewDataUseCase.js.map