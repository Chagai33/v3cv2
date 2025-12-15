// EventBuilderService - בניית אירועי לוח שנה
// מקור: calculateExpectedEvents שורות 179-281 מ-index.ts
// הלוגיקה נשארת זהה, אבל מקבלת נתונים מעובדים כפרמטרים

import { SyncEvent, BirthdayData, TenantData, GroupData, WishlistItem } from '../entities/types';
import { ZodiacService } from './ZodiacService';

export class EventBuilderService {
  constructor(private zodiacService: ZodiacService) {}

  async buildEventsForBirthday(
    birthday: BirthdayData,
    tenant: TenantData,
    groups: GroupData[],
    wishlistItems: WishlistItem[]
  ): Promise<SyncEvent[]> {
    const events: SyncEvent[] = [];
    const language = (tenant?.default_language || 'he') as 'he' | 'en';
    
    // Description Construction - העתקה מדויקת
    let description = '';
    let wishlistText = '';
    
    if (wishlistItems.length > 0) {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const items = wishlistItems
        .sort((a, b) => (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0))
        .map((item, index) => `${index + 1}. ${item.item_name}`);
      if (items.length > 0) {
        wishlistText = (language === 'en' ? '🎁 Wishlist:\n' : '🎁 רשימת משאלות:\n') + items.join('\n') + '\n\n';
      }
    }

    description += wishlistText;
    description += language === 'en' 
      ? `Gregorian Birth Date: ${birthday.birth_date_gregorian}\nHebrew Birth Date: ${birthday.birth_date_hebrew_string || ''}\n`
      : `תאריך לידה לועזי: ${birthday.birth_date_gregorian}\nתאריך לידה עברי: ${birthday.birth_date_hebrew_string || ''}\n`;
    
    if (birthday.after_sunset) {
      description += language === 'en' ? '⚠️ After Sunset\n' : '⚠️ לאחר השקיעה\n';
    }
    
    if (groups.length > 0) {
      const gNames = groups.map(g => g.parentName ? `${g.parentName}: ${g.name}` : g.name);
      description += `\n${language === 'en' ? 'Groups' : 'קבוצות'}: ${gNames.join(', ')}`;
    }
    
    if (birthday.notes) {
      description += `\n\n${language === 'en' ? 'Notes' : 'הערות'}: ${birthday.notes}`;
    }

    const extendedProperties = { 
      private: { 
        createdByApp: 'hebbirthday', 
        tenantId: birthday.tenant_id, 
        birthdayId: birthday.id || 'unknown' 
      } 
    };
    
    // Zodiacs - שימוש ב-ZodiacService
    const gregSign = this.zodiacService.getGregorianZodiacSign(new Date(birthday.birth_date_gregorian));
    const hebSign = birthday.birth_date_hebrew_month ? 
      this.zodiacService.getHebrewZodiacSign(birthday.birth_date_hebrew_month) : null;

    const prefs = birthday.calendar_preference_override || tenant?.default_calendar_preference || 'both';
    const doHeb = prefs === 'hebrew' || prefs === 'both';
    const doGreg = prefs === 'gregorian' || prefs === 'both';

    const createEvent = (title: string, date: Date, type: 'gregorian'|'hebrew', year: number, desc: string): SyncEvent => {
      const start = new Date(date); 
      start.setHours(0, 0, 0, 0);
      const end = new Date(start); 
      end.setDate(end.getDate() + 1);
      return {
        summary: title, 
        description: desc,
        start: { date: start.toISOString().split('T')[0] },
        end: { date: end.toISOString().split('T')[0] },
        extendedProperties,
        reminders: { 
          useDefault: false, 
          overrides: [
            { method: 'popup', minutes: 1440 }, 
            { method: 'popup', minutes: 60 }
          ]
        },
        _type: type, 
        _year: year
      };
    };

    // Gregorian Events
    if (doGreg) {
      const bDate = new Date(birthday.birth_date_gregorian);
      let gregDesc = description;
      if (gregSign) {
        gregDesc += `\n\n${language === 'en' ? 'Zodiac Sign' : 'מזל'}: ${
          language === 'en' ? 
            this.zodiacService.getZodiacSignNameEn(gregSign) : 
            this.zodiacService.getZodiacSignNameHe(gregSign)
        }`;
      }
      
      const curYear = new Date().getFullYear();
      for (let i = 0; i <= 10; i++) {
        const y = curYear + i;
        const d = new Date(y, bDate.getMonth(), bDate.getDate());
        const age = y - bDate.getFullYear();
        const title = language === 'en' ? 
          `${birthday.first_name} ${birthday.last_name} | ${age} | Birthday 🎂` : 
          `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת לועזי 🎂`;
        events.push(createEvent(title, d, 'gregorian', y, gregDesc));
      }
    }

    // Hebrew Events
    if (doHeb && birthday.future_hebrew_birthdays) {
      let hebDesc = description;
      if (hebSign) {
        hebDesc += `\n\n${language === 'en' ? 'Zodiac Sign' : 'מזל'}: ${
          language === 'en' ? 
            this.zodiacService.getZodiacSignNameEn(hebSign) : 
            this.zodiacService.getZodiacSignNameHe(hebSign)
        }`;
      }
      
      birthday.future_hebrew_birthdays.slice(0, 10).forEach((item: any) => {
        const dStr = typeof item === 'string' ? item : item.gregorian;
        const hYear = typeof item === 'string' ? 0 : item.hebrewYear;
        const age = (hYear && birthday.hebrew_year) ? hYear - birthday.hebrew_year : 0;
        const title = language === 'en' ? 
          `${birthday.first_name} ${birthday.last_name} | ${age} | Hebrew Birthday 🎂` : 
          `${birthday.first_name} ${birthday.last_name} | ${age} | יום הולדת עברי 🎂`;
        events.push(createEvent(title, new Date(dStr), 'hebrew', hYear, hebDesc));
      });
    }
    
    return events;
  }
}
