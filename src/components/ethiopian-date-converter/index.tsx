"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  Copy,
  Globe2,
  Info,
  Sparkles,
} from "lucide-react";
import Kenat from "kenat";

import { cn } from "@/lib/utils";
import {
  DAY_OPTIONS,
  ETHIOPIAN_MONTHS,
  GREGORIAN_MONTHS,
  getCenteredEthiopianYears,
  getCenteredGregorianYears,
  getDaysInMonthForMode,
  getTodayInputForMode,
  type CalendarMode,
  type DateInput,
  type MonthOption,
} from "@/lib/calendar-data";

type SelectOption = string | MonthOption;

type ConversionSuccess = {
  day: number;
  month: string;
  year: number;
  weekday: string;
  amharicMonth: string | null;
  extra: string | null;
  fromLabel: "Gregorian" | "Ethiopian";
  toLabel: "Gregorian" | "Ethiopian";
  title: "Gregorian Date" | "Ethiopian Date";
};

type ConversionError = {
  error: true;
  message: string;
};

type ConversionResult = ConversionSuccess | ConversionError;

const GREGORIAN_YEAR_OPTIONS = getCenteredGregorianYears();
const ETHIOPIAN_YEAR_OPTIONS = getCenteredEthiopianYears();

interface FieldSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  accent?: "teal" | "amber";
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  accent = "teal",
}: FieldSelectProps) {
  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string"
          ? { value: option, label: option, amharic: undefined }
          : option
      ),
    [options]
  );

  return (
    <div className="group relative">
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border bg-white/80 px-3 pr-9 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-all duration-200 sm:h-12 sm:px-4 sm:pr-10",
            "hover:shadow-md focus:shadow-md",
            "dark:bg-slate-800/80 dark:text-slate-100",
            accent === "teal"
              ? "border-teal-200/60 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-teal-800/40 dark:focus:border-teal-500"
              : "border-amber-200/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 dark:border-amber-800/40 dark:focus:border-amber-500"
          )}
        >
          {normalizedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.amharic
                ? `${option.label} (${option.amharic})`
                : option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform group-focus-within:rotate-180" />
      </div>
    </div>
  );
}

