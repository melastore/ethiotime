"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import {
  type HolidayCalendarType,
  type HolidayOccurrence,
  getHolidayOccurrencesForYear,
} from "@/lib/ethiopian-holidays";
import { cn } from "@/lib/utils";

const CALENDAR_LABELS: Record<HolidayCalendarType, string> = {
  ethiopian: "Ethiopian",
  gregorian: "Gregorian",
  islamic: "Hijri",
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const ONE_DAY = 24 * 60 * 60 * 1000;

const formatWeekday = (date: Date, style: "short" | "long") =>
  date.toLocaleDateString("en-US", { weekday: style });

const fieldClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100";

type HolidayGroup = {
  monthLabel: string;
  items: HolidayOccurrence[];
};

export default function HolidayGuide() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [query, setQuery] = useState("");
  // Resolved after mount so the server and the browser cannot disagree about
  // what "today" is and trip a hydration mismatch.
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => setToday(startOfDay(new Date())), []);

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

  // Grouped by Gregorian month so a year of holidays reads as a calendar
  // rather than one undifferentiated list.
  const groups = useMemo(() => {
    const result: HolidayGroup[] = [];

    for (const item of filtered) {
      const monthLabel = item.gregorianDate.toLocaleDateString("en-US", {
        month: "long",
      });

      if (result[result.length - 1]?.monthLabel !== monthLabel) {
        result.push({ monthLabel, items: [] });
      }
      result[result.length - 1].items.push(item);
    }

    return result;
  }, [filtered]);

  const nextUp = useMemo(() => {
    if (today === null) return null;
    return (
      occurrences.find((item) => startOfDay(item.gregorianDate) >= today) ?? null
    );
  }, [occurrences, today]);

  const daysUntil = (date: Date) =>
    today === null ? null : Math.round((startOfDay(date) - today) / ONE_DAY);

  return (
    <section className="mx-auto w-full max-w-3xl px-1 py-2">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Ethiopian Holidays
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Public and observed holidays, with the weekday and the date in both
          calendars.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <div>
          <label
            htmlFor="holiday-year"
            className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400"
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
            className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400"
          >
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="holiday-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cn(fieldClass, "pl-9")}
              placeholder="Adwa, Timket, እንቁጣጣሽ…"
            />
          </div>
        </div>
      </div>

      {nextUp && !query && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-900/50 dark:bg-teal-950/30">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
              Next holiday
            </p>
            <p className="mt-0.5 truncate font-semibold text-slate-900 dark:text-white">
              {nextUp.holiday.name}
            </p>
            <p className="truncate text-sm text-slate-600 dark:text-slate-400">
              {formatWeekday(nextUp.gregorianDate, "long")},{" "}
              {nextUp.gregorianDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <span className="shrink-0 text-right">
            <span className="block text-2xl font-bold tabular-nums leading-none text-teal-700 dark:text-teal-400">
              {daysUntil(nextUp.gregorianDate)}
            </span>
            <span className="text-[11px] text-teal-700/80 dark:text-teal-400/80">
              {daysUntil(nextUp.gregorianDate) === 1 ? "day" : "days"}
            </span>
          </span>
        </div>
      )}

      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
        {filtered.length} {filtered.length === 1 ? "holiday" : "holidays"} in{" "}
        {year}
      </p>

      {groups.map((group) => (
        <div key={group.monthLabel} className="mt-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {group.monthLabel}
          </h2>

          <ul className="space-y-2">
            {group.items.map((item) => {
              const remaining = daysUntil(item.gregorianDate);
              const isToday = remaining === 0;
              const isPast = remaining !== null && remaining < 0;

              return (
                <li key={item.holiday.id}>
                  <details
                    className={cn(
                      "group rounded-xl border bg-white transition-colors dark:bg-slate-900",
                      isToday
                        ? "border-teal-500 dark:border-teal-600"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    )}
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3.5 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                      {/* Weekday sits above the day number so the date block
                          answers "which day of the week" at a glance. */}
                      <span
                        className={cn(
                          "flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5",
                          isToday
                            ? "bg-teal-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800",
                          isPast && !isToday && "opacity-60"
                        )}
                      >
                        <span
                          className={cn(
                            "text-[11px] font-semibold uppercase tracking-wide",
                            isToday
                              ? "text-teal-50"
                              : "text-slate-500 dark:text-slate-400"
                          )}
                        >
                          {formatWeekday(item.gregorianDate, "short")}
                        </span>
                        <span
                          className={cn(
                            "text-xl font-bold leading-tight tabular-nums",
                            !isToday && "text-slate-900 dark:text-white"
                          )}
                        >
                          {item.gregorianDate.getDate()}
                        </span>
                      </span>

                      <span
                        className={cn(
                          "min-w-0 flex-1",
                          isPast && !isToday && "opacity-70"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-slate-900 dark:text-white">
                            {item.holiday.name}
                          </span>
                          {isToday && (
                            <span className="shrink-0 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              Today
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-slate-500 dark:text-slate-400">
                          {formatWeekday(item.gregorianDate, "long")} ·{" "}
                          {item.ethiopian.day} {item.ethiopian.monthLabel}{" "}
                          {item.ethiopian.year}
                        </span>
                        <span className="block truncate text-sm text-slate-400 dark:text-slate-500">
                          {item.holiday.amharic}
                        </span>
                      </span>

                      <span className="hidden shrink-0 rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:inline-block">
                        {CALENDAR_LABELS[item.holiday.calendar]}
                      </span>

                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>

                    <div className="space-y-3 border-t border-slate-100 px-4 py-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      <p>{item.holiday.description}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {item.holiday.history}
                      </p>
                      {item.holiday.calendar === "islamic" && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Hijri date: {item.islamic.day}{" "}
                          {item.islamic.monthLabel} {item.islamic.year} AH.
                          Observed dates may shift by a day with the moon
                          sighting.
                        </p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Nothing matched “{query}” in {year}.
        </p>
      )}
    </section>
  );
}
