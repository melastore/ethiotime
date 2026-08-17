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

test("an unbalanced bracket does not open a formula that never ends", () => {
  const input = ["[", "\\frac{a}{b}"].join("\n");
  // The bracket stays where it was; only the formula line itself is typeset.
  assert.equal(
    normalizeMath(input),
    ["[", "$$", "\\frac{a}{b}", "$$"].join("\n")
  );
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

test("typesets a formula left with one stray delimiter on it", () => {
  const pasted =
    "[x_i,x_{i+1}] = \\frac{[x_{i+1}]-[x_i]}{x_{i+2}-x_i}$}";

  assert.equal(
    normalizeMath(pasted),
    [
      "$$",
      "[x_i,x_{i+1}] = \\frac{[x_{i+1}]-[x_i]}{x_{i+2}-x_i}",
      "$$",
    ].join("\n")
  );
});

test("typesets a formula pasted with its delimiters gone entirely", () => {
  assert.equal(
    normalizeMath("\\frac{dy}{dx} = 3x^2"),
    ["$$", "\\frac{dy}{dx} = 3x^2", "$$"].join("\n")
  );
});

test("reads a one-line bracketed formula as display maths", () => {
  assert.equal(
    normalizeMath("[ \\frac{a}{b} ]"),
    ["$$", "\\frac{a}{b}", "$$"].join("\n")
  );
});

test("keeps brackets that are part of the formula rather than around it", () => {
  assert.equal(
    normalizeMath("[a,b] = [c,d_{1}]"),
    ["$$", "[a,b] = [c,d_{1}]", "$$"].join("\n")
  );
});

test("leaves a sentence that merely contains a formula as prose", () => {
  const input = "The area of the circle is \\pi r^2 exactly";
  assert.equal(normalizeMath(input), input);
});

test("leaves a price alone", () => {
  const input = "the book costs $5 today";
  assert.equal(normalizeMath(input), input);
});

test("wraps a bare \\begin{align} block in display maths", () => {
  const input = [
    "Working:",
    "",
    "\\begin{align}",
    "a &= b + c \\\\",
    "d &= e",
    "\\end{align}",
    "",
    "done",
  ].join("\n");

  assert.equal(
    normalizeMath(input),
    [
      "Working:",
      "",
      "$$",
      "\\begin{align}",
      "a &= b + c \\\\",
      "d &= e",
      "\\end{align}",
      "$$",
      "",
      "done",
    ].join("\n")
  );
});

test("leaves an environment that already carries its delimiters", () => {
  const input = ["$$", "\\begin{cases}", "x", "\\end{cases}", "$$"].join("\n");
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
