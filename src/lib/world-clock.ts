/**
 * World clock utility with dual Ethiopian & Gregorian time reckonings.
 */

import { ethiopianTimeAt, formatEthiopianClock } from "./ethiopian-clock.ts";

export type WorldCity = {
  id: string;
  nameEn: string;
  nameAm: string;
  countryEn: string;
  countryAm: string;
  timeZone: string;
  isHome?: boolean;
};

export const WORLD_CITIES: WorldCity[] = [
  {
    id: "addis",
    nameEn: "Addis Ababa",
    nameAm: "አዲስ አበባ",
    countryEn: "Ethiopia",
    countryAm: "ኢትዮጵያ",
    timeZone: "Africa/Addis_Ababa",
    isHome: true,
  },
  {
    id: "dc",
    nameEn: "Washington, D.C.",
    nameAm: "ዋሽንግተን ዲሲ",
    countryEn: "United States",
    countryAm: "አሜሪካ",
    timeZone: "America/New_York",
  },
  {
    id: "minneapolis",
    nameEn: "Minneapolis",
    nameAm: "ሚኒያፖሊስ",
    countryEn: "United States",
    countryAm: "አሜሪካ",
    timeZone: "America/Chicago",
  },
  {
    id: "london",
    nameEn: "London",
    nameAm: "ለንደን",
    countryEn: "United Kingdom",
    countryAm: "እንግሊዝ",
    timeZone: "Europe/London",
  },
  {
    id: "frankfurt",
    nameEn: "Frankfurt",
    nameAm: "ፍራንክፈርት",
    countryEn: "Germany",
    countryAm: "ጀርመን",
    timeZone: "Europe/Berlin",
  },
  {
    id: "dubai",
    nameEn: "Dubai",
    nameAm: "ዱባይ",
    countryEn: "United Arab Emirates",
    countryAm: "የተባበሩት አረብ ኤምሬቶች",
    timeZone: "Asia/Dubai",
  },
  {
    id: "riyadh",
    nameEn: "Riyadh",
    nameAm: "ሪያድ",
    countryEn: "Saudi Arabia",
    countryAm: "ሳውዲ አረቢያ",
    timeZone: "Asia/Riyadh",
  },
  {
    id: "toronto",
    nameEn: "Toronto",
    nameAm: "ቶሮንቶ",
    countryEn: "Canada",
    countryAm: "ካናዳ",
    timeZone: "America/Toronto",
  },
  {
    id: "melbourne",
    nameEn: "Melbourne",
    nameAm: "ሜልበርን",
    countryEn: "Australia",
    countryAm: "አውስትራሊያ",
    timeZone: "Australia/Melbourne",
  },
];

export type CityTimeInfo = {
  city: WorldCity;
  localDate: Date;
  timeString24: string;
  timeString12: string;
  ethiopianClock: string;
  ethiopianPeriodAm: string;
  ethiopianPeriodEn: string;
  offsetHoursFromAddis: number;
  callStatus: "good" | "borderline" | "night";
};

/** Formats a date into parts for a specific IANA timeZone */
export function getTimeInZone(reference: Date, timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(reference);
  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = Number.parseInt(p.value, 10);
    }
  }

  return new Date(
    partMap.year,
    partMap.month - 1,
    partMap.day,
    partMap.hour === 24 ? 0 : partMap.hour,
    partMap.minute,
    partMap.second
  );
}

/** Computes city time details relative to a reference moment */
export function getCityTime(city: WorldCity, reference: Date): CityTimeInfo {
  const localDate = getTimeInZone(reference, city.timeZone);
  const addisDate = getTimeInZone(reference, "Africa/Addis_Ababa");

  const diffMs = localDate.getTime() - addisDate.getTime();
  const offsetHoursFromAddis = Math.round(diffMs / (60 * 60 * 1000));

  // Compute Ethiopian 12-hour clock for local time
  const ethTime = ethiopianTimeAt(localDate);
  const ethiopianClock = formatEthiopianClock(ethTime);

  // Call status: based on local hour
  const hour = localDate.getHours();
  let callStatus: "good" | "borderline" | "night" = "night";
  if (hour >= 9 && hour < 20) {
    callStatus = "good";
  } else if ((hour >= 7 && hour < 9) || (hour >= 20 && hour < 22)) {
    callStatus = "borderline";
  }

  const hoursStr = String(localDate.getHours()).padStart(2, "0");
  const minutesStr = String(localDate.getMinutes()).padStart(2, "0");
  const timeString24 = `${hoursStr}:${minutesStr}`;

  const timeString12 = localDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    city,
    localDate,
    timeString24,
    timeString12,
    ethiopianClock,
    ethiopianPeriodAm: ethTime.period.amharic,
    ethiopianPeriodEn: ethTime.period.english,
    offsetHoursFromAddis,
    callStatus,
  };
}
