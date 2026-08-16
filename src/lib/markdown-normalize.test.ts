import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMath } from "./markdown-normalize.ts";

test("expands one-line display maths onto its own lines", () => {
  assert.equal(normalizeMath("$$E = mc^2$$"), "$$\nE = mc^2\n$$");
});

test("leaves inline dollar maths alone", () => {
  assert.equal(normalizeMath("energy is $E = mc^2$ here"), "energy is $E = mc^2$ here");
});

test("converts LaTeX \\( \\) delimiters to inline maths", () => {
  assert.equal(normalizeMath("the value \\(x^2\\) grows"), "the value $x^2$ grows");
});

test("converts LaTeX \\[ \\] delimiters to display maths", () => {
  assert.equal(normalizeMath("\\[x^2\\]"), "$$\nx^2\n$$");
});

test("reads a bracket alone on its line as a display formula", () => {
  const pasted = ["Find:", "", "[", "\\frac{dy}{dx}", "]"].join("\n");
  assert.equal(
    normalizeMath(pasted),
    ["Find:", "", "$$", "\\frac{dy}{dx}", "$$"].join("\n")
  );
});

test("leaves an unbalanced bracket alone rather than opening a formula", () => {
  const input = ["[", "\\frac{a}{b}"].join("\n");
  assert.equal(normalizeMath(input), input);
});

test("does not disturb a Markdown link", () => {
  const input = "see [the docs](https://example.com) and [a][ref]";
  assert.equal(normalizeMath(input), input);
});

test("does not disturb a reference link definition", () => {
  const input = "[ref]: https://example.com";
  assert.equal(normalizeMath(input), input);
});

test("leaves everything inside a fenced code block untouched", () => {
  const input = ["```md", "$$x$$", "[", "\\alpha", "]", "```"].join("\n");
  assert.equal(normalizeMath(input), input);
});

test("a bracket pair spanning a fence boundary does not pair across it", () => {
  const input = ["```", "[", "```", "text"].join("\n");
  assert.equal(normalizeMath(input), input);
});

test("restores the = that a setext heading rule ate inside a formula", () => {
  const pasted = ["[", "\\frac{dy}{dx}", "=============", "\\frac{1}{h}", "]"].join("\n");
  assert.equal(
    normalizeMath(pasted),
    ["$$", "\\frac{dy}{dx}", "=", "\\frac{1}{h}", "$$"].join("\n")
  );
});

test("keeps a real setext heading outside a formula", () => {
  const input = ["Chapter 5", "=========", "", "text"].join("\n");
  assert.equal(normalizeMath(input), input);
});

test("handles several formulas in one document", () => {
  const input = [
    "Given \\(h = 1\\):",
    "",
    "[",
    "u = 0",
    "]",
    "",
    "and \\[I = 10.5\\] follows",
  ].join("\n");

  assert.equal(
    normalizeMath(input),
    [
      "Given $h = 1$:",
      "",
      "$$",
      "u = 0",
      "$$",
      "",
      "and $I = 10.5$ follows",
    ].join("\n")
  );
});
