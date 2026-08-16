"use client";

import dynamic from "next/dynamic";

/**
 * The renderer carries the TeX typesetter and the syntax highlighter, which
 * together outweigh everything else on the page. Notes are only read from this
 * device after mount, so nothing is lost by fetching it separately.
 *
 * Declared once and shared, so the feed and the reader resolve to the same
 * chunk rather than each pulling their own.
 */
export const MarkdownView = dynamic(
  () =>
    import("@/components/note-taking/markdown-view").then(
      (module) => module.MarkdownView
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
        aria-hidden="true"
      />
    ),
  }
);
