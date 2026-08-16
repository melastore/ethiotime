/* eslint-disable prefer-const */

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

// Vowels as standalone characters (using the 'a' family as carriers)
const vowelAsChar: { [key: string]: string } = {
  a: amharicChars["a"][0], // አ
  e: amharicChars["a"][5], // እ
  i: amharicChars["a"][2], // ኢ
  o: amharicChars["a"][6], // ኦ
  u: amharicChars["a"][1], // ኡ
};

const vowels = "aeiouE";
const vowelMap: { [key: string]: number } = {
  e: 0, // Ge'ez (as in s'e')
  u: 1, // Ka'eb
  i: 2, // Salis
  a: 3, // Rabi
  E: 4, // Hamis (as in s'ie')
  o: 6, // Sab'i
};

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

// Labialized "consonant + w + a" forms
const labializedAForms: { [previousChar: string]: string } = {
  [amharicChars["k"][5]]: "ኳ", // kwa
  [amharicChars["g"][5]]: "ጓ", // gwa
  [amharicChars["m"][5]]: "ሟ", // mwa
  [amharicChars["l"][5]]: "ሏ", // lwa
  [amharicChars["s"][5]]: "ሷ", // swa
  [amharicChars["r"][5]]: "ሯ", // rwa
  [amharicChars["b"][5]]: "ቧ", // bwa
  [amharicChars["t"][5]]: "ቷ", // twa
  [amharicChars["q"][5]]: "ቋ", // qwa
  [amharicChars["h"][5]]: "ኋ", // hwa
  [amharicChars["H"][5]]: "ኋ", // Hwa
};

// Create a reverse map to find the latin base for an amharic character
const reverseCharMap: { [key: string]: string } = {};
for (const latin in amharicChars) {
  for (const amharic of amharicChars[latin]) {
    // Prioritize multi-char mappings if a character is in multiple families
    // This is a simple heuristic, a more robust system might need more rules.
    if (!reverseCharMap[amharic] || latin.length > 1) {
      reverseCharMap[amharic] = latin;
    }
  }
}

const MODIFICATION_TIMEOUT = 3000; // ms

