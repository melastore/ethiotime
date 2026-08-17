import Kenat from "kenat";

export type CalendarMode = "gregorian" | "ethiopian";

export interface DateInput {
  day: string;
  month: string;
  year: string;
}

export interface MonthOption {
  value: string;
  label: string;
  amharic?: string;
  short?: string;
  /** Approximate Gregorian range this Ethiopian month covers. */
  gregorianSpan?: string;
}

export interface WeekdayHeader {
  short: string;
  full: string;
  amharic: string;
}

/**
 * Each Ethiopian month is 30 days and lines up with the same stretch of the
 * Gregorian year, give or take a day around leap years — so the spans below are
 * labelled as approximate wherever they are shown.
 */
export const ETHIOPIAN_MONTHS: MonthOption[] = [
  { value: "1", label: "Meskerem", amharic: "መስከረም", gregorianSpan: "Sep 11 – Oct 10" },
  { value: "2", label: "Tikimt", amharic: "ጥቅምት", gregorianSpan: "Oct 11 – Nov 9" },
  { value: "3", label: "Hidar", amharic: "ኅዳር", gregorianSpan: "Nov 10 – Dec 9" },
  { value: "4", label: "Tahsas", amharic: "ታኅሣሥ", gregorianSpan: "Dec 10 – Jan 8" },
  { value: "5", label: "Tir", amharic: "ጥር", gregorianSpan: "Jan 9 – Feb 7" },
  { value: "6", label: "Yekatit", amharic: "የካቲት", gregorianSpan: "Feb 8 – Mar 9" },
  { value: "7", label: "Megabit", amharic: "መጋቢት", gregorianSpan: "Mar 10 – Apr 8" },
  { value: "8", label: "Miyazya", amharic: "ሚያዝያ", gregorianSpan: "Apr 9 – May 8" },
  { value: "9", label: "Ginbot", amharic: "ግንቦት", gregorianSpan: "May 9 – Jun 7" },
  { value: "10", label: "Sene", amharic: "ሰኔ", gregorianSpan: "Jun 8 – Jul 7" },
  { value: "11", label: "Hamle", amharic: "ሐምሌ", gregorianSpan: "Jul 8 – Aug 6" },
  { value: "12", label: "Nehase", amharic: "ነሐሴ", gregorianSpan: "Aug 7 – Sep 5" },
  { value: "13", label: "Pagume", amharic: "ጳጉሜ", gregorianSpan: "Sep 6 – Sep 10" },
];

export const GREGORIAN_MONTHS: MonthOption[] = [
  { value: "1", label: "January", short: "Jan" },
  { value: "2", label: "February", short: "Feb" },
  { value: "3", label: "March", short: "Mar" },
  { value: "4", label: "April", short: "Apr" },
  { value: "5", label: "May", short: "May" },
  { value: "6", label: "June", short: "Jun" },
  { value: "7", label: "July", short: "Jul" },
  { value: "8", label: "August", short: "Aug" },
  { value: "9", label: "September", short: "Sep" },
  { value: "10", label: "October", short: "Oct" },
  { value: "11", label: "November", short: "Nov" },
  { value: "12", label: "December", short: "Dec" },
];

export const WEEKDAY_HEADERS: WeekdayHeader[] = [
  { short: "Mon", full: "Monday", amharic: "ሰኞ" },
  { short: "Tue", full: "Tuesday", amharic: "ማክሰኞ" },
  { short: "Wed", full: "Wednesday", amharic: "ረቡዕ" },
  { short: "Thu", full: "Thursday", amharic: "ሐሙስ" },
  { short: "Fri", full: "Friday", amharic: "ዓርብ" },
  { short: "Sat", full: "Saturday", amharic: "ቅዳሜ" },
  { short: "Sun", full: "Sunday", amharic: "እሑድ" },
];

export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1)
);

const getCurrentGregorianYear = () => new Date().getFullYear();

export const getCurrentEthiopianYear = () => new Kenat().getEthiopian().year;

export const getCenteredGregorianYears = (
  yearsBefore = 75,
  total = 150
): string[] => {
  const start = getCurrentGregorianYear() - yearsBefore;
  return Array.from({ length: total }, (_, i) => String(start + i));
};

export const getCenteredEthiopianYears = (
  yearsBefore = 75,
  total = 150
): string[] => {
  const start = getCurrentEthiopianYear() - yearsBefore;
  return Array.from({ length: total }, (_, i) => String(start + i));
};

export const getDescendingGregorianYears = (count = 120): string[] => {
  const currentYear = getCurrentGregorianYear();
  return Array.from({ length: count }, (_, i) => String(currentYear - i));
};

export const getDescendingEthiopianYears = (count = 120): string[] => {
  const currentYear = getCurrentEthiopianYear();
  return Array.from({ length: count }, (_, i) => String(currentYear - i));
};

export const getTodayInputForMode = (mode: CalendarMode): DateInput => {
  if (mode === "gregorian") {
    const today = new Date();
    return {
      day: String(today.getDate()),
      month: String(today.getMonth() + 1),
      year: String(today.getFullYear()),
    };
  }

  const eth = new Kenat().getEthiopian();
  return {
    day: String(eth.day),
    month: String(eth.month),
    year: String(eth.year),
  };
};

export const getDaysInMonthForMode = (
  mode: CalendarMode,
  month: string,
  year: string
): number => {
  const monthNumber = parseInt(month, 10);
  const yearNumber = parseInt(year, 10);

  if (!monthNumber) return 31;
  if (mode === "gregorian") {
    const safeYear = Number.isNaN(yearNumber) ? getCurrentGregorianYear() : yearNumber;
    return new Date(safeYear, monthNumber, 0).getDate();
  }

  if (monthNumber !== 13) return 30;
  if (Number.isNaN(yearNumber)) return 5;
  return yearNumber % 4 === 3 ? 6 : 5;
};
