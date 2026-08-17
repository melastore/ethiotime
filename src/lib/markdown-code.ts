/**
 * Shows the code in a pasted note as code.
 *
 * Notes are rendered with raw HTML switched off — a pasted `<script>` must
 * never become live — and Markdown answers that by dropping the tags into the
 * page as loose text. So a tutorial pasted out of a chat, the single most
 * common thing in these notes, arrives with its examples flattened: `<ul>` and
 * `<li>` lines lose their indentation and run together, and a CSS rule collapses
 * onto one line. The code the note is *about* is the part that reads worst.
 *
 * Fencing it fixes both halves at once: the source is shown exactly as written,
 * monospaced and indented, and it is highlighted like any other code block. It
 * also survives the .docx export, which has nothing to do with raw HTML either.
 *
 * Everything here is deliberately conservative — a paste is only fenced when it
 * cannot be anything but code — and anything already inside a fence is left
 * exactly as it was.
 */

const FENCE = /^[ \t]*(`{3,}|~{3,})/;
const MATH_FENCE = /^[ \t]*\$\$[ \t]*$/;
const BLANK = /^[ \t]*$/;

/** A tag, near enough: `<p>`, `</p>`, `<img src="a.jpg">`, `<br/>`. */
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^<>]*)?)(\/?)>/;
const TAG_GLOBAL = new RegExp(TAG.source, "g");
/** A Markdown code span, so tags already shown as code are left alone. */
const CODE_SPAN = /(`[^`]*`)/;
/** Doctype, comment or processing instruction. */
const HTML_ASIDE = /^[ \t]{0,3}<[!?]/;

/** Elements with no closing tag, which therefore never open a block. */
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** Lines a fenced code block or a `$$` formula covers, which are never rewritten. */
export function protectedLines(lines: string[]): boolean[] {
  const protectedAt = Array.from({ length: lines.length }, () => false);
  let fence: string | null = null;
  let inMath = false;

  lines.forEach((line, index) => {
    const match = FENCE.exec(line);

    if (match) {
      const marker = match[1][0];
      if (fence === null) {
        fence = marker;
        protectedAt[index] = true;
        return;
      }
      if (marker === fence) {
        fence = null;
        protectedAt[index] = true;
        return;
      }
    }

    if (fence === null && MATH_FENCE.test(line)) {
      protectedAt[index] = true;
      inMath = !inMath;
      return;
    }

    protectedAt[index] = fence !== null || inMath;
  });

  return protectedAt;
}

/** How many elements a line leaves open, counting only tags it closes itself. */
function tagBalance(line: string): number {
  let depth = 0;

  for (const match of line.matchAll(TAG_GLOBAL)) {
    const [, closing, name, , selfClosing] = match;
    if (closing) depth -= 1;
    else if (!selfClosing && !VOID_ELEMENTS.has(name.toLowerCase())) depth += 1;
  }

  return depth;
}

function startsWithTag(line: string): boolean {
  if (HTML_ASIDE.test(line)) return true;
  const match = TAG.exec(line);
  return match?.index === line.length - line.trimStart().length;
}

/** Whether an element left open at `from` is ever closed further down. */
function closesLater(lines: string[], from: number, depth: number): boolean {
  let open = depth;
  let blanks = 0;

  for (let index = from; index < lines.length && index < from + 200; index += 1) {
    if (FENCE.test(lines[index])) return false;

    if (BLANK.test(lines[index])) {
      blanks += 1;
      // One blank line inside a page of markup is layout; two is the end of it.
      if (blanks > 1) return false;
      continue;
    }

    blanks = 0;
    open += tagBalance(lines[index]);
    if (open <= 0) return true;
  }

  return false;
}

/** The last line of the run of markup that starts at `start`. */
function htmlBlockEnd(
  lines: string[],
  start: number,
  isProtected: boolean[]
): number {
  let depth = 0;
  let end = start;

  for (let index = start; index < lines.length; index += 1) {
    if (isProtected[index]) break;

    if (BLANK.test(lines[index])) {
      if (depth <= 0) break;
      if (!closesLater(lines, index + 1, depth)) break;
      continue;
    }

    // With nothing left open, prose has resumed unless another element starts.
    if (index > start && depth <= 0 && !startsWithTag(lines[index])) break;

    depth += tagBalance(lines[index]);
    end = index;
  }

  return end;
}

/** Wraps a tag left in the middle of a sentence in a code span. */
function inlineTagsAsCode(line: string): string {
  return line
    .split(CODE_SPAN)
    .map((part, index) =>
      index % 2 === 1 ? part : part.replace(TAG_GLOBAL, (tag) => `\`${tag}\``)
    )
    .join("");
}

/**
 * A line that opens a brace block: a CSS selector, or any other head ending in
 * `{`. A TeX command rules it out — `\left\{` opens a formula, not a block.
 */
const BRACE_OPEN = /^[^\s{}][^{}]*\{[ \t]*$/;
const BRACE_CLOSE = /^\}[ \t;]*$/;
const DECLARATION = /[:;]/;
const TEX_COMMAND = /\\[a-zA-Z]/;

/**
 * The last line of a brace block starting at `start`, or `-1` if the lines that
 * follow do not close one.
 */
function braceBlockEnd(
  lines: string[],
  start: number,
  isProtected: boolean[]
): number {
  let declarations = false;

  for (let index = start + 1; index < lines.length; index += 1) {
    if (isProtected[index] || FENCE.test(lines[index])) return -1;

    if (BRACE_CLOSE.test(lines[index])) {
      if (!declarations) return -1;

      // A blank line then another rule is the same listing, not prose.
      let next = index + 1;
      while (next < lines.length && BLANK.test(lines[next])) next += 1;
      if (
        next < lines.length &&
        !isProtected[next] &&
        BRACE_OPEN.test(lines[next]) &&
        !TEX_COMMAND.test(lines[next])
      ) {
        const merged = braceBlockEnd(lines, next, isProtected);
        if (merged !== -1) return merged;
      }

      return index;
    }

    if (BLANK.test(lines[index])) continue;
    if (DECLARATION.test(lines[index])) declarations = true;
  }

  return -1;
}

/**
 * Fences the code in a note that was pasted without its fences: runs of HTML,
 * and brace blocks such as a CSS rule. Tags in the middle of a sentence become
 * code spans.
 */
export function fenceLooseCode(markdown: string): string {
  const lines = markdown.split("\n");
  const isProtected = protectedLines(lines);
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (isProtected[index]) {
      output.push(line);
      continue;
    }

    if (startsWithTag(line)) {
      const end = htmlBlockEnd(lines, index, isProtected);
      output.push("```html", ...lines.slice(index, end + 1), "```");
      index = end;
      continue;
    }

    if (BRACE_OPEN.test(line) && !TEX_COMMAND.test(line)) {
      const end = braceBlockEnd(lines, index, isProtected);
      if (end !== -1) {
        // Left without a language: the highlighter guesses better across the
        // CSS, JavaScript and C-shaped things that all look like this.
        output.push("```", ...lines.slice(index, end + 1), "```");
        index = end;
        continue;
      }
    }

    output.push(inlineTagsAsCode(line));
  }

  return output.join("\n");
}
