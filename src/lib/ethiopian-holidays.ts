import Kenat from "kenat";

import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";

export type HolidayCalendarType =
  | "ethiopian"
  | "gregorian"
  | "islamic"
  /** Moves with Fasika, which is worked out rather than looked up. */
  | "easter";

/** Who keeps the day: the state, a church, a mosque, or a community.
 * `orthodox` is the Bahire Hasab cycle of feasts and fasts, which are kept but
 * are not public holidays. */
export type HolidayTradition =
  | "national"
  | "christian"
  | "muslim"
  | "cultural"
  | "orthodox";

type HolidayDetails = {
  id: string;
  name: string;
  amharic: string;
  tradition: HolidayTradition;
  description: string;
  history: string;
};

export type EthiopianHoliday = HolidayDetails &
  (
    | {
        calendar: "ethiopian" | "gregorian" | "islamic";
        /** The day it falls on, in the calendar that keeps it. */
        month: number;
        day: number;
      }
    | {
        calendar: "easter";
        /** Days from Fasika: 0 is Fasika itself, -2 is Siklet. */
        offsetFromEaster: number;
      }
  );

/** A feast on a date its own calendar fixes, as against one that moves. */
type FixedHoliday = Extract<EthiopianHoliday, { month: number }>;

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
    id: "tsome-nenewe",
    name: "Tsome Nenewe",
    amharic: "ጾመ ነነዌ",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: -69,
    description: "The three day fast of Nineveh.",
    history:
      "Kept for the three days Jonah spent inside the fish and the repentance of Nineveh that followed his preaching. It opens the moveable part of the Ethiopian church year: every other date in the cycle is counted from it.",
  },
  {
    id: "abiy-tsom",
    name: "Abiy Tsom",
    amharic: "ዓቢይ ጾም",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: -55,
    description: "The start of the great fast of fifty five days.",
    history:
      "Hudadi or Abiy Tsom is the longest fast of the year, running from this day until Fasika. No animal products are taken, and the observant eat nothing before three in the afternoon.",
  },
  {
    id: "debre-zeit",
    name: "Debre Zeit",
    amharic: "ደብረ ዘይት",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: -28,
    description: "Mid point of the great fast, on the Mount of Olives.",
    history:
      "The fourth Sunday of Abiy Tsom, when the reading is Christ's teaching on the Mount of Olives about the end of the age. It marks the halfway point of the fast.",
  },
  {
    id: "hosanna",
    name: "Hosanna",
    amharic: "ሆሳዕና",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: -7,
    description: "Palm Sunday, the entry into Jerusalem.",
    history:
      "Worshippers are given rings and crosses woven from palm fronds and wear them through Holy Week. It opens the last and strictest week of the fast.",
  },
  {
    id: "rikbe-kahnat",
    name: "Rikbe Kahnat",
    amharic: "ርክበ ካህናት",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: 24,
    description: "The meeting of the priests.",
    history:
      "Commemorates the Council of Nicaea, where the bishops met and settled the rule for calculating Easter that the Ethiopian church still follows.",
  },
  {
    id: "erget",
    name: "Erget",
    amharic: "ዕርገት",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: 39,
    description: "The Ascension, forty days after the Resurrection.",
    history:
      "Always falls on a Thursday, forty days after Tinsae counting the feast itself.",
  },
  {
    id: "peraklitos",
    name: "Peraklitos",
    amharic: "ጰራቅሊጦስ",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: 49,
    description: "Pentecost, the coming of the Holy Spirit.",
    history:
      "The fiftieth day after Tinsae. The name is the Greek Paraclete, the advocate promised to the apostles.",
  },
  {
    id: "tsome-hawaryat",
    name: "Tsome Hawaryat",
    amharic: "ጾመ ሐዋርያት",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: 50,
    description: "The apostles' fast begins.",
    history:
      "Starts the day after Pentecost and runs until the feast of Peter and Paul in Hamle, kept for the apostles who went out to preach after the Spirit came.",
  },
  {
    id: "tsome-dihnet",
    name: "Tsome Dihnet",
    amharic: "ጾመ ድህነት",
    calendar: "easter",
    tradition: "orthodox",
    offsetFromEaster: 52,
    description: "The fast of salvation resumes on Wednesdays and Fridays.",
    history:
      "Marks the return of the ordinary weekly fast after the Easter season. Wednesday for the decision to betray Christ, Friday for the crucifixion.",
  },
  {
    id: "tsome-filseta",
    name: "Tsome Filseta",
    amharic: "ጾመ ፍልሰታ",
    calendar: "ethiopian",
    tradition: "orthodox",
    month: 12,
    day: 1,
    description: "The sixteen day fast for the Virgin Mary begins.",
    history:
      "Kept from Nehase 1 to Nehase 16. It is the most widely observed fast after Abiy Tsom, and many who keep no other fast keep this one.",
  },
  {
    id: "debre-tabor",
    name: "Debre Tabor",
    amharic: "ደብረ ታቦር",
    calendar: "ethiopian",
    tradition: "orthodox",
    month: 12,
    day: 13,
    description: "The Transfiguration, known in the streets as Buhe.",
    history:
      "Boys go house to house singing hoya hoye and are given hambasha bread. Bonfires are lit in the evening, and whips are cracked in memory of the shepherds who were out when Christ was transfigured.",
  },
  {
    id: "filseta",
    name: "Filseta",
    amharic: "የእመቤታችን ዕረፍት",
    calendar: "ethiopian",
    tradition: "orthodox",
    month: 12,
    day: 16,
    description: "The Assumption of the Virgin Mary.",
    history:
      "Closes the sixteen day Filseta fast. Kept with an all night vigil, and one of the largest gatherings of the year at Marian churches.",
  },
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
  {
    id: "siklet",
    name: "Siklet",
    amharic: "ስቅለት",
    calendar: "easter",
    tradition: "christian",
    offsetFromEaster: -2,
    description: "Good Friday, kept as a fast day.",
    history:
      "Siklet marks the crucifixion, and is observed with a long service and a fast that is broken at Fasika.",
  },
  {
    id: "fasika",
    name: "Fasika",
    amharic: "ፋሲካ",
    calendar: "easter",
    tradition: "christian",
    offsetFromEaster: 0,
    description: "Ethiopian Easter, the end of the fifty-five day fast.",
    history:
      "Called Tinsae, ትንሳኤ, in church. Fasika follows the Julian computus of bahire hasab, so it falls with Orthodox Easter rather than the Western one, and the fast is broken after the midnight service.",
  },
  {
    id: "nations",
    name: "Nations, Nationalities and Peoples' Day",
    amharic: "የብሔር ብሔረሰቦች ቀን",
    calendar: "ethiopian",
    tradition: "national",
    month: 3,
    day: 29,
    description: "The day the constitution was ratified.",
    history:
      "Ratified on Hidar 29, 1987 — 8 December 1994 — the day is marked in a different regional capital each year.",
  },
];

