/**
 * Repairs the LaTeX delimiters that survive a copy-paste, before parsing.
 *
 * Five things go wrong with pasted maths, none of which `remark-math` handles:
 *
 *  1. `\(x\)` and `\[x\]` are standard LaTeX delimiters, but `remark-math` only
 *     reads `$`. Anything copied out of a LaTeX document, a PDF or a chat
 *     assistant arrives in that form and renders as raw backslashes.
 *
 *  2. Those escapes are often lost on the way, leaving a bare `[` and `]` alone
 *     on their own lines around the formula. A lone bracket line means nothing
 *     in Markdown, so reading it as a display formula costs nothing and rescues
 *     the very common degraded paste.
 *
 *  3. `remark-math` only treats `$$` as display when the delimiters sit on
 *     their own lines, so the far more usual one-line `$$E = mc^2$$` renders
 *     mid-sentence instead of centred.
 *
 *  4. A `\begin{align}` environment is often pasted with no delimiters at all
 *     around it, because in a real LaTeX document it needs none. On its own it
 *     is not maths to `remark-math`, and Markdown then eats the `\\` row breaks
 *     inside it for good measure.
 *
 *  5. The delimiters arrive damaged rather than missing: a formula alone on its
 *     line keeps one stray `$` or one stray `}` from the markup that was
 *     stripped around it, and one loose character is enough to leave the whole
 *     line as text. A line that is a formula and nothing else is typeset once
 *     the strays are taken off it.
 *
 * Fenced code is left exactly as written throughout: a formula shown as an
 * example of source is not a formula to typeset. So is anything already inside
 * a `$$` block, which is by definition already maths.
 */

// Imported by path rather than through the `@/` alias so that the unit tests,
// which run straight on the source files, can resolve it.
import { fenceLooseCode, protectedLines } from "./markdown-code.ts";

const LONE_OPEN = /^[ \t]*\\?\[[ \t]*$/;
const LONE_CLOSE = /^[ \t]*\\?\][ \t]*$/;
const ONE_LINE_DOLLAR = /^[ \t]*\$\$[ \t]*(\S[^\n]*?)[ \t]*\$\$[ \t]*$/;
const ONE_LINE_BRACKET = /^[ \t]*\\\[[ \t]*(\S[^\n]*?)[ \t]*\\\][ \t]*$/;
const BRACKET_LINE = /^[ \t]*\[[ \t]*(\S[^\n]*?)[ \t]*\][ \t]*$/;
const INLINE_PAREN = /\\\(([\s\S]+?)\\\)/g;
const INLINE_BRACKET = /\\\[([^\n]+?)\\\]/g;
/**
 * A row of `=` under a line is a Markdown setext heading, which is how a
 * formula's own `=` gets eaten on the way in: `a = b` becomes `a`, a rule of
 * `=`, then `b`, and the formula renders as a title. Inside a formula such a
 * row can only ever have been that one character.
 */
const EQUALS_RULE = /^[ \t]*={3,}[ \t]*$/;

/** The multi-line environments that stand in for `$$` in pasted LaTeX. */
const ENVIRONMENT =
  /\\begin\{(align\*?|aligned|alignat\*?|equation\*?|gather\*?|gathered|multline\*?|split|cases|array|[bBpvV]?matrix|smallmatrix)\}/;

