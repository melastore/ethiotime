"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Kenat from "kenat";

import { useLanguage } from "@/components/providers/language-provider";
import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";
import {
  daysInEthiopianMonth,
  monthArc,
  yearFraction,
} from "@/lib/ethiopian-clock";
import {
  getHolidayOccurrencesForEthiopianYear,
  type HolidayOccurrence,
} from "@/lib/ethiopian-holidays";
import { cn } from "@/lib/utils";

/*
 * The Ethiopian year as a ring of thirteen.
 *
 * The point of drawing it rather than listing it is Pagume: twelve months of
 * thirty days and then a stub of five, which a grid of equal boxes quietly hides
 * and a ring cannot. Each slice is sized by the days in it, so the odd little
 * thirteenth is visible as exactly what it is — and the feasts sit on the ring
 * at the point in the year they actually fall.
 */

const SIZE = 320;
const CENTER = SIZE / 2;
const OUTER = 140;
/** Room for the feast dots and the Pagume label, which sit outside the ring. */
const MARGIN = 26;
const INNER = 100;

/** The four Ethiopian seasons, and the months each one covers. */
const SEASONS = [
  { months: [1, 2, 3], amharic: "መጸው", english: "Harvest", tint: "#0D9488" },
  { months: [4, 5, 6], amharic: "በጋ", english: "Dry", tint: "#D97706" },
  { months: [7, 8, 9], amharic: "ጸደይ", english: "Spring", tint: "#E11D48" },
  { months: [10, 11, 12], amharic: "ክረምት", english: "Rains", tint: "#4F46E5" },
  { months: [13], amharic: "ጳጉሜ", english: "Pagume", tint: "#CA8A04" },
];

const seasonOf = (month: number) =>
  SEASONS.find((season) => season.months.includes(month)) ?? SEASONS[0];

