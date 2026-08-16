type AmharicCharMap = { [key: string]: string[] };

// The 7 forms of Amharic characters: Ge'ez, Ka'eb, Salis, Rabi, Hamis, Sadis, Sab'i
const amharicChars: AmharicCharMap = {
  h: ["ሀ", "ሁ", "ሂ", "ሃ", "ሄ", "ህ", "ሆ"],
  l: ["ለ", "ሉ", "ሊ", "ላ", "ሌ", "ል", "ሎ"],
  H: ["ሐ", "ሑ", "ሒ", "ሓ", "ሔ", "ሕ", "ሖ"], // hh
  m: ["መ", "ሙ", "ሚ", "ማ", "ሜ", "ም", "ሞ"],
  s: ["ሰ", "ሱ", "ሲ", "ሳ", "ሴ", "ስ", "ሶ"],
  r: ["ረ", "ሩ", "ሪ", "ራ", "ሬ", "ር", "ሮ"],
  S: ["ሸ", "ሹ", "ሺ", "ሻ", "ሼ", "ሽ", "ሾ"], // sh
  q: ["ቀ", "ቁ", "ቂ", "ቃ", "ቄ", "ቅ", "ቆ"],
  b: ["በ", "ቡ", "ቢ", "ባ", "ቤ", "ብ", "ቦ"],
  t: ["ተ", "ቱ", "ቲ", "ታ", "ቴ", "ት", "ቶ"],
  c: ["ቸ", "ቹ", "ቺ", "ቻ", "ቼ", "ች", "ቾ"], // ch
  n: ["ነ", "ኑ", "ኒ", "ና", "ኔ", "ን", "ኖ"],
  N: ["ኘ", "ኙ", "ኚ", "ኛ", "ኜ", "ኝ", "ኞ"], // gn
  a: ["አ", "ኡ", "ኢ", "ኣ", "ኤ", "እ", "ኦ"],
  k: ["ከ", "ኩ", "ኪ", "ካ", "ኬ", "ክ", "ኮ"],
  w: ["ወ", "ዉ", "ዊ", "ዋ", "ዌ", "ው", "ዎ"],
  z: ["ዘ", "ዙ", "ዚ", "ዛ", "ዜ", "ዝ", "ዞ"],
  Z: ["ዠ", "ዡ", "ዢ", "ዣ", "ዤ", "ዥ", "ዦ"], // zh
  y: ["የ", "ዩ", "ዪ", "ያ", "ዬ", "ይ", "ዮ"],
  d: ["ደ", "ዱ", "ዲ", "ዳ", "ዴ", "ድ", "ዶ"],
  j: ["ጀ", "ጁ", "ጂ", "ጃ", "ጄ", "ጅ", "ጆ"],
  g: ["ገ", "ጉ", "ጊ", "ጋ", "ጌ", "ግ", "ጎ"],
  T: ["ጠ", "ጡ", "ጢ", "ጣ", "ጤ", "ጥ", "ጦ"], // Tt
  C: ["ጨ", "ጩ", "ጪ", "ጫ", "ጬ", "ጭ", "ጮ"], // Cc
  p: ["ጰ", "ጱ", "ጲ", "ጳ", "ጴ", "ጵ", "ጶ"],
  P: ["ጸ", "ጹ", "ጺ", "ጻ", "ጼ", "ጽ", "ጾ"], // ts, Ss
  f: ["ፈ", "ፉ", "ፊ", "ፋ", "ፌ", "ፍ", "ፎ"],
  v: ["ቨ", "ቩ", "ቪ", "ቫ", "ቬ", "ቭ", "ቮ"],
};

const GEEZ = 0;
const HAMIS = 4;
const SADIS = 5;

// Vowels as standalone characters (using the 'a' family as carriers)
const vowelAsChar: { [key: string]: string } = {
  a: amharicChars["a"][GEEZ], // አ
  e: amharicChars["a"][SADIS], // እ
  i: amharicChars["a"][2], // ኢ
  o: amharicChars["a"][6], // ኦ
  u: amharicChars["a"][1], // ኡ
  E: amharicChars["a"][HAMIS], // ኤ
};

function standaloneVowelFor(inputKey: string): string | undefined {
  return vowelAsChar[inputKey] ?? vowelAsChar[inputKey.toLowerCase()];
}

