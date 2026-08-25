// Age arithmetic. Split out of the component so it can be tested.
//
// Both calendars are worked out from the same pair of dates, so the totals
// always agree even though 13 months give a different remainder than 12.

import Kenat from "kenat";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
}

export interface AgeParts {
  years: number;
  months: number;
  days: number;
}

export interface AgeTotals {
  days: number;
  weeks: number;
  hours: number;
  minutes: number;
  /** Gregorian months elapsed, for the "and that is N months" line. */
  months: number;
}

export interface NextBirthday {
  /** Gregorian date of the coming birthday. */
  date: Date;
  /** Whole days from today; 0 means it is today. */
  daysAway: number;
  /** The age reached on that day. */
  turning: number;
}

/** Whole days, midnight to midnight. UTC so DST can't shift the count. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

/** Days in a Gregorian month, 1-indexed. */
export const gregorianMonthLength = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

/** 30, except Pagume: 6 in John's year (year % 4 === 3), otherwise 5. */
export const ethiopianMonthLength = (year: number, month: number) =>
  month === 13 ? (((year % 4) + 4) % 4 === 3 ? 6 : 5) : 30;

/** Absolute day number, so two dates can just be subtracted. */
const gregorianDayNumber = (year: number, month: number, day: number) =>
  Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);

/**
 * Same, Ethiopian. 12 months of 30 plus Pagume; the leap days before year Y come
 * to Math.floor(Y / 4).
 */
const ethiopianDayNumber = (year: number, month: number, day: number) =>
  365 * year + Math.floor(year / 4) + (month - 1) * 30 + (day - 1);

/**
 * Years/months/days between two dates in a fixed-length-month calendar.
 *
 * Counts whole month anniversaries, then the remainder in real days. The obvious
 * version (borrow one month's length when days go negative) breaks on 31 Jan to
 * 2 Mar: it borrows February's 28 and still lands on -1.
 */
function breakdown(
  from: { year: number; month: number; day: number },
  to: { year: number; month: number; day: number },
  monthsInYear: number,
  lengthOf: (year: number, month: number) => number,
  dayNumber: (year: number, month: number, day: number) => number
): AgeParts {
  let months =
    (to.year - from.year) * monthsInYear + (to.month - from.month);

  // The day of the month the anniversary falls on, short months included.
  if (to.day < Math.min(from.day, lengthOf(to.year, to.month))) months -= 1;
  if (months < 0) months = 0;

  const shifted = from.month - 1 + months;
  const year = from.year + Math.floor(shifted / monthsInYear);
  const month = (shifted % monthsInYear) + 1;
  const day = Math.min(from.day, lengthOf(year, month));

  return {
    years: Math.floor(months / monthsInYear),
    months: months % monthsInYear,
    days: dayNumber(to.year, to.month, to.day) - dayNumber(year, month, day),
  };
}

export function gregorianAge(birth: Date, now: Date): AgeParts {
  return breakdown(
    { year: birth.getFullYear(), month: birth.getMonth() + 1, day: birth.getDate() },
    { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() },
    12,
    gregorianMonthLength,
    gregorianDayNumber
  );
}

export function ethiopianAge(birth: EthiopianDate, now: EthiopianDate): AgeParts {
  return breakdown(birth, now, 13, ethiopianMonthLength, ethiopianDayNumber);
}

export const toEthiopian = (date: Date): EthiopianDate =>
  new Kenat(date).getEthiopian();

export function totalsFor(birth: Date, now: Date): AgeTotals {
  const days = daysBetween(birth, now);
  const { years, months } = gregorianAge(birth, now);

  return {
    days,
    weeks: Math.floor(days / 7),
    hours: days * 24,
    minutes: days * 24 * 60,
    months: years * 12 + months,
  };
}

/**
 * Next birthday. A 29 Feb birth date has no anniversary in a common year, so it
 * moves to 1 Mar rather than being celebrated a day early on the 28th.
 */
export function nextBirthday(birth: Date, now: Date): NextBirthday {
  const month = birth.getMonth();
  const day = birth.getDate();

  const anniversaryIn = (year: number) => {
    const clamped = Math.min(day, gregorianMonthLength(year, month + 1));
    const date = new Date(year, month, clamped);
    // 29 February lands on 1 March rather than shrinking to the 28th, so the
    // birthday is never celebrated a day early.
    if (clamped !== day) date.setDate(date.getDate() + 1);
    return date;
  };

  let date = anniversaryIn(now.getFullYear());
  if (daysBetween(now, date) < 0) date = anniversaryIn(now.getFullYear() + 1);

  return {
    date,
    daysAway: daysBetween(now, date),
    turning: date.getFullYear() - birth.getFullYear(),
  };
}

/** Units for the ticking counter. */
export interface LivedTime {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Time elapsed today. Nobody enters an hour of birth, so this counts from
 * midnight; it's the seconds of today, not of a life.
 */
export function timeIntoToday(now: Date): LivedTime {
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
  };
}
