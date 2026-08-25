// Zodiac signs with their Ge'ez names (ሐመል, ሱንቡላ...), which is how they appear
// in Ethiopian almanacs.
//
// Boundaries are the conventional tropical dates. The real crossing moves by a
// day or so year to year, hence isOnCusp/cuspNeighbour below.

export type ZodiacElement = "fire" | "earth" | "air" | "water";

export interface ZodiacSign {
  id: string;
  /** Common English name. */
  name: string;
  /** The Ge'ez name used in Ethiopian almanacs. */
  geez: string;
  symbol: string;
  element: ZodiacElement;
  /** Inclusive Gregorian start of the sign, as [month, day]. */
  from: [number, number];
  /** Inclusive Gregorian end of the sign, as [month, day]. */
  to: [number, number];
  /** Newspaper-column shorthand. */
  traits: string;
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { id: "aries", name: "Aries", geez: "ሐመል", symbol: "♈", element: "fire", from: [3, 21], to: [4, 19], traits: "Bold, restless, first" },
  { id: "taurus", name: "Taurus", geez: "ሰዉር", symbol: "♉", element: "earth", from: [4, 20], to: [5, 20], traits: "Steady, patient, rooted" },
  { id: "gemini", name: "Gemini", geez: "ጀውዛ", symbol: "♊", element: "air", from: [5, 21], to: [6, 20], traits: "Quick, curious, talkative" },
  { id: "cancer", name: "Cancer", geez: "ሰረጣን", symbol: "♋", element: "water", from: [6, 21], to: [7, 22], traits: "Tender, loyal, homebound" },
  { id: "leo", name: "Leo", geez: "አሰድ", symbol: "♌", element: "fire", from: [7, 23], to: [8, 22], traits: "Warm, proud, generous" },
  { id: "virgo", name: "Virgo", geez: "ሱንቡላ", symbol: "♍", element: "earth", from: [8, 23], to: [9, 22], traits: "Precise, useful, quiet" },
  { id: "libra", name: "Libra", geez: "ሚዛን", symbol: "♎", element: "air", from: [9, 23], to: [10, 22], traits: "Fair, gracious, weighing" },
  { id: "scorpio", name: "Scorpio", geez: "ዓቅራብ", symbol: "♏", element: "water", from: [10, 23], to: [11, 21], traits: "Deep, private, unwavering" },
  { id: "sagittarius", name: "Sagittarius", geez: "ቀውስ", symbol: "♐", element: "fire", from: [11, 22], to: [12, 21], traits: "Roaming, frank, hopeful" },
  { id: "capricorn", name: "Capricorn", geez: "ጀዲ", symbol: "♑", element: "earth", from: [12, 22], to: [1, 19], traits: "Climbing, sober, durable" },
  { id: "aquarius", name: "Aquarius", geez: "ደላዊ", symbol: "♒", element: "air", from: [1, 20], to: [2, 18], traits: "Odd, principled, far-sighted" },
  { id: "pisces", name: "Pisces", geez: "ሑት", symbol: "♓", element: "water", from: [2, 19], to: [3, 20], traits: "Dreaming, kind, tidal" },
];

export const ELEMENT_LABELS: Record<ZodiacElement, { en: string; am: string }> = {
  fire: { en: "Fire", am: "እሳት" },
  earth: { en: "Earth", am: "መሬት" },
  air: { en: "Air", am: "አየር" },
  water: { en: "Water", am: "ውሃ" },
};

/** [month, day] as a sortable number, for range checks. */
const stamp = (month: number, day: number) => month * 100 + day;

/** Capricorn is the only range that wraps the new year, hence the two cases. */
export function zodiacFor(month: number, day: number): ZodiacSign {
  const point = stamp(month, day);

  const sign = ZODIAC_SIGNS.find(({ from, to }) => {
    const start = stamp(...from);
    const end = stamp(...to);
    return start <= end
      ? point >= start && point <= end
      : point >= start || point <= end;
  });

  // Every day lands in exactly one sign. Fallback is only for the return type.
  return sign ?? ZODIAC_SIGNS[0];
}

export const zodiacForDate = (date: Date): ZodiacSign =>
  zodiacFor(date.getMonth() + 1, date.getDate());

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "23 October – 21 November". */
export function zodiacSpan(sign: ZodiacSign): string {
  const part = ([month, day]: [number, number]) =>
    `${day} ${MONTH_NAMES[month - 1]}`;
  return `${part(sign.from)} – ${part(sign.to)}`;
}

/** Within a day of a boundary, where the fixed table above can be wrong. */
export function isOnCusp(month: number, day: number): boolean {
  const sign = zodiacFor(month, day);
  const point = stamp(month, day);
  const start = stamp(...sign.from);
  const end = stamp(...sign.to);
  return point <= start + 1 || point >= end - 1;
}

/** The sign on the other side of a cusp, or null if not on one. */
export function cuspNeighbour(month: number, day: number): ZodiacSign | null {
  if (!isOnCusp(month, day)) return null;

  const sign = zodiacFor(month, day);
  const index = ZODIAC_SIGNS.indexOf(sign);
  const atStart = stamp(month, day) <= stamp(...sign.from) + 1;
  const offset = atStart ? -1 : 1;
  return ZODIAC_SIGNS[(index + offset + ZODIAC_SIGNS.length) % ZODIAC_SIGNS.length];
}

/**
 * Ethiopian years cycle Matthew, Mark, Luke, John. John's year is the leap one
 * (the sixth day of Pagume).
 */
export const EVANGELISTS = [
  { name: "Matthew", amharic: "ማቴዎስ" },
  { name: "Mark", amharic: "ማርቆስ" },
  { name: "Luke", amharic: "ሉቃስ" },
  { name: "John", amharic: "ዮሐንስ" },
] as const;

export const evangelistOf = (ethiopianYear: number) =>
  EVANGELISTS[((ethiopianYear % 4) + 4) % 4];
