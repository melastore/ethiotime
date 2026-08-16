/**
 * Repairs the LaTeX delimiters that survive a copy-paste, before parsing.
 *
 * Three things go wrong with pasted maths, none of which `remark-math` handles:
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
 * Fenced code is left exactly as written throughout: a formula shown as an
 * example of source is not a formula to typeset.
 */

const FENCE = /^[ \t]*(`{3,}|~{3,})/;
const LONE_OPEN = /^[ \t]*\\?\[[ \t]*$/;
const LONE_CLOSE = /^[ \t]*\\?\][ \t]*$/;
const ONE_LINE_DOLLAR = /^[ \t]*\$\$[ \t]*(\S[^\n]*?)[ \t]*\$\$[ \t]*$/;
const ONE_LINE_BRACKET = /^[ \t]*\\\[[ \t]*(\S[^\n]*?)[ \t]*\\\][ \t]*$/;
const INLINE_PAREN = /\\\(([\s\S]+?)\\\)/g;
const INLINE_BRACKET = /\\\[([^\n]+?)\\\]/g;
/**
 * A row of `=` under a line is a Markdown setext heading, which is how a
 * formula's own `=` gets eaten on the way in: `a = b` becomes `a`, a rule of
 * `=`, then `b`, and the formula renders as a title. Inside a formula such a
 * row can only ever have been that one character.
 */
const EQUALS_RULE = /^[ \t]*={3,}[ \t]*$/;

/** Line indices covered by a fenced code block, which must not be touched. */
function fencedLines(lines: string[]): boolean[] {
  const fenced = Array.from({ length: lines.length }, () => false);
  let fence: string | null = null;

  lines.forEach((line, index) => {
    const match = FENCE.exec(line);

    if (match) {
      const marker = match[1][0];
      if (fence === null) {
        fence = marker;
        fenced[index] = true;
        return;
      }
      if (marker === fence) {
        fence = null;
        fenced[index] = true;
        return;
      }
    }

    fenced[index] = fence !== null;
  });

  return fenced;
}

/**
 * Pairs up lone bracket lines. Only matched pairs become formulas, so an
 * unbalanced bracket is left alone rather than opening a block that never ends.
 */
function bracketPairs(lines: string[], fenced: boolean[]) {
  const open = new Set<number>();
  const close = new Set<number>();
  const stack: number[] = [];

  lines.forEach((line, index) => {
    if (fenced[index]) return;

    if (LONE_OPEN.test(line)) {
      stack.push(index);
    } else if (LONE_CLOSE.test(line) && stack.length > 0) {
      open.add(stack.pop() as number);
      close.add(index);
    }
  });

  return { open, close };
}

export function normalizeMath(markdown: string): string {
  const lines = markdown.split("\n");
  const fenced = fencedLines(lines);
  const { open, close } = bracketPairs(lines, fenced);

  const output: string[] = [];
  let inMath = false;

  lines.forEach((line, index) => {
    if (fenced[index]) {
      output.push(line);
      return;
    }

    if (open.has(index)) {
      inMath = true;
      output.push("$$");
      return;
    }

    if (close.has(index)) {
      inMath = false;
      output.push("$$");
      return;
    }

    if (inMath) {
      output.push(EQUALS_RULE.test(line) ? "=" : line);
      return;
    }

    const bracket = ONE_LINE_BRACKET.exec(line);
    if (bracket) {
      output.push("$$", bracket[1], "$$");
      return;
    }

    const dollar = ONE_LINE_DOLLAR.exec(line);
    if (dollar) {
      output.push("$$", dollar[1], "$$");
      return;
    }

    // `\[ \]` still in the middle of a sentence stays inline: breaking it out
    // would mean splitting the sentence around it.
    output.push(
      line
        .replace(INLINE_BRACKET, (_, tex: string) => `$${tex}$`)
        .replace(INLINE_PAREN, (_, tex: string) => `$${tex}$`)
    );
  });

  return output.join("\n");
}
