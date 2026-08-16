import Kenat from "kenat";

import { getDaysInMonthForMode } from "@/lib/calendar-data";

export type PlannerCalendar = "gregorian" | "ethiopian";
export type RecurrenceRule = "none" | "monthly" | "yearly";

export type PlannerDateInput = {
  calendar: PlannerCalendar;
  year: number;
  month: number;
  day: number;
  time: string;
};

export type PlannerEvent = {
  id: string;
  title: string;
  notes: string;
  date: PlannerDateInput;
  recurrence: RecurrenceRule;
  reminderMinutes: number;
  createdAt: number;
};

export type PlannerOccurrence = {
  eventId: string;
  title: string;
  notes: string;
  sourceCalendar: PlannerCalendar;
  start: Date;
  ethiopian: {
    year: number;
    month: number;
    day: number;
  };
  gregorian: {
    year: number;
    month: number;
    day: number;
  };
  reminderMinutes: number;
  recurrence: RecurrenceRule;
  occurrenceKey: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const parseTime = (value: string) => {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number.parseInt(hoursRaw ?? "0", 10);
  const minutes = Number.parseInt(minutesRaw ?? "0", 10);

  return {
    hours: Number.isNaN(hours) ? 0 : Math.min(Math.max(hours, 0), 23),
    minutes: Number.isNaN(minutes) ? 0 : Math.min(Math.max(minutes, 0), 59),
  };
};

const formatTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const normalizeGregorianDate = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0,
    0
  );

export const getTodayPlannerDate = (
  calendar: PlannerCalendar
): PlannerDateInput => {
  const now = new Date();

  if (calendar === "gregorian") {
    return {
      calendar,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      time: formatTime(now),
    };
  }

  const ethiopian = new Kenat(now).getEthiopian();

  return {
    calendar,
    year: ethiopian.year,
    month: ethiopian.month,
    day: ethiopian.day,
    time: formatTime(now),
  };
};

export const getPlannerDaysInMonth = (input: PlannerDateInput) =>
  getDaysInMonthForMode(input.calendar, String(input.month), String(input.year));

export const plannerDateToGregorian = (input: PlannerDateInput): Date => {
  const { hours, minutes } = parseTime(input.time);

  if (input.calendar === "gregorian") {
    const date = new Date(input.year, input.month - 1, input.day, hours, minutes, 0, 0);
    if (
      date.getFullYear() !== input.year ||
      date.getMonth() !== input.month - 1 ||
      date.getDate() !== input.day
    ) {
      throw new Error("Invalid Gregorian planner date.");
    }
    return date;
  }

  const converted = new Kenat({
    year: input.year,
    month: input.month,
    day: input.day,
  }).getGregorian();

  return new Date(
    converted.year,
    converted.month - 1,
    converted.day,
    hours,
    minutes,
    0,
    0
  );
};

export const gregorianToPlannerDate = (
  gregorianDate: Date,
  calendar: PlannerCalendar
): PlannerDateInput => {
  const normalized = normalizeGregorianDate(gregorianDate);

  if (calendar === "gregorian") {
    return {
      calendar,
      year: normalized.getFullYear(),
      month: normalized.getMonth() + 1,
      day: normalized.getDate(),
      time: formatTime(normalized),
    };
  }

  const eth = new Kenat(normalized).getEthiopian();
  return {
    calendar,
    year: eth.year,
    month: eth.month,
    day: eth.day,
    time: formatTime(normalized),
  };
};

export const convertPlannerDate = (
  input: PlannerDateInput,
  nextCalendar: PlannerCalendar
): PlannerDateInput => {
  if (input.calendar === nextCalendar) {
    return input;
  }

  const gregorian = plannerDateToGregorian(input);
  return gregorianToPlannerDate(gregorian, nextCalendar);
};

const addGregorianMonths = (date: Date, count: number) => {
  const next = new Date(date);
  const day = next.getDate();

  next.setDate(1);
  next.setMonth(next.getMonth() + count);
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, daysInMonth));

  return next;
};

