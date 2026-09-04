"use client";

import { useMemo, useState } from "react";
import { Briefcase, CalendarCheck2, ReceiptText } from "lucide-react";
import Kenat from "kenat";
import { useLanguage } from "@/components/providers/language-provider";
import {
  calculateWorkingDays,
  addWorkingDays,
  ETHIOPIAN_TAX_DEADLINES,
} from "@/lib/business-days";
import { ETHIOPIAN_MONTHS, getCurrentEthiopianYear } from "@/lib/calendar-data";
import { cn } from "@/lib/utils";

export default function BusinessDaysCalculator() {
  const { language } = useLanguage();
  const isAmharic = language === "am";

  const currentYear = getCurrentEthiopianYear();

  const [activeTab, setActiveTab] = useState<"between" | "add" | "tax">("between");
  const [includeSaturdays, setIncludeSaturdays] = useState<boolean>(false);

  const [startMonth, setStartMonth] = useState<number>(1);
  const [startDay, setStartDay] = useState<number>(1);
  const [startYear, setStartYear] = useState<number>(currentYear);

  const [endMonth, setEndMonth] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(30);
  const [endYear, setEndYear] = useState<number>(currentYear);

  const [daysToAdd, setDaysToAdd] = useState<number>(30);

  const startDate = useMemo(() => {
    try {
      const g = new Kenat({ year: startYear, month: startMonth, day: startDay }).getGregorian();
      return new Date(g.year, g.month - 1, g.day);
    } catch {
      return new Date();
    }
  }, [startYear, startMonth, startDay]);

  const endDate = useMemo(() => {
    try {
      const g = new Kenat({ year: endYear, month: endMonth, day: endDay }).getGregorian();
      return new Date(g.year, g.month - 1, g.day);
    } catch {
      return new Date();
    }
  }, [endYear, endMonth, endDay]);

  const countResult = useMemo(() => {
    return calculateWorkingDays(startDate, endDate, includeSaturdays);
  }, [startDate, endDate, includeSaturdays]);

  const targetDateResult = useMemo(() => {
    const targetGreg = addWorkingDays(startDate, daysToAdd, includeSaturdays);
    const targetEth = new Kenat(targetGreg).getEthiopian();
    const month = ETHIOPIAN_MONTHS[targetEth.month - 1];
    return {
      gregorian: targetGreg,
      ethiopian: targetEth,
      monthLabel: isAmharic ? month?.amharic : month?.label,
    };
  }, [startDate, daysToAdd, includeSaturdays, isAmharic]);

  return (
    <div className="w-full pb-10 pt-2">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {isAmharic ? "የሥራ ቀናት እና ግብር" : "Business Days & Tax"}
        </p>
        <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {isAmharic ? "የኢትዮጵያ የሥራ ቀናት ማስሊያ" : "Ethiopian Working Days Calculator"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
          {isAmharic
            ? "በሁለት ቀናት መካከል ያሉትን የሥራ ቀናት በዓላትንና ቅዳሜ/እሁድን በማስላት ይወቁ፤ የግብርና የውል ቀነ-ገደቦችንም ያቅዱ።"
            : "Calculate exact working days between dates excluding Ethiopian national holidays and weekends. Plan contracts, tenders, and tax deadlines."}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/60 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab("between")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold transition-all",
            activeTab === "between"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Briefcase className="h-4 w-4" />
          <span>{isAmharic ? "የቀናት ልዩነት" : "Count Days"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("add")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold transition-all",
            activeTab === "add"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <CalendarCheck2 className="h-4 w-4" />
          <span>{isAmharic ? "የሥራ ቀን ጨምር" : "Add Days"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tax")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold transition-all",
            activeTab === "tax"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <ReceiptText className="h-4 w-4" />
          <span>{isAmharic ? "የግብር ቀናት" : "Tax Calendar"}</span>
        </button>
      </div>

      {activeTab === "between" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAmharic ? "የመጀመሪያ ቀን (ኢትዮጵያ)" : "Start Date (Ethiopian)"}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {ETHIOPIAN_MONTHS.map((m, i) => (
                    <option key={m.label} value={i + 1}>
                      {isAmharic ? m.amharic : m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={startDay}
                  onChange={(e) => setStartDay(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {Array.from({ length: startMonth === 13 ? 6 : 30 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 font-mono text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {startDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAmharic ? "የማብቂያ ቀን (ኢትዮጵያ)" : "End Date (Ethiopian)"}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {ETHIOPIAN_MONTHS.map((m, i) => (
                    <option key={m.label} value={i + 1}>
                      {isAmharic ? m.amharic : m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={endDay}
                  onChange={(e) => setEndDay(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {Array.from({ length: endMonth === 13 ? 6 : 30 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={endYear}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 font-mono text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {endDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSaturdays}
                  onChange={(e) => setIncludeSaturdays(e.target.checked)}
                  className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isAmharic ? "ቅዳሜን እንደ ሥራ ቀን ቁጠር (የግል ድርጅቶች)" : "Count Saturdays as workdays (6-day work week)"}
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAmharic ? "የውጤት ማጠቃለያ" : "Calculation Breakdown"}
            </p>

            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 border border-emerald-200/60 dark:border-emerald-500/20">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                {isAmharic ? "ትክክለኛ የሥራ ቀናት" : "Net Working Days"}
              </p>
              <p className="mt-2 text-5xl font-black text-slate-900 dark:text-white tabular-nums">
                {countResult.workingDays}
                <span className="text-lg font-bold ml-2 text-slate-500 dark:text-slate-400">
                  {isAmharic ? "ቀናት" : "days"}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 p-3 text-center dark:border-slate-800">
                <span className="block text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {countResult.totalDays}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {isAmharic ? "ጠቅላላ ቀናት" : "Total Days"}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-center dark:border-slate-800">
                <span className="block text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {countResult.weekendDays}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {isAmharic ? "የዕረፍት ቀናት" : "Weekends"}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-center dark:border-slate-800">
                <span className="block text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {countResult.holidayDays}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {isAmharic ? "የሕዝብ በዓላት" : "Holidays"}
                </span>
              </div>
            </div>

            {countResult.holidaysEncountered.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isAmharic ? "በጊዜው ውስጥ ያሉ የሕዝብ በዓላት" : "Public Holidays Encountered"}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {countResult.holidaysEncountered.map((h, i) => (
                    <li key={i} className="flex items-center justify-between text-xs font-semibold py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <span className="text-slate-900 dark:text-white">
                        {isAmharic ? h.amharic : h.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {h.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "add" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAmharic ? "መነሻ ቀን (ኢትዮጵያ)" : "Starting Date (Ethiopian)"}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {ETHIOPIAN_MONTHS.map((m, i) => (
                    <option key={m.label} value={i + 1}>
                      {isAmharic ? m.amharic : m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={startDay}
                  onChange={(e) => setStartDay(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {Array.from({ length: startMonth === 13 ? 6 : 30 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-2 font-mono text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="days-to-add-input" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAmharic ? "የሚጨመሩ የሥራ ቀናት ብዛት" : "Number of Business Days to Add"}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="days-to-add-input"
                  type="number"
                  value={daysToAdd}
                  onChange={(e) => setDaysToAdd(Number(e.target.value))}
                  className="h-12 w-36 rounded-xl border-2 border-slate-200 bg-white px-3 font-mono text-lg font-bold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[7, 15, 30, 60, 90].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDaysToAdd(preset)}
                      className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      +{preset}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSaturdays}
                  onChange={(e) => setIncludeSaturdays(e.target.checked)}
                  className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isAmharic ? "ቅዳሜን እንደ ሥራ ቀን ቁጠር" : "Count Saturdays as workdays"}
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAmharic ? "የሚደርስበት ቀን" : "Calculated Target Date"}
            </p>

            <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent p-6 border border-teal-200/60 dark:border-teal-500/20">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                {isAmharic ? "የኢትዮጵያ ቀን" : "Ethiopian Calendar Date"}
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {targetDateResult.monthLabel} {targetDateResult.ethiopian.day}, {targetDateResult.ethiopian.year} {isAmharic ? "ዓ.ም" : "E.C."}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                {targetDateResult.gregorian.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAmharic
                ? "ከመነሻው ቀን ጀምሮ ቅዳሜ፣ እሁድ እና የሕዝብ በዓላት ተዘለው " + daysToAdd + " የሥራ ቀናት ሲቆጠሩ የሚደርሰው ቀን ነው።"
                : "This date skips all intervening weekends and official Ethiopian public holidays to give the exact deadline after " + daysToAdd + " business days."}
            </p>
          </section>
        </div>
      )}

      {activeTab === "tax" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {ETHIOPIAN_TAX_DEADLINES.map((tax) => (
              <div
                key={tax.titleEn}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                      {isAmharic ? tax.titleAm : tax.titleEn}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-black text-slate-900 dark:text-white">
                    {isAmharic ? tax.periodAm : tax.periodEn}
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isAmharic ? tax.descriptionAm : tax.descriptionEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
