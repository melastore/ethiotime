"use client";

import { useMemo, useState } from "react";

import {
  type HolidayCalendarType,
  getHolidayOccurrencesForYear,
} from "@/lib/ethiopian-holidays";

const getCalendarLabel = (value: HolidayCalendarType) => {
  if (value === "ethiopian") return "Ethiopian";
  if (value === "gregorian") return "Gregorian";
  return "Hijri";
};

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const fieldClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default function HolidayGuide() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [query, setQuery] = useState("");

  const yearOptions = useMemo(
    () => Array.from({ length: 16 }, (_, index) => currentYear - 5 + index),
    [currentYear]
  );

  // Sorted by date so the year reads top to bottom the way a calendar does.
  const occurrences = useMemo(
    () =>
      [...getHolidayOccurrencesForYear(year)].sort(
        (a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime()
      ),
    [year]
  );

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) return occurrences;

    return occurrences.filter((item) =>
      `${item.holiday.name} ${item.holiday.amharic} ${item.holiday.description} ${item.holiday.history}`
        .toLowerCase()
        .includes(lowered)
    );
  }, [occurrences, query]);

  return (
    <section className="mx-auto w-full max-w-3xl px-1 py-2">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Ethiopian Holidays
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Public and observed holidays, with the date in both calendars.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div>
          <label
            htmlFor="holiday-year"
            className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Year
          </label>
          <select
            id="holiday-year"
            value={year}
            onChange={(event) => setYear(Number.parseInt(event.target.value, 10))}
            className={fieldClass}
          >
            {yearOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="holiday-search"
            className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Search
          </label>
          <input
            id="holiday-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClass}
            placeholder="Adwa, Timket, እንቁጣጣሽ…"
          />
        </div>
      </div>

      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
        {filtered.length} {filtered.length === 1 ? "holiday" : "holidays"} in {year}
      </p>

      <ul className="mt-3 space-y-2">
        {filtered.map((item) => (
          <li key={item.holiday.id}>
            <details className="group rounded-xl border border-slate-200 bg-white transition-colors open:border-teal-500/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
              <summary className="flex cursor-pointer list-none items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-slate-100 py-2 dark:bg-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {SHORT_MONTHS[item.gregorianDate.getMonth()]}
                  </span>
                  <span className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                    {item.gregorianDate.getDate()}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900 dark:text-white">
                    {item.holiday.name}
                  </span>
                  <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
                    {item.holiday.amharic} · {item.ethiopian.day}{" "}
                    {item.ethiopian.monthLabel} {item.ethiopian.year}
                  </span>
                </span>

                <span className="hidden shrink-0 rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:inline-block">
                  {getCalendarLabel(item.holiday.calendar)}
                </span>
              </summary>

              <div className="space-y-3 border-t border-slate-100 px-4 py-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <p>{item.holiday.description}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  {item.holiday.history}
                </p>
                {item.holiday.calendar === "islamic" && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hijri date: {item.islamic.day} {item.islamic.monthLabel}{" "}
                    {item.islamic.year} AH. Observed dates may shift by a day with
                    the moon sighting.
                  </p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nothing matched “{query}” in {year}.
        </p>
      )}
    </section>
  );
}
