"use client";

import { useMemo, useState } from "react";
import { BookOpenText, CalendarDays, Landmark } from "lucide-react";

import {
  ETHIOPIAN_PUBLIC_HOLIDAYS,
  type HolidayCalendarType,
  getHolidayOccurrencesForYear,
} from "@/lib/ethiopian-holidays";
import { cn } from "@/lib/utils";

const getCalendarLabel = (value: HolidayCalendarType) => {
  if (value === "ethiopian") return "Ethiopian";
  if (value === "gregorian") return "Gregorian";
  return "Islamic (Hijri)";
};

export default function HolidayGuide() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [query, setQuery] = useState("");

  const yearOptions = useMemo(
    () => Array.from({ length: 16 }, (_, index) => currentYear - 5 + index),
    [currentYear]
  );

  const occurrences = useMemo(
    () => getHolidayOccurrencesForYear(year),
    [year]
  );

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) return occurrences;

    return occurrences.filter((item) => {
      const haystack = `${item.holiday.name} ${item.holiday.amharic} ${item.holiday.description} ${item.holiday.history}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [occurrences, query]);

  return (
    <section className="animate-rise space-y-4 pb-8">
      <header className="glass-surface rounded-[1.8rem] p-6 sm:p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-300">
          <Landmark className="h-3.5 w-3.5" />
          Holiday history + context
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Ethiopian Public Holiday Guide
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Official holidays with Ethiopian and Gregorian dates, plus short
          historical context for each observance.
        </p>
      </header>

      <div className="glass-surface rounded-[1.6rem] p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[190px_1fr]">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Gregorian year
            </label>
            <select
              value={year}
              onChange={(event) => setYear(Number.parseInt(event.target.value, 10))}
              className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Search holidays
            </label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 px-3.5 text-sm font-medium outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
              placeholder="Adwa, Timket, እንቁጣጣሽ..."
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((item) => (
          <article
            key={item.holiday.id}
            className="glass-surface rounded-[1.5rem] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {item.holiday.name}
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {item.holiday.amharic}
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                {getCalendarLabel(item.holiday.calendar)}
              </span>
            </div>

            <div
              className={cn(
                "mt-4 grid gap-2 text-xs",
                item.holiday.calendar === "islamic"
                  ? "sm:grid-cols-3"
                  : "sm:grid-cols-2"
              )}
            >
              <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-3 py-2 dark:border-teal-900/50 dark:bg-teal-950/20">
                <p className="font-bold uppercase tracking-[0.1em] text-teal-700 dark:text-teal-300">
                  Ethiopian date
                </p>
                <p className="mt-1 font-semibold text-teal-800 dark:text-teal-100">
                  {item.ethiopian.day} {item.ethiopian.monthLabel} {item.ethiopian.year}
                </p>
              </div>
              <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-2 dark:border-orange-900/50 dark:bg-orange-950/20">
                <p className="font-bold uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">
                  Gregorian date
                </p>
                <p className="mt-1 font-semibold text-orange-800 dark:text-orange-100">
                  {item.gregorianDate.toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              {item.holiday.calendar === "islamic" && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <p className="font-bold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                    Islamic date
                  </p>
                  <p className="mt-1 font-semibold text-emerald-800 dark:text-emerald-100">
                    {item.islamic.day} {item.islamic.monthLabel} {item.islamic.year} AH
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  About
                </p>
                <p>{item.holiday.description}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <BookOpenText className="h-3.5 w-3.5" />
                  Historical context
                </p>
                <p>{item.holiday.history}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          No holiday matched your search for {year}. Try a different keyword.
        </div>
      )}

      <footer className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 text-xs text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/55 dark:text-slate-400">
        {ETHIOPIAN_PUBLIC_HOLIDAYS.length} official/observed holidays are currently included in this open-source guide.
      </footer>
    </section>
  );
}
