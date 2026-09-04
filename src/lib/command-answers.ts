import Kenat from "kenat";

import { amharicTransliterate } from "@/lib/amharicTransliterate";
import {
  ETHIOPIAN_MONTHS,
  GREGORIAN_MONTHS,
  WEEKDAY_HEADERS,
  type CalendarMode,
} from "@/lib/calendar-data";
import {
  getUpcomingHolidayOccurrences,
  type HolidayOccurrence,
} from "@/lib/ethiopian-holidays";

/**
 * Turns what someone types into the command palette into an answer, rather than
 * into a page to visit. A date typed here is converted on the spot; a Latin word
 * is shown in fidel; a feast name gives back the day it lands on. The palette
 * still links onward to the tool that owns each answer, but the answer arrives
 * first — for a suite whose whole job is small lookups, the trip to the tool is
 * usually the slowest part of it.
 *
 * Everything here is pure and takes `now` as an argument so the same query gives
 * the same answer under test.
 */

export type DateSide = {
  day: number;
  month: number;
  year: number;
  monthLabel: string;
  monthAmharic: string | null;
};

export type DateAnswer = {
  kind: "date";
  id: string;
  /** Calendar the typed date was read as. */
  from: CalendarMode;
  source: DateSide;
  target: DateSide;
  weekday: { full: string; amharic: string };
  /** Set when the same digits were also read as the other calendar. */
  alternate: boolean;
  href: string;
};

export type FidelAnswer = {
  kind: "fidel";
  id: string;
  latin: string;
  fidel: string;
};

export type HolidayAnswer = {
  kind: "holiday";
  id: string;
  occurrence: HolidayOccurrence;
  href: string;
};

export type CommandAnswer = DateAnswer | FidelAnswer | HolidayAnswer;

/* -------------------------------------------------------------------------- */
/* Month lookup                                                               */
/* -------------------------------------------------------------------------- */

type MonthMatch = { calendar: CalendarMode; month: number };

/**
 * Spellings that are common in the wild but are not the label the app uses.
 * Ethiopian month names have no single romanisation, so a lookup that only
 * accepted one of them would reject most of what people actually type.
 */
const ETHIOPIAN_MONTH_ALIASES: Record<string, number> = {
  tikimt: 2,
  tikemt: 2,
  tequemt: 2,
  hidar: 3,
  hedar: 3,
  tahsas: 4,
  tahisas: 4,
  tir: 5,
  ter: 5,
  yekatit: 6,
  yekatet: 6,
  megabit: 7,
  miyazya: 8,
  miazia: 8,
  ginbot: 9,
  genbot: 9,
  sene: 10,
  hamle: 11,
  hamlie: 11,
  nehase: 12,
  nehasse: 12,
  pagume: 13,
  pagumen: 13,
};

const buildMonthLookup = (): Map<string, MonthMatch> => {
  const lookup = new Map<string, MonthMatch>();

  const add = (key: string | undefined, match: MonthMatch) => {
    const normalised = key?.trim().toLowerCase();
    if (normalised) lookup.set(normalised, match);
  };

  GREGORIAN_MONTHS.forEach((month, index) => {
    const match: MonthMatch = { calendar: "gregorian", month: index + 1 };
    add(month.label, match);
    add(month.short, match);
  });

  ETHIOPIAN_MONTHS.forEach((month, index) => {
    const match: MonthMatch = { calendar: "ethiopian", month: index + 1 };
    add(month.label, match);
    add(month.amharic, match);
  });

  Object.entries(ETHIOPIAN_MONTH_ALIASES).forEach(([name, month]) => {
    add(name, { calendar: "ethiopian", month });
  });

  return lookup;
};

const MONTH_LOOKUP = buildMonthLookup();

/* -------------------------------------------------------------------------- */
/* Date parsing                                                               */
/* -------------------------------------------------------------------------- */

/** Words that stand in for a date, in both interface languages. */
const RELATIVE_DAYS: Record<string, number> = {
  today: 0,
  now: 0,
  ዛሬ: 0,
  tomorrow: 1,
  ነገ: 1,
  yesterday: -1,
  ትናንት: -1,
  ትላንት: -1,
};

type ParsedDate = { calendar: CalendarMode | "either"; day: number; month: number; year: number | null };

const NUMERIC_DATE =
  /^(\d{1,4})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{1,4}))?$/;

/**
 * Reads a typed date without asking which calendar it is in.
 *
 * A month name settles the calendar by itself — "Meskerem" is only Ethiopian and
 * "September" only Gregorian. Bare digits do not, so they come back as "either"
 * and both readings are offered; that ambiguity is the thing people come to this
 * app to resolve, and guessing one silently would answer the wrong question half
 * the time.
 */
