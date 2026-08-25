/**
 * The Ethiopian day and year, as quantities a drawing can use.
 *
 * Two things make Ethiopian timekeeping its own shape rather than an offset from
 * someone else's. The day begins at dawn, so six in the morning is twelve
 * o'clock and the clock face is anchored to sunrise instead of midnight. And an
 * hour is spoken with the part of the day it belongs to — ከጠዋቱ ሦስት ሰዓት is three
 * in the morning — so an hour without its period word is only half a time.
 *
 * Everything here is pure and takes the moment as an argument, so the same
 * instant always describes the same way.
 */

/** Dawn, in hours after local midnight. Six in the morning is twelve o'clock. */
export const DAWN_HOUR = 6;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

export type PeriodId = "morning" | "afternoon" | "evening" | "night";

export type DayPeriod = {
  id: PeriodId;
  /** How the hour is said: ከጠዋቱ ሦስት ሰዓት. */
  amharic: string;
  english: string;
};

/**
 * The four quarters the day is spoken in, in the order they arrive after dawn.
 * Each covers six hours, which is why an Ethiopian hour never needs to run past
 * twelve to say exactly when it is.
 */
export const DAY_PERIODS: Record<PeriodId, DayPeriod> = {
  morning: { id: "morning", amharic: "ከጠዋቱ", english: "morning" },
  afternoon: { id: "afternoon", amharic: "ከቀኑ", english: "afternoon" },
  evening: { id: "evening", amharic: "ከምሽቱ", english: "evening" },
  night: { id: "night", amharic: "ከሌሊቱ", english: "night" },
};

const PERIOD_ORDER: PeriodId[] = ["morning", "afternoon", "evening", "night"];

export type EthiopianTime = {
  /** 1–12, the way it is said aloud. */
  hour: number;
  minute: number;
  second: number;
  period: DayPeriod;
  /**
   * How far through the day, from dawn to dawn. 0 is sunrise, 0.5 is sunset.
   * This is what places the sun on the arc.
   */
  dayFraction: number;
  /** Between sunrise and sunset, taken as a flat twelve hours either side. */
  isDaylight: boolean;
};

/** Milliseconds since local midnight, which `Date` will not give directly. */
const msSinceMidnight = (date: Date) =>
  ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1000 +
  date.getMilliseconds();

export function ethiopianTimeAt(date: Date): EthiopianTime {
  // Wind back to dawn, then wrap: the hours before sunrise belong to the night
  // of the day before, and land at the end of the cycle rather than below zero.
  const sinceDawn =
    (msSinceMidnight(date) - DAWN_HOUR * MS_PER_HOUR + MS_PER_DAY) % MS_PER_DAY;

  const totalSeconds = Math.floor(sinceDawn / 1000);
  const hoursSinceDawn = Math.floor(totalSeconds / 3600);

  return {
    // Twelve, not zero: the hour dawn arrives is said as twelve o'clock.
    hour: hoursSinceDawn % 12 === 0 ? 12 : hoursSinceDawn % 12,
    minute: Math.floor(totalSeconds / 60) % 60,
    second: totalSeconds % 60,
    period: DAY_PERIODS[PERIOD_ORDER[Math.floor(hoursSinceDawn / 6)]],
    dayFraction: sinceDawn / MS_PER_DAY,
    isDaylight: sinceDawn < MS_PER_DAY / 2,
  };
}

/** `9:05` — the parts of an Ethiopian time, without its period word. */
export function formatEthiopianClock(time: EthiopianTime, withSeconds = false): string {
  const parts = [String(time.hour), String(time.minute).padStart(2, "0")];
  if (withSeconds) parts.push(String(time.second).padStart(2, "0"));
  return parts.join(":");
}

/**
 * The moment a point on the arc stands for, on the same day as `reference`.
 * Dragging along the arc is a question about the day, so the answer stays on it.
 */
export function dateAtDayFraction(fraction: number, reference: Date): Date {
  const clamped = Math.min(Math.max(fraction, 0), 0.999999);
  const dawn = new Date(reference);
  dawn.setHours(DAWN_HOUR, 0, 0, 0);
  return new Date(dawn.getTime() + clamped * MS_PER_DAY);
}

/* -------------------------------------------------------------------------- */
/* The year                                                                   */
/* -------------------------------------------------------------------------- */

/** Twelve months of thirty days, then Pagume's five — six before a leap year. */
export const pagumeLength = (ethiopianYear: number) =>
  ethiopianYear % 4 === 3 ? 6 : 5;

export const daysInEthiopianYear = (ethiopianYear: number) =>
  360 + pagumeLength(ethiopianYear);

export const daysInEthiopianMonth = (month: number, ethiopianYear: number) =>
  month === 13 ? pagumeLength(ethiopianYear) : 30;

/**
 * Where a date sits in its year, as a fraction of the whole. Pagume is a fifth
 * the length of the months before it, and the wheel is drawn to say so rather
 * than dividing the ring into thirteen equal parts.
 */
export function yearFraction(
  month: number,
  day: number,
  ethiopianYear: number
): number {
  const elapsed = (month - 1) * 30 + (day - 1);
  return elapsed / daysInEthiopianYear(ethiopianYear);
}

/** The slice a month occupies on the ring, as start and end fractions. */
export function monthArc(
  month: number,
  ethiopianYear: number
): { start: number; end: number } {
  const total = daysInEthiopianYear(ethiopianYear);
  const start = ((month - 1) * 30) / total;
  return { start, end: start + daysInEthiopianMonth(month, ethiopianYear) / total };
}
