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
import { visit } from "unist-util-visit";
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

    visit(tree, "element", (node, index, parent) => {
      if (index === undefined || !parent) return;

      const classes = classListOf(node);
      const displayMode = classes.includes("math-display");
      if (!displayMode && !classes.includes("math-inline")) return;

      pending.push({
        parent: parent as Element | Root,
        index,
        value: toText(node, { whitespace: "pre" }),
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
