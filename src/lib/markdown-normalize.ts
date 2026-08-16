/**
 * `remark-math` only reads `$$` as a display formula when the delimiters sit on
 * their own lines, so the far more common one-line form
 *
 *     $$E = mc^2$$
 *
 * parses as inline math and renders mid-sentence instead of centred on its own.
 * Every editor people arrive from — Obsidian, Typora, GitHub — treats that line
 * as display math, so it is expanded to the fenced form before parsing.
 *
 * Lines inside a fenced code block are left exactly as written: a formula shown
 * as an example of source is not a formula to typeset.
 */

const ONE_LINE_DISPLAY = /^[ \t]*\$\$[ \t]*(\S[^\n]*?)[ \t]*\$\$[ \t]*$/;
const FENCE = /^[ \t]*(`{3,}|~{3,})/;

export function normalizeDisplayMath(markdown: string): string {
  const lines = markdown.split("\n");
  const output: string[] = [];
  let fence: string | null = null;

  for (const line of lines) {
    const fenceMatch = FENCE.exec(line);

    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) {
        fence = marker[0];
      } else if (marker[0] === fence) {
        fence = null;
      }
      output.push(line);
      continue;
    }

    const match = fence === null ? ONE_LINE_DISPLAY.exec(line) : null;
    if (match) {
      output.push("$$", match[1], "$$");
    } else {
      output.push(line);
    }
  }

  return output.join("\n");
}
