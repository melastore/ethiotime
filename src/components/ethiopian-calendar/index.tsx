"use client";

import { useState, useMemo } from "react";
import Kenat, { MonthGrid, toGC } from "kenat";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ETHIOPIAN_MONTHS,
  WEEKDAY_HEADERS,
  getCenteredEthiopianYears,
} from "@/lib/calendar-data";
import { getHolidayOccurrencesForEthiopianYear } from "@/lib/ethiopian-holidays";

interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

interface Holiday {
  key: string;
  /** English name, with the Amharic one alongside it. */
  name: string;
  amharic: string;
  description?: string;
  tags?: string[];
}

interface CalendarDay {
  ethiopian: CalendarDateParts;
  gregorian: CalendarDateParts;
  holidays: Holiday[];
  isToday: boolean;
}

const toGregorianDate = (parts: CalendarDateParts) =>
  new Date(parts.year, parts.month - 1, parts.day);

/** Pagume runs to six days in a leap year; every other month is exactly 30. */
const daysInEthiopianMonth = (year: number, month: number) =>
  month === 13 ? (year % 4 === 3 ? 6 : 5) : 30;

/**
 * Builds the same day grid as the calendar library, minus holidays.
 *
 * The library's movable-holiday maths (Fasika and Siklet, via bahire hasab)
 * throws on one year in every nineteen — 1949, 1968, 1987, 2006, 2025 and so on
 * — and the throw takes the whole month with it, not just the holiday. Those
 * years are all reachable from the year dropdown, so the month is rebuilt here
 * instead of letting the page fail.
 */
function buildGridWithoutHolidays(
  year: number,
  month: number,
  today: CalendarDateParts
): Array<CalendarDay | null> {
  const firstDay = toGC(year, month, 1) as CalendarDateParts;
  // The grid starts on Monday, while getDay() starts on Sunday.
  const leadingBlanks = (toGregorianDate(firstDay).getDay() + 6) % 7;

  const days: Array<CalendarDay | null> = Array.from(
    { length: leadingBlanks },
    () => null
  );

  for (let day = 1; day <= daysInEthiopianMonth(year, month); day += 1) {
    days.push({
      ethiopian: { year, month, day },
      gregorian: toGC(year, month, day) as CalendarDateParts,
      holidays: [],
      isToday:
        today.year === year && today.month === month && today.day === day,
    });
  }

  return days;
}