/** Enough TeX for a line to be worth reading as a formula at all. */
const TEX_HINT = /\\[a-zA-Z]{2,}|[_^][{(]|[_^][A-Za-z0-9]/;
/** Markdown structure, which is never a stray formula. */
const STRUCTURAL = /^[ \t]*(#{1,6}[ \t]|[-*+][ \t]|\d+[.)][ \t]|>|\||!?\[[^\]]*\]\()/;
const WORD = /[A-Za-z]{3,}/g;
const TEXT_COMMAND =
  /\\(text|textbf|textit|textrm|mathrm|mathbf|mathit|operatorname)\{[^{}]*\}/g;
const INNERMOST_GROUP = /\{[^{}]*\}/g;

/**
 * Whether a line is a formula and nothing else.
 *
 * Variables are single letters and everything spelled out is a command, so once
 * the commands and their arguments are taken away a formula has no words left
 * in it. A sentence with a formula in it still does, and is left alone: turning
 * a whole sentence into maths would set its words in italics one letter at a
 * time.
 */
function isBareFormula(line: string): boolean {
  if (!TEX_HINT.test(line) || STRUCTURAL.test(line)) return false;

  let stripped = line.replace(TEXT_COMMAND, "").replace(/\\[a-zA-Z]+/g, "");
  for (let previous = ""; previous !== stripped; ) {
    previous = stripped;
    stripped = stripped.replace(INNERMOST_GROUP, "");
  }

  return (stripped.match(WORD)?.length ?? 0) === 0;
}

/**
 * Drops the `$` and the `}` that close nothing, and closes the `{` that nothing
 * closes — the shapes a stripped-out delimiter leaves behind. `\$` and `\}` are
 * characters of the formula and are counted as such.
 */
function stripStrayDelimiters(tex: string): string {
  const kept: string[] = [];
  const open: number[] = [];

  for (let index = 0; index < tex.length; index += 1) {
    const character = tex[index];

    if (character === "\\") {
      kept.push(character, tex[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (character === "$") continue;

    if (character === "{") open.push(kept.length);
    else if (character === "}") {
      if (open.length > 0) open.pop();
      else continue;
    }

    kept.push(character);
  }

  return (kept.join("") + "}".repeat(open.length)).trim();
}

/** How many `$` a line carries, not counting an escaped `\$`. */
function countDollars(line: string): number {
  let count = 0;

  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === "\\") index += 1;
    else if (line[index] === "$") count += 1;
  }

  return count;
}

/**
 * Whether the brackets around a line enclose the whole of it, rather than being
 * part of the formula: `[a, b]` is delimited, `[a, b] = [c, d]` is not.
 */
function bracketsEnclose(inner: string): boolean {
  let depth = 1;

  for (const character of inner) {
    if (character === "[") depth += 1;
    else if (character === "]") depth -= 1;
    if (depth === 0) return false;
  }

  return true;
}

/**
 * Pairs up lone bracket lines. Only matched pairs become formulas, so an
 * unbalanced bracket is left alone rather than opening a block that never ends.
 */
function bracketPairs(lines: string[], isProtected: boolean[]) {
  const open = new Set<number>();
  const close = new Set<number>();
  const stack: number[] = [];

  lines.forEach((line, index) => {
    if (isProtected[index]) return;

    if (LONE_OPEN.test(line)) {
      stack.push(index);
    } else if (LONE_CLOSE.test(line) && stack.length > 0) {
      open.add(stack.pop() as number);
      close.add(index);
    }
  });

  return { open, close };
}

/** Where each undelimited `\begin{…}` block starts and ends. */
function environmentBlocks(lines: string[], isProtected: boolean[]) {
  const blocks = new Map<number, number>();

  for (let index = 0; index < lines.length; index += 1) {
    if (isProtected[index]) continue;

    const match = ENVIRONMENT.exec(lines[index]);
    // A `$` on the line means it is delimited already.
    if (!match || lines[index].includes("$")) continue;

    const end = `\\end{${match[1]}}`;
    if (lines[index].includes(end)) {
      blocks.set(index, index);
      continue;
    }

    for (let scan = index + 1; scan < lines.length; scan += 1) {
      if (isProtected[scan]) break;
      if (lines[scan].includes(end)) {
        blocks.set(index, scan);
        index = scan;
        break;
      }
    }
  }

  return blocks;
}

export function normalizeMath(markdown: string): string {
  const lines = markdown.split("\n");
  const isProtected = protectedLines(lines);
  const { open, close } = bracketPairs(lines, isProtected);
  const environments = environmentBlocks(lines, isProtected);

  const output: string[] = [];
  let inMath = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (isProtected[index]) {
      output.push(line);
      continue;
    }

    if (open.has(index)) {
      inMath = true;
      output.push("$$");
      continue;
    }

    if (close.has(index)) {
      inMath = false;
      output.push("$$");
      continue;
    }

    if (inMath) {
      output.push(EQUALS_RULE.test(line) ? "=" : line);
      continue;
    }

    const environmentEnd = environments.get(index);
    if (environmentEnd !== undefined) {
      output.push("$$", ...lines.slice(index, environmentEnd + 1), "$$");
      index = environmentEnd;
      continue;
    }

    const bracket = ONE_LINE_BRACKET.exec(line);
    if (bracket) {
      output.push("$$", bracket[1], "$$");
      continue;
    }

    const dollar = ONE_LINE_DOLLAR.exec(line);
    if (dollar) {
      output.push("$$", dollar[1], "$$");
      continue;
    }

    // A formula the escapes were stripped off: `[ x^2 ]` alone on its line, its
    // brackets still standing in for `\[ \]`.
    const bare = BRACKET_LINE.exec(line);
    if (bare && bracketsEnclose(bare[1]) && isBareFormula(bare[1])) {
      output.push("$$", stripStrayDelimiters(bare[1]), "$$");
      continue;
    }

    // A formula alone on its line with no delimiters left, or with one stray
    // delimiter still stuck to it.
    const dollars = countDollars(line);
    if (dollars === 0 || dollars % 2 !== 0) {
      const repaired = stripStrayDelimiters(line);
      if (repaired && isBareFormula(repaired)) {
        output.push("$$", repaired, "$$");
        continue;
      }
    }

    // `\[ \]` still in the middle of a sentence stays inline: breaking it out
    // would mean splitting the sentence around it.
    output.push(
      line
        .replace(INLINE_BRACKET, (_, tex: string) => `$${tex}$`)
        .replace(INLINE_PAREN, (_, tex: string) => `$${tex}$`)
    );
  }

  return output.join("\n");
}

/**
 * Everything a pasted note is put through before it is parsed: its code is
 * fenced first, so that the maths pass leaves it alone.
 */
export function normalizeNote(markdown: string): string {
  return normalizeMath(fenceLooseCode(markdown));
}
