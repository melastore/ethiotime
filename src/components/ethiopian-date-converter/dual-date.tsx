"use client";

import { useMemo, useState } from "react";
import Kenat from "kenat";
import { ArrowDown, ArrowRight, ArrowLeftRight } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { PickerField } from "@/components/shared/picker-field";
import {
  ETHIOPIAN_MONTHS,
  GREGORIAN_MONTHS,
  WEEKDAY_HEADERS,
  gregorianDateOf,
} from "@/lib/calendar-data";
import { cn } from "@/lib/utils";

// From-panel on the left (pale, has the controls), to-panel on the right
// (coloured, read-only). Keeping controls on exactly one side is what makes it
// obvious which box is the question and which is the answer.

/** Ranges wide enough for a birth year at either end of a lifetime. */
const yearRun = (current: number) =>
  Array.from({ length: 141 }, (_, index) => current - 100 + index);

const numbers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }));

// Gregorian is blue, Ethiopian takes the app accent. The dark accent is indigo,
// too close to blue, so Gregorian goes cyan there.
const SKIN = {
  gregorian:
    "from-sky-600 via-blue-700 to-slate-900 dark:from-cyan-500 dark:via-sky-700 dark:to-slate-900",
  ethiopian: "from-teal-600 via-emerald-700 to-slate-900",
} as const;

type Calendar = "gregorian" | "ethiopian";

type DualDateProps = {
  /** What the fields show: the date as it is being edited, live. */
  value: Date;
  /** What the answer shows: the date once the fields have been still. */
  settled: Date;
  /** True while `value` has moved on and the answer has not caught up yet. */
  pending: boolean;
  /** How long that wait is, so the progress line can match it exactly. */
  revealDelayMs: number;
  onChange: (next: Date) => void;
  className?: string;
};

