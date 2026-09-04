"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Kenat from "kenat";
import { ArrowRight, Sparkles } from "lucide-react";

import { DayArc } from "@/components/home/day-arc";
import { YearWheel } from "@/components/home/year-wheel";
import { useLanguage } from "@/components/providers/language-provider";
import { ETHIOPIAN_MONTHS, WEEKDAY_HEADERS } from "@/lib/calendar-data";
import { ethiopianTimeAt } from "@/lib/ethiopian-clock";
import { getUpcomingHolidayOccurrences } from "@/lib/ethiopian-holidays";
import {
  getDailySaints,
  getFastingStatus,
  type DailySaint,
  type FastingStatus,
} from "@/lib/ethiopian-saints";
import { skyAt } from "@/lib/sky";
import { cn } from "@/lib/utils";

const GREGORIAN_WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

type Today = {
  ethDay: number;
  ethMonthLatin: string;
  ethMonthAmharic: string;
  ethYear: number;
  weekdayLatin: string;
  weekdayAmharic: string;
  gregorian: string;
  dailySaint: DailySaint;
  fasting: FastingStatus;
  nextFeast: { name: string; amharic: string; id: string; days: number } | null;
};

function describe(now: Date): Today {
  const eth = new Kenat(now).getEthiopian();
  const month = ETHIOPIAN_MONTHS[eth.month - 1];
  // WEEKDAY_HEADERS starts on Monday; Date#getDay starts on Sunday.
  const weekday = WEEKDAY_HEADERS[(now.getDay() + 6) % 7];

  const [upcoming] = getUpcomingHolidayOccurrences(now, 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return {
    ethDay: eth.day,
    ethMonthLatin: month?.label ?? "",
    ethMonthAmharic: month?.amharic ?? "",
    ethYear: eth.year,
    weekdayLatin: weekday?.full ?? GREGORIAN_WEEKDAYS[now.getDay()],
    weekdayAmharic: weekday?.amharic ?? "",
    gregorian: now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    dailySaint: getDailySaints(eth.day, eth.month === 13),
    fasting: getFastingStatus(eth.month, eth.day, now.getDay()),
    nextFeast: upcoming
      ? {
          name: upcoming.holiday.name,
          amharic: upcoming.holiday.amharic,
          id: upcoming.holiday.id,
          days: Math.round(
            (upcoming.gregorianDate.getTime() - startOfToday.getTime()) / 86400000
          ),
        }
      : null,
  };
}

export function TodayHero() {
  const { language, t } = useLanguage();
  const isAmharic = language === "am";

  /*
   * The clock lives here rather than in the dial, because the panel is painted
   * from it too: the card behind the sun is the sky the sun is in. Dragging the
   * dial hands back a scrub position, and the whole card moves to that hour.
   */
  const [now, setNow] = useState<Date | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [today, setToday] = useState<Today | null>(null);

  useEffect(() => {
    // Only after mount: a server-rendered "today" is wrong the moment it is cached.
    const tick = () => setNow(new Date());
    tick();
    setToday(describe(new Date()));

    const clock = window.setInterval(tick, 1000);
    const date = window.setInterval(() => setToday(describe(new Date())), 60_000);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(date);
    };
  }, []);

  const sky = useMemo(() => {
    const live = now ? ethiopianTimeAt(now).dayFraction : 0.25;
    return skyAt(preview ?? live);
  }, [now, preview]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      {/* The day: the date in words, over the dial that shows the hour. */}
      <section
        className="relative overflow-hidden rounded-[2rem] border border-white/20 p-6 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.75)] transition-[background] duration-1000 ease-linear sm:p-8 dark:border-white/10"
        style={{
          background: `linear-gradient(160deg, ${sky.inkSoft} 0%, ${sky.ink} 55%, rgb(9, 14, 26) 100%)`,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl transition-colors duration-1000"
          style={{ background: sky.bottom, opacity: 0.18 }}
        />

        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ring-white/25">
            {t("home.today", "Today")}
          </p>

          {today ? (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                {isAmharic ? today.weekdayAmharic : today.weekdayLatin}
              </p>
              {/* Not an h1: today's date only exists after mount, so the exported
                  HTML would ship the page with no heading at all. */}
              <p className="section-title mt-1 text-4xl font-black leading-[1.05] sm:text-5xl">
                {isAmharic ? today.ethMonthAmharic : today.ethMonthLatin} {today.ethDay}
              </p>
              <p className="mt-1 text-lg font-bold text-amber-200">
                {today.ethYear} {isAmharic ? "ዓ.ም" : "E.C."}
                <span className="ml-2 text-sm font-medium text-white/75">
                  {today.gregorian}
                </span>
              </p>

              {/* Commemorating Saint & Fasting Status */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  title={isAmharic ? today.dailySaint.descriptionAmharic : today.dailySaint.descriptionEnglish}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-300/30 backdrop-blur-sm"
                >
                  <span aria-hidden="true">⛪</span>
                  <span>{isAmharic ? today.dailySaint.primaryAmharic : today.dailySaint.primaryEnglish}</span>
                </span>
                <span
                  title={isAmharic ? today.fasting.seasonDescriptionAmharic : today.fasting.seasonDescriptionEnglish}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 backdrop-blur-sm",
                    today.fasting.isFasting
                      ? "bg-violet-500/25 text-violet-200 ring-violet-400/30"
                      : "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                  )}
                >
                  <span aria-hidden="true">{today.fasting.isFasting ? "🌿" : "✨"}</span>
                  <span>{isAmharic ? today.fasting.nameAmharic : today.fasting.nameEnglish}</span>
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 space-y-2.5" aria-hidden="true">
              <div className="h-3 w-24 animate-pulse rounded bg-white/25" />
              <div className="h-10 w-56 animate-pulse rounded bg-white/25" />
              <div className="h-4 w-64 animate-pulse rounded bg-white/15" />
            </div>
          )}

          <p className="sr-only" aria-live="polite">
            {today
              ? `${today.gregorian}. ${today.ethMonthLatin} ${today.ethDay}, ${today.ethYear} Ethiopian.`
              : ""}
          </p>
        </div>

        <DayArc
          now={now}
          preview={preview}
          onPreviewChange={setPreview}
          className="relative mx-auto mt-4 max-w-[19rem]"
        />

        <div className="relative mt-1.5 flex flex-col items-center gap-1.5">
          <p className="text-center text-[11px] text-white/60">
            {t("home.arcHint", "Drag the dial to read any hour in both reckonings.")}
          </p>
          {preview !== null && (
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-white/30 active:scale-95 transition-all shadow-sm"
            >
              <span>{isAmharic ? "ወደ አሁኑ ሰዓት ተመለስ" : "Reset to live clock"}</span>
              <span className="text-[11px] opacity-75">✕</span>
            </button>
          )}
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/date-converter"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {t("nav.dateConverter", "Date Converter")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {today?.nextFeast && (
            <Link
              href={`/holidays?holiday=${today.nextFeast.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold ring-1 ring-white/30 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
              {isAmharic ? today.nextFeast.amharic : today.nextFeast.name}
              <span className="text-white/70">
                {today.nextFeast.days === 0
                  ? isAmharic ? "ዛሬ" : "today"
                  : `${today.nextFeast.days}${isAmharic ? " ቀን" : "d"}`}
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* The year: thirteen months, sized by the days in them. */}
      <section className="glass-surface rounded-[2rem] p-5 sm:p-8">
        <h2 className="section-title text-lg font-black text-slate-900 dark:text-white">
          {t("home.yearTitle", "The thirteen months")}
        </h2>
        {/* Reaches past the card padding on a phone: the ring is the content,
            and 40px of padding around it is 40px it does not have. */}
        <YearWheel className="mt-3 -mx-4 sm:mx-0" />
      </section>
    </div>
  );
}
