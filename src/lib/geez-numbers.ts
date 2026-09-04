/**
 * Ge'ez (Ethiopic) numerals conversion utility.
 *
 * Ge'ez numerals work in base 100 grouping.
 * Characters:
 * Ones: ፩ (1), ፪ (2), ፫ (3), ፬ (4), ፭ (5), ፮ (6), ፯ (7), ፰ (8), ፱ (9)
 * Tens: ፲ (10), ፳ (20), ፴ (30), ፵ (40), ፶ (50), ፷ (60), ፸ (70), ፹ (80), ፺ (90)
 * Hundreds: ፻ (100)
 * Ten thousands: ፼ (10,000)
 */

export const GEEZ_ONES = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"];
export const GEEZ_TENS = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"];
export const GEEZ_HUNDRED = "፻";
export const GEEZ_TEN_THOUSAND = "፼";

export type GeezNumeralEntry = {
  arabic: number;
  geez: string;
  nameAmharic: string;
  nameEnglish: string;
};

export const GEEZ_NUMERALS_TABLE: GeezNumeralEntry[] = [
  { arabic: 1, geez: "፩", nameAmharic: "አንድ", nameEnglish: "One" },
  { arabic: 2, geez: "፪", nameAmharic: "ሁለት", nameEnglish: "Two" },
  { arabic: 3, geez: "፫", nameAmharic: "ሦስት", nameEnglish: "Three" },
  { arabic: 4, geez: "፬", nameAmharic: "አራት", nameEnglish: "Four" },
  { arabic: 5, geez: "፭", nameAmharic: "አምስት", nameEnglish: "Five" },
  { arabic: 6, geez: "፮", nameAmharic: "ስድስት", nameEnglish: "Six" },
  { arabic: 7, geez: "፯", nameAmharic: "ሰባት", nameEnglish: "Seven" },
  { arabic: 8, geez: "፰", nameAmharic: "ስምንት", nameEnglish: "Eight" },
  { arabic: 9, geez: "፱", nameAmharic: "ዘጠኝ", nameEnglish: "Nine" },
  { arabic: 10, geez: "፲", nameAmharic: "አሥር", nameEnglish: "Ten" },
  { arabic: 20, geez: "፳", nameAmharic: "ሃያ", nameEnglish: "Twenty" },
  { arabic: 30, geez: "፴", nameAmharic: "ሠላሳ", nameEnglish: "Thirty" },
  { arabic: 40, geez: "፵", nameAmharic: "አርባ", nameEnglish: "Forty" },
  { arabic: 50, geez: "፶", nameAmharic: "ኃምሳ", nameEnglish: "Fifty" },
  { arabic: 60, geez: "፷", nameAmharic: "ስድሳ", nameEnglish: "Sixty" },
  { arabic: 70, geez: "፸", nameAmharic: "ሰባ", nameEnglish: "Seventy" },
  { arabic: 80, geez: "፹", nameAmharic: "ሰማንያ", nameEnglish: "Eighty" },
  { arabic: 90, geez: "፺", nameAmharic: "ዘጠና", nameEnglish: "Ninety" },
  { arabic: 100, geez: "፻", nameAmharic: "መቶ", nameEnglish: "One Hundred" },
  { arabic: 10000, geez: "፼", nameAmharic: "እልፍ (አሥር ሺህ)", nameEnglish: "Ten Thousand" },
];

/** Converts an integer between 1 and 99 to its Ge'ez representation. */
function twoDigitsToGeez(n: number): string {
  if (n <= 0 || n > 99) return "";
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${GEEZ_TENS[tens]}${GEEZ_ONES[ones]}`;
}

/**
 * Converts a positive integer into Ge'ez numerals.
 * Supports numbers up to 1,000,000,000.
 */
export function arabicToGeez(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return "";
  const intVal = Math.floor(num);
  if (intVal === 0) return "";

  // Split number into 2-digit pairs from right to left
  const pairs: number[] = [];
  let temp = intVal;
  while (temp > 0) {
    pairs.push(temp % 100);
    temp = Math.floor(temp / 100);
  }

  let result = "";

  for (let i = pairs.length - 1; i >= 0; i--) {
    const pair = pairs[i];
    if (pair === 0 && i !== 0) continue;

    const pairStr = twoDigitsToGeez(pair);

    let separator = "";
    if (i % 2 === 1) {
      separator = GEEZ_HUNDRED;
    } else if (i > 0 && i % 2 === 0) {
      separator = GEEZ_TEN_THOUSAND;
    }

    if (pair === 1 && i > 0) {
      result += separator;
    } else {
      result += pairStr + separator;
    }
  }

  return result;
}

const GEEZ_MAP: Record<string, number> = {
  "፩": 1, "፪": 2, "፫": 3, "፬": 4, "፭": 5,
  "፮": 6, "፯": 7, "፰": 8, "፱": 9,
  "፲": 10, "፳": 20, "፴": 30, "፵": 40, "፶": 50,
  "፷": 60, "፸": 70, "፹": 80, "፺": 90,
  "፻": 100,
  "፼": 10000,
};

/**
 * Parses a Ge'ez numeral string back into an integer.
 * Returns null if the input is invalid.
 */
export function geezToArabic(geezText: string): number | null {
  const trimmed = geezText.trim();
  if (!trimmed) return null;

  for (const ch of trimmed) {
    if (!(ch in GEEZ_MAP)) return null;
  }

  let total = 0;
  let currentGroup = 0;
  let currentVal = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    const val = GEEZ_MAP[ch];

    if (val === 10000) {
      const multiplier = (currentGroup + currentVal) || 1;
      total += multiplier * 10000;
      currentGroup = 0;
      currentVal = 0;
    } else if (val === 100) {
      const multiplier = currentVal || 1;
      currentGroup += multiplier * 100;
      currentVal = 0;
    } else {
      currentVal += val;
    }
  }

  total += currentGroup + currentVal;
  return total > 0 ? total : null;
}

/** Formats an Ethiopian date with Ge'ez numerals (e.g. መስከረም ፩ ቀን ፳፻፲፯ ዓ.ም) */
export function formatEthiopianDateGeez(
  monthName: string,
  day: number,
  year: number
): string {
  const dayGeez = arabicToGeez(day);
  const yearGeez = arabicToGeez(year);
  return `${monthName} ${dayGeez} ቀን ${yearGeez} ዓ.ም`;
}
