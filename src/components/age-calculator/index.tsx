"use client";

import { useEffect, useMemo, useState } from "react";
import { CakeSlice, Sparkles, Stars } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { PickerField } from "@/components/shared/picker-field";
import {
  ethiopianAge,
  ethiopianMonthLength,
  gregorianAge,
  gregorianMonthLength,
  nextBirthday,
  timeIntoToday,
  toEthiopian,
  totalsFor,
} from "@/lib/age";
import {
  ETHIOPIAN_MONTHS,
  GREGORIAN_MONTHS,
  WEEKDAY_HEADERS,
  gregorianDateOf,
} from "@/lib/calendar-data";
import { readText, writeText } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  ELEMENT_LABELS,
  cuspNeighbour,
  evangelistOf,
  zodiacForDate,
  zodiacSpan,
  type ZodiacElement,
} from "@/lib/zodiac";

// Starts from the last birth date used (or 1 Jan 2000) rather than empty
// dropdowns, so there's something on screen before you touch anything.

const STORAGE_KEY = "ethiotime-birth-date";

/** Neutral enough to be nobody's birthday, recent enough to be a plausible one. */
const FALLBACK_BIRTH = new Date(2000, 0, 1, 12);

const numbers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }));

/** A century and a half, which covers any age anyone has to enter. */
const yearRun = (current: number) =>
  Array.from({ length: 141 }, (_, index) => current - 120 + index);

const isoOf = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