export function DualDate({
  value,
  settled,
  pending,
  revealDelayMs,
  onChange,
  className,
}: DualDateProps) {
  const { language } = useLanguage();
  const isAmharic = language === "am";

  const [source, setSource] = useState<Calendar>("gregorian");
  const target: Calendar = source === "gregorian" ? "ethiopian" : "gregorian";
  // Counted, not derived from `source`, so the dial always spins the same way
  // instead of winding back on the return trip.
  const [turns, setTurns] = useState(0);

  const swapTo = (next: Calendar) => {
    if (next === source) return;
    setSource(next);
    setTurns((count) => count + 1);
  };

  const ethiopian = useMemo(() => new Kenat(value).getEthiopian(), [value]);
  // Answer reads off `settled`, never the date being edited.
  const shownEthiopian = useMemo(() => new Kenat(settled).getEthiopian(), [settled]);

  /** Pagume runs to five days, or six, so a day can fall off the end of a month. */
  const ethiopianMonthLength =
    ethiopian.month === 13 ? (ethiopian.year % 4 === 3 ? 6 : 5) : 30;

  const setEthiopian = (patch: { day?: number; month?: number; year?: number }) => {
    const year = patch.year ?? ethiopian.year;
    const month = patch.month ?? ethiopian.month;
    const length = month === 13 ? (year % 4 === 3 ? 6 : 5) : 30;
    onChange(gregorianDateOf(year, month, Math.min(patch.day ?? ethiopian.day, length)));
  };

  const gregorianMonthLength = new Date(
    value.getFullYear(),
    value.getMonth() + 1,
    0
  ).getDate();

  const setGregorian = (patch: { day?: number; month?: number; year?: number }) => {
    const year = patch.year ?? value.getFullYear();
    const month = patch.month ?? value.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    onChange(
      new Date(year, month - 1, Math.min(patch.day ?? value.getDate(), lastDay), 12)
    );
  };

  const ethiopianMonth = ETHIOPIAN_MONTHS[ethiopian.month - 1];
  const gregorianMonth = GREGORIAN_MONTHS[value.getMonth()];

  const NAME: Record<Calendar, string> = {
    gregorian: "Gregorian",
    ethiopian: isAmharic ? "ኢትዮጵያ" : "Ethiopian",
  };

  const FIELDS: Record<Calendar, React.ReactNode> = {
    gregorian: (
      <>
        <PickerField
          label={isAmharic ? "ቀን" : "Day"}
          value={value.getDate()}
          display={String(value.getDate())}
          options={numbers(gregorianMonthLength)}
          onCommit={(day) => setGregorian({ day })}
          columns={6}
          width="17rem"
          className="w-[6.5rem] shrink-0 lg:order-2 lg:w-full"
        />
        <PickerField
          label={isAmharic ? "ወር" : "Month"}
          value={value.getMonth() + 1}
          display={gregorianMonth?.label ?? ""}
          options={GREGORIAN_MONTHS.map((month, index) => ({
            value: index + 1,
            label: month.label,
          }))}
          onCommit={(month) => setGregorian({ month })}
          columns={2}
          width="20rem"
          className="min-w-0 flex-1 lg:order-1 lg:col-span-2 lg:w-full"
        />
        <PickerField
          label={isAmharic ? "ዓመት" : "Year"}
          value={value.getFullYear()}
          display={String(value.getFullYear())}
          options={yearRun(value.getFullYear()).map((year) => ({
            value: year,
            label: String(year),
          }))}
          onCommit={(year) => setGregorian({ year })}
          columns={1}
          width="9rem"
          className="w-[7.5rem] shrink-0 lg:order-3 lg:w-full"
        />
      </>
    ),
    ethiopian: (
      <>
        <PickerField
          label={isAmharic ? "ቀን" : "Day"}
          value={ethiopian.day}
          display={String(ethiopian.day)}
          options={numbers(ethiopianMonthLength)}
          onCommit={(day) => setEthiopian({ day })}
          columns={6}
          width="17rem"
          className="w-[6.5rem] shrink-0 lg:order-2 lg:w-full"
        />
        <PickerField
          label={isAmharic ? "ወር" : "Month"}
          value={ethiopian.month}
          display={
            isAmharic
              ? `${ethiopianMonth?.amharic ?? ""} ${ethiopianMonth?.label ?? ""}`
              : `${ethiopianMonth?.label ?? ""} ${ethiopianMonth?.amharic ?? ""}`
          }
          options={ETHIOPIAN_MONTHS.map((month, index) => ({
            value: index + 1,
            label: `${month.label} · ${month.amharic}`,
            hint: month.gregorianSpan,
          }))}
          onCommit={(month) => setEthiopian({ month })}
          columns={1}
          width="20rem"
          className="min-w-0 flex-1 lg:order-1 lg:col-span-2 lg:w-full"
        />
        <PickerField
          label={isAmharic ? "ዓመት" : "Year"}
          value={ethiopian.year}
          display={String(ethiopian.year)}
          options={yearRun(ethiopian.year).map((year) => ({
            value: year,
            label: String(year),
          }))}
          onCommit={(year) => setEthiopian({ year })}
          columns={1}
          width="9rem"
          className="w-[7.5rem] shrink-0 lg:order-3 lg:w-full"
        />
      </>
    ),
  };

  const shownEthiopianMonth = ETHIOPIAN_MONTHS[shownEthiopian.month - 1];
  const shownGregorianMonth = GREGORIAN_MONTHS[settled.getMonth()];
  // WEEKDAY_HEADERS starts on Monday; Date#getDay starts on Sunday.
  const shownWeekday = WEEKDAY_HEADERS[(settled.getDay() + 6) % 7];

  /** The answer, read off the settled date rather than the live one. */
  const READOUT: Record<Calendar, React.ReactNode> = {
    gregorian: (
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-5xl font-black leading-none tabular-nums sm:text-6xl lg:text-7xl">
          {settled.getDate()}
        </span>
        <span className="section-title text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
          {shownGregorianMonth?.label}
        </span>
        <span className="text-2xl font-bold text-amber-200 sm:text-3xl lg:text-4xl">
          {settled.getFullYear()}
        </span>
      </p>
    ),
    ethiopian: (
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-5xl font-black leading-none tabular-nums sm:text-6xl lg:text-7xl">
          {shownEthiopian.day}
        </span>
        <span className="section-title text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
          {isAmharic ? shownEthiopianMonth?.amharic : shownEthiopianMonth?.label}
          <span className="ml-2 text-2xl font-bold text-white/70 sm:text-3xl lg:text-4xl">
            {isAmharic ? shownEthiopianMonth?.label : shownEthiopianMonth?.amharic}
          </span>
        </span>
        <span className="text-2xl font-bold text-amber-200 sm:text-3xl lg:text-4xl">
          {shownEthiopian.year}
          <span className="ml-1 text-lg">{isAmharic ? "ዓ.ም" : "E.C."}</span>
        </span>
      </p>
    ),
  };

  type EthiopianParts = { year: number; month: number; day: number };

  /** The day in words. Called twice: live for the input, settled for the answer. */
  const words = (calendar: Calendar, date: Date, eth: EthiopianParts) => {
    if (calendar === "gregorian") {
      return `${GREGORIAN_MONTHS[date.getMonth()]?.label} ${date.getDate()}, ${date.getFullYear()}`;
    }
    const month = ETHIOPIAN_MONTHS[eth.month - 1];
    return `${isAmharic ? month?.amharic : month?.label} ${eth.day}, ${eth.year} ${
      isAmharic ? "ዓ.ም" : "E.C."
    }`;
  };

  /** Compact enough to ride along inside a switcher chip. */
  const short = (calendar: Calendar, date: Date, eth: EthiopianParts) => {
    if (calendar === "gregorian") {
      return `${date.getDate()} ${GREGORIAN_MONTHS[date.getMonth()]?.short} ${date.getFullYear()}`;
    }
    const month = ETHIOPIAN_MONTHS[eth.month - 1];
    return `${eth.day} ${isAmharic ? month?.amharic : month?.label} ${eth.year}`;
  };

  const eyebrow =
    "text-[11px] font-bold uppercase tracking-[0.2em]";

  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* Swapping shuffles the two chips past each other: the incoming one
          arcs over, the outgoing one dips under, and the dial spins. */}
      <div className="mx-auto w-full max-w-md flex-none">
        <div className="grid grid-cols-[1fr_3rem_1fr] items-end px-2 pb-2">
          <span className={cn(eyebrow, "text-center text-slate-500 dark:text-slate-400")}>
            {isAmharic ? "ከ" : "From"}
          </span>
          <span />
          <span className={cn(eyebrow, "text-center text-slate-500 dark:text-slate-400")}>
            {isAmharic ? "ወደ" : "To"}
          </span>
        </div>

        <div className="relative h-[4.25rem] rounded-full bg-gradient-to-b from-slate-200/80 to-slate-100 p-1.5 shadow-inner ring-1 ring-slate-900/5 dark:from-slate-800 dark:to-slate-800/50 dark:ring-white/5">
          {(["gregorian", "ethiopian"] as const).map((option) => {
            const isSource = source === option;

            return (
              <button
                key={option}
                type="button"
                aria-pressed={isSource}
                aria-label={
                  isSource
                    ? `${NAME[option]} — ${isAmharic ? "ከ" : "converting from"}`
                    : `${isAmharic ? "ወደ" : "Convert from"} ${NAME[option]}`
                }
                onClick={() => swapTo(option)}
                style={{
                  // Far slot = own width + the 3rem dial gap.
                  transform: isSource
                    ? "translateX(0)"
                    : "translateX(calc(100% + 3rem))",
                }}
                className={cn(
                  // Underscores are Tailwind's spaces; calc() needs real ones.
                  "absolute inset-y-1.5 left-1.5 w-[calc(50%_-_1.875rem)] rounded-full",
                  "transition-[transform,box-shadow] duration-[560ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none",
                  isSource
                    ? option === "gregorian"
                      ? "shadow-lg shadow-sky-500/40"
                      : "shadow-lg shadow-teal-500/40"
                    : "shadow-sm"
                )}
              >
                {/* Keyed on `turns` so the arc replays each swap. */}
                <span
                  key={turns}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-full",
                    isSource
                      ? cn("bg-gradient-to-br text-white", SKIN[option])
                      : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400",
                    turns > 0 && (isSource ? "swap-over" : "swap-under")
                  )}
                >
                  <span className="truncate px-3 text-sm font-black leading-tight">
                    {NAME[option]}
                  </span>
                  <span
                    className={cn(
                      "truncate px-3 text-[10px] font-bold tabular-nums leading-tight",
                      isSource ? "text-white/75" : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {isSource
                      ? short(option, value, ethiopian)
                      : short(option, settled, shownEthiopian)}
                  </span>
                </span>
              </button>
            );
          })}

          {/* Swap button. */}
          <button
            type="button"
            onClick={() => swapTo(target)}
            aria-label={isAmharic ? "አቅጣጫ ቀይር" : "Swap direction"}
            title={isAmharic ? "አቅጣጫ ቀይር" : "Swap direction"}
            className="group absolute left-1/2 top-1/2 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2"
          >
            <span
              key={turns}
              className={cn(
                "grid h-full w-full place-items-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-slate-900/10 transition-colors group-hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:ring-white/10 dark:group-hover:text-white",
                turns > 0 && "swap-pulse"
              )}
            >
              <ArrowLeftRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-[560ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
                style={{ transform: `rotate(${turns * 180}deg)` }}
              />
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-3 lg:mt-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
        {/* Input side. */}
        <section
          aria-label={`${isAmharic ? "ከ" : "From"} ${NAME[source]}`}
          className="flex flex-col justify-center rounded-[1.75rem] border-2 border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className={cn(eyebrow, "text-slate-500 dark:text-slate-400")}>
            {isAmharic ? "ከ" : "From"} · {NAME[source]}
          </p>

          {/* One row narrow; grid wide (month on top, day+year under). A picker
              eats ~60px of chrome, so three in a row truncated "2026" to "20..". */}
          <div className="mt-3 flex items-end gap-2 lg:mt-5 lg:grid lg:grid-cols-2 lg:gap-3">
            {FIELDS[source]}
          </div>

          <p className="mt-3 border-t border-slate-100 pt-3 text-sm font-bold text-slate-500 lg:mt-5 lg:pt-4 lg:text-base dark:border-slate-800 dark:text-slate-400">
            {words(source, value, ethiopian)}
          </p>
        </section>

        {/* Direction arrow: down when stacked, across when side by side. */}
        <div className="flex items-center justify-center lg:px-1">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300"
          >
            <ArrowDown className="h-4 w-4 lg:hidden" />
            <ArrowRight className="hidden h-4 w-4 lg:block" />
          </span>
        </div>

        {/* Result side. Deliberately has no controls. */}
        <section
          aria-label={`${isAmharic ? "ወደ" : "To"} ${NAME[target]}`}
          aria-live="polite"
          className={cn(
            "relative flex flex-col justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-5 text-white shadow-lg sm:p-6 lg:p-7",
            SKIN[target]
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl"
          />

          <p className={cn(eyebrow, "relative flex items-center gap-2 text-white/60")}>
            <span>
              {isAmharic ? "ወደ" : "To"} · {NAME[target]}
            </span>
            {pending && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] tracking-[0.14em] text-white/80">
                {isAmharic ? "እየተቀየረ…" : "converting…"}
              </span>
            )}
          </p>

          {/* Blurred back while stale, so it's clear this is the old value. */}
          <div
            className={cn(
              "relative mt-3 transition-[filter,opacity,transform] duration-300 lg:mt-5",
              pending && "scale-[0.985] opacity-45 blur-[5px] motion-reduce:blur-none"
            )}
          >
            {/* Keyed on the settled day so the arrival replays. */}
            <div key={settled.getTime()} className={cn(!pending && "answer-in")}>
              {READOUT[target]}
            </div>
          </div>

          <p className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/20 pt-3 text-sm font-semibold text-white/80 lg:mt-5 lg:pt-4">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5">
              {isAmharic ? shownWeekday?.amharic : shownWeekday?.full}
            </span>
            <span>{words(target, settled, shownEthiopian)}</span>
          </p>

          {pending && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1 overflow-hidden"
            >
              {/* Restarts on each edit; duration matches the wait. */}
              <span
                key={value.getTime()}
                style={{ animationDuration: `${revealDelayMs}ms` }}
                className="answer-wait block h-full w-full origin-left bg-white/70"
              />
            </span>
          )}
        </section>
      </div>
    </div>
  );
}
