"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Kenat from "kenat";
import { CalendarDays, ChevronLeft, ChevronRight, Dot, X } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ETHIOPIAN_MONTHS, WEEKDAY_HEADERS } from "@/lib/calendar-data";
import { getHolidayOccurrencesForEthiopianYear } from "@/lib/ethiopian-holidays";
import {
  MONTH_GRID_CELLS,
  dateKey,
  monthGridDates,
  stepMonth,
  toGregorianDate,
  type DateParts,
} from "@/lib/month-grid";
import { cn } from "@/lib/utils";

// Fits one month on screen without scrolling.
//
// The month/year picker floats rather than opening into the layout, so it
// doesn't shrink the grid underneath it. Grid is always 6 rows so the height
// doesn't jump when you page between months.

interface Holiday {
  key: string;
  /** English name, with the Amharic one alongside it. */
  name: string;
  amharic: string;
  description?: string;
  tags: string[];
}

interface DayCell {
  ethiopian: DateParts;
  gregorian: DateParts;
  holidays: Holiday[];
  isToday: boolean;
  /** False for the greyed days borrowed from the months either side. */
  inMonth: boolean;
}

/** The month's grid, with today and the feast days painted onto it. */
function buildGrid(
  year: number,
  month: number,
  today: DateParts | null,
  holidays: Map<string, Holiday[]>
): DayCell[] {
  return monthGridDates(year, month).map((date) => ({
    ...date,
    holidays: holidays.get(dateKey(date.ethiopian)) ?? [],
    isToday: today !== null && dateKey(today) === dateKey(date.ethiopian),
  }));
}

const PANEL =
  "rounded-3xl border border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/75";

const EYEBROW =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

const NAV_BUTTON =
  "grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white";

