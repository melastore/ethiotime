/**
 * Typesets the math nodes `remark-math` produces.
 *
 * This does the same job as `rehype-katex`, but calls KaTeX through this
 * module's own import. That matters because KaTeX ships both a CommonJS and an
 * ESM build, and `katex/contrib/mhchem` only registers `\ce{...}` on whichever
 * one it was loaded alongside. Going through `rehype-katex` leaves the two on
 * opposite sides of that split, and every chemistry formula renders as an
 * undefined-control-sequence error.
 */

import katex from "katex";
import "katex/contrib/mhchem";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { toText } from "hast-util-to-text";
import { visitParents } from "unist-util-visit-parents";
import type { Element, ElementContent, Root } from "hast";

export type RehypeMathOptions = {
  macros?: Record<string, string>;
  errorColor?: string;
};

type Pending = {
  parent: Element | Root;
  index: number;
  value: string;
  displayMode: boolean;
};

const classListOf = (node: Element): string[] => {
  const raw: unknown = node.properties?.className;
  if (Array.isArray(raw)) return raw.map(String);
  return typeof raw === "string" ? raw.split(/\s+/) : [];
};

export function rehypeMath(options: RehypeMathOptions = {}) {
  return (tree: Root) => {
    const pending: Pending[] = [];

    visitParents(tree, "element", (node, ancestors) => {
      const classes = classListOf(node);
      let displayMode = classes.includes("math-display");
      if (!displayMode && !classes.includes("math-inline")) return;

      // `remark-math` renders a `$$` block as `<pre><code class="math-display">`.
      // Replacing only the `<code>` would leave the `<pre>` behind, and this
      // project styles `<pre>` as a code listing — so every display formula
      // would sit inside a bordered grey code panel.
      let target: Element = node;
      let parent = ancestors[ancestors.length - 1] as Element | Root | undefined;

      if (node.tagName === "code" && (parent as Element)?.tagName === "pre") {
        target = parent as Element;
        parent = ancestors[ancestors.length - 2] as Element | Root | undefined;
        displayMode = true;
      }

      if (!parent) return;

      const index = parent.children.indexOf(target);
      if (index === -1) return;

      pending.push({
        parent,
        index,
        value: toText(target, { whitespace: "pre" }),
        displayMode,
      });
    });

    // Replaced back to front so an earlier replacement cannot shift the index
    // of one still queued.
    for (const { parent, index, value, displayMode } of pending.reverse()) {
      let replacement: ElementContent[];

      try {
        const html = katex.renderToString(value, {
          ...options,
          displayMode,
          throwOnError: true,
          output: "htmlAndMathml",
        });
        replacement = fromHtmlIsomorphic(html, { fragment: true })
          .children as ElementContent[];
      } catch (error) {
        // A formula that will not parse is shown where it was written, in the
        // error colour, rather than blanking the note it belongs to.
        replacement = [
          {
            type: "element",
            tagName: displayMode ? "div" : "span",
            properties: {
              className: ["math-error"],
              title: error instanceof Error ? error.message : "Invalid formula",
              style: `color:${options.errorColor ?? "#d1495b"}`,
            },
            children: [{ type: "text", value }],
          },
        ];
      }

      parent.children.splice(index, 1, ...replacement);
    }
  };
}
