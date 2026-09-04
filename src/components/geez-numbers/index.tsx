"use client";

import { useMemo, useState } from "react";
import { Check, Copy, RotateCcw, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import {
  arabicToGeez,
  geezToArabic,
  formatEthiopianDateGeez,
  GEEZ_NUMERALS_TABLE,
} from "@/lib/geez-numbers";
import { ETHIOPIAN_MONTHS, getCurrentEthiopianYear } from "@/lib/calendar-data";
import { cn } from "@/lib/utils";

export default function GeezNumbers() {
  const { language } = useLanguage();
  const isAmharic = language === "am";

  // Tab: number or date
  const [mode, setMode] = useState<"number" | "date">("number");

  // Number converter state
  const [numberInput, setNumberInput] = useState<string>("2017");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Date converter state
  const currentYear = getCurrentEthiopianYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Computed results
  const parsedNumber = Number.parseInt(numberInput, 10);
  const geezResult = useMemo(() => {
    if (!numberInput.trim() || Number.isNaN(parsedNumber) || parsedNumber <= 0) {
      // Check if user entered Ge'ez text directly
      const fromGeez = geezToArabic(numberInput);
      if (fromGeez !== null) {
        return {
          geez: numberInput.trim(),
          arabic: fromGeez,
          direction: "fromGeez" as const,
        };
      }
      return null;
    }
    return {
      geez: arabicToGeez(parsedNumber),
      arabic: parsedNumber,
      direction: "fromArabic" as const,
    };
  }, [numberInput, parsedNumber]);

  const monthData = ETHIOPIAN_MONTHS[selectedMonth - 1];
  const formattedDateGeez = useMemo(() => {
    const monthName = isAmharic ? monthData?.amharic : monthData?.label;
    return formatEthiopianDateGeez(monthName ?? "", selectedDay, selectedYear);
  }, [isAmharic, monthData, selectedDay, selectedYear]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="w-full pb-10 pt-2">
      {/* Header */}
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {isAmharic ? "የግዕዝ ቁጥሮች" : "Ge'ez Numerals"}
        </p>
        <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {isAmharic ? "የግዕዝ ቁጥር መለወጫ" : "Ethiopic Numeral Converter"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
          {isAmharic
            ? "ቁጥሮችን እና ቀናትን ወደ ጥንታዊው የግዕዝ ቁጥር አጻጻፍ ይቀይሩ፤ ዝርዝር የቁጥሮች ሰንጠረዥንም ይመልከቱ።"
            : "Convert numbers and dates to traditional Ge'ez numerals, or convert Ge'ez back to Arabic digits with manuscript typography."}
        </p>
      </header>

      {/* Mode Switcher */}
      <div className="mb-6 flex gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/60 max-w-sm">
        <button
          type="button"
          onClick={() => setMode("number")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-sm font-bold transition-all",
            mode === "number"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Hash className="h-4 w-4" />
          <span>{isAmharic ? "ቁጥሮች" : "Numbers"}</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("date")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-sm font-bold transition-all",
            mode === "date"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Calendar className="h-4 w-4" />
          <span>{isAmharic ? "ቀን ወደ ግዕዝ" : "Date to Ge'ez"}</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        {/* Main interactive tool card */}
        <section className="space-y-4">
          {mode === "number" ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <label htmlFor="geez-number-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAmharic ? "ቁጥር ያስገቡ (በአረብኛ ወይም በግዕዝ)" : "Enter number (Arabic or Ge'ez)"}
              </label>

              <div className="mt-2 flex gap-2">
                <input
                  id="geez-number-input"
                  type="text"
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  placeholder="e.g. 2017 or ፳፻፲፯"
                  className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 font-mono text-xl font-black text-slate-900 outline-none transition-colors focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                {numberInput && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNumberInput("")}
                    className="h-14 rounded-2xl px-4 border-slate-200 dark:border-slate-700"
                    title={isAmharic ? "አጽዳ" : "Clear"}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Result Preview Box */}
              {geezResult ? (
                <div className="mt-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 border border-amber-200/60 dark:border-amber-500/20">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                    {geezResult.direction === "fromArabic" ? (isAmharic ? "የግዕዝ ቁጥር" : "Ge'ez Numeral") : (isAmharic ? "የአረብኛ ቁጥር" : "Arabic Number")}
                  </p>
                  <p className="mt-3 text-4xl sm:text-5xl font-black tracking-wider text-slate-900 dark:text-white break-words">
                    {geezResult.direction === "fromArabic" ? geezResult.geez : geezResult.arabic.toLocaleString()}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-amber-200/40 dark:border-amber-500/20">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {geezResult.direction === "fromArabic"
                        ? `${isAmharic ? "ዋጋ" : "Value"}: ${geezResult.arabic.toLocaleString()}`
                        : `Ge'ez: ${geezResult.geez}`}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleCopy(geezResult.direction === "fromArabic" ? geezResult.geez : String(geezResult.arabic), "main")}
                      className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {copiedKey === "main" ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                      {copiedKey === "main" ? (isAmharic ? "ተቀድቷል" : "Copied") : (isAmharic ? "ቅዳ" : "Copy")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {isAmharic ? "ለመቀየር ማንኛውንም ቁጥር ያስገቡ (ለምሳሌ 1, 25, 2017)" : "Enter any positive number to see its Ge'ez numeral"}
                  </p>
                </div>
              )}

              {/* Quick Preset Chips */}
              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isAmharic ? "የተለመዱ ዓመታትና ቁጥሮች" : "Common numbers & years"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 7, 12, 21, 100, 1991, 2016, 2017, 10000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumberInput(String(num))}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-amber-400 hover:bg-amber-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-amber-500"
                    >
                      {num} ({arabicToGeez(num)})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAmharic ? "የኢትዮጵያ ቀን ይምረጡ" : "Select Ethiopian Date"}
              </h2>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {/* Month Picker */}
                <div>
                  <label htmlFor="geez-month-select" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {isAmharic ? "ወር" : "Month"}
                  </label>
                  <select
                    id="geez-month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="mt-1 h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {ETHIOPIAN_MONTHS.map((m, i) => (
                      <option key={m.label} value={i + 1}>
                        {isAmharic ? m.amharic : m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Day Picker */}
                <div>
                  <label htmlFor="geez-day-select" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {isAmharic ? "ቀን" : "Day"}
                  </label>
                  <select
                    id="geez-day-select"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    className="mt-1 h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {Array.from({ length: selectedMonth === 13 ? 6 : 30 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d} ({arabicToGeez(d)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Picker */}
                <div>
                  <label htmlFor="geez-year-input" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {isAmharic ? "ዓመት" : "Year"}
                  </label>
                  <input
                    id="geez-year-input"
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="mt-1 h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 font-mono text-sm font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Manuscript Date Result */}
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-500/20 dark:bg-amber-950/20">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  {isAmharic ? "የቀን አጻጻፍ በግዕዝ" : "Formal Ge'ez Date"}
                </p>
                <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {formattedDateGeez}
                </p>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleCopy(formattedDateGeez, "date")}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {copiedKey === "date" ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                    {copiedKey === "date" ? (isAmharic ? "ተቀድቷል" : "Copied") : (isAmharic ? "ቅዳ" : "Copy")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Reference Chart Sidebar */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isAmharic ? "የግዕዝ ቁጥሮች ሰንጠረዥ" : "Ge'ez Numerals Chart"}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isAmharic ? "ጠቅ በማድረግ ወደ መጻፊያው ያስገቡ" : "Tap any numeral to insert into converter"}
          </p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[460px] overflow-y-auto scrollbar-slim pr-1">
            {GEEZ_NUMERALS_TABLE.map((item) => (
              <button
                key={item.arabic}
                type="button"
                onClick={() => setNumberInput(String(item.arabic))}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-center transition-all hover:border-amber-400 hover:bg-amber-50 active:scale-95 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-amber-500"
              >
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {item.geez}
                </span>
                <span className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {item.arabic.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">
                  {isAmharic ? item.nameAmharic : item.nameEnglish}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
