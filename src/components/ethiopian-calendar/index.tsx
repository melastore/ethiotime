"use client";

import { useState, useMemo } from "react";
import Kenat, { MonthGrid } from "kenat";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  MapPin,
  Sparkles,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
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

const EthiopianCalendar = () => {
  const [currentDate, setCurrentDate] = useState(() => new Kenat());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const currentEthDate = currentDate.getEthiopian();
  const currentYear = currentEthDate.year;
  const currentMonth = currentEthDate.month;

  const monthGrid = useMemo(() => {
    return new MonthGrid({
      year: currentYear,
      month: currentMonth,
      weekStart: 1,
      mode: "public",
    });
  }, [currentYear, currentMonth]);

  const gridData = useMemo(() => monthGrid.generate(), [monthGrid]);
  const monthDays = useMemo(
    () =>
      (gridData.days as Array<CalendarDay | null>).map((day) => {
        if (!day) {
          return day;
        }

        return {
          ...day,
          holidays: (day.holidays ?? []).filter(
            (holiday) => !BLOCKED_HOLIDAY_NAMES.has(holiday.name.trim())
          ),
        };
      }),
    [gridData.days]
  );
  const currentMonthDetails = ETHIOPIAN_MONTHS.find(
    (m) => m.value === currentMonth.toString()
  );

  const handlePrevMonth = () => {
    setCurrentDate((prev) => prev.addMonths(-1));
  };
  const handleNextMonth = () => {
    setCurrentDate((prev) => prev.addMonths(1));
  };

  const handleYearChange = (yearStr: string) => {
    setCurrentDate(
      new Kenat({ year: parseInt(yearStr, 10), month: currentMonth, day: 1 })
    );
  };

  const handleMonthSelect = (monthVal: number) => {
    setCurrentDate(
      new Kenat({ year: currentYear, month: monthVal, day: 1 })
    );
    setIsMonthPickerOpen(false);
  };

  const handleGoToToday = () => {
    setCurrentDate(new Kenat());
  };

  const yearOptions = useMemo(() => getCenteredEthiopianYears(), []);

  const weekCount = Math.ceil(monthDays.length / 7);

  return (
    <div className="mx-auto flex h-[calc(100svh-6.5rem)] w-full max-w-5xl animate-rise flex-col px-2 select-none lg:h-[calc(100vh-4.5rem)]">
      {/* Header — compact, no wasted space */}
      <header className="mb-1.5 flex-none sm:mb-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Month info */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="section-title truncate text-xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                {currentMonthDetails?.label}
              </h1>
              <span className="text-base font-bold text-teal-600 sm:text-xl lg:text-2xl dark:text-teal-400">
                {currentYear}
              </span>
            </div>
            <p className="mt-0.5 hidden text-xs font-semibold text-slate-400 sm:block sm:text-sm dark:text-slate-500">
              {currentMonthDetails?.amharic}
              {currentMonthDetails?.gregorianSpan && (
                <span className="ml-1.5 text-slate-300 dark:text-slate-600">
                  &middot; ≈ {currentMonthDetails.gregorianSpan}
                </span>
              )}
            </p>
          </div>

          {/* Right: Nav + Today */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 sm:h-10 sm:w-10 sm:rounded-xl dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className={cn(
                "hidden items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all hover:shadow-md active:scale-[0.98] sm:flex",
                isMonthPickerOpen
                  ? "border-teal-300 bg-teal-50 text-teal-700 shadow-md dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                  : "border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Browse
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 sm:h-10 sm:w-10 sm:rounded-xl dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleGoToToday}
              className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-teal-700 transition-all hover:bg-teal-100 hover:shadow-md active:scale-[0.97] sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/60"
            >
              Today
            </button>
          </div>
        </div>
      </header>

      {/* Month/Year Picker Panel — overlays the calendar */}
      {isMonthPickerOpen && (
        <div className="mb-2 animate-rise overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg sm:mb-3 dark:border-slate-700/80 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Year
            </p>
            <select
              value={currentYear.toString()}
              onChange={(e) => handleYearChange(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-1.5 p-3 sm:gap-2 sm:p-4 lg:grid-cols-7">
            {ETHIOPIAN_MONTHS.map((m) => {
              const isActive = m.value === currentMonth.toString();
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleMonthSelect(parseInt(m.value, 10))}
                  className={cn(
                    "flex flex-col items-center rounded-xl px-2 py-2 text-center transition-all active:scale-95 sm:py-2.5",
                    isActive
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-200 dark:shadow-teal-900/50"
                      : "bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-teal-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-teal-950/40"
                  )}
                >
                  <span className="text-xs font-bold sm:text-sm">
                    {m.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[10px] font-medium",
                      isActive
                        ? "text-white/80"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {m.amharic}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Grid — flex-1 fills remaining viewport height on desktop */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl sm:rounded-2xl lg:rounded-3xl dark:border-slate-700/80 dark:bg-slate-900">
        {/* Weekday headers */}
        <div className="grid flex-none grid-cols-7 border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80">
          {WEEKDAY_HEADERS.map((day, i) => (
            <div key={i} className="py-1.5 text-center sm:py-2 lg:py-2.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs dark:text-slate-400">
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.full}</span>
              </span>
              <span className="mt-0.5 hidden text-[9px] font-medium text-slate-300 sm:block sm:text-[10px] dark:text-slate-600">
                {day.amharic}
              </span>
            </div>
          ))}
        </div>

        {/* Days grid — stretches to fill */}
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
                  className="border-b border-r border-slate-100/60 bg-slate-50/30 dark:border-slate-800/40 dark:bg-slate-950/20"
                />
              );
            }

            const isWeekend = index % 7 === 5 || index % 7 === 6;
            const isToday = day.isToday;
            const hasHoliday = day.holidays && day.holidays.length > 0;

            return (
              <button
                type="button"
                key={`${day.ethiopian.year}-${day.ethiopian.month}-${day.ethiopian.day}`}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "group relative flex flex-col items-center justify-center border-b border-r border-slate-100/60 transition-all duration-150",
                  "hover:z-10 hover:bg-teal-50/60 hover:shadow-[inset_0_0_0_1px_theme(colors.teal.200)] dark:border-slate-800/40 dark:hover:bg-teal-950/30",
                  isWeekend && "bg-slate-50/40 dark:bg-slate-950/30",
                  isToday && "bg-teal-50/50 dark:bg-teal-950/20"
                )}
              >
                {/* Ethiopian day */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all sm:h-10 sm:w-10 lg:h-11 lg:w-11",
                    isToday &&
                      "bg-teal-600 shadow-lg shadow-teal-300/40 dark:shadow-teal-900/60",
                    hasHoliday &&
                      !isToday &&
                      "ring-2 ring-rose-200 dark:ring-rose-800/50"
                  )}
                >
                  <span
                    className={cn(
                      "text-base font-bold tabular-nums tracking-tight sm:text-lg lg:text-xl",
                      isToday && "text-white",
                      hasHoliday &&
                        !isToday &&
                        "text-rose-600 dark:text-rose-400",
                      !isToday &&
                        !hasHoliday &&
                        "text-slate-800 group-hover:text-teal-700 dark:text-slate-200 dark:group-hover:text-teal-300"
                    )}
                  >
                    {day.ethiopian.day}
                  </span>
                </div>

                {/* Gregorian day */}
                <span
                  className={cn(
                    "mt-0.5 text-[9px] font-medium tabular-nums sm:text-[10px]",
                    isToday
                      ? "font-bold text-teal-600 dark:text-teal-400"
                      : "text-slate-400 dark:text-slate-600"
                  )}
                >
                  {day.gregorian.day}
                </span>

                {/* Holiday dot */}
                {hasHoliday && (
                  <div
                    className={cn(
                      "mt-0.5 h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5",
                      isToday ? "bg-white" : "bg-rose-500"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend — slim, minimal on mobile */}
      <div className="mt-1.5 flex flex-none items-center justify-center gap-4 py-0.5 text-[9px] font-medium text-slate-400 sm:mt-2 sm:gap-5 sm:text-xs dark:text-slate-500">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-teal-600 sm:h-2.5 sm:w-2.5" />
          Today
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500 sm:h-2.5 sm:w-2.5" />
          Holiday
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-3 rounded bg-slate-100 sm:h-2 sm:w-4 dark:bg-slate-800" />
          Weekend
        </div>
      </div>

      {/* Day Detail Dialog */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="w-[92%] max-w-[340px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 p-0 shadow-2xl backdrop-blur-xl outline-none [&>button]:hidden dark:border-slate-700/70 dark:bg-slate-950/95">
          {selectedDay && (
            <div className="flex flex-col">
              {/* Dialog header */}
              <div
                className={cn(
                  "relative flex items-center gap-4 p-4 text-white",
                  selectedDay.holidays.length > 0
                    ? "bg-gradient-to-br from-rose-500 to-red-600"
                    : "bg-gradient-to-br from-teal-500 to-cyan-600"
                )}
              >
                <CalendarIcon className="pointer-events-none absolute -bottom-4 -right-3 h-20 w-20 rotate-12 text-white/10" />

                <DialogClose className="absolute right-3 top-3 z-50 rounded-full bg-white/20 p-1.5 ring-1 ring-white/20 transition-all hover:bg-white/35">
                  <X className="h-3.5 w-3.5 text-white" />
                </DialogClose>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-lg ring-1 ring-white/20">
                  <span className="text-3xl font-black leading-none tabular-nums">
                    {selectedDay.ethiopian.day}
                  </span>
                </div>

                <div className="pr-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
                    {ETHIOPIAN_MONTHS[selectedDay.ethiopian.month - 1].amharic}
                  </p>
                  <h3 className="text-lg font-black leading-tight tracking-tight">
                    {ETHIOPIAN_MONTHS[selectedDay.ethiopian.month - 1].label},{" "}
                    {selectedDay.ethiopian.year}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-white/75">
                    {new Date(
                      selectedDay.gregorian.year,
                      selectedDay.gregorian.month - 1,
                      selectedDay.gregorian.day
                    ).toLocaleDateString("en-US", { weekday: "long" })}
                  </p>
                </div>
              </div>

              {/* Dialog body */}
              <div className="space-y-3 p-4">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />
                    Gregorian Date
                  </div>
                  <div className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
                    {new Date(
                      selectedDay.gregorian.year,
                      selectedDay.gregorian.month - 1,
                      selectedDay.gregorian.day
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Year {selectedDay.gregorian.year}
                  </div>
                </div>

                {selectedDay.holidays.length > 0 ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/20">
                    <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      Events & Holidays
                    </div>
                    <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                      {selectedDay.holidays.map((h, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-rose-200 bg-white/80 p-3 dark:border-rose-900/60 dark:bg-slate-900/50"
                        >
                          <div className="text-sm font-bold leading-tight text-rose-800 dark:text-rose-200">
                            {h.name}
                          </div>
                          <div className="mt-0.5 text-[11px] font-medium text-rose-600/80 dark:text-rose-300/80">
                            Official Holiday
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                    No public holiday listed for this date.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EthiopianCalendar;
