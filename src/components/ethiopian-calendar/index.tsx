"use client";

import { useState, useMemo } from "react";
import Kenat, { MonthGrid } from "kenat";
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

interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

interface Holiday {
  name: string;
}

interface CalendarDay {
  ethiopian: CalendarDateParts;
  gregorian: CalendarDateParts;
  holidays: Holiday[];
  isToday: boolean;
}

const BLOCKED_HOLIDAY_NAMES = new Set([
  "የደርግ ውድቀት ቀን",
  "Derg Downfall Day",
  "የሰማዕታት ቀን",
]);

const toGregorianDate = (parts: CalendarDateParts) =>
  new Date(parts.year, parts.month - 1, parts.day);

const EthiopianCalendar = () => {
  const [currentDate, setCurrentDate] = useState(() => new Kenat());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const currentEthDate = currentDate.getEthiopian();
  const currentYear = currentEthDate.year;
  const currentMonth = currentEthDate.month;

  const monthGrid = useMemo(
    () =>
      new MonthGrid({
        year: currentYear,
        month: currentMonth,
        weekStart: 1,
        mode: "public",
      }),
    [currentYear, currentMonth]
  );

  const gridData = useMemo(() => monthGrid.generate(), [monthGrid]);
  const monthDays = useMemo(
    () =>
      (gridData.days as Array<CalendarDay | null>).map((day) =>
        day
          ? {
              ...day,
              holidays: (day.holidays ?? []).filter(
                (holiday) => !BLOCKED_HOLIDAY_NAMES.has(holiday.name.trim())
              ),
            }
          : day
      ),
    [gridData.days]
  );

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

          {/* Available at every width — on mobile this was the only way to
              change month or year, and it used to be hidden below `sm`. */}
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

            return (
              <button
                type="button"
                key={`${day.ethiopian.year}-${day.ethiopian.month}-${day.ethiopian.day}`}
                onClick={() => setSelectedDay(day)}
                aria-label={`${currentMonthDetails?.label} ${day.ethiopian.day}, ${day.ethiopian.year} — ${gregorian.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${hasHoliday ? `, ${day.holidays.map((holiday) => holiday.name).join(", ")}` : ""}`}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-0.5 border-b border-r border-slate-100 transition-colors dark:border-slate-800/60",
                  "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 dark:hover:bg-slate-800/50",
                  isWeekend && !isToday && "bg-slate-50/60 dark:bg-slate-950/30"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold tabular-nums transition-colors sm:h-9 sm:w-9 sm:text-lg",
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

                {/* Single holiday marker — the number is already tinted, so a
                    ring on top of a dot only added noise. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1 w-1 rounded-full",
                    hasHoliday ? "bg-rose-500" : "bg-transparent"
                  )}
                />
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
        <DialogContent className="w-[92%] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 outline-none [&>button]:hidden dark:border-slate-800 dark:bg-slate-900">
          {selectedDay && (
            <>
              <DialogTitle className="sr-only">
                {ETHIOPIAN_MONTHS[selectedDay.ethiopian.month - 1].label}{" "}
                {selectedDay.ethiopian.day}, {selectedDay.ethiopian.year}
              </DialogTitle>

              <div className="flex items-center gap-4 border-b border-slate-100 p-4 dark:border-slate-800">
                <div
                  className={cn(
                    "flex h-14 w-14 flex-none items-center justify-center rounded-xl text-3xl font-bold tabular-nums text-white",
                    selectedDay.holidays.length > 0 ? "bg-rose-500" : "bg-teal-600"
                  )}
                >
                  {selectedDay.ethiopian.day}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">
                    {ETHIOPIAN_MONTHS[selectedDay.ethiopian.month - 1].label}{" "}
                    {selectedDay.ethiopian.year}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {ETHIOPIAN_MONTHS[selectedDay.ethiopian.month - 1].amharic} ·{" "}
                    {toGregorianDate(selectedDay.gregorian).toLocaleDateString(
                      "en-US",
                      { weekday: "long" }
                    )}
                  </p>
                </div>

                <DialogClose className="flex-none rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Gregorian
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {toGregorianDate(selectedDay.gregorian).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Holidays
                  </p>
                  {selectedDay.holidays.length > 0 ? (
                    <ul className="mt-1.5 space-y-1.5">
                      {selectedDay.holidays.map((holiday) => (
                        <li
                          key={holiday.name}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
                        >
                          {holiday.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      No public holiday on this date.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EthiopianCalendar;