export function parseDateQuery(query: string, now: Date): ParsedDate | null {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return null;

  const relative = RELATIVE_DAYS[trimmed];
  if (relative !== undefined) {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + relative);
    return {
      calendar: "gregorian",
      day: target.getDate(),
      month: target.getMonth() + 1,
      year: target.getFullYear(),
    };
  }

  const numeric = trimmed.match(NUMERIC_DATE);
  if (numeric) {
    const [, first, second, third] = numeric;

    // A four-digit leading number is a year: "2017-1-1" is written year first.
    if (first.length === 4 && third !== undefined) {
      return {
        calendar: "either",
        year: Number(first),
        month: Number(second),
        day: Number(third),
      };
    }

    let day = Number(first);
    let month = Number(second);
    // Day/month/year is the order used across Ethiopia, so it is the default. A
    // second number above 12 can only be a day, which settles a US-style date.
    if (month > 13 && day <= 12) {
      [day, month] = [month, day];
    }

    return {
      calendar: "either",
      day,
      month,
      year: third === undefined ? null : Number(third),
    };
  }

  return parseNamedDate(trimmed, now);
}

/** "meskerem 1 2017", "11 sep 2025", "tir 9" — the month name in any position. */
function parseNamedDate(query: string, now: Date): ParsedDate | null {
  const tokens = query.split(/[\s,،፣]+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 3) return null;

  const monthIndex = tokens.findIndex((token) => MONTH_LOOKUP.has(token));
  if (monthIndex === -1) return null;

  const match = MONTH_LOOKUP.get(tokens[monthIndex]);
  if (!match) return null;

  const numbers = tokens
    .filter((_, index) => index !== monthIndex)
    .map((token) => Number(token));

  if (numbers.some((value) => !Number.isInteger(value) || value < 1)) return null;
  if (numbers.length === 0) return null;

  // With two numbers the larger is the year; with one, a value that cannot be a
  // day of the month is a year, and the day falls back to the 1st.
  let day: number;
  let year: number | null;

  if (numbers.length === 2) {
    const [a, b] = numbers;
    day = Math.min(a, b);
    year = Math.max(a, b);
  } else if (numbers[0] > 31) {
    day = 1;
    year = numbers[0];
  } else {
    day = numbers[0];
    year =
      match.calendar === "ethiopian"
        ? new Kenat(now).getEthiopian().year
        : now.getFullYear();
  }

  return { calendar: match.calendar, day, month: match.month, year };
}

/* -------------------------------------------------------------------------- */
/* Date conversion                                                            */
/* -------------------------------------------------------------------------- */

const gregorianSide = (date: Date): DateSide => ({
  day: date.getDate(),
  month: date.getMonth() + 1,
  year: date.getFullYear(),
  monthLabel: GREGORIAN_MONTHS[date.getMonth()]?.label ?? "",
  monthAmharic: null,
});

const ethiopianSide = (parts: { day: number; month: number; year: number }): DateSide => ({
  day: parts.day,
  month: parts.month,
  year: parts.year,
  monthLabel: ETHIOPIAN_MONTHS[parts.month - 1]?.label ?? "",
  monthAmharic: ETHIOPIAN_MONTHS[parts.month - 1]?.amharic ?? null,
});

/** WEEKDAY_HEADERS starts on Monday; `Date#getDay` starts on Sunday. */
const weekdayOf = (date: Date) => {
  const header = WEEKDAY_HEADERS[(date.getDay() + 6) % 7];
  return { full: header?.full ?? "", amharic: header?.amharic ?? "" };
};

const converterHref = (from: CalendarMode, side: DateSide) =>
  `/date-converter?from=${from}&day=${side.day}&month=${side.month}&year=${side.year}`;

function convertGregorian(day: number, month: number, year: number): DateAnswer | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const source = new Date(year, month - 1, day);
  // Rolled-over values (31 April becoming 1 May) mean the date never existed.
  if (
    source.getFullYear() !== year ||
    source.getMonth() !== month - 1 ||
    source.getDate() !== day
  ) {
    return null;
  }

  try {
    const converted = new Kenat(source).getEthiopian();
    const sourceSide = gregorianSide(source);

    return {
      kind: "date",
      id: `date-gregorian-${year}-${month}-${day}`,
      from: "gregorian",
      source: sourceSide,
      target: ethiopianSide(converted),
      weekday: weekdayOf(source),
      alternate: false,
      href: converterHref("gregorian", sourceSide),
    };
  } catch {
    return null;
  }
}

function convertEthiopian(day: number, month: number, year: number): DateAnswer | null {
  if (month < 1 || month > 13 || day < 1) return null;
  // Twelve months of thirty days, then Pagume's five — six in a leap year.
  const daysInMonth = month === 13 ? ((((year % 4) + 4) % 4 === 3) ? 6 : 5) : 30;
  if (day > daysInMonth) return null;

  try {
    const converted = new Kenat({ year, month, day }).getGregorian();
    const target = new Date(converted.year, converted.month - 1, converted.day);
    if (Number.isNaN(target.getTime())) return null;

    const sourceSide = ethiopianSide({ day, month, year });

    return {
      kind: "date",
      id: `date-ethiopian-${year}-${month}-${day}`,
      from: "ethiopian",
      source: sourceSide,
      target: gregorianSide(target),
      weekday: weekdayOf(target),
      alternate: false,
      href: converterHref("ethiopian", sourceSide),
    };
  } catch {
    return null;
  }
}

