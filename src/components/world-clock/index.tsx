"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, PhoneCall, RotateCcw } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { WORLD_CITIES, getCityTime } from "@/lib/world-clock";
import { cn } from "@/lib/utils";

export default function WorldClock() {
  const { language } = useLanguage();
  const isAmharic = language === "am";

  // Live real-time tick
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubAddisHour, setScrubAddisHour] = useState<number>(14);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isScrubbing) {
        setLiveNow(new Date());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isScrubbing]);

  // When scrubbing, adjust reference moment based on Addis Ababa target hour
  const referenceMoment = useMemo(() => {
    if (!isScrubbing) return liveNow;
    const date = new Date(liveNow);
    // Set to scrubAddisHour UTC+3
    const utcHour = (scrubAddisHour - 3 + 24) % 24;
    date.setUTCHours(utcHour, 0, 0, 0);
    return date;
  }, [isScrubbing, liveNow, scrubAddisHour]);

  // Compute time for all cities
  const cityTimes = useMemo(() => {
    return WORLD_CITIES.map((city) => getCityTime(city, referenceMoment));
  }, [referenceMoment]);

  const addisCityTime = cityTimes.find((c) => c.city.isHome) ?? cityTimes[0];

  return (
    <div className="w-full pb-10 pt-2">
      {/* Header */}
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {isAmharic ? "የዓለም ሰዓት እና ዳያስፖራ" : "World Clock & Diaspora"}
        </p>
        <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {isAmharic ? "የዓለም ሰዓት ከኢትዮጵያ አቆጣጠር ጋር" : "Dual-Reckoning World Clock"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
          {isAmharic
            ? "የኢትዮጵያን የ12 ሰዓት የቀን/የማታ አቆጣጠር ከዋና ዋና የዳያስፖራ ከተሞች ሰዓት ጋር ጎን ለጎን ያነጻጽሩ፤ ጥሪ ለማድረግም አመቺ ሰዓት ይምረጡ።"
            : "Compare the Ethiopian 12-hour day/night reckoning side-by-side with global diaspora cities. Plan meetings and phone calls across timezones."}
        </p>
      </header>

      {/* Meeting Planner Slider Card */}
      <section className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {isAmharic ? "የጥሪና የስብሰባ ሰዓት መምረጫ" : "Meeting & Calling Time Planner"}
            </h2>
          </div>
          {isScrubbing && (
            <button
              type="button"
              onClick={() => setIsScrubbing(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isAmharic ? "ወደ ቀጥታ ሰዓት መልስ" : "Reset to Live Time"}</span>
            </button>
          )}
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
            <span>
              {isAmharic ? "አዲስ አበባ ሰዓት" : "Addis Ababa Hour"}:{" "}
              <span className="text-teal-600 dark:text-teal-400 font-mono text-sm">
                {addisCityTime?.timeString12} ({isAmharic ? addisCityTime?.ethiopianPeriodAm : addisCityTime?.ethiopianPeriodEn} {addisCityTime?.ethiopianClock})
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              {isScrubbing ? (isAmharic ? "ቅድመ እይታ" : "Previewing") : (isAmharic ? "ቀጥታ" : "Live")}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={23}
            value={isScrubbing ? scrubAddisHour : addisCityTime?.localDate.getHours() ?? 12}
            onChange={(e) => {
              setIsScrubbing(true);
              setScrubAddisHour(Number(e.target.value));
            }}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:bg-slate-700"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>00:00</span>
            <span>06:00 (12:00 ቀ)</span>
            <span>12:00 (6:00 ቀ)</span>
            <span>18:00 (12:00 ማ)</span>
            <span>23:00</span>
          </div>
        </div>
      </section>

      {/* City Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cityTimes.map((info) => {
          const isHome = info.city.isHome;
          return (
            <div
              key={info.city.id}
              className={cn(
                "rounded-3xl border p-5 shadow-sm transition-all flex flex-col justify-between",
                isHome
                  ? "border-teal-500/80 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-white dark:to-slate-900 ring-2 ring-teal-500/20"
                  : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {isAmharic ? info.city.nameAm : info.city.nameEn}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {isAmharic ? info.city.countryAm : info.city.countryEn}
                    </p>
                  </div>
                  {isHome ? (
                    <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      {isAmharic ? "መነሻ" : "Home"}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                        info.offsetHoursFromAddis === 0
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : info.offsetHoursFromAddis > 0
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      )}
                    >
                      {info.offsetHoursFromAddis > 0 ? `+${info.offsetHoursFromAddis}h` : `${info.offsetHoursFromAddis}h`}
                    </span>
                  )}
                </div>

                {/* Main Clock Displays */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                      {info.timeString12}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {info.timeString24}
                    </span>
                  </div>

                  {/* Ethiopian 12-Hour Reckoning */}
                  <div className="mt-2.5 rounded-2xl bg-slate-50 p-3 border border-slate-100 dark:border-slate-800 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isAmharic ? "የኢትዮጵያ ሰዓት አቆጣጠር" : "Ethiopian 12-Hour Clock"}
                    </p>
                    <p className="mt-1 text-base font-bold text-teal-700 dark:text-teal-300">
                      <span className="text-xs opacity-80 mr-1.5 font-medium">
                        {isAmharic ? info.ethiopianPeriodAm : info.ethiopianPeriodEn}
                      </span>
                      <span className="font-mono text-lg font-black tabular-nums">
                        {info.ethiopianClock}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Calling Friendly Indicator */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>{isAmharic ? "ጥሪ ለማድረግ" : "Calling"}</span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    info.callStatus === "good"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : info.callStatus === "borderline"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {info.callStatus === "good"
                    ? isAmharic ? "አመቺ ሰዓት" : "Ideal Time"
                    : info.callStatus === "borderline"
                      ? isAmharic ? "ጠዋት / ማታ" : "Early / Late"
                      : isAmharic ? "የእንቅልፍ ሰዓት" : "Sleeping"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
