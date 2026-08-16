"use client";

import { useMemo } from "react";

import {
  DAY_OPTIONS,
  ETHIOPIAN_MONTHS,
  GREGORIAN_MONTHS,
  getCenteredEthiopianYears,
  getCenteredGregorianYears,
} from "@/lib/calendar-data";
import { cn } from "@/lib/utils";

type CalendarMode = "gregorian" | "ethiopian";

type DateInputFieldsProps = {
  calendar: CalendarMode;
  day: number;
  month: number;
  year: number;
  onChange: (patch: { day?: number; month?: number; year?: number }) => void;
  className?: string;
  size?: "default" | "compact";
};

const gregorianYears = getCenteredGregorianYears(80, 180).map((value) =>
  Number.parseInt(value, 10)
);
const ethiopianYears = getCenteredEthiopianYears(80, 180).map((value) =>
  Number.parseInt(value, 10)
);

export function DateInputFields({
  calendar,
  day,
  month,
  year,
  onChange,
  className,
  size = "default",
}: DateInputFieldsProps) {
  const daysInMonth = useMemo(() => {
    if (calendar === "gregorian") {
      return new Date(year, month, 0).getDate();
    }

    if (month === 13) {
      return year % 4 === 3 ? 6 : 5;
    }

    return 30;
  }, [calendar, month, year]);

  const dayOptions = DAY_OPTIONS.slice(0, daysInMonth).map((value) =>
    Number.parseInt(value, 10)
  );
  const months = calendar === "gregorian" ? GREGORIAN_MONTHS : ETHIOPIAN_MONTHS;
  const years = calendar === "gregorian" ? gregorianYears : ethiopianYears;
  const fieldHeight = size === "compact" ? "h-10" : "h-11 sm:h-12";

  return (
    <div className={cn("grid grid-cols-3 gap-2.5 sm:gap-3", className)}>
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Day
        </label>
        <select
          value={day}
          onChange={(event) => onChange({ day: Number.parseInt(event.target.value, 10) })}
          className={cn(
            fieldHeight,
            "w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
          )}
        >
          {dayOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Month
        </label>
        <select
          value={month}
          onChange={(event) => onChange({ month: Number.parseInt(event.target.value, 10) })}
          className={cn(
            fieldHeight,
            "w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
          )}
        >
          {months.map((item) => (
            <option key={item.value} value={item.value}>
              {item.amharic ? `${item.label} (${item.amharic})` : item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Year
        </label>
        <select
          value={year}
          onChange={(event) => onChange({ year: Number.parseInt(event.target.value, 10) })}
          className={cn(
            fieldHeight,
            "w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
          )}
        >
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
