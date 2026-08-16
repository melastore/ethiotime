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
  meaning?: string;
}

export interface WeekdayHeader {
  short: string;
  full: string;
  amharic: string;
}

export const ETHIOPIAN_MONTHS: MonthOption[] = [
  { value: "1", label: "Meskerem", amharic: "መስከረም", meaning: "New Beginning" },
  { value: "2", label: "Tikimt", amharic: "ጥቅምት", meaning: "Harvest" },
  { value: "3", label: "Hidar", amharic: "ኅዳር", meaning: "Harvest" },
  { value: "4", label: "Tahsas", amharic: "ታኅሣሥ", meaning: "Harvest" },
  { value: "5", label: "Tir", amharic: "ጥር", meaning: "Harvest" },
  { value: "6", label: "Yekatit", amharic: "የካቲት", meaning: "Harvest" },
  { value: "7", label: "Megabit", amharic: "መጋቢት", meaning: "Harvest" },
  { value: "8", label: "Miyaziy", amharic: "ሚያዝያ", meaning: "Harvest" },
  { value: "9", label: "Ginbot", amharic: "ግንቦት", meaning: "Harvest" },
  { value: "10", label: "Sene", amharic: "ሰኔ", meaning: "Harvest" },
  { value: "11", label: "Hamle", amharic: "ሐምሌ", meaning: "Harvest" },
  { value: "12", label: "Nehase", amharic: "ነሐሴ", meaning: "Harvest" },
  { value: "13", label: "Pagume", amharic: "ጳጉሜ", meaning: "The 13th Month" },
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

const getCurrentEthiopianYear = () => new Kenat().getEthiopian().year;

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
