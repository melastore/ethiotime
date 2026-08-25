import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AMHARIC_WORDS } from "./amharic-words.ts";
import {
  fidelBase,
  replaceWord,
  skeleton,
  suggestWords,
  wordAt,
} from "./amharic-suggest.ts";

describe("fidelBase", () => {
  it("takes the vowel back off every form of a consonant", () => {
    for (const form of ["ሰ", "ሱ", "ሲ", "ሳ", "ሴ", "ስ", "ሶ"]) {
      assert.equal(fidelBase(form), "ሰ");
    }
  });

  it("leaves anything that is not fidel alone", () => {
    assert.equal(fidelBase("a"), "a");
    assert.equal(fidelBase(" "), " ");
    assert.equal(fidelBase("፣"), "፣");
  });
});

describe("skeleton", () => {
  it("matches a half-typed word against the finished one", () => {
    // What the transliterator actually puts on screen, keystroke by keystroke.
    for (const partial of ["ሰ", "ሰል", "ሰላ"]) {
      assert.equal(skeleton("ሰላም").startsWith(skeleton(partial)), true, partial);
    }
  });

  it("does not collapse two different consonants together", () => {
    assert.notEqual(skeleton("ላም"), skeleton("ሳም"));
  });
});

describe("wordAt", () => {
  it("reads back to the space before the cursor", () => {
    const text = "ሰላም አዲ";
    assert.deepEqual(wordAt(text, text.length), {
      start: 4,
      end: 6,
      text: "አዲ",
    });
  });

  it("stops at Amharic punctuation", () => {
    assert.equal(wordAt("ሰላም። አዲ", 8).text, "አዲ");
  });

  it("ignores whatever sits after the cursor", () => {
    assert.equal(wordAt("ሰላም አዲስ", 6).text, "አዲ");
  });

  it("gives nothing when the cursor follows a space", () => {
    assert.equal(wordAt("ሰላም ", 5).text, "");
  });
});

describe("suggestWords", () => {
  it("completes a word from its opening consonant", () => {
    assert.equal(suggestWords("ሰላ").includes("ሰላም"), true);
  });

  it("completes it mid-keystroke, before the vowel lands", () => {
    assert.equal(suggestWords("ሰል").includes("ሰላም"), true);
  });

  it("puts the word spelled the same so far first", () => {
    // Both share consonants with "ኢት"; only one is also spelled that way.
    assert.equal(suggestWords("ኢት")[0], "ኢትዮጵያ");
  });

  it("does not offer a word that is already finished", () => {
    assert.equal(suggestWords("ሰላም").includes("ሰላም"), false);
  });

  it("gives nothing for an empty fragment", () => {
    assert.deepEqual(suggestWords("   "), []);
  });

  it("keeps to the limit asked for", () => {
    assert.equal(suggestWords("መ", 4).length, 4);
  });
});

describe("replaceWord", () => {
  it("swaps the fragment for the word and adds a space", () => {
    const text = "ሰላም አዲ";
    const result = replaceWord(text, wordAt(text, text.length), "አዲስ");

    assert.equal(result.text, "ሰላም አዲስ ");
    assert.equal(result.cursor, 8);
  });

  it("does not add a second space when one follows", () => {
    const text = "አዲ ከተማ";
    const result = replaceWord(text, wordAt(text, 2), "አዲስ");

    assert.equal(result.text, "አዲስ ከተማ");
    assert.equal(result.cursor, 3);
  });
});

describe("AMHARIC_WORDS", () => {
  it("has no duplicates", () => {
    assert.equal(new Set(AMHARIC_WORDS).size, AMHARIC_WORDS.length);
  });

  it("is all fidel", () => {
    const stray = AMHARIC_WORDS.filter((word) => !/^[ሀ-፿ ]+$/.test(word));
    assert.deepEqual(stray, []);
  });
});
