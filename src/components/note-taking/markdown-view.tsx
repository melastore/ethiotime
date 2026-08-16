"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";

import "katex/dist/katex.min.css";

import { normalizeMath } from "@/lib/markdown-normalize";
import { rehypeMath } from "@/lib/rehype-math";
import { cn } from "@/lib/utils";

const KATEX_OPTIONS = {
  macros: {
    "\\RR": "\\mathbb{R}",
    "\\NN": "\\mathbb{N}",
    "\\ZZ": "\\mathbb{Z}",
    "\\QQ": "\\mathbb{Q}",
    "\\CC": "\\mathbb{C}",
    "\\dd": "\\,\\mathrm{d}",
    "\\ddx": "\\frac{\\mathrm{d}}{\\mathrm{d}x}",
    "\\abs": "\\left|#1\\right|",
    "\\norm": "\\left\\|#1\\right\\|",
    "\\ket": "\\left|#1\\right\\rangle",
    "\\bra": "\\left\\langle#1\\right|",
    "\\braket": "\\left\\langle#1\\right\\rangle",
    "\\unit": "\\,\\mathrm{#1}",
  },
};

/**
 * Renders note text as Markdown with LaTeX and fenced code.
 *
 * Raw HTML is deliberately not enabled: notes are user text rendered straight
 * back into the page, and `rehype-raw` would make a pasted `<script>` live.
 */
function MarkdownViewComponent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("note-prose", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeMath, KATEX_OPTIONS],
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
      >
        {normalizeMath(content)}
      </ReactMarkdown>
    </div>
  );
}

// Notes re-render on every keystroke elsewhere in the feed; parsing Markdown and
// typesetting maths is far too expensive to repeat for unchanged text.
export const MarkdownView = memo(MarkdownViewComponent);