const EthiopianCalendar = () => {
  const [currentDate, setCurrentDate] = useState(() => new Kenat());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const currentEthDate = currentDate.getEthiopian();
  const currentYear = currentEthDate.year;
  const currentMonth = currentEthDate.month;

  /**
   * The month's feasts, keyed by Ethiopian day.
   *
   * They come from `src/lib` rather than from the calendar library, which put
   * Eid al-Adha on 9 Dhu al-Hijjah, Mawlid on 11 Rabi al-Awwal and Nations Day
   * on Hidar 20 — each a day or more out, and each one a date the holiday guide
   * disagreed with. One source keeps the two pages saying the same thing.
   */
  const holidaysByDay = useMemo(() => {
    const byDay = new Map<number, Holiday[]>();

    for (const occurrence of getHolidayOccurrencesForEthiopianYear(currentYear)) {
      if (occurrence.ethiopian.month !== currentMonth) continue;

      const day = byDay.get(occurrence.ethiopian.day) ?? [];
      day.push({
        key: occurrence.holiday.id,
        name: occurrence.holiday.name,
        amharic: occurrence.holiday.amharic,
        description: occurrence.holiday.description,
        tags: ["public", occurrence.holiday.tradition],
      });
      byDay.set(occurrence.ethiopian.day, day);
    }

    return byDay;
  }, [currentYear, currentMonth]);

  const monthDays = useMemo(() => {
    const withHolidays = (day: CalendarDay | null) =>
      day
        ? { ...day, holidays: holidaysByDay.get(day.ethiopian.day) ?? [] }
        : day;

    try {
      const grid = new MonthGrid({
        year: currentYear,
        month: currentMonth,
        weekStart: 1,
        mode: "public",
      }).generate();

      return (grid.days as Array<CalendarDay | null>).map(withHolidays);
    } catch {
      return buildGridWithoutHolidays(
        currentYear,
        currentMonth,
        new Kenat().getEthiopian()
      ).map(withHolidays);
    }
  }, [currentYear, currentMonth, holidaysByDay]);

  const currentMonthDetails = ETHIOPIAN_MONTHS.find(
    (month) => month.value === currentMonth.toString()
  );

  const yearOptions = useMemo(() => getCenteredEthiopianYears(), []);
  const weekCount = Math.ceil(monthDays.length / 7);

  const handlePrevMonth = () => setCurrentDate((prev) => prev.addMonths(-1));
  const handleNextMonth = () => setCurrentDate((prev) => prev.addMonths(1));
  const handleGoToToday = () => setCurrentDate(new Kenat());

  const handleYearChange = (value: string) => {
    setCurrentDate(
      new Kenat({ year: Number.parseInt(value, 10), month: currentMonth, day: 1 })
    );
  };

  const handleMonthSelect = (month: number) => {
    setCurrentDate(new Kenat({ year: currentYear, month, day: 1 }));
    setIsMonthPickerOpen(false);
  };

  const navButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100";

  return (
    <div className="mx-auto flex h-[calc(100svh-7rem)] w-full max-w-5xl select-none flex-col px-1 lg:h-[calc(100vh-4.5rem)]">
      <header className="mb-3 flex flex-none items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-baseline gap-2 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {currentMonthDetails?.label}
            <span className="text-lg font-semibold text-teal-600 sm:text-xl dark:text-teal-400">
              {currentYear}
            </span>
          </h1>
          <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            {currentMonthDetails?.amharic}
            {currentMonthDetails?.gregorianSpan && (
              <span className="text-slate-400 dark:text-slate-500">
                {" · ≈ "}
                {currentMonthDetails.gregorianSpan}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-none items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className={navButtonClass}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className={navButtonClass}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* The only way to jump a month or year, so it stays available at
              every width. */}
          <button
            type="button"
            onClick={() => setIsMonthPickerOpen((open) => !open)}
            aria-expanded={isMonthPickerOpen}
            aria-controls="calendar-month-picker"
            className={cn(
              "h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
              isMonthPickerOpen
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            Browse
          </button>

          <button
            type="button"
            onClick={handleGoToToday}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 dark:border-slate-800 dark:bg-slate-900 dark:text-teal-400 dark:hover:bg-teal-950/40"
          >
            Today
          </button>
        </div>
      </header>

      {isMonthPickerOpen && (
        <div
          id="calendar-month-picker"
          className="mb-3 flex-none overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <label
              htmlFor="calendar-year"
              className="text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              Year
            </label>
            <select
              id="calendar-year"
              value={currentYear.toString()}
              onChange={(event) => handleYearChange(event.target.value)}
              className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-3 sm:grid-cols-7">
            {ETHIOPIAN_MONTHS.map((month) => {
              const isActive = month.value === currentMonth.toString();
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => handleMonthSelect(Number.parseInt(month.value, 10))}
                  aria-pressed={isActive}
                  className={cn(
                    "flex flex-col items-center rounded-lg px-2 py-2 text-center transition-colors",
                    isActive
                      ? "bg-teal-600 text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-sm font-semibold">{month.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 text-[11px]",
                      isActive ? "text-teal-100" : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {month.amharic}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="grid flex-none grid-cols-7 border-b border-slate-200 dark:border-slate-800">
          {WEEKDAY_HEADERS.map((day) => (
            <div key={day.full} className="py-2 text-center">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.full}</span>
              </span>
              <span className="mt-0.5 hidden text-[10px] text-slate-400 sm:block dark:text-slate-600">
                {day.amharic}
              </span>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "grid flex-1 grid-cols-7",
            weekCount <= 5 ? "grid-rows-5" : "grid-rows-6"
          )}
        >
          {monthDays.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="border-b border-r border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-950/30"
                />
              );
            }

            // The grid starts on Monday, so the last two columns are the weekend.
            const isWeekend = index % 7 >= 5;
            const { isToday } = day;
            const hasHoliday = day.holidays.length > 0;
            const gregorian = toGregorianDate(day.gregorian);

            const cellClass = cn(
              "relative flex flex-col items-center justify-center gap-0.5 border-b border-r border-slate-100 dark:border-slate-800/60",
              isWeekend && !isToday && "bg-slate-50/60 dark:bg-slate-950/30"
            );

            const content = (
              <>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold tabular-nums sm:h-9 sm:w-9 sm:text-lg",
                    isToday
                      ? "bg-teal-600 text-white"
                      : hasHoliday
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-800 dark:text-slate-200"
                  )}
                >
                  {day.ethiopian.day}
                </span>

                <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                  {day.gregorian.day}
                </span>

                {/* One marker only: the number is already tinted on a holiday. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1 w-1 rounded-full",
                    hasHoliday ? "bg-rose-500" : "bg-transparent"
                  )}
                />
              </>
            );

            const key = `${day.ethiopian.year}-${day.ethiopian.month}-${day.ethiopian.day}`;

            // Only holidays have anything to show, so only they are clickable.
            if (!hasHoliday) {
              return (
                <div key={key} className={cellClass}>
                  {content}
                </div>
              );
            }

            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedDay(day)}
                aria-label={`${day.holidays
                  .map((holiday) => holiday.name)
                  .join(", ")} — ${currentMonthDetails?.label} ${day.ethiopian.day}, ${day.ethiopian.year} (${gregorian.toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" }
                )})`}
                className={cn(
                  cellClass,
                  "cursor-pointer transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500 dark:hover:bg-rose-950/30"
                )}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-none items-center justify-center gap-5 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden="true" />
          Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
          Holiday
          <span className="hidden text-slate-400 sm:inline dark:text-slate-500">
            — tap for details
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-3.5 rounded-sm bg-slate-100 dark:bg-slate-800"
            aria-hidden="true"
          />
          Weekend
        </span>
      </div>

      <Dialog
        open={selectedDay !== null}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="w-[92%] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl outline-none [&>button]:hidden dark:border-slate-800 dark:bg-slate-900">
          {selectedDay && (
            <>
              {/* The dialog only ever opens on a holiday. */}
              <div className="relative bg-gradient-to-br from-rose-500 to-rose-600 px-5 pb-5 pt-4 text-white">
                <DialogClose className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Close</span>
                </DialogClose>

                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  {toGregorianDate(selectedDay.gregorian).toLocaleDateString(
                    "en-US",
                    { weekday: "long" }
                  )}
                </p>

                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-5xl font-bold leading-none tabular-nums">
                    {selectedDay.ethiopian.day}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold leading-tight">
                      {ETHIOPIAN_MONTHS[selectedDay.ethiopian.month - 1].label}{" "}
                      {selectedDay.ethiopian.year}
                    </p>
                    <p className="truncate text-sm text-white/75">
                      {ETHIOPIAN_MONTHS[selectedDay.ethiopian.month - 1].amharic}
                    </p>
                  </div>
                </div>

                <p className="mt-3 border-t border-white/20 pt-2.5 text-sm text-white/85">
                  {toGregorianDate(selectedDay.gregorian).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" }
                  )}
                </p>
              </div>

              <DialogTitle className="sr-only">
                {selectedDay.holidays.map((holiday) => holiday.name).join(", ")}
              </DialogTitle>

              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedDay.holidays.map((holiday) => (
                  <li key={holiday.key} className="px-5 py-4">
                    <p className="font-semibold leading-snug text-slate-900 dark:text-white">
                      {holiday.name}
                    </p>
                    <p className="mt-0.5 text-sm text-rose-600 dark:text-rose-400">
                      {holiday.amharic}
                    </p>

                    {holiday.description && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {holiday.description}
                      </p>
                    )}

                    {holiday.tags && holiday.tags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {holiday.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EthiopianCalendar;
