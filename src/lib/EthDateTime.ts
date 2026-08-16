import { DayOfWeek, MonthEth } from '../components/ethiopian-date-converter/types';
import { toEthiopianDateTime, toEuropeanDate } from './dateConverter';

function leftpadZero(num: number, length = 2): string {
  return String(num).padStart(length, '0');
}

const ethMonthStrings = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
  'Megabit', 'Meyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

const ethWeekdayStringsAm = [
  'እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'
];

const gregorianMonthStrings = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const gregorianWeekdayStrings = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];


export class EthDateTime {
  year: number;
  month: MonthEth;
  date: number;
  hour: number;
  minute: number;
  second: number;
  private _weekday: DayOfWeek | undefined;

  constructor(
    yr: number | string,
    mon?: number, // mon in human form
    date?: number,
    hr = 0,
    min = 0,
    sec = 0,
    weekday?: DayOfWeek
  ) {
    if (date !== undefined && date > 30) throw new Error(`Invalid Ethiopian Date: ${date}`);
    if (mon && (mon < 1 || mon > 13)) throw new Error(`Invalid Ethiopian Month: ${mon}`);

    if (typeof yr === 'string') {
      const parts = yr.split(/[-/]/).map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const [year, month, day] = parts;
        this.year = year;
        this.month = month as MonthEth;
        this.date = day;
      } else {
        throw new Error(`Invalid date string format: ${yr}`);
      }
    } else {
      this.year = yr > 200 ? yr : yr + 1900;
      this.month = mon as MonthEth;
      this.date = date as number;
    }

    this.hour = hr;
    this.minute = min;
    this.second = sec;
    this._weekday = weekday;
  }

  get weekday(): DayOfWeek {
    if (this._weekday === undefined) {
      this._weekday = this.toEuropeanDate().getDay() as DayOfWeek;
    }
    return this._weekday;
  }
  static now(): EthDateTime {
    const eurNow = new Date();
    return this.fromEuropeanDate(eurNow);
  }

  static fromEuropeanDate(europeanDate: Date): EthDateTime {
    return toEthiopianDateTime(europeanDate);
  }

  toEuropeanDate(): Date {
    return toEuropeanDate(this);
  }

  getDaysInMonth(): number {
    if (this.month === 13) {
      // Pagume has 6 days in a leap year, 5 otherwise.
      // An Ethiopian year is a leap year if (year % 4) === 3.
      const isLeap = this.year % 4 === 3;
      return isLeap ? 6 : 5;
    }
    // All other months have 30 days.
    return 30;
  }

  toTimeString = (): string => {
    return `${leftpadZero(this.hour)}:${leftpadZero(this.minute)}:${leftpadZero(
      this.second
    )}`;
  };

  toString(): string {
    return `${this.year}-${leftpadZero(this.month)}-${leftpadZero(this.date)}`;
  }

  toFullString(): string {
    return `${ethWeekdayStringsAm[this.weekday]}, ${ethMonthStrings[this.month - 1]} ${this.date}, ${this.year}`;
  }

  toNumericString(): string {
    return `${leftpadZero(this.month)}/${leftpadZero(this.date)}/${this.year}`;
  }
}

export function formatGregorianDate(date: Date, format: 'full' | 'numeric'): string {
  if (format === 'full') {
    const weekday = gregorianWeekdayStrings[date.getDay()];
    const month = gregorianMonthStrings[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  } else { // numeric
    return date.toLocaleDateString('en-US'); // e.g., "9/14/2025"
  }
}
