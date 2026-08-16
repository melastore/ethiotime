/**
 * Cuts a note down to what a collapsed card can actually show.
 *
 * The feed clamps each card to a few lines, but clamping is done in CSS, so
 * without this the whole note is still parsed, every formula typeset and every
 * code block highlighted — all to display eight lines of it. On a feed of
 * chapter-length notes that is seconds of blocked main thread.
 *
 * The cut has to leave valid Markdown behind: stopping in the middle of a code
 * fence or a `$$` block would leave it unterminated, and the rest of the
 * preview would be swallowed by it.
 */

const FENCE = /^[ \t]*(`{3,}|~{3,})/;
const MATH_FENCE = /^[ \t]*\$\$[ \t]*$/;

export type Preview = { text: string; truncated: boolean };

export function previewOf(
  markdown: string,
  { maxLines = 14, maxChars = 900 } = {}
): Preview {
  if (markdown.length <= maxChars && !markdown.includes("\n", maxChars)) {
    const lines = markdown.split("\n");
    if (lines.length <= maxLines) return { text: markdown, truncated: false };
  }

  const lines = markdown.split("\n");
  const kept: string[] = [];
  let characters = 0;
  let fence: string | null = null;
  let inMath = false;

  for (const line of lines) {
    if (kept.length >= maxLines || characters >= maxChars) break;

    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (marker === fence) fence = null;
    } else if (fence === null && MATH_FENCE.test(line)) {
      inMath = !inMath;
    }

    kept.push(line);
    characters += line.length + 1;
  }

  const truncated = kept.length < lines.length;

  // Close whatever the cut landed inside, so the preview still parses.
  if (inMath) kept.push("$$");
  if (fence !== null) kept.push(fence.repeat(3));

  return { text: kept.join("\n"), truncated };
}