const EthiopianCalendar = () => {
  const { language } = useLanguage();
  const isAmharic = language === "am";

  // Read after mount, not during render: this page is statically exported, so a
  // date computed on the server is the build date and hydration mismatches.
  const [today, setToday] = useState<DateParts | null>(null);
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(
    null
  );

  const [selected, setSelected] = useState<DayCell | null>(null);
  const [picker, setPicker] = useState<"closed" | "months" | "years">("closed");
  const pickerRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ethiopian = new Kenat().getEthiopian();
    setToday(ethiopian);
    setCursor({ year: ethiopian.year, month: ethiopian.month });
  }, []);

  useEffect(() => {
    if (picker === "closed") return;

    const onAway = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPicker("closed");
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPicker("closed");
    };

    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [picker]);

  // Open the year list on the current year. Sets scrollTop directly because
  // scrollIntoView also scrolls the page behind the panel.
  useEffect(() => {
    if (picker !== "years") return;

    const list = yearListRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !active) return;

    const listBox = list.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    list.scrollTop +=
      activeBox.top - listBox.top - (listBox.height - activeBox.height) / 2;
  }, [picker]);

  // Three years, not one: the first and last rows belong to the neighbouring
  // months, which in Meskerem or Pagume fall in a different year.
  const holidays = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    if (!cursor) return map;

    const years = new Set([
      stepMonth(cursor.year, cursor.month, -1).year,
      cursor.year,
      stepMonth(cursor.year, cursor.month, 1).year,
    ]);

    for (const year of years) {
      for (const occurrence of getHolidayOccurrencesForEthiopianYear(year)) {
        const key = dateKey(occurrence.ethiopian);
        const day = map.get(key) ?? [];
        day.push({
          key: occurrence.holiday.id,
          name: occurrence.holiday.name,
          amharic: occurrence.holiday.amharic,
          description: occurrence.holiday.description,
          tags: ["public", occurrence.holiday.tradition],
        });
        map.set(key, day);
      }
    }

    return map;
  }, [cursor]);

  const cells = useMemo(
    () => (cursor ? buildGrid(cursor.year, cursor.month, today, holidays) : []),
    [cursor, today, holidays]
  );

  const yearOptions = useMemo(() => {
    if (!cursor) return [];
    return Array.from({ length: 121 }, (_, index) => cursor.year - 60 + index);
  }, [cursor]);

  const month = cursor ? ETHIOPIAN_MONTHS[cursor.month - 1] : undefined;

  const shift = (delta: number) =>
    setCursor((current) =>
      current ? stepMonth(current.year, current.month, delta) : current
    );

  const goToToday = () => {
    const ethiopian = new Kenat().getEthiopian();
    setToday(ethiopian);
    setCursor({ year: ethiopian.year, month: ethiopian.month });
    setPicker("closed");
  };

  const isCurrentMonth =
    today !== null &&
    cursor !== null &&
    today.year === cursor.year &&
    today.month === cursor.month;

  return (
    <div className="mx-auto flex h-[calc(100svh-7rem)] w-full max-w-5xl select-none flex-col px-1 lg:h-[calc(100vh-4.5rem)]">
      <header className="relative mb-3 flex flex-none items-end justify-between gap-3">
        {/* The title is the picker trigger. */}
        <div ref={pickerRef} className="relative min-w-0">
          <button
            type="button"
            onClick={() =>
              setPicker((open) => (open === "closed" ? "months" : "closed"))
            }
            aria-expanded={picker !== "closed"}
            aria-label={isAmharic ? "ወር ይምረጡ" : "Choose a month"}
            className="group -mx-2 min-w-0 rounded-2xl px-2 py-1 text-left transition-colors hover:bg-white/70 dark:hover:bg-slate-800/60"
          >
            <h1 className={EYEBROW}>
              {isAmharic ? "የኢትዮጵያ ዘመን አቆጣጠር" : "Ethiopian calendar"}
            </h1>

            {/* Not a heading: the month only resolves once the clock is read. */}
            <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
              {/* Placeholder until the clock is read, or the chip flashes empty. */}
              {cursor ? (
                <>
                  <span className="truncate text-2xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                    {isAmharic ? month?.amharic : month?.label}
                  </span>
                  <span className="truncate text-lg font-bold text-teal-600 sm:text-2xl dark:text-teal-400">
                    {isAmharic ? month?.label : month?.amharic}
                  </span>
                  <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-sm font-black tabular-nums text-white sm:text-base dark:bg-white dark:text-slate-900">
                    {cursor.year}
                  </span>
                </>
              ) : (
                <span
                  aria-hidden="true"
                  className="my-1 block h-7 w-48 animate-pulse rounded-lg bg-slate-200 sm:h-9 sm:w-64 dark:bg-slate-800"
                />
              )}
              <ChevronRight
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
                  picker === "closed" ? "rotate-90" : "-rotate-90"
                )}
              />
            </div>

            <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
              {month?.gregorianSpan ? `≈ ${month.gregorianSpan}` : " "}
            </p>
          </button>

          {/* Floats, so it doesn't shorten the grid below. */}
          {picker !== "closed" && cursor && (
            <div
              className={cn(
                PANEL,
                "absolute left-0 top-full z-40 mt-2 w-[min(30rem,calc(100vw-2.5rem))] overflow-hidden shadow-2xl"
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setCursor({ ...cursor, year: cursor.year - 1 })
                  }
                  aria-label={isAmharic ? "ያለፈው ዓመት" : "Previous year"}
                  className={NAV_BUTTON}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPicker((view) => (view === "years" ? "months" : "years"))
                  }
                  className="rounded-xl px-4 py-1.5 text-lg font-black tabular-nums text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                >
                  {cursor.year}
                  <span className="ml-1.5 text-xs font-bold text-slate-500">
                    {isAmharic ? "ዓ.ም" : "E.C."}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCursor({ ...cursor, year: cursor.year + 1 })
                  }
                  aria-label={isAmharic ? "የሚቀጥለው ዓመት" : "Next year"}
                  className={NAV_BUTTON}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {picker === "months" ? (
                <div className="grid grid-cols-3 gap-1 p-2 sm:grid-cols-4">
                  {ETHIOPIAN_MONTHS.map((option, index) => {
                    const active = index + 1 === cursor.month;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setCursor({ ...cursor, month: index + 1 });
                          setPicker("closed");
                        }}
                        aria-pressed={active}
                        className={cn(
                          "rounded-xl px-2 py-2 text-center transition-colors",
                          active
                            ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        )}
                      >
                        <span className="block truncate text-[13px] font-bold">
                          {option.label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-[11px]",
                            active
                              ? "text-teal-50"
                              : "text-slate-500 dark:text-slate-400"
                          )}
                        >
                          {option.amharic}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  ref={yearListRef}
                  className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto p-2 sm:grid-cols-6"
                >
                  {yearOptions.map((year) => {
                    const active = year === cursor.year;
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setCursor({ ...cursor, year });
                          setPicker("months");
                        }}
                        aria-pressed={active}
                        className={cn(
                          "rounded-xl px-2 py-2 text-sm font-bold tabular-nums transition-colors",
                          active
                            ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        )}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-none items-center gap-1 rounded-2xl bg-slate-100/80 p-1 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label={isAmharic ? "ያለፈው ወር" : "Previous month"}
            className={NAV_BUTTON}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            disabled={isCurrentMonth}
            className={cn(
              "h-9 rounded-xl px-3 text-sm font-bold transition-colors",
              isCurrentMonth
                ? "cursor-default text-slate-500 dark:text-slate-600"
                : "text-teal-700 hover:bg-white hover:shadow-sm dark:text-teal-400 dark:hover:bg-slate-800"
            )}
          >
            {isAmharic ? "ዛሬ" : "Today"}
          </button>

          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={isAmharic ? "የሚቀጥለው ወር" : "Next month"}
            className={NAV_BUTTON}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className={cn(PANEL, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
        <div className="grid flex-none grid-cols-7 bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-800/50">
          {WEEKDAY_HEADERS.map((day) => (
            <div key={day.full} className="py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.full}</span>
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-teal-600/70 sm:block dark:text-teal-400/60">
                {day.amharic}
              </span>
            </div>
          ))}
        </div>

        {/* gap-px over a coloured parent gives the 1px grid lines. */}
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px bg-slate-200/70 dark:bg-slate-800/70">
          {cells.map((cell) => {
            const { ethiopian, gregorian, isToday, inMonth } = cell;
            const feast = cell.holidays[0];
            const isWeekend = toGregorianDate(gregorian).getDay() % 6 === 0;

            // Days belonging to the months either side are left blank: Pagume is
            // five days long, so a faded run of neighbours reads as if the month
            // had dates it does not.
            if (!inMonth) {
              return (
                <div
                  key={dateKey(ethiopian)}
                  aria-hidden="true"
                  className="bg-slate-50/80 dark:bg-slate-950/40"
                />
              );
            }

            return (
              <button
                type="button"
                key={dateKey(ethiopian)}
                onClick={() => setSelected(cell)}
                aria-label={`${ethiopian.day} ${
                  ETHIOPIAN_MONTHS[ethiopian.month - 1]?.label
                } ${ethiopian.year}${feast ? ` — ${feast.name}` : ""}`}
                className={cn(
                  "relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors",
                  "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500",
                  "bg-white hover:bg-teal-50/70 dark:bg-slate-900 dark:hover:bg-slate-800/70",
                  isWeekend && "bg-slate-50/60 dark:bg-slate-900/60",
                  isToday && "bg-teal-50 dark:bg-teal-950/30"
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-base font-bold tabular-nums sm:h-9 sm:w-9 sm:text-lg",
                    isToday
                      ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-600/30 ring-2 ring-white dark:ring-slate-900"
                      : feast
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-800 dark:text-slate-200"
                  )}
                >
                  {ethiopian.day}
                </span>

                <span className="text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                  {gregorian.day}
                </span>

                {/* Name it where there's room, dot where there isn't. */}
                {feast && (
                  <>
                    <span className="hidden max-w-full truncate rounded px-1 text-[10px] font-bold leading-tight text-rose-600 lg:block dark:text-rose-400">
                      {isAmharic ? feast.amharic : feast.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-rose-500 lg:hidden"
                    />
                  </>
                )}
              </button>
            );
          })}

          {/* Keeps the grid's shape before the clock is read. */}
          {cells.length === 0 &&
            Array.from({ length: MONTH_GRID_CELLS }, (_, index) => (
              <div
                key={index}
                className="animate-pulse bg-white dark:bg-slate-900"
                aria-hidden="true"
              />
            ))}
        </div>
      </div>

      <div className="mt-2 flex flex-none flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600"
            aria-hidden="true"
          />
          {isAmharic ? "ዛሬ" : "Today"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />
          {isAmharic ? "በዓል" : "Holiday"}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" aria-hidden="true" />
          {isAmharic ? "ማንኛውንም ቀን ይንኩ" : "Tap any day"}
        </span>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="w-[92%] max-w-md overflow-hidden rounded-3xl border-none bg-white p-0 shadow-2xl outline-none [&>button]:hidden dark:bg-slate-900">
          {selected && (
            <>
              <div
                className={cn(
                  "relative overflow-hidden px-5 pb-5 pt-4 text-white",
                  selected.holidays.length > 0
                    ? "bg-gradient-to-br from-rose-500 via-rose-600 to-slate-900"
                    : "bg-gradient-to-br from-teal-500 via-emerald-700 to-slate-900"
                )}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/20 blur-3xl"
                />

                <DialogClose className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{isAmharic ? "ዝጋ" : "Close"}</span>
                </DialogClose>

                <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                  {
                    WEEKDAY_HEADERS[
                      (toGregorianDate(selected.gregorian).getDay() + 6) % 7
                    ]?.[isAmharic ? "amharic" : "full"]
                  }
                </p>

                <div className="relative mt-1.5 flex items-baseline gap-2.5">
                  <span className="text-5xl font-black leading-none tabular-nums">
                    {selected.ethiopian.day}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold leading-tight">
                      {ETHIOPIAN_MONTHS[selected.ethiopian.month - 1]?.label}{" "}
                      {selected.ethiopian.year}
                    </p>
                    <p className="truncate text-sm text-white/75">
                      {ETHIOPIAN_MONTHS[selected.ethiopian.month - 1]?.amharic}{" "}
                      {isAmharic ? "ዓ.ም" : "E.C."}
                    </p>
                  </div>
                </div>

                <p className="relative mt-3 border-t border-white/20 pt-2.5 text-sm font-semibold text-white/85">
                  {toGregorianDate(selected.gregorian).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              <DialogTitle className="sr-only">
                {selected.holidays.length > 0
                  ? selected.holidays.map((holiday) => holiday.name).join(", ")
                  : `${ETHIOPIAN_MONTHS[selected.ethiopian.month - 1]?.label} ${selected.ethiopian.day}`}
              </DialogTitle>

              {selected.holidays.length > 0 ? (
                <ul className="max-h-[45vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                  {selected.holidays.map((holiday) => (
                    <li key={holiday.key} className="px-5 py-4">
                      <p className="font-bold leading-snug text-slate-900 dark:text-white">
                        {holiday.name}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                        {holiday.amharic}
                      </p>

                      {holiday.description && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {holiday.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {holiday.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-1 px-5 py-5 text-sm text-slate-500 dark:text-slate-400">
                  <Dot className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {isAmharic
                    ? "በዚህ ቀን ምንም በዓል የለም።"
                    : "No feast falls on this day."}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EthiopianCalendar;
