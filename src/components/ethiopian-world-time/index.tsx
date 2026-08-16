"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Globe2, MapPin } from "lucide-react";
import Kenat from "kenat";

import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";

type CityOption = {
  city: string;
  timezone: string;
  country: string;
};

const CITIES: CityOption[] = [
  { city: "Addis Ababa", timezone: "Africa/Addis_Ababa", country: "Ethiopia" },
  { city: "Nairobi", timezone: "Africa/Nairobi", country: "Kenya" },
  { city: "Dubai", timezone: "Asia/Dubai", country: "UAE" },
  { city: "London", timezone: "Europe/London", country: "UK" },
  { city: "New York", timezone: "America/New_York", country: "USA" },
  { city: "Los Angeles", timezone: "America/Los_Angeles", country: "USA" },
  { city: "Tokyo", timezone: "Asia/Tokyo", country: "Japan" },
  { city: "Sydney", timezone: "Australia/Sydney", country: "Australia" },
];

const ETHIOPIAN_CLOCK_SHIFT_MS = 6 * 60 * 60 * 1000;

function getDateForTimeZone(timezone: string, source: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(source);
  const part = (type: string) =>
    Number.parseInt(parts.find((entry) => entry.type === type)?.value ?? "0", 10);

  return new Date(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
    0
  );
}

export default function EthiopianWorldTime() {
  const [city, setCity] = useState(CITIES[0]);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const cityDate = useMemo(() => getDateForTimeZone(city.timezone, new Date(tick)), [
    city.timezone,
    tick,
  ]);

  const ethiopianDateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        calendar: "ethiopic",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
        .format(cityDate)
        .replace(/\s*ERA\s*\d+\b/gi, "")
        .trim();
    } catch {
      const converted = new Kenat(cityDate).getEthiopian();
      const weekday = cityDate.toLocaleDateString(undefined, { weekday: "long" });
      const month = ETHIOPIAN_MONTHS[converted.month - 1];
      return `${weekday}, ${month?.label ?? converted.month} ${converted.day}, ${converted.year}`;
    }
  }, [cityDate]);

  const ethiopianClock = useMemo(() => {
    const shifted = new Date(cityDate.getTime() - ETHIOPIAN_CLOCK_SHIFT_MS);
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(shifted);
  }, [cityDate]);

  const gregorianCityTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        timeZone: city.timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(new Date(tick)),
    [city.timezone, tick]
  );

  return (
    <section className="animate-rise space-y-4 pb-8">
      <header className="glass-surface rounded-[1.8rem] p-6 sm:p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-300">
          <Globe2 className="h-3.5 w-3.5" />
          Time zone aware Ethiopian now
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Ethiopian Now for Any City
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Live Ethiopian date + 12-hour Ethiopian clock using the selected city&apos;s
          time zone, with the standard 6-hour Ethiopian clock shift.
        </p>
      </header>

      <div className="glass-surface rounded-[1.6rem] p-5 sm:p-6">
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          City / Timezone
        </label>
        <select
          value={city.timezone}
          onChange={(event) => {
            const next = CITIES.find((item) => item.timezone === event.target.value);
            if (next) setCity(next);
          }}
          className="h-12 w-full rounded-xl border border-slate-200/80 bg-white/90 px-3.5 text-sm font-semibold outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
        >
          {CITIES.map((item) => (
            <option key={item.timezone} value={item.timezone}>
              {item.city}, {item.country} ({item.timezone})
            </option>
          ))}
        </select>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
              Ethiopian now
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-cyan-900 dark:text-cyan-100">
              {ethiopianDateLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50/80 p-4 dark:border-teal-900/40 dark:bg-teal-950/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">
              Ethiopian clock
            </p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight text-teal-900 dark:text-teal-100">
              <Clock3 className="h-5 w-5" />
              {ethiopianClock}
            </p>
            <p className="mt-1 text-[11px] text-teal-700/80 dark:text-teal-300/80">12-hour format, 6-hour shift</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              City local time
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
              {gregorianCityTime}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              {city.city}, {city.country}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
