"use client";

import { useReducer, useEffect, useMemo } from "react";
import Kenat from "kenat";

import {
  DAY_OPTIONS,
  ETHIOPIAN_MONTHS,
  GREGORIAN_MONTHS,
  getDescendingEthiopianYears,
  getDescendingGregorianYears,
  getDaysInMonthForMode,
  type CalendarMode,
  type DateInput,
} from "@/lib/calendar-data";
import { cn } from "@/lib/utils";

const ethiopianMonths = ETHIOPIAN_MONTHS.map((month) => ({
  value: month.value,
  label: month.amharic ? `${month.label} (${month.amharic})` : month.label,
}));

const gregorianMonths = GREGORIAN_MONTHS.map((month) => ({
  value: month.value,
  label: month.label,
}));

const gregorianYears = getDescendingGregorianYears(120);
const ethiopianYears = getDescendingEthiopianYears(120);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between two calendar dates, ignoring clock time and DST. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

interface Age {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

interface State {
  dob: DateInput;
  age: Age | null;
  mode: CalendarMode;
  error: string | null;
}

type Action =
  | { type: "SET_DOB"; payload: Partial<DateInput> }
  | { type: "SET_MODE"; payload: CalendarMode }
  | { type: "CALCULATE_AGE" };

/** Starts empty so the page asks for a birth date rather than reporting an age of zero. */
const emptyState = (mode: CalendarMode): State => ({
  dob: { day: "", month: "", year: "" },
  age: null,
  mode,
  error: null,
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DOB":
      return {
        ...state,
        dob: { ...state.dob, ...action.payload },
        age: null,
        error: null,
      };
    case "SET_MODE":
      if (state.mode === action.payload) return state;
      return emptyState(action.payload);
    case "CALCULATE_AGE": {
      const { day, month, year } = state.dob;
      if (!day || !month || !year) {
        return { ...state, age: null, error: null };
      }

      try {
        if (state.mode === "gregorian") {
          const birthDate = new Date(+year, +month - 1, +day);
          if (
            Number.isNaN(birthDate.getTime()) ||
            birthDate.getFullYear() !== +year ||
            birthDate.getMonth() !== +month - 1 ||
            birthDate.getDate() !== +day
          ) {
            throw new Error("That date does not exist.");
          }

          const today = new Date();
          if (birthDate > today) {
            throw new Error("Date of birth cannot be in the future.");
          }

          let years = today.getFullYear() - birthDate.getFullYear();
          let months = today.getMonth() - birthDate.getMonth();
          let days = today.getDate() - birthDate.getDate();

          if (days < 0) {
            months--;
            days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
          }
          if (months < 0) {
            years--;
            months += 12;
          }

          return {
            ...state,
            age: { years, months, days, totalDays: daysBetween(birthDate, today) },
            error: null,
          };
        }

        const birthGregorian = new Kenat({
          year: +year,
          month: +month,
          day: +day,
        }).getGregorian();
        const birthGDate = new Date(
          birthGregorian.year,
          birthGregorian.month - 1,
          birthGregorian.day
        );

        if (Number.isNaN(birthGDate.getTime())) {
          throw new Error("That date does not exist.");
        }

        const nowKenat = new Kenat();
        const today = nowKenat.getEthiopian();
        const todayGregorian = nowKenat.getGregorian();
        const todayGDate = new Date(
          todayGregorian.year,
          todayGregorian.month - 1,
          todayGregorian.day
        );

        if (birthGDate > todayGDate) {
          throw new Error("Date of birth cannot be in the future.");
        }

        let years = today.year - +year;
        let months = today.month - +month;
        let days = today.day - +day;

        if (days < 0) {
          months--;
          const prevMonth = today.month === 1 ? 13 : today.month - 1;
          const prevMonthYear = today.month === 1 ? today.year - 1 : today.year;
          days += prevMonth === 13 ? (prevMonthYear % 4 === 3 ? 6 : 5) : 30;
        }
        if (months < 0) {
          years--;
          months += 13;
        }

        return {
          ...state,
          age: {
            years,
            months,
            days,
            totalDays: daysBetween(birthGDate, todayGDate),
          },
          error: null,
        };
      } catch (e: unknown) {
        return {
          ...state,
          age: null,
          error: e instanceof Error ? e.message : "Could not calculate age.",
        };
      }
    }
    default:
      return state;
  }
}

const fieldClass =
  "h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const labelClass =
  "mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400";

function Field({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        className={fieldClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AgeCalculator() {
  const [state, dispatch] = useReducer(reducer, emptyState("gregorian"));
  const { dob, age, mode, error } = state;

  useEffect(() => {
    dispatch({ type: "CALCULATE_AGE" });
  }, [dob, mode]);

  const isGregorian = mode === "gregorian";

  const dayOptions = useMemo(() => {
    const limit =
      dob.month && dob.year
        ? getDaysInMonthForMode(mode, dob.month, dob.year)
        : DAY_OPTIONS.length;
    return DAY_OPTIONS.slice(0, limit).map((day) => ({ value: day, label: day }));
  }, [dob.month, dob.year, mode]);

  const yearOptions = useMemo(
    () =>
      (isGregorian ? gregorianYears : ethiopianYears).map((year) => ({
        value: year,
        label: year,
      })),
    [isGregorian]
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-1 py-2">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Age Calculator
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Enter a date of birth in either calendar to see an exact age.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div
          className="inline-flex rounded-lg border border-slate-200 p-1 dark:border-slate-700"
          role="group"
          aria-label="Calendar"
        >
          {(["gregorian", "ethiopian"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => dispatch({ type: "SET_MODE", payload: option })}
              aria-pressed={mode === option}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold capitalize transition-colors",
                mode === option
                  ? "bg-teal-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field
            label="Month"
            placeholder="Select"
            value={dob.month}
            options={isGregorian ? gregorianMonths : ethiopianMonths}
            onChange={(month) => dispatch({ type: "SET_DOB", payload: { month } })}
          />
          <Field
            label="Day"
            placeholder="Select"
            value={dob.day}
            options={dayOptions}
            onChange={(day) => dispatch({ type: "SET_DOB", payload: { day } })}
          />
          <Field
            label="Year"
            placeholder="Select"
            value={dob.year}
            options={yearOptions}
            onChange={(year) => dispatch({ type: "SET_DOB", payload: { year } })}
          />
        </div>
      </div>

      <div className="mt-6" aria-live="polite">
        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        ) : age ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">You are</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              {age.years}
              <span className="ml-2 text-xl font-semibold text-slate-500 dark:text-slate-400">
                {age.years === 1 ? "year" : "years"}
              </span>
            </p>
            <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">
              {age.months} {age.months === 1 ? "month" : "months"}, {age.days}{" "}
              {age.days === 1 ? "day" : "days"}
            </p>
            <hr className="my-5 border-slate-200 dark:border-slate-800" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              That is{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {age.totalDays.toLocaleString()}
              </span>{" "}
              days in total.
            </p>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Choose a month, day and year to see the result.
          </p>
        )}
      </div>
    </div>
  );
}
