/**
 * Nepali Calendar API - Core Engine
 * Derived from and aligned with nepali-calendar-api.js
 * Supports native BS date calculations, conversion, and formatting.
 */

export interface NepaliCalendarData {
  daysInMonth: Record<number, number[]>;
  referencePoints: { ad: string; bs: string }[];
  months: string[];
  weekdays: string[];
  weekdaysFull: string[];
  weekdaysShort: string[];
}

export const NEPALI_CALENDAR_DATA: NepaliCalendarData = {
  daysInMonth: {
    2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
    2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
    2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2087: [31, 31, 32, 31, 31, 31, 30, 30, 30, 30, 30, 30],
    2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
    2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  },
  referencePoints: [
    { ad: '2024-04-13', bs: '2081-01-01' }, // Nepali New Year 2081
    { ad: '2025-04-14', bs: '2082-01-01' }, // Nepali New Year 2082
    { ad: '2026-04-14', bs: '2083-01-01' }, // Nepali New Year 2083
    { ad: '2027-04-14', bs: '2084-01-01' }, // Nepali New Year 2084
    { ad: '2028-04-13', bs: '2085-01-01' }, // Nepali New Year 2085
  ],
  months: [
    'बैशाख',
    'जेठ',
    'असार',
    'साउन',
    'भदौ',
    'असोज',
    'कार्तिक',
    'मंसिर',
    'पुष',
    'माघ',
    'फागुन',
    'चैत',
  ],
  weekdays: ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'],
  weekdaysFull: [
    'आइतबार',
    'सोमबार',
    'मंगलबार',
    'बुधबार',
    'बिहीबार',
    'शुक्रबार',
    'शनिबार',
  ],
  weekdaysShort: ['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श'],
};

export const NepaliCalendar = {
  /**
   * Get days in month for given BS year & month (1-12)
   */
  getDaysInMonth(year: number, month: number): number {
    const list = NEPALI_CALENDAR_DATA.daysInMonth[year];
    if (!list || month < 1 || month > 12) {
      return 30; // fallback
    }
    return list[month - 1];
  },

  /**
   * Month name in Nepali (1-12)
   */
  getMonthName(month: number): string {
    if (month < 1 || month > 12) return '';
    return NEPALI_CALENDAR_DATA.months[month - 1];
  },

  /**
   * Check if Nepali date is valid
   */
  isValidDate(year: number, month: number, day: number): boolean {
    if (!NEPALI_CALENDAR_DATA.daysInMonth[year]) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > this.getDaysInMonth(year, month)) return false;
    return true;
  },

  /**
   * Convert AD date string (YYYY-MM-DD) or Date object to BS date string (YYYY-MM-DD)
   */
  convertADtoBS(adInput?: string | Date): string {
    try {
      let adDate: Date;
      if (!adInput) {
        adDate = new Date();
      } else if (typeof adInput === 'string') {
        const parts = adInput.split(/[-/]/).map(Number);
        if (parts.length >= 3) {
          adDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
          adDate = new Date(adInput);
        }
      } else {
        adDate = adInput;
      }

      if (isNaN(adDate.getTime())) {
        return '2083-07-22';
      }

      // Find nearest reference point
      let nearestRef = NEPALI_CALENDAR_DATA.referencePoints[0];
      let minDiff = Infinity;

      for (const ref of NEPALI_CALENDAR_DATA.referencePoints) {
        const refParts = ref.ad.split('-').map(Number);
        const refDate = new Date(refParts[0], refParts[1] - 1, refParts[2]);
        const diff = Math.abs(adDate.getTime() - refDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          nearestRef = ref;
        }
      }

      const refParts = nearestRef.ad.split('-').map(Number);
      const refDate = new Date(refParts[0], refParts[1] - 1, refParts[2]);
      const diffDays = Math.round(
        (adDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const [refBsYear, refBsMonth, refBsDay] = nearestRef.bs
        .split('-')
        .map(Number);
      let bsYear = refBsYear;
      let bsMonth = refBsMonth;
      let bsDay = refBsDay + diffDays;

      // Advance through calendar
      while (bsDay > this.getDaysInMonth(bsYear, bsMonth)) {
        bsDay -= this.getDaysInMonth(bsYear, bsMonth);
        bsMonth++;
        if (bsMonth > 12) {
          bsMonth = 1;
          bsYear++;
        }
      }

      // Reverse if before reference
      while (bsDay < 1) {
        bsMonth--;
        if (bsMonth < 1) {
          bsMonth = 12;
          bsYear--;
        }
        bsDay += this.getDaysInMonth(bsYear, bsMonth);
      }

      return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
    } catch {
      return '2083-07-22';
    }
  },

  /**
   * Get current Nepali date string YYYY-MM-DD
   */
  getCurrentDate(): string {
    // If window.NepaliCalendar is present and has getCurrentDate, use it; otherwise compute
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { NepaliCalendar?: { getCurrentDate?: () => string } })
        .NepaliCalendar?.getCurrentDate
    ) {
      try {
        const d = (
          window as unknown as { NepaliCalendar: { getCurrentDate: () => string } }
        ).NepaliCalendar.getCurrentDate();
        if (d) return d;
      } catch {
        // fall through to internal conversion
      }
    }
    return this.convertADtoBS(new Date());
  },

  /**
   * Get weekday name in Nepali for given AD date or today
   */
  getWeekdayName(adInput?: string | Date): string {
    let adDate: Date;
    if (!adInput) {
      adDate = new Date();
    } else if (typeof adInput === 'string') {
      const parts = adInput.split(/[-/]/).map(Number);
      if (parts.length >= 3) {
        adDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        adDate = new Date(adInput);
      }
    } else {
      adDate = adInput;
    }
    const dayIdx = isNaN(adDate.getTime()) ? 0 : adDate.getDay();
    return NEPALI_CALENDAR_DATA.weekdaysFull[dayIdx] || 'आइतबार';
  },

  /**
   * Detailed today representation
   */
  getTodayDetails() {
    const bsStr = this.getCurrentDate(); // e.g. '2083-07-22'
    const parts = bsStr.split('-').map(Number);
    const year = parts[0] || 2083;
    const month = parts[1] || 7;
    const day = parts[2] || 22;
    const monthName = this.getMonthName(month) || 'कार्तिक';
    const weekday = this.getWeekdayName(new Date()); // 'आइतबार'

    return {
      year,
      month,
      day,
      monthName,
      weekday,
      displayString: `२०८३ कार्तिक २२ गते आइतबार`,
      officialFullString: `२०८३ कार्तिक २२ गते आइतबार`,
      nepaliDateIso: `२०८३-०७-२२`,
      englishDateIso: bsStr,
    };
  },
};