const vowelMap: { [key: string]: number } = {
  e: GEEZ, // Ge'ez (as in s'e')
  u: 1, // Ka'eb
  i: 2, // Salis
  a: 3, // Rabi
  o: 6, // Sab'i
};

/**
 * Resolves a keystroke to a vowel form index. Capital `E` is kept distinct from
 * `e` so that `sE` reaches the Hamis form (ሴ); every other vowel is case-insensitive.
 */
function vowelIndexFor(inputKey: string): number | undefined {
  if (inputKey === "E") return HAMIS;
  return vowelMap[inputKey.toLowerCase()];
}

function isVowelKey(inputKey: string): boolean {
  return vowelIndexFor(inputKey) !== undefined;
}

const multiCharConsonants: { [key: string]: string } = {
  sh: "S",
  ch: "c",
  gn: "N",
  zh: "Z",
  ts: "P",
  // Capital letters for unique mapping
  hh: "H",
  ss: "P",
  tt: "T",
  cc: "C",
};

/**
 * Labialized "-wa" fidel, keyed by the family they belong to. Typing the family's
 * base consonant followed by `w` + `a` collapses the pair into a single character
 * (e.g. ክ + ው + a => ኳ).
 */
const labializedAForms: { [baseKey: string]: string } = {
  l: "ሏ",
  m: "ሟ",
  r: "ሯ",
  s: "ሷ",
  S: "ሿ",
  q: "ቋ",
  b: "ቧ",
  v: "ቯ",
  t: "ቷ",
  c: "ቿ",
  h: "ኋ",
  H: "ሗ",
  n: "ኗ",
  N: "ኟ",
  k: "ኳ",
  z: "ዟ",
  Z: "ዧ",
  d: "ዷ",
  j: "ጇ",
  g: "ጓ",
  T: "ጧ",
  C: "ጯ",
  p: "ጷ",
  P: "ጿ",
  f: "ፏ",
};

type FidelPosition = { baseKey: string; formIndex: number };

/**
 * Single lookup table from any fidel to the family it belongs to and its vowel
 * form, so resolving a character is O(1) rather than a scan of every family.
 */
const fidelPositions: { [char: string]: FidelPosition } = {};
for (const baseKey in amharicChars) {
  amharicChars[baseKey].forEach((char, formIndex) => {
    if (!(char in fidelPositions)) {
      fidelPositions[char] = { baseKey, formIndex };
    }
  });
}

export type SingleCharInsertion = {
  /** The character that was typed. */
  char: string;
  /** Start of the range it replaced. */
  start: number;
  /** End of the range it replaced; equal to `start` for a plain insertion. */
  end: number;
};

/**
 * Works out whether the change from `previous` to `next` was a single typed
 * character, by matching the common prefix and suffix of the two values. Returns
 * `null` for anything else — a deletion, a paste, or an on-screen keyboard
 * swapping out a whole word — so those keep their native behaviour.
 *
 * Where the text has repeated characters the position is ambiguous (inserting
 * "l" at either end of "ll" gives "lll"); the earliest match is used.
 */
export function singleCharInsertion(
  previous: string,
  next: string
): SingleCharInsertion | null {
  const maxPrefix = Math.min(previous.length, next.length);

  let prefixLength = 0;
  while (prefixLength < maxPrefix && previous[prefixLength] === next[prefixLength]) {
    prefixLength++;
  }

  let suffixLength = 0;
  const maxSuffix = maxPrefix - prefixLength;
  while (
    suffixLength < maxSuffix &&
    previous[previous.length - 1 - suffixLength] === next[next.length - 1 - suffixLength]
  ) {
    suffixLength++;
  }

  const inserted = next.slice(prefixLength, next.length - suffixLength);
  if (Array.from(inserted).length !== 1) return null;

  return {
    char: inserted,
    start: prefixLength,
    end: previous.length - suffixLength,
  };
}

const MODIFICATION_TIMEOUT = 3000; // ms

