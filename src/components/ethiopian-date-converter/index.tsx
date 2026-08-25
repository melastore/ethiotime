"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Kenat from "kenat";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DualDate } from "@/components/ethiopian-date-converter/dual-date";
import { useLanguage } from "@/components/providers/language-provider";
import { daysBetween } from "@/lib/age";
import {
  ETHIOPIAN_MONTHS,
  WEEKDAY_HEADERS,
  gregorianDateOf,
} from "@/lib/calendar-data";
import { cn } from "@/lib/utils";

// State is a single Date. Both calendars render from it and either can edit it.
//
// Wide screens put the two panels side by side and fill the viewport height;
// narrow stacks them.

const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12);

/**
 * How long the fields must be still before the answer updates. Debounce, so the
 * result lands once instead of flickering through a value per tap. The progress
 * line reads the same number.
 */
const REVEAL_DELAY_MS = 1000;

export default function EthiopianDateConverter() {
  const { t, language } = useLanguage();
  const isAmharic = language === "am";

  // Resolved after mount: the server has no idea what "today" is for the visitor.
  const [date, setDate] = useState<Date | null>(null);
  /** The date the answer is showing, which trails `date` by the wait. */
  const [settled, setSettled] = useState<Date | null>(null);
  const hasSettled = useRef(false);

  useEffect(() => {
    setDate(readFromUrl() ?? new Date());
  }, []);

  // First date shows immediately; only later changes wait.
  useEffect(() => {
    if (!date) return;

    if (!hasSettled.current) {
      hasSettled.current = true;
      setSettled(date);
      return;
    }

    const timer = window.setTimeout(() => setSettled(date), REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [date]);

  /*
   * Kept in the URL so a conversion can be linked to. Written with the history
   * API rather than the router: this only rewrites the query of the page already
   * on screen, and there is nothing to re-render or scroll.
   */
  useEffect(() => {
    if (!date) return;

    const params = new URLSearchParams(window.location.search);
    params.set("from", "gregorian");
    params.set("day", String(date.getDate()));
    params.set("month", String(date.getMonth() + 1));
    params.set("year", String(date.getFullYear()));
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`
    );
  }, [date]);

  const handleChange = useCallback((next: Date) => setDate(next), []);

  const shiftDay = useCallback(
    (delta: number) =>
      setDate((current) => {
        if (!current) return current;
        const next = new Date(current);
        next.setDate(next.getDate() + delta);
        return next;
      }),
    []
  );

  // Off the settled date, not the live one, or the weekday leaks the answer
  // while the panel above is still waiting.
  const facts = useMemo(() => {
    if (!settled) return null;

    const ethiopian = new Kenat(settled).getEthiopian();
    const month = ETHIOPIAN_MONTHS[ethiopian.month - 1];
    // WEEKDAY_HEADERS starts on Monday; Date#getDay starts on Sunday.
    const weekday = WEEKDAY_HEADERS[(settled.getDay() + 6) % 7];

    const away = daysBetween(new Date(), settled);
    const distance =
      away === 0
        ? isAmharic
          ? "ዛሬ"
          : "Today"
        : away > 0
          ? isAmharic
            ? `ከዛሬ በኋላ ${away} ቀን`
            : `${away} ${away === 1 ? "day" : "days"} from today`
          : isAmharic
            ? `ከዛሬ በፊት ${-away} ቀን`
            : `${-away} ${away === -1 ? "day" : "days"} ago`;

    return {
      weekday: isAmharic ? weekday?.amharic : weekday?.full,
      span: month?.gregorianSpan ? `${month.label} ≈ ${month.gregorianSpan}` : null,
      // Ethiopian months are thirty days each, so the day of the year is exact.
      dayOfYear: (ethiopian.month - 1) * 30 + ethiopian.day,
      distance,
    };
  }, [settled, isAmharic]);

  // From the live date: off `settled` the button stays enabled for the whole
  // wait after it's already been pressed.
  const onToday = date !== null && daysBetween(new Date(), date) === 0;

  const navButton =
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white";

  return (
    <section className="mx-auto flex w-full max-w-2xl animate-rise flex-col px-2 lg:h-[calc(100vh-4.5rem)] lg:max-w-4xl lg:px-0">
      <div className="mb-3 flex-none text-center sm:mb-4 lg:mb-6">
        <h1 className="section-title text-2xl font-black text-slate-900 sm:text-3xl lg:text-5xl dark:text-white">
          {isAmharic ? "የቀን መቀየሪያ" : "Ethiopian Date Converter"}
        </h1>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 sm:text-sm lg:mt-2 lg:max-w-xl lg:text-base dark:text-slate-400">
          {isAmharic
            ? "ማንኛውንም ቀን በኢትዮጵያ እና በግሪጎሪያን አቆጣጠር መካከል ይቀይሩ።"
            : "One day, read both ways. Change either side and the other follows."}
        </p>
      </div>

      {/* No outer card: both panels already have their own frames. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {date && facts ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <DualDate
              value={date}
              settled={settled ?? date}
              pending={settled !== null && settled.getTime() !== date.getTime()}
              revealDelayMs={REVEAL_DELAY_MS}
              onChange={handleChange}
              className="min-h-0 flex-1"
            />

            {/* Facts strip and day stepper. */}
            <div className="mt-4 flex flex-none flex-wrap items-center justify-center gap-x-3 gap-y-2 lg:mt-5 lg:gap-x-4">
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1 dark:bg-slate-800/60">
                <button
                  type="button"
                  onClick={() => shiftDay(-1)}
                  aria-label={isAmharic ? "ያለፈው ቀን" : "Previous day"}
                  className={navButton}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleChange(new Date())}
                  disabled={onToday}
                  className={cn(
                    "h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                    onToday
                      ? "cursor-default text-slate-500 dark:text-slate-600"
                      : "text-teal-700 hover:bg-white hover:shadow-sm dark:text-teal-400 dark:hover:bg-slate-800"
                  )}
                >
                  {t("home.today", "Today")}
                </button>
                <button
                  type="button"
                  onClick={() => shiftDay(1)}
                  aria-label={isAmharic ? "የሚቀጥለው ቀን" : "Next day"}
                  className={navButton}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {facts.weekday}
              </span>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {facts.distance}
              </span>

              <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
                {isAmharic ? "የዓመቱ ቀን" : "day"}{" "}
                <span className="font-bold tabular-nums text-slate-600 dark:text-slate-300">
                  {facts.dayOfYear}
                </span>{" "}
                {isAmharic ? "" : "of the Ethiopian year"}
              </span>

              {facts.span && (
                <span className="hidden text-xs text-slate-500 lg:inline dark:text-slate-400">
                  {facts.span}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div aria-hidden="true">
            <div className="mx-auto h-12 max-w-md animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="mt-4 grid gap-3 lg:mt-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
              <div className="h-44 animate-pulse rounded-[1.75rem] bg-slate-100 dark:bg-slate-800" />
              <div className="hidden w-9 lg:block" />
              <div className="h-44 animate-pulse rounded-[1.75rem] bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * A shared link. `from=ethiopian` is still understood, because links written by
 * the previous version of this page carry it.
 */
function readFromUrl(): Date | null {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");
  const day = Number.parseInt(params.get("day") ?? "", 10);
  const month = Number.parseInt(params.get("month") ?? "", 10);
  const year = Number.parseInt(params.get("year") ?? "", 10);

  if (!day || !month || !year) return null;
  if (from !== "gregorian" && from !== "ethiopian") return null;

  try {
    if (from === "ethiopian") {
      if (month < 1 || month > 13) return null;
      const length = month === 13 ? (year % 4 === 3 ? 6 : 5) : 30;
      return gregorianDateOf(year, month, Math.min(day, length));
    }

    if (month < 1 || month > 12) return null;
    const lastDay = new Date(year, month, 0).getDate();
    return noon(year, month, Math.min(day, lastDay));
  } catch {
    return null;
  }
}