function toDate(input: { year: number; month: number; day: number }) {
  return new Date(input.year, input.month - 1, input.day, 9, 0, 0, 0);
}

const shiftDays = (date: Date, days: number) =>
  toDate({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate() + days,
  });

/**
 * Fasika, on the Gregorian calendar.
 *
 * The Ethiopian church works Easter out with bahire hasab, which keeps the
 * Julian computus — the same one the Eastern Orthodox churches use — so Fasika
 * falls on Orthodox Easter rather than on the Western one. The Julian date that
 * computus gives is then moved onto the Gregorian calendar by the gap between
 * the two, which grows by a day every century that is not a leap year.
 *
 * `toDate` normalises a day past the end of its month, so April 43 becoming
 * May 13 needs no arithmetic of its own.
 */
function fasikaDate(gregorianYear: number): Date {
  const remainder4 = gregorianYear % 4;
  const remainder7 = gregorianYear % 7;
  const remainder19 = gregorianYear % 19;
  const paschalMoon = (19 * remainder19 + 15) % 30;
  const weekday =
    (2 * remainder4 + 4 * remainder7 - paschalMoon + 34) % 7;
  const offset = paschalMoon + weekday + 114;

  const julianToGregorian =
    Math.floor(gregorianYear / 100) - Math.floor(gregorianYear / 400) - 2;

  return toDate({
    year: gregorianYear,
    month: Math.floor(offset / 31),
    day: (offset % 31) + 1 + julianToGregorian,
  });
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
  holiday: FixedHoliday,
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

/**
 * Every date an Islamic holiday falls on inside one Gregorian year.
 *
 * There can be two of them: the lunar year is eleven days shorter than the
 * solar one, so a feast that opens a Gregorian year in January comes round
 * again before December is out. Returning only the first is what once hid an
 * Eid from the Ethiopian year that the second one belonged to.
 */
function resolveIslamicHolidayDates(
  holiday: FixedHoliday,
  gregorianYear: number
): Date[] {
  const start = Date.UTC(gregorianYear, 0, 1, 12, 0, 0, 0);
  const end = Date.UTC(gregorianYear, 11, 31, 12, 0, 0, 0);
  const dates: Date[] = [];

  for (let cursor = start; cursor <= end; cursor += ONE_DAY_MS) {
    const utcDate = new Date(cursor);
    const islamic = getIslamicDateParts(utcDate);

    if (islamic.month === holiday.month && islamic.day === holiday.day) {
      dates.push(
        toDate({
          year: utcDate.getUTCFullYear(),
          month: utcDate.getUTCMonth() + 1,
          day: utcDate.getUTCDate(),
        })
      );
    }
  }

  return dates;
}

/** Every date a holiday falls on inside one Gregorian year. */
function resolveHolidayDates(
  holiday: EthiopianHoliday,
  gregorianYear: number
): Date[] {
  switch (holiday.calendar) {
    case "easter":
      return [shiftDays(fasikaDate(gregorianYear), holiday.offsetFromEaster)];
    case "gregorian":
      return [
        toDate({ year: gregorianYear, month: holiday.month, day: holiday.day }),
      ];
    case "ethiopian":
      return [resolveEthiopianHolidayDate(holiday, gregorianYear)];
    case "islamic":
      return resolveIslamicHolidayDates(holiday, gregorianYear);
  }
}

function occurrenceOf(
  holiday: EthiopianHoliday,
  gregorianDate: Date
): HolidayOccurrence {
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

export function resolveHolidayOccurrences(
  holiday: EthiopianHoliday,
  gregorianYear: number
): HolidayOccurrence[] {
  return resolveHolidayDates(holiday, gregorianYear).map((date) =>
    occurrenceOf(holiday, date)
  );
}

export function getHolidayOccurrencesForYear(
  gregorianYear: number
): HolidayOccurrence[] {
  return ETHIOPIAN_PUBLIC_HOLIDAYS.flatMap((holiday) =>
    resolveHolidayOccurrences(holiday, gregorianYear)
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
