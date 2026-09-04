import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_COMBINE_TIMEOUT_MS,
  amharicTransliterate,
  singleCharInsertion,
} from "./amharicTransliterate.ts";

/** Types a run of keys into an empty field, quickly enough to stay within one word. */
function type(keys: string, gapMs = 100): string {
  let text = "";
  let cursor = 0;
  for (const key of keys) {
    const result = amharicTransliterate(text, key, cursor, cursor, gapMs);
    text = result.newText;
    cursor = result.newCursorPos;
  }
  return text;
}

test("consonants and vowels combine into fidel", () => {
  assert.equal(type("selam"), "ሰላም");
  assert.equal(type("ityopya"), "ኢትዮጵያ");
  assert.equal(type("adis abeba"), "አዲስ አበባ");
});

test("digraphs collapse into a single fidel", () => {
  assert.equal(type("sh"), "ሽ");
  assert.equal(type("ch"), "ች");
  assert.equal(type("gn"), "ኝ");
  assert.equal(type("ny"), "ኝ");
  assert.equal(type("zh"), "ዥ");
  assert.equal(type("ts"), "ጽ");
  assert.equal(type("hh"), "ሕ");
});

test("capital letters reach the second family directly", () => {
  assert.equal(type("S"), "ሽ");
  assert.equal(type("T"), "ጥ");
  assert.equal(type("P"), "ጽ");
});

test("the Hamis form is reachable by ee, ie and capital E", () => {
  assert.equal(type("see"), "ሴ");
  assert.equal(type("sie"), "ሴ");
  assert.equal(type("sE"), "ሴ");
});

test("consonant + w + a collapses into the labialized fidel", () => {
  assert.equal(type("kwa"), "ኳ");
  assert.equal(type("gwa"), "ጓ");
  assert.equal(type("shwa"), "ሿ");
  assert.equal(type("chwa"), "ቿ");
  assert.equal(type("nwa"), "ኗ");
  assert.equal(type("zwa"), "ዟ");
  assert.equal(type("fwa"), "ፏ");
  assert.equal(type("ttwa"), "ጧ");
  // ሕ belongs to the Hawt family, so its labialized form is ሗ rather than ኋ.
  assert.equal(type("hhwa"), "ሗ");
});

test("a standalone vowel uses the carrier family", () => {
  assert.equal(type("a"), "አ");
  assert.equal(type("e"), "እ");
  assert.equal(type("i"), "ኢ");
  assert.equal(type("o"), "ኦ");
  assert.equal(type("u"), "ኡ");
  // Consecutive vowels re-shape the carrier rather than stacking, which is what
  // lets `ie` reach ኤ.
  assert.equal(type("ie"), "ኤ");
});

test("unmapped characters pass through untouched", () => {
  assert.equal(type("12"), "12");
  assert.equal(type("se be"), "ሰ በ");
});

test("a long pause stops the vowel folding into the previous consonant", () => {
  const settled = amharicTransliterate("ስ", "e", 1, 1, 9999);
  assert.equal(settled.newText, "ስእ");
});

test("combine word timeout defaults to 0.2s (200ms)", () => {
  assert.equal(DEFAULT_COMBINE_TIMEOUT_MS, 200);
  // Within default 200ms (e.g. 150ms), combines:
  const combined = amharicTransliterate("ስ", "e", 1, 1, 150);
  assert.equal(combined.newText, "ሰ");
  // Past default 200ms (e.g. 250ms), settles:
  const settled = amharicTransliterate("ስ", "e", 1, 1, 250);
  assert.equal(settled.newText, "ስእ");
});

test("configurable combine word timeout options work as expected", () => {
  // 0.2s (200ms)
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 190, 200).newText, "ሰ");
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 210, 200).newText, "ስእ");

  // 0.4s (400ms)
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 350, 400).newText, "ሰ");
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 450, 400).newText, "ስእ");

  // 0.8s (800ms)
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 750, 800).newText, "ሰ");
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 850, 800).newText, "ስእ");

  // 2s (2000ms)
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 1500, 2000).newText, "ሰ");
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 2100, 2000).newText, "ስእ");

  // Custom (e.g. 500ms)
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 400, 500).newText, "ሰ");
  assert.equal(amharicTransliterate("ስ", "e", 1, 1, 600, 500).newText, "ስእ");
});

test("backspace removes a selection whole", () => {
  const result = amharicTransliterate("ሰላም", "Backspace", 1, 3);
  assert.equal(result.newText, "ሰ");
  assert.equal(result.newCursorPos, 1);
});

test("backspace at the start of the field is a no-op", () => {
  const result = amharicTransliterate("ሰ", "Backspace", 0, 0);
  assert.equal(result.newText, "ሰ");
  assert.equal(result.newCursorPos, 0);
});

test("typing into the middle of the text preserves the tail", () => {
  const result = amharicTransliterate("ሰም", "l", 1, 1, 100);
  assert.equal(result.newText, "ሰልም");
  assert.equal(result.newCursorPos, 2);
});

test("singleCharInsertion locates a character typed at the end", () => {
  assert.deepEqual(singleCharInsertion("ሰ", "ሰl"), { char: "l", start: 1, end: 1 });
});

test("singleCharInsertion locates a character typed in the middle", () => {
  assert.deepEqual(singleCharInsertion("ሰም", "ሰlም"), { char: "l", start: 1, end: 1 });
});

test("singleCharInsertion reports the range a selection replaced", () => {
  // "ላም" was selected and overtyped with "b".
  assert.deepEqual(singleCharInsertion("ሰላም", "ሰb"), { char: "b", start: 1, end: 3 });
});

test("singleCharInsertion ignores deletions and pastes", () => {
  assert.equal(singleCharInsertion("ሰላ", "ሰ"), null); // backspace
  assert.equal(singleCharInsertion("ሰ", ""), null); // cleared
  assert.equal(singleCharInsertion("", "selam"), null); // pasted
  assert.equal(singleCharInsertion("ሰ", "ሰ"), null); // no change
});

test("an edit detected from the value transliterates the same as a keypress", () => {
  // What the textarea does on a phone: the raw letter lands in the value first.
  const edit = singleCharInsertion("ሰ", "ሰl");
  assert.ok(edit);
  const result = amharicTransliterate("ሰ", edit.char, edit.start, edit.end, 100);
  assert.equal(result.newText, "ሰል");
});