const shiftEthiopianDate = (
  source: PlannerDateInput,
  monthsToAdd: number,
  yearsToAdd: number
): PlannerDateInput => {
  let year = source.year + yearsToAdd;
  let month = source.month;

  if (monthsToAdd !== 0) {
    const absoluteMonth = month - 1 + monthsToAdd;
    year += Math.floor(absoluteMonth / 13);
    month = ((absoluteMonth % 13) + 13) % 13 + 1;
  }

  const daysInMonth = getDaysInMonthForMode("ethiopian", String(month), String(year));
  const day = Math.min(source.day, daysInMonth);

  return {
    ...source,
    year,
    month,
    day,
  };
};

const shiftGregorianDate = (
  source: PlannerDateInput,
  monthsToAdd: number,
  yearsToAdd: number
): PlannerDateInput => {
  const base = plannerDateToGregorian(source);
  let shifted = base;

  if (monthsToAdd !== 0) {
    shifted = addGregorianMonths(shifted, monthsToAdd);
  }

  if (yearsToAdd !== 0) {
    const month = shifted.getMonth();
    const day = shifted.getDate();
    shifted = new Date(
      shifted.getFullYear() + yearsToAdd,
      month,
      day,
      shifted.getHours(),
      shifted.getMinutes(),
      0,
      0
    );

    if (shifted.getMonth() !== month) {
      shifted = new Date(
        shifted.getFullYear(),
        month + 1,
        0,
        shifted.getHours(),
        shifted.getMinutes(),
        0,
        0
      );
    }
  }

  return {
    ...source,
    year: shifted.getFullYear(),
    month: shifted.getMonth() + 1,
    day: shifted.getDate(),
    time: formatTime(shifted),
  };
};

const getOccurrenceInput = (
  source: PlannerDateInput,
  recurrence: RecurrenceRule,
  offset: number
): PlannerDateInput => {
  if (offset <= 0 || recurrence === "none") {
    return source;
  }

  if (source.calendar === "ethiopian") {
    if (recurrence === "monthly") {
      return shiftEthiopianDate(source, offset, 0);
    }
    return shiftEthiopianDate(source, 0, offset);
  }

  if (recurrence === "monthly") {
    return shiftGregorianDate(source, offset, 0);
  }

  return shiftGregorianDate(source, 0, offset);
};

export const getUpcomingOccurrences = (
  event: PlannerEvent,
  startDate: Date,
  count: number
): PlannerOccurrence[] => {
  const occurrences: PlannerOccurrence[] = [];

  if (count <= 0) return occurrences;

  const limit = event.recurrence === "none" ? 1 : 600;

  for (let index = 0; index < limit; index += 1) {
    const occurrenceInput = getOccurrenceInput(event.date, event.recurrence, index);

    let start: Date;
    try {
      start = plannerDateToGregorian(occurrenceInput);
    } catch {
      continue;
    }

    if (start.getTime() < startDate.getTime()) {
      if (event.recurrence === "none") {
        break;
      }
      continue;
    }

    const gregorian = {
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      day: start.getDate(),
    };

    const eth = new Kenat(start).getEthiopian();

    occurrences.push({
      eventId: event.id,
      title: event.title,
      notes: event.notes,
      sourceCalendar: event.date.calendar,
      start,
      ethiopian: {
        year: eth.year,
        month: eth.month,
        day: eth.day,
      },
      gregorian,
      reminderMinutes: event.reminderMinutes,
      recurrence: event.recurrence,
      occurrenceKey: `${event.id}:${start.toISOString()}`,
    });

    if (occurrences.length >= count || event.recurrence === "none") {
      break;
    }
  }

  return occurrences;
};

export const getNextOccurrence = (
  event: PlannerEvent,
  startDate: Date
): PlannerOccurrence | null => {
  const [next] = getUpcomingOccurrences(event, startDate, 1);
  return next ?? null;
};

export const normalizePlannerEvent = (
  value: Omit<PlannerEvent, "id" | "createdAt">
): PlannerEvent => ({
  ...value,
  id: crypto.randomUUID(),
  createdAt: Date.now(),
});
