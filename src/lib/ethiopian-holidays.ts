import Kenat from "kenat";

import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";

export type HolidayCalendarType = "ethiopian" | "gregorian" | "islamic";

/** Who keeps the day: the state, a church, a mosque, or a community. */
export type HolidayTradition = "national" | "christian" | "muslim" | "cultural";

export type EthiopianHoliday = {
  id: string;
  name: string;
  amharic: string;
  calendar: HolidayCalendarType;
  tradition: HolidayTradition;
  month: number;
  day: number;
  description: string;
  history: string;
};

export type HolidayOccurrence = {
  holiday: EthiopianHoliday;
  gregorianDate: Date;
  ethiopian: {
    year: number;
    month: number;
    day: number;
    monthLabel: string;
    monthAmharic: string;
  };
  islamic: {
    year: number;
    month: number;
    day: number;
    monthLabel: string;
  };
};

type IslamicDateParts = {
  year: number;
  month: number;
  day: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ISLAMIC_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
];

const islamicFormatter = (() => {
  const options: Intl.DateTimeFormatOptions = {
    calendar: "islamic-umalqura",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  };

  try {
    return new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", options);
  } catch {
    return new Intl.DateTimeFormat("en-US-u-ca-islamic", options);
  }
})();

export const ETHIOPIAN_PUBLIC_HOLIDAYS: EthiopianHoliday[] = [
  {
    id: "enkutatash",
    name: "Enkutatash",
    amharic: "እንቁጣጣሽ",
    calendar: "ethiopian",
    tradition: "cultural",
    month: 1,
    day: 1,
    description: "Ethiopian New Year celebration.",
    history:
      "Enkutatash marks the first day of Meskerem and symbolizes renewal after the rainy season.",
  },
  {
    id: "meskel",
    name: "Meskel",
    amharic: "መስቀል",
    calendar: "ethiopian",
    tradition: "christian",
    month: 1,
    day: 17,
    description: "Finding of the True Cross festival.",
    history:
      "Meskel commemorates the discovery of the True Cross by Saint Helena and is celebrated with Demera bonfires.",
  },
  {
    id: "genna",
    name: "Genna",
    amharic: "ገና",
    calendar: "ethiopian",
    tradition: "christian",
    month: 4,
    day: 29,
    description: "Ethiopian Christmas.",
    history:
      "Genna commemorates the birth of Jesus Christ in the Ethiopian Orthodox tradition.",
  },
  {
    id: "timket",
    name: "Timket",
    amharic: "ጥምቀት",
    calendar: "ethiopian",
    tradition: "christian",
    month: 5,
    day: 11,
    description: "Epiphany celebration and blessing of water.",
    history:
      "Timket reenacts the baptism of Christ and is known for colorful processions and tabot ceremonies.",
  },
  {
    id: "adwa",
    name: "Adwa Victory Day",
    amharic: "የአድዋ ድል በዓል",
    calendar: "ethiopian",
    tradition: "national",
    month: 6,
    day: 23,
    description: "Commemoration of the Battle of Adwa victory.",
    history:
      "Celebrates Ethiopia's 1896 victory against Italian colonial forces, a major anti-colonial milestone.",
  },
  {
    id: "patriots",
    name: "Patriots' Victory Day",
    amharic: "የአርበኞች ቀን",
    calendar: "ethiopian",
    tradition: "national",
    month: 8,
    day: 27,
    description: "Victory over fascist occupation in 1941.",
    history:
      "Honors the resistance fighters who helped end the Italian occupation during World War II.",
  },
  {
    id: "labour",
    name: "International Labour Day",
    amharic: "የሰራተኞች ቀን",
    calendar: "gregorian",
    tradition: "national",
    month: 5,
    day: 1,
    description: "Global labor rights and workers day.",
    history:
      "Recognized internationally, this day highlights workers' rights and social justice movements.",
  },
  {
    id: "irreecha",
    name: "Irreecha",
    amharic: "ኢሬቻ",
    calendar: "gregorian",
    tradition: "cultural",
    month: 10,
    day: 6,
    description: "Thanksgiving festival celebrated by Oromo communities.",
    history:
      "Irreecha is a thanksgiving and renewal celebration connected to nature and community gathering.",
  },
  {
    id: "eid-al-fitr",
    name: "Eid al-Fitr",
    amharic: "ኢድ አልፊጥር",
    calendar: "islamic",
    tradition: "muslim",
    month: 10,
    day: 1,
    description: "Festival marking the end of Ramadan fasting.",
    history:
      "Eid al-Fitr is a major Islamic holiday celebrated with prayers, charity, and family gatherings.",
  },
  {
    id: "eid-al-adha",
    name: "Eid al-Adha",
    amharic: "ኢድ አልአድሃ",
    calendar: "islamic",
    tradition: "muslim",
    month: 12,
    day: 10,
    description: "Festival of Sacrifice during Hajj season.",
    history:
      "Eid al-Adha commemorates Prophet Ibrahim's devotion and is observed with communal prayers and charity.",
  },
  {
    id: "mawlid",
    name: "Mawlid al-Nabi",
    amharic: "መውሊድ አል-ነቢ",
    calendar: "islamic",
    tradition: "muslim",
    month: 3,
    day: 12,
    description: "Commemoration of the birth of Prophet Muhammad.",
    history:
      "Mawlid is observed in many Muslim communities through prayers, recitation, and community events.",
  },
];

function toDate(input: { year: number; month: number; day: number }) {
  return new Date(input.year, input.month - 1, input.day, 9, 0, 0, 0);
}