function parseIso(raw: string | null): Date | null {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(+year, +month - 1, +day, 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

/*
 * The element decides the colour of the answer, which is the one place the page
 * is allowed to be decorative: a Scorpio reads in water, a Leo in fire.
 */
const ELEMENT_SKIN: Record<
  ZodiacElement,
  { hero: string; glow: string; chip: string; mark: string }
> = {
  fire: {
    hero: "from-orange-600 via-rose-700 to-slate-900",
    glow: "bg-amber-300",
    chip: "bg-amber-400/20 text-amber-100 ring-amber-200/30",
    mark: "text-amber-200",
  },
  earth: {
    hero: "from-emerald-600 via-teal-700 to-slate-900",
    glow: "bg-emerald-300",
    chip: "bg-emerald-400/20 text-emerald-100 ring-emerald-200/30",
    mark: "text-emerald-200",
  },
  air: {
    hero: "from-sky-500 via-indigo-700 to-slate-900",
    glow: "bg-sky-300",
    chip: "bg-sky-400/20 text-sky-100 ring-sky-200/30",
    mark: "text-sky-200",
  },
  water: {
    hero: "from-cyan-600 via-blue-800 to-slate-900",
    glow: "bg-cyan-300",
    chip: "bg-cyan-400/20 text-cyan-100 ring-cyan-200/30",
    mark: "text-cyan-200",
  },
};

// Solid, not frosted. backdrop-blur makes a stacking context, which trapped a
// picker's open list inside the card and let the panel below paint over it.
const CARD =
  "rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900";

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xl font-black tabular-nums text-slate-900 sm:text-2xl dark:text-white">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default function AgeCalculator() {
  const { language } = useLanguage();
  const isAmharic = language === "am";

  const [birth, setBirth] = useState<Date>(FALLBACK_BIRTH);
  const [calendar, setCalendar] = useState<"gregorian" | "ethiopian">("gregorian");

  /*
   * Both the stored birth date and "now" arrive after mount. Rendering an age on
   * the server would bake one day's answer into the exported HTML, and reading
   * storage during render would disagree with it — so the answer waits a tick and
   * the page shows its shape in the meantime.
   */
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const stored = parseIso(readText(STORAGE_KEY));
    if (stored) setBirth(stored);

    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const commit = (next: Date) => {
    setBirth(next);
    writeText(STORAGE_KEY, isoOf(next));
  };

  const ethiopianBirth = useMemo(() => toEthiopian(birth), [birth]);

  const setGregorian = (patch: { day?: number; month?: number; year?: number }) => {
    const year = patch.year ?? birth.getFullYear();
    const month = patch.month ?? birth.getMonth() + 1;
    const day = Math.min(patch.day ?? birth.getDate(), gregorianMonthLength(year, month));
    commit(new Date(year, month - 1, day, 12));
  };

  const setEthiopian = (patch: { day?: number; month?: number; year?: number }) => {
    const year = patch.year ?? ethiopianBirth.year;
    const month = patch.month ?? ethiopianBirth.month;
    const day = Math.min(patch.day ?? ethiopianBirth.day, ethiopianMonthLength(year, month));
    commit(gregorianDateOf(year, month, day));
  };

  const ethiopianMonth = ETHIOPIAN_MONTHS[ethiopianBirth.month - 1];
  const gregorianMonth = GREGORIAN_MONTHS[birth.getMonth()];
  // WEEKDAY_HEADERS starts on Monday; Date#getDay starts on Sunday.
  const bornWeekday = WEEKDAY_HEADERS[(birth.getDay() + 6) % 7];

  const zodiac = useMemo(() => zodiacForDate(birth), [birth]);
  const neighbour = useMemo(
    () => cuspNeighbour(birth.getMonth() + 1, birth.getDate()),
    [birth]
  );
  const evangelist = evangelistOf(ethiopianBirth.year);
  const skin = ELEMENT_SKIN[zodiac.element];

  const unborn = now !== null && birth > now;

  const result = useMemo(() => {
    if (!now || birth > now) return null;

    return {
      gregorian: gregorianAge(birth, now),
      ethiopian: ethiopianAge(ethiopianBirth, toEthiopian(now)),
      totals: totalsFor(birth, now),
      birthday: nextBirthday(birth, now),
      clock: timeIntoToday(now),
    };
  }, [birth, ethiopianBirth, now]);

  const fromGregorian = calendar === "gregorian";

  const fields = fromGregorian ? (
    <>
      <PickerField
        label={isAmharic ? "ቀን" : "Day"}
        value={birth.getDate()}
        display={String(birth.getDate())}
        options={numbers(gregorianMonthLength(birth.getFullYear(), birth.getMonth() + 1))}
        onCommit={(day) => setGregorian({ day })}
        columns={6}
        width="17rem"
        className="order-2 w-full"
      />
      <PickerField
        label={isAmharic ? "ወር" : "Month"}
        value={birth.getMonth() + 1}
        display={gregorianMonth?.label ?? ""}
        options={GREGORIAN_MONTHS.map((month, index) => ({
          value: index + 1,
          label: month.label,
        }))}
        onCommit={(month) => setGregorian({ month })}
        columns={2}
        width="20rem"
        className="order-1 col-span-2 w-full"
      />
      <PickerField
        label={isAmharic ? "ዓመት" : "Year"}
        value={birth.getFullYear()}
        display={String(birth.getFullYear())}
        options={yearRun(new Date().getFullYear()).map((year) => ({
          value: year,
          label: String(year),
        }))}
        onCommit={(year) => setGregorian({ year })}
        columns={1}
        width="9rem"
        className="order-3 w-full"
      />
    </>
  ) : (
    <>
      <PickerField
        label={isAmharic ? "ቀን" : "Day"}
        value={ethiopianBirth.day}
        display={String(ethiopianBirth.day)}
        options={numbers(ethiopianMonthLength(ethiopianBirth.year, ethiopianBirth.month))}
        onCommit={(day) => setEthiopian({ day })}
        columns={6}
        width="17rem"
        className="order-2 w-full"
      />
      <PickerField
        label={isAmharic ? "ወር" : "Month"}
        value={ethiopianBirth.month}
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
        className="order-1 col-span-2 w-full"
      />
      <PickerField
        label={isAmharic ? "ዓመት" : "Year"}
        value={ethiopianBirth.year}
        display={String(ethiopianBirth.year)}
        options={yearRun(toEthiopian(new Date()).year).map((year) => ({
          value: year,
          label: String(year),
        }))}
        onCommit={(year) => setEthiopian({ year })}
        columns={1}
        width="9rem"
        className="order-3 w-full"
      />
    </>
  );

  return (
    <div className="w-full pb-4 pt-2">
      <header className="mb-6">
        <h1 className={EYEBROW}>
          {isAmharic ? "የኢትዮጵያ ዕድሜ ማስሊያ" : "Ethiopian age calculator"}
        </h1>
        <p className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {isAmharic ? "ዕድሜዎን ይወቁ" : "How old, exactly"}
        </p>
        <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
          {isAmharic
            ? "የተወለዱበትን ቀን በሁለቱም የቀን አቆጣጠር ያስገቡ — ዕድሜዎ፣ ኮከብዎ እና ቀጣዩ ልደትዎ ወዲያው ይታያል።"
            : "Set a birth date in either calendar. The age, the sign it falls under, and the next birthday follow from it."}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        {/* The one thing to fill in. */}
        <section className={cn(CARD, "lg:sticky lg:top-6")}>
          <p className={EYEBROW}>{isAmharic ? "የትውልድ ቀን" : "Date of birth"}</p>

          <div
            role="tablist"
            aria-label={isAmharic ? "የቀን አቆጣጠር" : "Calendar to enter"}
            className="mt-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/60"
          >
            {(["gregorian", "ethiopian"] as const).map((option) => {
              const active = calendar === option;
              const label =
                option === "gregorian"
                  ? "Gregorian"
                  : isAmharic
                    ? "ኢትዮጵያ"
                    : "Ethiopian";

              return (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCalendar(option)}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200",
                    active
                      ? option === "gregorian"
                        ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md"
                        : "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 items-end gap-2 sm:gap-3">{fields}</div>

          {/* The same day written out the other way, so the entry can be checked. */}
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-3.5 dark:border-slate-700">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {isAmharic ? "የተወለዱት" : "Born on"}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {isAmharic ? bornWeekday?.amharic : bornWeekday?.full}
            </p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {fromGregorian
                ? `${ethiopianMonth?.label} ${ethiopianMonth?.amharic} ${ethiopianBirth.day}, ${ethiopianBirth.year} ${isAmharic ? "ዓ.ም" : "E.C."}`
                : `${gregorianMonth?.label} ${birth.getDate()}, ${birth.getFullYear()}`}
            </p>
            <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {isAmharic ? "ዘመነ" : "The year of"}{" "}
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {isAmharic ? evangelist.amharic : evangelist.name}
              </span>
              {!isAmharic && <span className="ml-1.5">{evangelist.amharic}</span>}
            </p>
          </div>
        </section>

        {/* Everything the date implies. */}
        <div className="space-y-4" aria-live="polite">
          {unborn ? (
            <section className="rounded-3xl border border-amber-300 bg-amber-50 px-5 py-8 text-center dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                {isAmharic
                  ? "የተመረጠው ቀን ገና አልደረሰም።"
                  : "That date has not happened yet."}
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80">
                {isAmharic
                  ? "ያለፈ ቀን ይምረጡ።"
                  : "Pick a day that has already been and gone."}
              </p>
            </section>
          ) : !result ? (
            // The shape of the answer while the clock is still being read.
            <div
              className="h-64 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/50"
              aria-hidden="true"
            />
          ) : (
            <>
              <section
                className={cn(
                  "relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lg sm:p-7",
                  skin.hero
                )}
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl",
                    skin.glow
                  )}
                />

                <div className="relative">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                    {isAmharic ? "ዕድሜዎ" : "You are"}
                  </p>

                  <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-6xl font-black leading-none tabular-nums sm:text-7xl">
                      {result.gregorian.years}
                    </span>
                    <span className="text-2xl font-bold text-white/75 sm:text-3xl">
                      {isAmharic
                        ? "ዓመት"
                        : result.gregorian.years === 1
                          ? "year"
                          : "years"}
                    </span>
                  </p>

                  <p className="mt-2 text-lg font-semibold text-white/85 sm:text-xl">
                    {isAmharic
                      ? `${result.gregorian.months} ወር፣ ${result.gregorian.days} ቀን`
                      : `${result.gregorian.months} ${result.gregorian.months === 1 ? "month" : "months"}, ${result.gregorian.days} ${result.gregorian.days === 1 ? "day" : "days"}`}
                  </p>

                  {/* The same span counted in thirteen months rather than twelve. */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/20 pt-4">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ring-1 ring-white/20">
                      {isAmharic ? "በኢትዮጵያ አቆጣጠር" : "Ethiopian reckoning"}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-white/90">
                      {result.ethiopian.years} ዓመት · {result.ethiopian.months} ወር ·{" "}
                      {result.ethiopian.days} ቀን
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-medium tabular-nums text-white/55">
                    {isAmharic ? "ዛሬ ካለፈው" : "and"}{" "}
                    {String(result.clock.hours).padStart(2, "0")}:
                    {String(result.clock.minutes).padStart(2, "0")}:
                    {String(result.clock.seconds).padStart(2, "0")}{" "}
                    {isAmharic ? "" : "into today"}
                  </p>
                </div>
              </section>

              {/* The sign, under both names it goes by here. */}
              <section className={CARD}>
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-3xl text-white shadow-md",
                      skin.hero
                    )}
                  >
                    {zodiac.symbol}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className={EYEBROW}>
                      <Stars className="mr-1 inline h-3 w-3" aria-hidden="true" />
                      {isAmharic ? "ኮከብ" : "Star sign"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
                      <span className="text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
                        {zodiac.name}
                      </span>
                      <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                        {zodiac.geez}
                      </span>
                    </p>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                      {zodiacSpan(zodiac)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {isAmharic
                      ? ELEMENT_LABELS[zodiac.element].am
                      : ELEMENT_LABELS[zodiac.element].en}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {zodiac.traits}
                  </span>
                </div>

                {neighbour && (
                  <p className="mt-3 flex gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {isAmharic
                        ? `በ${zodiac.geez} እና በ${neighbour.geez} ጠርዝ ላይ — የመሸጋገሪያው ቀን ከዓመት ዓመት ይለያያል።`
                        : `On the cusp with ${neighbour.name} (${neighbour.geez}). The crossing moves by a day from year to year, so either sign may be yours.`}
                    </span>
                  </p>
                )}
              </section>

              {/* The age again, in units nobody counts but everybody likes. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  value={result.totals.months.toLocaleString()}
                  label={isAmharic ? "ወራት" : "months"}
                />
                <Stat
                  value={result.totals.weeks.toLocaleString()}
                  label={isAmharic ? "ሳምንታት" : "weeks"}
                />
                <Stat
                  value={result.totals.days.toLocaleString()}
                  label={isAmharic ? "ቀናት" : "days"}
                />
                <Stat
                  value={result.totals.hours.toLocaleString()}
                  label={isAmharic ? "ሰዓታት" : "hours"}
                />
              </div>

              {/* What the date is good for next. */}
              <section className={cn(CARD, "flex flex-wrap items-center gap-4")}>
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-md"
                >
                  <CakeSlice className="h-6 w-6" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className={EYEBROW}>{isAmharic ? "ቀጣይ ልደት" : "Next birthday"}</p>
                  <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                    {result.birthday.daysAway === 0
                      ? isAmharic
                        ? "ዛሬ ነው — መልካም ልደት!"
                        : "Today — many happy returns."
                      : isAmharic
                        ? `በ${result.birthday.daysAway} ቀን ውስጥ`
                        : `In ${result.birthday.daysAway} ${result.birthday.daysAway === 1 ? "day" : "days"}`}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                    {result.birthday.date.toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {result.birthday.daysAway >= 0 && (
                  <p className="text-right">
                    <span className="block text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                      {result.birthday.turning}
                    </span>
                    <span className={EYEBROW}>
                      {result.birthday.daysAway === 0
                        ? isAmharic
                          ? "ዛሬ ተሞላ"
                          : "turned today"
                        : isAmharic
                          ? "ይሞላል"
                          : "turning"}
                    </span>
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
