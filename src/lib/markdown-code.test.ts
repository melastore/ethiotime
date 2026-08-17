import assert from "node:assert/strict";
import test from "node:test";

import { fenceLooseCode } from "./markdown-code.ts";

test("fences a run of markup as HTML", () => {
  const pasted = ["<ul>", "    <li>Apple</li>", "</ul>"].join("\n");

  assert.equal(
    fenceLooseCode(pasted),
    ["```html", "<ul>", "    <li>Apple</li>", "</ul>", "```"].join("\n")
  );
});

test("keeps a whole page together across the blank lines inside it", () => {
  const pasted = [
    "<html>",
    "<head>",
    "",
    "    <title>Practice</title>",
    "</head>",
    "</html>",
    "",
    "Some prose after it.",
  ].join("\n");

  assert.equal(
    fenceLooseCode(pasted),
    [
      "```html",
      "<html>",
      "<head>",
      "",
      "    <title>Practice</title>",
      "</head>",
      "</html>",
      "```",
      "",
      "Some prose after it.",
    ].join("\n")
  );
});

test("keeps consecutive void elements in one block", () => {
  const pasted = ['<input type="text">', '<input type="email">'].join("\n");

  assert.equal(
    fenceLooseCode(pasted),
    ["```html", '<input type="text">', '<input type="email">', "```"].join("\n")
  );
});

test("stops the block where the prose starts again", () => {
  const pasted = ["<br>", "Important attributes:", "<hr>"].join("\n");

  assert.equal(
    fenceLooseCode(pasted),
    [
      "```html",
      "<br>",
      "```",
      "Important attributes:",
      "```html",
      "<hr>",
      "```",
    ].join("\n")
  );
});

test("shows a tag inside a sentence as a code span", () => {
  assert.equal(
    fenceLooseCode("Use the <img> element for images."),
    "Use the `<img>` element for images."
  );
});

test("does not wrap a tag that is already a code span", () => {
  const input = "Use the `<img>` element.";
  assert.equal(fenceLooseCode(input), input);
});

test("leaves an autolink alone", () => {
  const input = "see <https://example.com> and <me@example.com>";
  assert.equal(fenceLooseCode(input), input);
});

test("fences a CSS rule", () => {
  const pasted = [".cat {", "    width: 300px;", "}"].join("\n");

  assert.equal(
    fenceLooseCode(pasted),
    ["```", ".cat {", "    width: 300px;", "}", "```"].join("\n")
  );
});

test("keeps consecutive rules in one listing", () => {
  const pasted = [
    "table {",
    "    border-collapse: collapse;",
    "}",
    "",
    "th, td {",
    "    padding: 10px;",
    "}",
  ].join("\n");

  assert.equal(fenceLooseCode(pasted), ["```", ...pasted.split("\n"), "```"].join("\n"));
});

test("leaves a brace that never closes as prose", () => {
  const input = ["it looked like this {", "and then it stopped"].join("\n");
  assert.equal(fenceLooseCode(input), input);
});

test("leaves a formula that opens a brace alone", () => {
  const input = ["f(x) = \\left\\{", "x: 1", "}"].join("\n");
  assert.equal(fenceLooseCode(input), input);
});

test("leaves everything inside an existing fence untouched", () => {
  const input = ["```html", "<ul>", "</ul>", "```", ""].join("\n");
  assert.equal(fenceLooseCode(input), input);
});

test("leaves markup inside a display formula untouched", () => {
  const input = ["$$", "a < b > c", "$$"].join("\n");
  assert.equal(fenceLooseCode(input), input);
});