function getIslamicDateParts(date: Date): IslamicDateParts {
  const parts = islamicFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(
      parts.find((part) => part.type === type)?.value ?? "0",
      10
    );

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

function resolveEthiopianHolidayDate(
  holiday: EthiopianHoliday,
  gregorianYear: number
): Date {
  const candidates: Date[] = [];

  for (let ethiopianYear = gregorianYear - 9; ethiopianYear <= gregorianYear - 5; ethiopianYear += 1) {
    try {
      const converted = new Kenat({
        year: ethiopianYear,
        month: holiday.month,
        day: holiday.day,
      }).getGregorian();
      const date = toDate(converted);
      candidates.push(date);
    } catch {
      // Ignore impossible dates.
    }
  }

  const sameYear = candidates.find((candidate) => candidate.getFullYear() === gregorianYear);
  if (sameYear) {
    return sameYear;
  }

  return candidates.sort(
    (a, b) =>
      Math.abs(a.getTime() - new Date(gregorianYear, 6, 1).getTime()) -
      Math.abs(b.getTime() - new Date(gregorianYear, 6, 1).getTime())
  )[0];
}

function resolveIslamicHolidayDate(
  holiday: EthiopianHoliday,
  gregorianYear: number
): Date {
  const start = Date.UTC(gregorianYear, 0, 1, 12, 0, 0, 0);
  const end = Date.UTC(gregorianYear, 11, 31, 12, 0, 0, 0);

  for (let cursor = start; cursor <= end; cursor += ONE_DAY_MS) {
    const utcDate = new Date(cursor);
    const islamic = getIslamicDateParts(utcDate);

    if (islamic.month === holiday.month && islamic.day === holiday.day) {
      return toDate({
        year: utcDate.getUTCFullYear(),
        month: utcDate.getUTCMonth() + 1,
        day: utcDate.getUTCDate(),
      });
    }
  }

  return toDate({ year: gregorianYear, month: 1, day: 1 });
}

export function resolveHolidayOccurrence(
  holiday: EthiopianHoliday,
  gregorianYear: number
): HolidayOccurrence {
  const gregorianDate =
    holiday.calendar === "gregorian"
      ? toDate({ year: gregorianYear, month: holiday.month, day: holiday.day })
      : holiday.calendar === "ethiopian"
        ? resolveEthiopianHolidayDate(holiday, gregorianYear)
        : resolveIslamicHolidayDate(holiday, gregorianYear);

  const ethiopianDate = new Kenat(gregorianDate).getEthiopian();
  const monthData = ETHIOPIAN_MONTHS[ethiopianDate.month - 1];
  const islamicDate = getIslamicDateParts(gregorianDate);

  return {
    holiday,
    gregorianDate,
    ethiopian: {
      year: ethiopianDate.year,
      month: ethiopianDate.month,
      day: ethiopianDate.day,
      monthLabel: monthData?.label ?? String(ethiopianDate.month),
      monthAmharic: monthData?.amharic ?? "",
    },
    islamic: {
      year: islamicDate.year,
      month: islamicDate.month,
      day: islamicDate.day,
      monthLabel: ISLAMIC_MONTHS[islamicDate.month - 1] ?? String(islamicDate.month),
    },
  };
}

export function getHolidayOccurrencesForYear(
  gregorianYear: number
): HolidayOccurrence[] {
  return ETHIOPIAN_PUBLIC_HOLIDAYS.map((holiday) =>
    resolveHolidayOccurrence(holiday, gregorianYear)
  ).sort((a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime());
}

/**
 * The Gregorian years an Ethiopian year runs across: it opens on Meskerem 1 in
 * September of `ethiopianYear + 7` and closes at the end of Pagume in September
 * of the year after that.
 */
export function gregorianYearsOfEthiopianYear(ethiopianYear: number) {
  return [ethiopianYear + 7, ethiopianYear + 8] as const;
}

/**
 * The holidays of one Ethiopian year, Meskerem through Pagume.
 *
 * Each holiday is resolved against both Gregorian years the Ethiopian year
 * straddles and then kept only if it really lands inside it. An Islamic holiday
 * can fall twice in the same Ethiopian year — the lunar year is eleven days
 * shorter — so occurrences are keyed by date rather than by holiday.
 */
export function getHolidayOccurrencesForEthiopianYear(
  ethiopianYear: number
): HolidayOccurrence[] {
  const seen = new Set<string>();
  const occurrences: HolidayOccurrence[] = [];

  for (const gregorianYear of gregorianYearsOfEthiopianYear(ethiopianYear)) {
    for (const occurrence of getHolidayOccurrencesForYear(gregorianYear)) {
      if (occurrence.ethiopian.year !== ethiopianYear) continue;

      const key = `${occurrence.holiday.id}:${occurrence.gregorianDate.toDateString()}`;
      if (seen.has(key)) continue;

      seen.add(key);
      occurrences.push(occurrence);
    }
  }

  return occurrences.sort(
    (a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime()
  );
}

export function getUpcomingHolidayOccurrences(
  startDate: Date,
  limit = 8
): HolidayOccurrence[] {
  const year = startDate.getFullYear();
  const pool = [
    ...getHolidayOccurrencesForYear(year),
    ...getHolidayOccurrencesForYear(year + 1),
  ];

  return pool
    .filter((entry) => entry.gregorianDate.getTime() >= startDate.getTime())
    .sort((a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime())
    .slice(0, limit);
}

export function getHolidayById(id: string) {
  return ETHIOPIAN_PUBLIC_HOLIDAYS.find((holiday) => holiday.id === id) ?? null;
}
