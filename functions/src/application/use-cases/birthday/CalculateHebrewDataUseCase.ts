// CalculateHebrewDataUseCase - חישוב נתונים עבריים ליום הולדת
// מקור: לוגיקת Hebcal מתוך onBirthdayWrite שורות 505-549

import * as functions from 'firebase-functions';
import { HebcalService } from '../../../domain/services/HebcalService';
import { BirthdayRepository } from '../../../infrastructure/database/repositories/BirthdayRepository';

export class CalculateHebrewDataUseCase {
  constructor(
    private hebcalService: HebcalService,
    private birthdayRepo: BirthdayRepository
  ) {}

  async execute(
    birthdayId: string,
    birthDateGregorian: string,
    afterSunset: boolean
  ): Promise<any> {
    try {
      functions.logger.log(`Calculating Hebrew data for ${birthdayId}`);
      
      const dateParts = birthDateGregorian.split('-');
      const bDate = new Date(
        parseInt(dateParts[0]), 
        parseInt(dateParts[1]) - 1, 
        parseInt(dateParts[2])
      );
      
      const hebcal = await this.hebcalService.fetchHebcalData(bDate, afterSunset);
      const currHy = await this.hebcalService.getCurrentHebrewYear();
      const futures = await this.hebcalService.fetchNextHebrewBirthdays(
        currHy, 
        hebcal.hm, 
        hebcal.hd, 
        10
      );

      const updateData: any = {
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
      } else {
        updateData.future_hebrew_birthdays = [];
        updateData.next_upcoming_hebrew_year = null;
      }

      await this.birthdayRepo.update(birthdayId, updateData);
      return updateData;
    } catch (e) {
      functions.logger.error('Hebcal error:', e);
      throw e;
    }
  }

  shouldCalculate(beforeData: any, afterData: any): boolean {
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