/** Clockwise from the top, so the year reads the way a clock does. */
const pointAt = (fraction: number, radius: number) => {
  const angle = ((fraction * 360 - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
};

/** One slice of the ring, as an SVG path. */
function segmentPath(start: number, end: number, outer: number, inner: number) {
  const a = pointAt(start, outer);
  const b = pointAt(end, outer);
  const c = pointAt(end, inner);
  const d = pointAt(start, inner);
  const large = end - start > 0.5 ? 1 : 0;

  return [
    `M ${a.x} ${a.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y}`,
    "Z",
  ].join(" ");
}

export function YearWheel({ className }: { className?: string }) {
  const { language, t } = useLanguage();
  const isAmharic = language === "am";

  const [today, setToday] = useState<{ year: number; month: number; day: number } | null>(
    null
  );
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const eth = new Kenat(new Date()).getEthiopian();
    setToday({ year: eth.year, month: eth.month, day: eth.day });
  }, []);

  const year = today?.year ?? null;

  const holidays = useMemo<HolidayOccurrence[]>(
    () => (year === null ? [] : getHolidayOccurrencesForEthiopianYear(year)),
    [year]
  );

  if (!today || year === null) {
    return (
      <div
        className={cn("aspect-square w-full animate-pulse rounded-full bg-white/10", className)}
        aria-hidden="true"
      />
    );
  }

  const shownMonth = active ?? today.month;
  const month = ETHIOPIAN_MONTHS[shownMonth - 1];
  const season = seasonOf(shownMonth);
  const monthHolidays = holidays.filter(
    (entry) => entry.ethiopian.month === shownMonth
  );
  const todayFraction = yearFraction(today.month, today.day, year);
  // Just inside the ring: on it, the marker covered whichever label it reached.
  const todayPoint = pointAt(todayFraction, INNER - 11);
  const todayReach = pointAt(todayFraction, INNER - 1);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`${-MARGIN} ${-MARGIN} ${SIZE + MARGIN * 2} ${SIZE + MARGIN * 2}`}
        className="h-auto w-full"
      >
        <title>
          {isAmharic
            ? "የኢትዮጵያ ዓመት አሥራ ሦስት ወራት"
            : "The thirteen months of the Ethiopian year"}
        </title>

        {ETHIOPIAN_MONTHS.map((entry, index) => {
          const number = index + 1;
          const { start, end } = monthArc(number, year);
          const tint = seasonOf(number).tint;
          const isShown = number === shownMonth;
          const isCurrent = number === today.month;
          const label = pointAt((start + end) / 2, (OUTER + INNER) / 2);

          return (
            <g key={entry.value}>
              <path
                d={segmentPath(start, end, isShown ? OUTER + 6 : OUTER, INNER)}
                fill={tint}
                fillOpacity={isShown ? 0.95 : isCurrent ? 0.6 : 0.3}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActive(number)}
                onFocus={() => setActive(number)}
                tabIndex={0}
                role="button"
                aria-label={`${entry.label} — ${daysInEthiopianMonth(number, year)} days`}
                onClick={() => setActive(number)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActive(number);
                  }
                }}
              />
              {/* Pagume's slice is far too narrow to letter. */}
              {number !== 13 && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    "pointer-events-none text-[10px] font-bold",
                    // A slice is a light tint on white and a dark one on slate,
                    // so the label has to follow the theme rather than the fill.
                    isShown
                      ? "fill-white"
                      : "fill-slate-700/90 dark:fill-white/80"
                  )}
                >
                  {isAmharic ? entry.amharic : entry.short ?? entry.label.slice(0, 3)}
                </text>
              )}
            </g>
          );
        })}

        {/* Every feast of the year, at the point on the ring where it lands. */}
        {holidays.map((entry) => {
          const point = pointAt(
            yearFraction(entry.ethiopian.month, entry.ethiopian.day, year),
            OUTER + 14
          );
          return (
            <circle
              key={`${entry.holiday.id}-${entry.ethiopian.month}-${entry.ethiopian.day}`}
              cx={point.x}
              cy={point.y}
              r={entry.ethiopian.month === shownMonth ? 3.6 : 2.2}
              className="fill-amber-400 transition-all duration-200"
            />
          );
        })}

        {/* Today, pointing out at the day it falls on. */}
        <line
          x1={todayPoint.x}
          y1={todayPoint.y}
          x2={todayReach.x}
          y2={todayReach.y}
          className="stroke-slate-900/50 dark:stroke-white/60"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <circle
          cx={todayPoint.x}
          cy={todayPoint.y}
          r={4}
          className="fill-slate-900 dark:fill-white"
        />

        {/* Pagume is too narrow to letter, so it is named from outside. */}
        <text
          x={pointAt((monthArc(13, year).start + monthArc(13, year).end) / 2, OUTER + 30).x}
          y={pointAt((monthArc(13, year).start + monthArc(13, year).end) / 2, OUTER + 30).y}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none fill-amber-600 text-[9px] font-bold dark:fill-amber-400"
        >
          {isAmharic ? "ጳጉሜ" : "Pagume"}
        </text>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          key={shownMonth}
          className="month-pop pointer-events-auto w-[58%] text-center"
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: season.tint }}
          >
            {isAmharic ? season.amharic : season.english}
          </p>
          <p className="section-title mt-0.5 text-xl font-black leading-tight text-slate-900 dark:text-white">
            {isAmharic ? month.amharic : month.label}
          </p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {daysInEthiopianMonth(shownMonth, year)}{" "}
            {isAmharic ? "ቀናት" : "days"}
          </p>
          {month.gregorianSpan && (
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              {month.gregorianSpan}
            </p>
          )}

          {monthHolidays.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {monthHolidays.slice(0, 2).map((entry) => (
                <li key={entry.holiday.id}>
                  <Link
                    href={`/holidays?holiday=${entry.holiday.id}`}
                    className="block truncate text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-300"
                  >
                    {isAmharic ? entry.holiday.amharic : entry.holiday.name}
                  </Link>
                </li>
              ))}
              {monthHolidays.length > 2 && (
                <li className="text-[10px] text-slate-500 dark:text-slate-400">
                  +{monthHolidays.length - 2} {isAmharic ? "ተጨማሪ" : "more"}
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        {t("home.wheelHint", "Pick a month — Pagume is only five days.")}
      </p>
    </div>
  );
}
