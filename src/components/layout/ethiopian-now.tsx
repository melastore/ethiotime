"use client";

import { useEffect, useMemo, useState } from "react";
import Kenat from "kenat";

import { useLanguage } from "@/components/providers/language-provider";
import { addisWallClock, matchesAddis } from "@/lib/addis-time";
import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";
import { cn } from "@/lib/utils";

const ETHIOPIAN_CLOCK_SHIFT_MS = 6 * 60 * 60 * 1000;

const removeEraLabel = (value: string) =>
  value
    .replace(/\s*ERA\s*\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

type EthiopianNowProps = {
  compact?: boolean;
  className?: string;
};

export function EthiopianNow({ compact = false, className }: EthiopianNowProps) {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    setMounted(true);
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const ethiopianDateLabel = useMemo(() => {
    if (!mounted) return "";

    const locale = language === "am" ? "am-ET" : undefined;
    try {
      const formatted = new Intl.DateTimeFormat(locale, {
        calendar: "ethiopic",
        weekday: compact ? undefined : "long",
        year: "numeric",
        month: compact ? "short" : "long",
        day: "numeric",
      }).format(now);
      return removeEraLabel(formatted);
    } catch {
      const eth = new Kenat(now).getEthiopian();
      const monthData = ETHIOPIAN_MONTHS[eth.month - 1];
      const weekday = compact
        ? ""
        : new Intl.DateTimeFormat(locale, {
            weekday: "long",
          }).format(now);

      const monthName =
        language === "am" ? (monthData?.amharic ?? "") : (monthData?.label ?? "");
      return removeEraLabel(
        `${weekday ? `${weekday}, ` : ""}${monthName} ${eth.day}, ${eth.year}`
      );
    }
  }, [compact, language, mounted, now]);

  const clockOf = useMemo(
    () => (moment: Date) =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: compact ? undefined : "2-digit",
        hour12: true,
      }).format(new Date(moment.getTime() - ETHIOPIAN_CLOCK_SHIFT_MS)),
    [compact]
  );

  const ethiopianClockLabel = useMemo(
    () => (mounted ? clockOf(now) : ""),
    [clockOf, mounted, now]
  );

  // Away from Ethiopia the reading above is the local one, which is what you
  // want for your own day and not what you want for home. Zones that keep the
  // same clock, Nairobi among them, add nothing and are left out.
  const addis = useMemo(() => {
    if (!mounted || matchesAddis(now)) return null;

    const there = addisWallClock(now);
    const sameDay = there.toDateString() === now.toDateString();
    return { clock: clockOf(there), sameDay };
  }, [clockOf, mounted, now]);

  if (!mounted) {
    return (
      <div
        className={cn(
          "shrink-0 rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/50",
          className
        )}
      >
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-2xl border border-slate-200 bg-white/70 p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200",
        className
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {language === "am" ? "የኢትዮጵያ ዛሬ" : "Ethiopian Today"}
      </p>
      <p
        className={cn(
          "mt-1 break-words font-semibold leading-snug",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {ethiopianDateLabel}
      </p>
      <p
        className={cn(
          "mt-2 font-mono font-bold tracking-tight text-teal-700 dark:text-teal-300",
          compact ? "text-sm" : "text-lg"
        )}
      >
        {ethiopianClockLabel}
      </p>
      {addis && (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="uppercase tracking-wider">
            {language === "am" ? "አዲስ አበባ" : "Addis"}
          </span>
          <span className="font-mono text-slate-700 dark:text-slate-200">
            {addis.clock}
          </span>
          {!addis.sameDay && (
            <span className="text-amber-600 dark:text-amber-400">
              {language === "am" ? "(ሌላ ቀን)" : "(another day)"}
            </span>
          )}
        </p>
      )}
      {!compact && (
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
          {language === "am"
            ? "12-ሰዓት የኢትዮጵያ ሰዓት (6 ሰዓት ልዩነት)"
            : "12-hour Ethiopian clock (6-hour shift)"}
        </p>
      )}
    </div>
  );
}
