"use client";

import { useEffect, useMemo, useState } from "react";
import Kenat from "kenat";

import { useLanguage } from "@/components/providers/language-provider";
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

    try {
      const formatted = new Intl.DateTimeFormat(undefined, {
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
        : new Intl.DateTimeFormat(undefined, {
            weekday: "long",
          }).format(now);

      return removeEraLabel(
        `${weekday ? `${weekday}, ` : ""}${monthData?.label ?? ""} ${eth.day}, ${eth.year}`
      );
    }
  }, [compact, mounted, now]);

  const ethiopianClockLabel = useMemo(() => {
    if (!mounted) return "";

    const shifted = new Date(now.getTime() - ETHIOPIAN_CLOCK_SHIFT_MS);
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: compact ? undefined : "2-digit",
      hour12: true,
    }).format(shifted);
  }, [compact, mounted, now]);

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