/**
 * Answers for a typed date, most likely reading first.
 *
 * When the digits work in both calendars both are returned: the year decides the
 * order, since whichever of the two current years it sits closer to is almost
 * always the one that was meant.
 */
export function buildDateAnswers(query: string, now: Date): DateAnswer[] {
  const parsed = parseDateQuery(query, now);
  if (!parsed) return [];

  const { calendar, day, month } = parsed;

  if (calendar === "gregorian") {
    const year = parsed.year ?? now.getFullYear();
    const answer = convertGregorian(day, month, year);
    return answer ? [answer] : [];
  }

  if (calendar === "ethiopian") {
    const year = parsed.year ?? new Kenat(now).getEthiopian().year;
    const answer = convertEthiopian(day, month, year);
    return answer ? [answer] : [];
  }

  const currentGregorian = now.getFullYear();
  const currentEthiopian = new Kenat(now).getEthiopian().year;

  const gregorian = convertGregorian(day, month, parsed.year ?? currentGregorian);
  const ethiopian = convertEthiopian(day, month, parsed.year ?? currentEthiopian);

  const answers = [gregorian, ethiopian].filter(
    (answer): answer is DateAnswer => answer !== null
  );
  if (answers.length < 2) return answers;

  const year = parsed.year;
  const gregorianFirst =
    year === null
      ? false // Without a year, the Ethiopian reading is the one this app is for.
      : Math.abs(year - currentGregorian) <= Math.abs(year - currentEthiopian);

  const ordered = gregorianFirst ? [gregorian!, ethiopian!] : [ethiopian!, gregorian!];
  return ordered.map((answer, index) => ({ ...answer, alternate: index > 0 }));
}

/* -------------------------------------------------------------------------- */
/* Fidel                                                                      */
/* -------------------------------------------------------------------------- */

const LATIN_WORD = /^[a-z][a-z\s'-]*$/i;

/**
 * Runs a whole word through the keyboard's transliteration rules by replaying it
 * one character at a time, which is how the keyboard itself sees typing. The
 * pause argument is pinned to zero so every character is treated as part of the
 * same word — a paste has no timing to read.
 */
export function transliterateLatin(latin: string): string {
  let text = "";
  for (const character of latin) {
    text = amharicTransliterate(text, character, text.length, text.length, 0).newText;
  }
  return text;
}

/**
 * Fidel for a Latin word. Held back until three characters so the palette does
 * not answer with a single letter while someone is still typing "meskerem".
 */
export function buildFidelAnswer(query: string): FidelAnswer | null {
  const trimmed = query.trim();
  if (trimmed.length < 3 || !LATIN_WORD.test(trimmed)) return null;

  const fidel = transliterateLatin(trimmed);
  if (!fidel || fidel === trimmed) return null;

  return { kind: "fidel", id: `fidel-${trimmed}`, latin: trimmed, fidel };
}

/* -------------------------------------------------------------------------- */
/* Holidays                                                                   */
/* -------------------------------------------------------------------------- */

/** Two years of occurrences, so a feast just past still resolves to its next one. */
const HOLIDAY_LOOKAHEAD = 40;

export function buildHolidayAnswers(
  query: string,
  now: Date,
  limit = 3
): HolidayAnswer[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const seen = new Set<string>();
  const answers: HolidayAnswer[] = [];

  for (const occurrence of getUpcomingHolidayOccurrences(now, HOLIDAY_LOOKAHEAD)) {
    const { holiday } = occurrence;
    if (seen.has(holiday.id)) continue;

    const matches =
      holiday.name.toLowerCase().includes(needle) ||
      holiday.amharic.includes(query.trim()) ||
      holiday.id.includes(needle);
    if (!matches) continue;

    seen.add(holiday.id);
    answers.push({
      kind: "holiday",
      id: `holiday-${holiday.id}`,
      occurrence,
      href: `/holidays?holiday=${holiday.id}`,
    });

    if (answers.length === limit) break;
  }

  return answers;
}

/* -------------------------------------------------------------------------- */
/* Everything at once                                                         */
/* -------------------------------------------------------------------------- */

/**
 * `includeFidel` is off when the query already named something in the app.
 * Every Latin word has a fidel spelling, so an unconditional fidel answer would
 * sit above the Note Taking tool for someone who typed "note" — and take the
 * Enter key with it.
 */
export function buildAnswers(
  query: string,
  now: Date,
  { includeFidel = true }: { includeFidel?: boolean } = {}
): CommandAnswer[] {
  const dates = buildDateAnswers(query, now);
  const holidays = buildHolidayAnswers(query, now);
  const fidel = includeFidel ? buildFidelAnswer(query) : null;

  return [...dates, ...holidays, ...(fidel ? [fidel] : [])];
}
