"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Kenat from "kenat";
import { ArrowRight, Clock3 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { ETHIOPIAN_MONTHS, WEEKDAY_HEADERS } from "@/lib/calendar-data";

/** Ethiopian clock runs six hours behind the wall clock: 12:00 EAT is 6:00 locally. */
const ETHIOPIAN_CLOCK_SHIFT_MS = 6 * 60 * 60 * 1000;

const GREGORIAN_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const GREGORIAN_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type TodayParts = {
  ethDay: number;
  ethMonthLatin: string;
  ethMonthAmharic: string;
  ethYear: number;
  weekdayLatin: string;
  weekdayAmharic: string;
  gregorian: string;
  clock: string;
};

function describe(now: Date): TodayParts {
  const eth = new Kenat(now).getEthiopian();
  const month = ETHIOPIAN_MONTHS[eth.month - 1];
  // WEEKDAY_HEADERS starts on Monday; Date#getDay starts on Sunday.
  const weekday = WEEKDAY_HEADERS[(now.getDay() + 6) % 7];

  const shifted = new Date(now.getTime() - ETHIOPIAN_CLOCK_SHIFT_MS);
  const hours = shifted.getHours();
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(shifted.getMinutes()).padStart(2, "0");
  const seconds = String(shifted.getSeconds()).padStart(2, "0");

  return {
    ethDay: eth.day,
    ethMonthLatin: month?.label ?? "",
    ethMonthAmharic: month?.amharic ?? "",
    ethYear: eth.year,
    weekdayLatin: weekday?.full ?? GREGORIAN_WEEKDAYS[now.getDay()],
    weekdayAmharic: weekday?.amharic ?? "",
    gregorian: `${GREGORIAN_WEEKDAYS[now.getDay()]}, ${
      GREGORIAN_MONTH_NAMES[now.getMonth()]
    } ${now.getDate()}, ${now.getFullYear()}`,
    clock: `${displayHour}:${minutes}:${seconds}`,
  };
}

export function TodayHero() {
  const { language, t } = useLanguage();
  const [today, setToday] = useState<TodayParts | null>(null);

  useEffect(() => {
    // Rendered only after mount: the server has no idea what "today" is for the
    // visitor, and a server-rendered date would be wrong the moment it is cached.
    const tick = () => setToday(describe(new Date()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isAmharic = language === "am";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 text-white shadow-[0_30px_80px_-40px_rgba(13,148,136,0.9)] dark:border-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl"
      />

      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/25">
            {isAmharic ? "ዛሬ" : "Today"}
          </p>

          {today ? (
            <>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-teal-100/90">
                {isAmharic ? today.weekdayAmharic : today.weekdayLatin}
              </p>

              <h1 className="section-title mt-2 text-4xl font-black leading-[1.05] sm:text-6xl">
                {isAmharic ? (
                  <>
                    {today.ethMonthAmharic} {today.ethDay}
                  </>
                ) : (
                  <>
                    {today.ethMonthLatin} {today.ethDay}
                  </>
                )}
              </h1>

              <p className="mt-2 text-xl font-bold text-amber-200 sm:text-2xl">
                {today.ethYear} {isAmharic ? "ዓ.ም" : "E.C."}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-teal-50/90">
                <span className="rounded-lg bg-white/10 px-2.5 py-1 font-semibold ring-1 ring-white/15">
                  {isAmharic
                    ? `${today.ethMonthLatin} ${today.ethDay}, ${today.ethYear}`
                    : `${today.ethMonthAmharic} ${today.ethDay}፣ ${today.ethYear}`}
                </span>
                <span className="font-medium">{today.gregorian}</span>
              </div>
            </>
          ) : (
            <div className="mt-5 space-y-3" aria-hidden="true">
              <div className="h-4 w-32 animate-pulse rounded bg-white/25" />
              <div className="h-12 w-64 animate-pulse rounded bg-white/25" />
              <div className="h-6 w-40 animate-pulse rounded bg-white/20" />
              <div className="h-4 w-72 animate-pulse rounded bg-white/15" />
            </div>
          )}

          <p className="sr-only" aria-live="polite">
            {today
              ? `${today.gregorian}. ${today.ethMonthLatin} ${today.ethDay}, ${today.ethYear} Ethiopian.`
              : ""}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/date-converter"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-teal-800 shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700"
            >
              {t("nav.dateConverter", "Date Converter")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/ethiopian-calendar"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/30 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("nav.ethiopianCalendar", "Ethiopian Calendar")}
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-100">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {isAmharic ? "የኢትዮጵያ ሰዓት" : "Ethiopian Time"}
          </p>
          <p className="mt-3 font-mono text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
            {today ? today.clock : "--:--:--"}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-teal-50/80">
            {isAmharic
              ? "የኢትዮጵያ ሰዓት ከመደበኛው ሰዓት በ6 ሰዓት ይለያል።"
              : "The Ethiopian day starts at dawn, six hours behind the 24-hour clock."}
          </p>
        </div>
      </div>
    </section>
  );
}
