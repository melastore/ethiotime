import assert from "node:assert/strict";
import test from "node:test";

import { previewOf } from "./markdown-preview.ts";

test("a short note is returned whole and not marked truncated", () => {
  const note = "just a line\n\nand another";
  assert.deepEqual(previewOf(note), { text: note, truncated: false });
});

test("a long note is cut and marked truncated", () => {
  const note = Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n");
  const preview = previewOf(note, { maxLines: 5 });

  assert.equal(preview.truncated, true);
  assert.equal(preview.text.split("\n").length, 5);
  assert.ok(note.startsWith(preview.text));
});

test("a cut inside a code fence closes the fence", () => {
  const note = ["intro", "```python", "a = 1", "b = 2", "c = 3"].join("\n");
  const preview = previewOf(note, { maxLines: 3 });

  assert.equal(preview.text.split("\n").at(-1), "```");
  // Two fences: the opener and the one added, so the block terminates.
  assert.equal((preview.text.match(/```/g) ?? []).length, 2);
});

test("a cut inside a display formula closes it", () => {
  const note = ["intro", "$$", "E = mc^2", "and more", "tail"].join("\n");
  const preview = previewOf(note, { maxLines: 3 });

  assert.equal(preview.text.split("\n").at(-1), "$$");
  assert.equal((preview.text.match(/\$\$/g) ?? []).length, 2);
});

test("a fence that closed before the cut is not reopened", () => {
  const note = ["```", "a", "```", "text", "more", "and more"].join("\n");
  const preview = previewOf(note, { maxLines: 5 });

  assert.equal((preview.text.match(/```/g) ?? []).length, 2);
});

test("a $$ inside a code fence does not count as a formula", () => {
  const note = ["```md", "$$", "x", "y"].join("\n");
  const preview = previewOf(note, { maxLines: 3 });

  // The fence is closed, and no stray $$ is appended for the example inside it.
  assert.equal(preview.text.split("\n").at(-1), "```");
});

test("the character budget cuts a note with very long lines", () => {
  const note = Array.from({ length: 5 }, () => "x".repeat(400)).join("\n");
  const preview = previewOf(note, { maxLines: 100, maxChars: 500 });

  assert.equal(preview.truncated, true);
  assert.ok(preview.text.length < note.length);
});