export default function EthiopianDateConverter() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<CalendarMode>("gregorian");
  const [input, setInput] = useState<DateInput>(
    getTodayInputForMode("gregorian")
  );
  const [mounted, setMounted] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fromParam = searchParams.get("from");
    const dayParam = searchParams.get("day");
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    if (!fromParam || !dayParam || !monthParam || !yearParam) {
      return;
    }

    if (fromParam !== "gregorian" && fromParam !== "ethiopian") {
      return;
    }

    const parsedDay = Number.parseInt(dayParam, 10);
    const parsedMonth = Number.parseInt(monthParam, 10);
    const parsedYear = Number.parseInt(yearParam, 10);

    if (
      Number.isNaN(parsedDay) ||
      Number.isNaN(parsedMonth) ||
      Number.isNaN(parsedYear) ||
      parsedDay < 1
    ) {
      return;
    }

    if (parsedMonth < 1 || parsedMonth > (fromParam === "gregorian" ? 12 : 13)) {
      return;
    }

    const daysInMonth = getDaysInMonthForMode(
      fromParam,
      String(parsedMonth),
      String(parsedYear)
    );
    const safeDay = Math.min(parsedDay, daysInMonth);

    setMode(fromParam);
    setInput({
      day: String(safeDay),
      month: String(parsedMonth),
      year: String(parsedYear),
    });
  }, [mounted, searchParams]);

  useEffect(() => {
    if (!mounted) return;

    if (
      searchParams.get("from") === mode &&
      searchParams.get("day") === input.day &&
      searchParams.get("month") === input.month &&
      searchParams.get("year") === input.year
    ) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("from", mode);
    params.set("day", input.day);
    params.set("month", input.month);
    params.set("year", input.year);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [input.day, input.month, input.year, mode, mounted, pathname, router, searchParams]);

  const isGregorianInput = mode === "gregorian";

  const updateInput = useCallback((patch: Partial<DateInput>) => {
    setInput((previous) => ({ ...previous, ...patch }));
  }, []);

  const setTodayForCurrentMode = useCallback(() => {
    setInput(getTodayInputForMode(mode));
  }, [mode]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }

    window.setTimeout(() => setShareState("idle"), 2000);
  }, []);

  const switchMode = useCallback(() => {
    setIsSwapping(true);
    setTimeout(() => {
      const nextMode: CalendarMode =
        mode === "gregorian" ? "ethiopian" : "gregorian";
      setMode(nextMode);
      setInput(getTodayInputForMode(nextMode));
      setIsSwapping(false);
    }, 300);
  }, [mode]);

  const validDayOptions = useMemo(() => {
    const totalDays = getDaysInMonthForMode(mode, input.month, input.year);
    return DAY_OPTIONS.slice(0, totalDays);
  }, [input.month, input.year, mode]);

  useEffect(() => {
    const selectedDay = Number.parseInt(input.day, 10);
    if (!Number.isNaN(selectedDay) && selectedDay > validDayOptions.length) {
      updateInput({ day: String(validDayOptions.length) });
    }
  }, [input.day, updateInput, validDayOptions]);

  const result = useMemo<ConversionResult>(() => {
    const day = Number.parseInt(input.day, 10);
    const month = Number.parseInt(input.month, 10);
    const year = Number.parseInt(input.year, 10);

    if (
      Number.isNaN(day) ||
      Number.isNaN(month) ||
      Number.isNaN(year) ||
      day < 1
    ) {
      return { error: true, message: "Please select a valid date." };
    }

    try {
      if (mode === "gregorian") {
        const source = new Date(year, month - 1, day);
        if (
          source.getFullYear() !== year ||
          source.getMonth() !== month - 1 ||
          source.getDate() !== day
        ) {
          throw new Error("Invalid Gregorian date");
        }

        const converted = new Kenat(source).getEthiopian();
        const monthData = ETHIOPIAN_MONTHS[converted.month - 1];

        return {
          day: converted.day,
          month: monthData.label,
          year: converted.year,
          weekday: source.toLocaleDateString(undefined, { weekday: "long" }),
          amharicMonth: monthData.amharic ?? null,
          extra: monthData.meaning ?? null,
          fromLabel: "Gregorian",
          toLabel: "Ethiopian",
          title: "Ethiopian Date",
        };
      }

      const converted = new Kenat({ year, month, day }).getGregorian();
      const source = new Date(
        converted.year,
        converted.month - 1,
        converted.day
      );

      return {
        day: source.getDate(),
        month: source.toLocaleDateString(undefined, { month: "long" }),
        year: source.getFullYear(),
        weekday: source.toLocaleDateString(undefined, { weekday: "long" }),
        amharicMonth: null,
        extra: null,
        fromLabel: "Ethiopian",
        toLabel: "Gregorian",
        title: "Gregorian Date",
      };
    } catch {
      return { error: true, message: "That date cannot be converted." };
    }
  }, [input.day, input.month, input.year, mode]);

  if (!mounted) return null;

  const accent = isGregorianInput ? "teal" : "amber";
  const resultSurface = isGregorianInput
    ? "bg-gradient-to-br from-white via-slate-50 to-teal-50/70 text-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/25 dark:text-slate-100"
    : "bg-gradient-to-br from-white via-slate-50 to-amber-50/70 text-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/25 dark:text-slate-100";
  const resultTonePill = isGregorianInput
    ? "border-teal-300/70 bg-teal-50/90 text-teal-800 dark:border-teal-700/70 dark:bg-teal-950/50 dark:text-teal-200"
    : "border-amber-300/70 bg-amber-50/90 text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200";
  const resultToneCard = isGregorianInput
    ? "border-teal-200/70 bg-white/80 dark:border-teal-800/45 dark:bg-slate-900/45"
    : "border-amber-200/70 bg-white/80 dark:border-amber-800/45 dark:bg-slate-900/45";
  const resultToneNumber = isGregorianInput
    ? "text-teal-700 dark:text-teal-300"
    : "text-orange-700 dark:text-amber-300";
  const weekdayTone = isGregorianInput
    ? "border-teal-200/70 bg-teal-50/75 text-teal-800 dark:border-teal-700/60 dark:bg-teal-950/45 dark:text-teal-200"
    : "border-amber-200/70 bg-amber-50/75 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/45 dark:text-amber-200";

  return (
    <section className="mx-auto flex w-full max-w-5xl animate-rise flex-col px-2">
      {/* Header */}
      <div className="mb-3 flex-none text-center sm:mb-4">
        <h1 className="section-title text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
          Convert Between Calendars
        </h1>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          Gregorian and Ethiopian calendar conversion
        </p>
      </div>

      {/* Main Card */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-xl transition-all duration-500 sm:rounded-3xl dark:border-slate-700/50 dark:bg-slate-900">
        <div className="relative z-10 grid min-h-0 flex-1 gap-0 lg:grid-cols-2">
          {/* ─── Input Side ─── */}
          <div
            className={cn(
              "flex flex-col border-b p-5 transition-opacity duration-300 sm:p-7 lg:border-b-0 lg:border-r lg:p-10",
              isGregorianInput
                ? "border-teal-200/40 dark:border-teal-900/30"
                : "border-amber-200/40 dark:border-amber-900/30",
              isSwapping ? "opacity-0" : "opacity-100"
            )}
          >
            {/* Mode Switcher */}
            <div className="mb-5 flex-none rounded-2xl border border-slate-200/60 bg-slate-100/60 p-1.5 sm:mb-6 dark:border-slate-700/50 dark:bg-slate-800/50">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!isGregorianInput) switchMode();
                  }}
                  className={cn(
                    "relative flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300",
                    isGregorianInput
                      ? "bg-white text-teal-700 shadow-md dark:bg-slate-700 dark:text-teal-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                  )}
                >
                  <Globe2 className="h-4 w-4" />
                  Gregorian
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isGregorianInput) switchMode();
                  }}
                  className={cn(
                    "relative flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300",
                    !isGregorianInput
                      ? "bg-white text-amber-700 shadow-md dark:bg-slate-700 dark:text-amber-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  Ethiopian
                </button>
              </div>
            </div>

            <div
              className={cn(
                "mb-4 rounded-xl border p-3 sm:mb-5",
                isGregorianInput
                  ? "border-teal-200/60 bg-teal-50/60 dark:border-teal-800/40 dark:bg-teal-950/20"
                  : "border-amber-200/60 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20"
              )}
            >
              <div className="flex items-start gap-2">
                <Info
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    isGregorianInput
                      ? "text-teal-600 dark:text-teal-300"
                      : "text-amber-600 dark:text-amber-300"
                  )}
                />
                <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  Pick month, day, and year. The result updates instantly.
                </p>
              </div>
            </div>

            {/* Date Selects */}
            <div className="space-y-3 sm:space-y-4 lg:space-y-5">
              <FieldSelect
                label={isGregorianInput ? "Month" : "Month (ወር)"}
                value={input.month}
                options={isGregorianInput ? GREGORIAN_MONTHS : ETHIOPIAN_MONTHS}
                onChange={(value) => updateInput({ month: value })}
                accent={accent}
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldSelect
                  label="Day"
                  value={input.day}
                  options={validDayOptions}
                  onChange={(value) => updateInput({ day: value })}
                  accent={accent}
                />
                <FieldSelect
                  label="Year"
                  value={input.year}
                  options={
                    isGregorianInput
                      ? GREGORIAN_YEAR_OPTIONS
                      : ETHIOPIAN_YEAR_OPTIONS
                  }
                  onChange={(value) => updateInput({ year: value })}
                  accent={accent}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 grid flex-none grid-cols-1 gap-2 sm:mt-6 sm:grid-cols-3">
              <button
                type="button"
                onClick={setTodayForCurrentMode}
                className={cn(
                  "rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 hover:shadow-md active:scale-[0.98]",
                  isGregorianInput
                    ? "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/60"
                    : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={switchMode}
                className="group/swap flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition-all duration-200 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover/swap:rotate-180" />
                Swap
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition-all duration-200 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
              >
                <Copy className="h-3.5 w-3.5" />
                {shareState === "idle"
                  ? "Share"
                  : shareState === "copied"
                    ? "Copied"
                    : "Failed"}
              </button>
            </div>
          </div>

          {/* ─── Result Side ─── */}
          <div
            className={cn(
              "relative flex flex-1 flex-col justify-center overflow-hidden transition-opacity duration-300",
              resultSurface,
              isSwapping ? "opacity-0" : "opacity-100"
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full blur-3xl",
                isGregorianInput
                  ? "bg-teal-200/40 dark:bg-teal-500/10"
                  : "bg-amber-200/40 dark:bg-amber-500/10"
              )}
            />
            <div
              className={cn(
                "pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full blur-3xl",
                isGregorianInput
                  ? "bg-cyan-200/35 dark:bg-cyan-500/10"
                  : "bg-orange-200/35 dark:bg-orange-500/10"
              )}
            />
            <div className="p-5 sm:p-7 lg:p-10">
              {"error" in result ? (
                <div className="flex flex-col items-center justify-center py-8 text-center sm:py-16">
                  <Sparkles
                    className={cn("mb-3 h-7 w-7 sm:h-8 sm:w-8", resultToneNumber)}
                  />
                  <p className="text-sm font-semibold text-slate-800 sm:text-base lg:text-lg dark:text-slate-100">
                    {result.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Adjust the date selectors and try again.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Result Header */}
                  <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6 lg:mb-8">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                        resultTonePill
                      )}
                    >
                      <Sparkles className="h-3 w-3" />
                      {result.title}
                    </span>
                    <span className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", weekdayTone)}>
                      {result.weekday}
                    </span>
                  </div>

                  {/* Big Date Display */}
                  <div className="flex items-end gap-4 lg:gap-5">
                    <span
                      className={cn(
                        "text-7xl font-black leading-none tracking-tight sm:text-8xl lg:text-[9rem]",
                        resultToneNumber
                      )}
                    >
                      {result.day}
                    </span>
                    <div className="pb-2 lg:pb-4">
                      <p className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-slate-100">
                        {result.month}
                      </p>
                      <p className="text-lg font-semibold text-slate-600 sm:text-xl lg:text-2xl dark:text-slate-400">
                        {result.year}
                      </p>
                    </div>
                  </div>

                  {/* Amharic Month Info */}
                  {result.amharicMonth && (
                    <div
                      className={cn(
                        "mt-5 rounded-2xl border p-4 lg:mt-8",
                        resultToneCard
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Amharic
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-2xl font-bold tracking-tight lg:text-3xl",
                          resultToneNumber
                        )}
                      >
                        {result.amharicMonth}
                      </p>
                      {result.extra && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {result.extra}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Conversion Direction */}
                  <div className="mt-4 flex items-center gap-2 text-xs lg:mt-8">
                    <span className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 font-semibold text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/45 dark:text-slate-200">
                      {result.fromLabel}
                    </span>
                    <ArrowRightLeft className={cn("h-3.5 w-3.5 shrink-0", resultToneNumber)} />
                    <span className={cn("rounded-lg border px-3 py-2 font-semibold", resultTonePill)}>
                      {result.toLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
