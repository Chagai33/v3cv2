
export const zodiacService = {
  getGregorianSign(date: Date): string {
    const month = date.getMonth() + 1; // 1-12
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

    return '';
  },

  getHebrewSign(hebrewMonth: string): string {
    if (!hebrewMonth) return '';
    
    // Hebrew months from Hebcal: Nisan, Iyyar, Sivan, Tamuz, Av, Elul, Tishrei, Cheshvan, Kislev, Tevet, Sh'vat, Adar, Adar I, Adar II
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
      case 'Adar':
      case 'Adar I':
      case 'Adar II':
        return 'pisces';
      default: return '';
    }
  }
};





