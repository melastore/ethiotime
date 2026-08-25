/**
 * Six-week day grid for an Ethiopian month, including the days either side.
 *
 * Not kenat's MonthGrid: that one runs movable-feast maths and throws on roughly
 * one year in nineteen (1949, 1968, 1987, 2006, 2025...), taking the whole month
 * with it. Holidays come from ethiopian-holidays anyway.
 */

import Kenat, { toGC } from "kenat";

/** Always six weeks, so the grid height doesn't jump between months. */
export const MONTH_GRID_CELLS = 42;

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export interface GridDate {
  ethiopian: DateParts;
  gregorian: DateParts;
  /** False for the greyed days borrowed from the months either side. */
  inMonth: boolean;
}

export const toGregorianDate = (parts: DateParts) =>
  new Date(parts.year, parts.month - 1, parts.day);

export const dateKey = (parts: DateParts) =>
  `${parts.year}-${parts.month}-${parts.day}`;

/** The month `delta` steps away. Counts in absolute months so any size works. */
export function stepMonth(year: number, month: number, delta: number) {
  const absolute = year * 13 + (month - 1) + delta;
  return { year: Math.floor(absolute / 13), month: (absolute % 13) + 1 };
}

/**
 * The grid for one month, starting Monday.
 *
 * Walks 42 consecutive Gregorian days and converts each back. Don't "optimise"
 * this into last-N-days-of-previous-month arithmetic: Pagume only has 5 days, so
 * it can't fill 6 leading cells and you end up asking kenat for 2017/13/6.
 */
export function monthGridDates(year: number, month: number): GridDate[] {
  const first = toGC(year, month, 1) as DateParts;
  // The grid starts on Monday, while getDay() starts on Sunday.
  const leading = (toGregorianDate(first).getDay() + 6) % 7;

  // Midday, so a daylight-saving change cannot slide a date onto its neighbour.
  const start = toGregorianDate(first);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - leading);

  return Array.from({ length: MONTH_GRID_CELLS }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);

    const ethiopian = new Kenat(date).getEthiopian() as DateParts;

    return {
      ethiopian,
      gregorian: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      },
      inMonth: ethiopian.year === year && ethiopian.month === month,
    };
  });
}
