"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, CalendarRange, Minus } from "lucide-react";
import Kenat from "kenat";

import { DateInputFields } from "@/components/shared/date-input-fields";
import {
  getTodayPlannerDate,
  plannerDateToGregorian,
  type PlannerDateInput,
} from "@/lib/planner";
import { cn } from "@/lib/utils";

type DateSlot = {
  label: string;
  accent: "teal" | "amber";
  value: PlannerDateInput;
  setValue: (next: PlannerDateInput) => void;
};

type DifferenceResult =
  | { error: string }
  | {
      error: null;
      firstGregorian: Date;
      secondGregorian: Date;
      firstEth: { year: number; month: number; day: number };
      secondEth: { year: number; month: number; day: number };
      absDays: number;
      absWeeks: number;
      direction: "same" | "future" | "past";
    };

const formatGregorian = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function DatePanel({ label, accent, value, setValue }: DateSlot) {
  return (
    <div
      className={cn(
        "h-full rounded-2xl border p-4 sm:p-5",
        accent === "teal"
          ? "border-teal-200/70 bg-teal-50/40 dark:border-teal-900/50 dark:bg-teal-950/20"
          : "border-amber-200/70 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
      )}
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(["gregorian", "ethiopian"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() =>
              setValue({
                ...value,
                calendar: item,
              })
            }
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-bold transition-all",
              value.calendar === item
                ? "border-white/60 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                : "border-transparent bg-white/55 text-slate-500 hover:bg-white/75 dark:bg-slate-900/45 dark:text-slate-400"
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <DateInputFields
        calendar={value.calendar}
        day={value.day}
        month={value.month}
        year={value.year}
        onChange={(patch) => setValue({ ...value, ...patch })}
        size="compact"
      />
    </div>
  );
}

export default function DateDifference() {
  const [firstDate, setFirstDate] = useState<PlannerDateInput>(() => ({
    ...getTodayPlannerDate("gregorian"),
    time: "00:00",
  }));
  const [secondDate, setSecondDate] = useState<PlannerDateInput>(() => ({
    ...getTodayPlannerDate("ethiopian"),
    time: "00:00",
  }));

  const result = useMemo<DifferenceResult>(() => {
    try {
      const firstGregorian = plannerDateToGregorian(firstDate);
      const secondGregorian = plannerDateToGregorian(secondDate);
      const deltaMs = secondGregorian.getTime() - firstGregorian.getTime();
      const absDays = Math.abs(Math.round(deltaMs / (24 * 60 * 60 * 1000)));
      const absWeeks = absDays / 7;
      const direction = deltaMs === 0 ? "same" : deltaMs > 0 ? "future" : "past";

      const firstEth = new Kenat(firstGregorian).getEthiopian();
      const secondEth = new Kenat(secondGregorian).getEthiopian();

      return {
        error: null,
        firstGregorian,
        secondGregorian,
        firstEth,
        secondEth,
        absDays,
        absWeeks,
        direction,
      };
    } catch {
      return { error: "Please choose valid dates." };
    }
  }, [firstDate, secondDate]);

  return (
    <section className="animate-rise space-y-4 pb-8">
      <header className="glass-surface rounded-[1.8rem] p-6 sm:p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700 dark:border-cyan-900/45 dark:bg-cyan-950/25 dark:text-cyan-300">
          <CalendarRange className="h-3.5 w-3.5" />
          Days + weeks in both systems
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Date Difference Calculator
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Pick any two dates in Ethiopian or Gregorian calendar and instantly see
          the difference in days and weeks, with cross-converted outputs.
        </p>
      </header>

      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <DatePanel
          label="Date A"
          accent="teal"
          value={firstDate}
          setValue={setFirstDate}
        />

        <div className="flex items-center justify-center lg:flex-col lg:justify-center">
          <div className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
        </div>

        <DatePanel
          label="Date B"
          accent="amber"
          value={secondDate}
          setValue={setSecondDate}
        />
      </div>

      <div className="glass-surface rounded-[1.6rem] p-5 sm:p-6">
        {result.error !== null ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">
            {result.error}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-teal-100 bg-teal-50/80 px-3 py-3 text-center dark:border-teal-900/50 dark:bg-teal-950/20">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">Total days</p>
                <p className="mt-1 text-3xl font-black text-teal-800 dark:text-teal-100">{result.absDays}</p>
              </div>
              <div className="rounded-xl border border-cyan-100 bg-cyan-50/80 px-3 py-3 text-center dark:border-cyan-900/50 dark:bg-cyan-950/20">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">Total weeks</p>
                <p className="mt-1 text-3xl font-black text-cyan-800 dark:text-cyan-100">{result.absWeeks.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Direction</p>
                <p className="mt-1 text-3xl font-black text-slate-800 dark:text-slate-100">
                  {result.direction === "same" ? "0" : result.direction === "future" ? "+" : "-"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="mb-2 font-bold text-slate-900 dark:text-white">Date A conversions</p>
                <p className="text-slate-600 dark:text-slate-300">Gregorian: {formatGregorian(result.firstGregorian)}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Ethiopian: {result.firstEth.day}/{result.firstEth.month}/{result.firstEth.year}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="mb-2 font-bold text-slate-900 dark:text-white">Date B conversions</p>
                <p className="text-slate-600 dark:text-slate-300">Gregorian: {formatGregorian(result.secondGregorian)}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Ethiopian: {result.secondEth.day}/{result.secondEth.month}/{result.secondEth.year}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/65 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-400">
              <Minus className="mr-1 inline h-3 w-3" />
              Difference is calculated as Date B minus Date A in Gregorian day units.
            </div>
          </>
        )}
      </div>
    </section>
  );
}