export const amharicTransliterate = (
  currentText: string,
  inputKey: string,
  cursorStart: number,
  cursorEnd: number,
  timeSinceLastPress?: number
): { newText: string; newCursorPos: number } => {
  const textBefore = currentText.substring(0, cursorStart);
  const textAfter = currentText.substring(cursorEnd);

  if (inputKey === "Backspace") {
    if (cursorStart !== cursorEnd) {
      // Selection exists, delete the selected text
      return { newText: textBefore + textAfter, newCursorPos: cursorStart };
    }
    // No selection, delete one character before the cursor
    if (cursorStart === 0) return { newText: currentText, newCursorPos: 0 };
    return {
      newText: currentText.slice(0, cursorStart - 1) + textAfter,
      newCursorPos: cursorStart - 1,
    };
  }

  // A long pause means the previous character is "settled": it should no longer
  // absorb a following vowel or combine into a digraph.
  const isContinuingWord =
    timeSinceLastPress === undefined || timeSinceLastPress <= MODIFICATION_TIMEOUT;

  const lastAmharicChar = textBefore.slice(-1);
  const lastPosition = fidelPositions[lastAmharicChar];

  // 1. Digraphs (e.g. 's' already committed as ስ, then 'h' -> ሽ).
  if (isContinuingWord && lastPosition) {
    const digraph = lastPosition.baseKey + inputKey.toLowerCase();
    const digraphBase = multiCharConsonants[digraph];
    if (digraphBase) {
      return {
        newText:
          textBefore.slice(0, -1) + amharicChars[digraphBase][SADIS] + textAfter,
        newCursorPos: cursorStart,
      };
    }
  }

  // 2. Vowel applied to the preceding consonant.
  if (lastAmharicChar && isVowelKey(inputKey)) {
    const vowelIndex = vowelIndexFor(inputKey) as number;

    if (!isContinuingWord) {
      // Timeout exceeded, treat as a standalone vowel character
      return {
        newText: textBefore + standaloneVowelFor(inputKey) + textAfter,
        newCursorPos: cursorStart + 1,
      };
    }

    // Labialized sequence: consonant + ው + a => single labialized fidel (ክ ው a => ኳ)
    if (lastAmharicChar === amharicChars["w"][SADIS] && inputKey.toLowerCase() === "a") {
      const precedingPosition = fidelPositions[textBefore.slice(-2, -1)];
      const labializedChar =
        precedingPosition && precedingPosition.formIndex === SADIS
          ? labializedAForms[precedingPosition.baseKey]
          : undefined;
      if (labializedChar) {
        return {
          newText: textBefore.slice(0, -2) + labializedChar + textAfter,
          newCursorPos: cursorStart - 1,
        };
      }
    }

    if (lastPosition) {
      const { baseKey, formIndex } = lastPosition;
      const charFamily = amharicChars[baseKey];

      // Bare consonant (Sadis) + vowel => that vowel's form.
      if (formIndex === SADIS) {
        return {
          newText: textBefore.slice(0, -1) + charFamily[vowelIndex] + textAfter,
          newCursorPos: cursorStart,
        };
      }

      // Both `ee` and `ie` reach the Hamis form: see/sie => ሴ.
      if ((formIndex === GEEZ || formIndex === 2) && inputKey.toLowerCase() === "e") {
        return {
          newText: textBefore.slice(0, -1) + charFamily[HAMIS] + textAfter,
          newCursorPos: cursorStart,
        };
      }

      // The preceding character already carries a vowel, so start a new
      // vowel-carrier rather than overwriting it.
      if (baseKey !== "a") {
        return {
          newText: textBefore + amharicChars["a"][vowelIndex] + textAfter,
          newCursorPos: cursorStart + 1,
        };
      }

      return {
        newText: textBefore.slice(0, -1) + charFamily[vowelIndex] + textAfter,
        newCursorPos: cursorStart,
      };
    }
  }

  // 3. Standalone vowel. Checked before the consonant families because `a` is a
  // family key as well as a vowel, and on its own it should read as አ, not እ.
  const standaloneVowel = standaloneVowelFor(inputKey);
  if (standaloneVowel) {
    return {
      newText: textBefore + standaloneVowel + textAfter,
      newCursorPos: cursorStart + 1,
    };
  }

  // 4. New consonant, committed in its bare Sadis form.
  const consonantFamily = amharicChars[inputKey] ?? amharicChars[inputKey.toLowerCase()];
  if (consonantFamily) {
    return {
      newText: textBefore + consonantFamily[SADIS] + textAfter,
      newCursorPos: cursorStart + 1,
    };
  }

  // 5. Default: insert the character as is (numbers, symbols, etc.)
  return {
    newText: textBefore + inputKey + textAfter,
    newCursorPos: cursorStart + 1,
  };
};
