/**
 * Ethiopian Business & Working Days Calculator utility.
 *
 * Calculates working days between two dates, taking into account
 * weekends and Ethiopian national statutory public holidays.
 */

import { getHolidayOccurrencesForEthiopianYear, type HolidayOccurrence } from "./ethiopian-holidays.ts";
import Kenat from "kenat";

export type WorkingDaysResult = {
  workingDays: number;
  weekendDays: number;
  holidayDays: number;
  totalDays: number;
  holidaysEncountered: Array<{
    date: Date;
    name: string;
    amharic: string;
  }>;
};

/** Official statutory public holidays in Ethiopia (offices and banks closed). */
export const STATUTORY_PUBLIC_HOLIDAYS = new Set([
  "enkutatash",
  "meskel",
  "genna",
  "timket",
  "adwa",
  "siklet",
  "fasika",
  "labor-day",
  "patriots-day",
  "downfall-of-derg",
  "eid-al-fitr",
  "eid-al-adha",
  "mawlid",
]);

export type TaxDeadline = {
  titleEn: string;
  titleAm: string;
  periodEn: string;
  periodAm: string;
  category: "vat" | "income" | "fiscal";
  descriptionEn: string;
  descriptionAm: string;
};

export const ETHIOPIAN_TAX_DEADLINES: TaxDeadline[] = [
  {
    titleEn: "Monthly VAT Filing",
    titleAm: "የወርሃዊ የተጨማሪ እሴት ታክስ (VAT)",
    periodEn: "23rd of every Ethiopian month",
    periodAm: "በየወሩ በ23ኛው ቀን",
    category: "vat",
    descriptionEn: "All VAT-registered businesses must submit declarations and payments by the 23rd of the following Ethiopian month.",
    descriptionAm: "የተጨማሪ እሴት ታክስ የተመዘገቡ ነጋዴዎች በየወሩ እስከ 23ኛው ቀን ድረስ ማስታወቅና መክፈል አለባቸው።",
  },
  {
    titleEn: "Category A Taxpayers (Large Business)",
    titleAm: "ደረጃ 'ሀ' ግብር ከፋዮች",
    periodEn: "Hamle 1 – Tikimt 30 (July 8 – Nov 9)",
    periodAm: "ከሐምሌ 1 እስከ ጥቅምት 30",
    category: "income",
    descriptionEn: "Annual income tax declaration and audited financial statements for annual turnover > 1,000,000 ETB.",
    descriptionAm: "ዓመታዊ የሂሳብ መዝገብ የሚያዘጋጁ ዓመታዊ ገቢያቸው ከአንድ ሚሊዮን ብር በላይ የሆኑ ግብር ከፋዮች።",
  },
  {
    titleEn: "Category B Taxpayers (Medium Business)",
    titleAm: "ደረጃ 'ለ' ግብር ከፋዮች",
    periodEn: "Hamle 1 – Nehase 30 (July 8 – Sep 5)",
    periodAm: "ከሐምሌ 1 እስከ ነሐሴ 30",
    category: "income",
    descriptionEn: "Turnover between 500,000 and 1,000,000 ETB. Required to maintain basic income records.",
    descriptionAm: "ዓመታዊ ገቢያቸው ከ500,000 እስከ 1,000,000 ብር የሆኑ መካከለኛ ግብር ከፋዮች።",
  },
  {
    titleEn: "Category C Taxpayers (Standard Assessment)",
    titleAm: "ደረጃ 'ሐ' ግብር ከፋዮች",
    periodEn: "Hamle 1 – Hamle 30 (July 8 – Aug 6)",
    periodAm: "ከሐምሌ 1 እስከ ሐምሌ 30",
    category: "income",
    descriptionEn: "Small businesses and sole proprietors paying standard estimated turnover tax.",
    descriptionAm: "የሂሳብ መዝገብ የማይይዙ በግምት የሚከፍሉ ጥቃቅን ነጋዴዎች ዓመታዊ ክፍያ።",
  },
  {
    titleEn: "Ethiopian Fiscal Year Period",
    titleAm: "የኢትዮጵያ በጀት ዓመት",
    periodEn: "Hamle 1 – Sene 30 (July 8 – July 7)",
    periodAm: "ከሐምሌ 1 እስከ ሰኔ 30",
    category: "fiscal",
    descriptionEn: "Standard financial and government fiscal reporting year for Ethiopia.",
    descriptionAm: "የመንግስትና የግል ተቋማት ዓመታዊ የፋይናንስና የበጀት ዑደት።",
  },
];

/** Checks if a date falls on a weekend. */
export function isWeekend(date: Date, includeSaturdaysAsWorkday = false): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (includeSaturdaysAsWorkday) {
    return day === 0;
  }
  return day === 0 || day === 6;
}

/** Normalized midnight timestamp for date comparisons. */
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * Calculates working days between two dates.
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  includeSaturdaysAsWorkday = false
): WorkingDaysResult {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  // Determine chronological direction
  const isForward = end >= start;
  const from = isForward ? start : end;
  const to = isForward ? end : start;

  // Gather holidays spanning all relevant Ethiopian years
  const startEth = new Kenat(from).getEthiopian();
  const endEth = new Kenat(to).getEthiopian();
  const holidaysMap = new Map<string, HolidayOccurrence>();

  for (let year = startEth.year; year <= endEth.year + 1; year++) {
    const list = getHolidayOccurrencesForEthiopianYear(year);
    for (const h of list) {
      if (STATUTORY_PUBLIC_HOLIDAYS.has(h.holiday.id)) {
        holidaysMap.set(dateKey(h.gregorianDate), h);
      }
    }
  }

  let workingDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;
  let totalDays = 0;
  const holidaysEncountered: Array<{ date: Date; name: string; amharic: string }> = [];

  const current = new Date(from);
  while (current <= to) {
    totalDays++;
    const weekend = isWeekend(current, includeSaturdaysAsWorkday);
    const holiday = holidaysMap.get(dateKey(current));

    if (weekend) {
      weekendDays++;
    } else if (holiday) {
      holidayDays++;
      holidaysEncountered.push({
        date: new Date(current),
        name: holiday.holiday.name,
        amharic: holiday.holiday.amharic,
      });
    } else {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    workingDays: isForward ? workingDays : -workingDays,
    weekendDays,
    holidayDays,
    totalDays,
    holidaysEncountered,
  };
}

/**
 * Adds or subtracts N working days from a starting date.
 */
export function addWorkingDays(
  startDate: Date,
  daysCount: number,
  includeSaturdaysAsWorkday = false
): Date {
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  if (daysCount === 0) return current;

  const direction = daysCount > 0 ? 1 : -1;
  let remaining = Math.abs(daysCount);

  // Preload relevant holidays
  const startEth = new Kenat(current).getEthiopian();
  const holidaysMap = new Map<string, HolidayOccurrence>();
  for (let y = startEth.year - 1; y <= startEth.year + 2; y++) {
    for (const h of getHolidayOccurrencesForEthiopianYear(y)) {
      if (STATUTORY_PUBLIC_HOLIDAYS.has(h.holiday.id)) {
        holidaysMap.set(dateKey(h.gregorianDate), h);
      }
    }
  }

  while (remaining > 0) {
    current.setDate(current.getDate() + direction);
    const weekend = isWeekend(current, includeSaturdaysAsWorkday);
    const isHoliday = holidaysMap.has(dateKey(current));

    if (!weekend && !isHoliday) {
      remaining--;
    }
  }

  return current;
}