export const amharicTransliterate = (
  currentText: string,
  inputKey: string,
  cursorStart: number,
  cursorEnd: number,
  timeSinceLastPress?: number
): { newText: string; newCursorPos: number } => {
  let textBefore = currentText.substring(0, cursorStart);
  const textAfter = currentText.substring(cursorEnd);

  if (inputKey === "Backspace") {
    if (cursorStart === cursorEnd) {
      // No selection, delete one character before the cursor
      if (cursorStart === 0) return { newText: currentText, newCursorPos: 0 };
      const newText = currentText.slice(0, cursorStart - 1) + textAfter;
      return { newText, newCursorPos: cursorStart - 1 };
    } else {
      // Selection exists, delete the selected text
      const newText = textBefore + textAfter;
      return { newText, newCursorPos: cursorStart };
    }
  }

  const lastAmharicChar = textBefore.slice(-1);
  const lastLatinBase = reverseCharMap[lastAmharicChar];

  // 1. Check for multi-character consonants (e.g., 's' + 'h' -> 'sh')
  if (timeSinceLastPress && timeSinceLastPress > MODIFICATION_TIMEOUT) {
    // Timeout exceeded, don't attempt multi-character combinations
  } else {
  const potentialMultiChar = (textBefore.slice(-1) + inputKey).toLowerCase();
  if (multiCharConsonants[potentialMultiChar]) {
    const lastCharLatinBase = reverseCharMap[textBefore.slice(-1)];
    // This is a bit simplistic. A better approach might track the typed latin characters.
    // For now, we assume the last amharic character corresponds to the start of the multichar.
    // e.g., for 'sh', the last char should be from the 's' family.
    if (lastCharLatinBase && potentialMultiChar.startsWith(lastCharLatinBase.toLowerCase())) {
      const newBase = multiCharConsonants[potentialMultiChar];
      const newChar = amharicChars[newBase][5]; // 6th form (Sadis)
      return {
        newText: textBefore.slice(0, -1) + newChar + textAfter,
        newCursorPos: cursorStart,
      };
    }
  } else if (lastLatinBase && multiCharConsonants[lastLatinBase + inputKey]) { // Keep old logic for capitals
    const newBase = multiCharConsonants[lastLatinBase + inputKey]; 
    const newChar = amharicChars[newBase][5]; // 6th form (Sadis)
    return {
      newText: textBefore.slice(0, -1) + newChar + textAfter,
      newCursorPos: cursorStart,
    };
  }
  }

  // 2. Check for vowel modification
  const lowerInputKey = inputKey.toLowerCase();
  if (lastAmharicChar && vowels.includes(lowerInputKey)) {
    if (timeSinceLastPress && timeSinceLastPress > MODIFICATION_TIMEOUT) {
      // Timeout exceeded, treat as a new character
      const newChar = vowelAsChar[lowerInputKey];
      return {
        newText: textBefore + newChar + textAfter,
        newCursorPos: cursorStart + 1,
      };
    }

    // Handle labialized sequence: consonant + ው + a => labialized fidel.
    // Example: ክ + ው + a => ኳ
    if (lastAmharicChar === amharicChars["w"][5] && lowerInputKey === "a") {
      const previousChar = textBefore.slice(-2, -1);
      const labializedChar = labializedAForms[previousChar];
      if (labializedChar) {
        return {
          newText: textBefore.slice(0, -2) + labializedChar + textAfter,
          newCursorPos: cursorStart - 1,
        };
      }
    }

    for (let baseKey in amharicChars) {
      const charFamily = amharicChars[baseKey];
      const familyIndex = charFamily.indexOf(lastAmharicChar);
      if (familyIndex !== -1) {
        // Base consonant (6th form) + vowel => directly pick that vowel form.
        if (familyIndex === 5) {
          const vowelIndex = vowelMap[lowerInputKey] ?? 5;
          const newChar = charFamily[vowelIndex];
          return {
            newText: textBefore.slice(0, -1) + newChar + textAfter,
            newCursorPos: cursorStart,
          };
        }

        // Support both ee and ie forms for 5th form:
        // mee/see/kee and mie/sie/kie => ሜ/ሴ/ኬ
        if (
          (familyIndex === 0 && lowerInputKey === "e") ||
          (familyIndex === 2 && lowerInputKey === "e")
        ) {
          const newChar = charFamily[4]; // 5th form (Hamis)
          return {
            newText: textBefore.slice(0, -1) + newChar + textAfter,
            newCursorPos: cursorStart,
          };
        }

        // If the last character is already modified (not 6th form) or is a vowel-carrier,
        // a new vowel should create a new vowel-carrier character instead of modifying.
        // The 'a' family is at baseKey 'a'.
        if (familyIndex !== 5 && baseKey !== 'a') {
            const vowelIndex = vowelMap[lowerInputKey] ?? 5; // Default to 6th form 'እ'
            const newChar = amharicChars['a'][vowelIndex];
            return {
                newText: textBefore + newChar + textAfter,
                newCursorPos: cursorStart + 1,
            };
        }
        const vowelIndex = vowelMap[lowerInputKey]; // Find the vowel form
        const newChar = charFamily[vowelIndex];
        return {
          newText: textBefore.slice(0, -1) + newChar + textAfter,
          newCursorPos: cursorStart,
        };
      }
    }
  }

  // 3. New consonant
  const lowerKey = inputKey.toLowerCase();
  if (amharicChars[lowerKey]) {
    // Use 6th form (Sadis) for new consonants, which is at index 5
    const newChar = amharicChars[lowerKey][5];
    return {
      newText: textBefore + newChar + textAfter,
      newCursorPos: cursorStart + 1,
    };
  }

  // Handle vowels as new characters
  if (vowelAsChar[lowerKey]) {
    const newChar = vowelAsChar[lowerKey];
    return {
      newText: textBefore + newChar + textAfter,
      newCursorPos: cursorStart + 1,
    };
  }

  // 4. Default: insert the character as is (numbers, symbols, etc.)
  return {
    newText: textBefore + inputKey + textAfter,
    newCursorPos: cursorStart + 1,
  };
};
