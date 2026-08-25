import { AMHARIC_WORDS } from "@/lib/amharic-words";

const ETHIOPIC_START = 0x1200;
// The regular syllabary stops here. Past it are ፘ/ፙ/ፚ, the combining marks,
// then punctuation and digits — none of which sit in blocks of eight.
const ETHIOPIC_END = 0x1357;
const BLOCK = 8;

/** Space, and the punctuation that ends a word in Amharic as well as English. */
const BOUNDARY = /[\s።፣፤፥፦፧፨,.!?;:()[\]{}"'`]/;

/**
 * The ግዕዝ form of a fidel — the consonant with the vowel taken back off.
 *
 * Ethiopic is laid out in blocks of eight: the bare consonant, its six vowel
 * forms, then a labialized one. Rounding down to the start of the block is
 * therefore the whole operation.
 */
export function fidelBase(char: string): string {
  const code = char.codePointAt(0);
  if (code === undefined || code < ETHIOPIC_START || code > ETHIOPIC_END) {
    return char;
  }

  return String.fromCodePoint(
    ETHIOPIC_START + Math.floor((code - ETHIOPIC_START) / BLOCK) * BLOCK
  );
}

/**
 * A word reduced to its consonants.
 *
 * This is what makes suggesting anything possible while a word is still being
 * typed. Transliteration rewrites the last letter on every keystroke, so
 * "selam" passes through ሰ, ሰል, ሰላ, ሰላም — and ሰላም does not start with ሰል, so
 * matching the text as written finds nothing until the word is already
 * finished. The consonants do line up: s, sl, sl, slm.
 */
export const skeleton = (word: string) =>
  [...word].map(fidelBase).join("");

// What may be offered to other devices as a suggestion: Ethiopic letters only,
// and long enough to be a word rather than a stray keystroke.
const AMHARIC_WORD = /^[\u1200-\u135A]{2,24}$/;

export const isAmharicWord = (word: string) => AMHARIC_WORD.test(word);

export type WordSpan = {
  /** Where the word starts in the text. */
  start: number;
  /** Where the cursor is, which is where the word ends for our purposes. */
  end: number;
  text: string;
};

/**
 * The word being typed: from the last boundary up to the cursor. Only what is
 * behind the cursor counts — a completion replaces what has been typed, not
 * whatever the cursor happens to be sitting in front of.
 */
export function wordAt(text: string, cursor: number): WordSpan {
  const end = Math.max(0, Math.min(cursor, text.length));
  let start = end;

  while (start > 0 && !BOUNDARY.test(text[start - 1])) start -= 1;

  return { start, end, text: text.slice(start, end) };
}

/**
 * Words that could finish `fragment`, best first.
 *
 * A word spelled the same so far outranks one that only shares consonants, and
 * a shorter word outranks a longer one, so the common word comes before its
 * own derivatives. List order breaks the remaining ties.
 */
export function suggestWords(
  fragment: string,
  limit = 6,
  words: readonly string[] = AMHARIC_WORDS
): string[] {
  const typed = fragment.trim();
  if (!typed) return [];

  const bones = skeleton(typed);
  const matches: { word: string; exact: boolean; index: number }[] = [];

  words.forEach((word, index) => {
    // Nothing to offer for a word that is already fully typed.
    if (word === typed) return;

    if (word.startsWith(typed)) {
      matches.push({ word, exact: true, index });
    } else if (skeleton(word).startsWith(bones)) {
      matches.push({ word, exact: false, index });
    }
  });

  matches.sort(
    (a, b) =>
      Number(b.exact) - Number(a.exact) ||
      a.word.length - b.word.length ||
      a.index - b.index
  );

  return matches.slice(0, limit).map((match) => match.word);
}

// Runs of non-boundary characters, which is what a word is here.
const WORD_RUN = /[^\s።፣፤፥፦፧፨,.!?;:()[\]{}"'`]+/g;

// Words the user has finished with, for reporting back to the shared list. The
// one under the cursor is skipped: it is still being typed, so it is as likely
// to be half a word as a whole one.
export function completedWords(text: string, cursor: number): string[] {
  const words: string[] = [];

  for (const match of text.matchAll(WORD_RUN)) {
    const start = match.index;
    if (cursor > start && cursor <= start + match[0].length) continue;
    if (isAmharicWord(match[0])) words.push(match[0]);
  }

  return words;
}

/**
 * Puts `word` in place of the fragment, followed by a space unless the text
 * already carries on with one.
 */
export function replaceWord(text: string, span: WordSpan, word: string) {
  const spaced = BOUNDARY.test(text[span.end] ?? "") ? word : `${word} `;

  return {
    text: text.slice(0, span.start) + spaced + text.slice(span.end),
    cursor: span.start + spaced.length,
  };
}
