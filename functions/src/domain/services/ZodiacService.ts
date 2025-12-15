// ZodiacService - לוגיקה טהורה ללא תלויות חיצוניות
// מקור: שורות 30-75 מ-index.ts

export class ZodiacService {
  getGregorianZodiacSign(date: Date): string | null {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces';
    return null;
  }

  getHebrewZodiacSign(hebrewMonth: string): string | null {
    if (!hebrewMonth) return null;
    switch (hebrewMonth) {
      case 'Nisan': return 'aries';
      case 'Iyyar': return 'taurus';
      case 'Sivan': return 'gemini';
      case 'Tamuz': return 'cancer';
      case 'Av': return 'leo';
      case 'Elul': return 'virgo';
      case 'Tishrei': return 'libra';
      case 'Cheshvan': return 'scorpio';
      case 'Kislev': return 'sagittarius';
      case 'Tevet': return 'capricorn';
      case 'Sh\'vat': return 'aquarius';
      case 'Adar': case 'Adar I': case 'Adar II': return 'pisces';
      default: return null;
    }
  }

  getZodiacSignNameEn(sign: string): string {
    const names: { [key: string]: string } = { 
      'aries': 'Aries', 
      'taurus': 'Taurus', 
      'gemini': 'Gemini', 
      'cancer': 'Cancer', 
      'leo': 'Leo', 
      'virgo': 'Virgo', 
      'libra': 'Libra', 
      'scorpio': 'Scorpio', 
      'sagittarius': 'Sagittarius', 
      'capricorn': 'Capricorn', 
      'aquarius': 'Aquarius', 
      'pisces': 'Pisces' 
    };
    return names[sign] || sign;
  }

  getZodiacSignNameHe(sign: string): string {
    const names: { [key: string]: string } = { 
      'aries': 'טלה', 
      'taurus': 'שור', 
      'gemini': 'תאומים', 
      'cancer': 'סרטן', 
      'leo': 'אריה', 
      'virgo': 'בתולה', 
      'libra': 'מאזניים', 
      'scorpio': 'עקרב', 
      'sagittarius': 'קשת', 
      'capricorn': 'גדי', 
      'aquarius': 'דלי', 
      'pisces': 'דגים' 
    };
    return names[sign] || sign;
  }
}
