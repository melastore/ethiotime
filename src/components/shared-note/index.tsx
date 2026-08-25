"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { MarkdownView } from "@/components/note-taking/markdown-lazy";
import { Button } from "@/components/ui/button";
import { ApiError, fetchSharedNote, type SharedNote as Note } from "@/lib/api";

type State =
  | { status: "loading" }
  | { status: "ready"; note: Note }
  | { status: "error"; message: string };

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9ሀ-፿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "note";

export default function SharedNote() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [saving, setSaving] = useState(false);

  // The id is in the query string rather than the path: the site is statically
  // exported, so there is no route to generate for an id that does not exist yet.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";

    if (!id) {
      setState({ status: "error", message: "This link is missing a note id." });
      return;
    }

    let cancelled = false;

    fetchSharedNote(id)
      .then((note) => {
        if (!cancelled) setState({ status: "ready", note });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setState({
          status: "error",
          message:
            error instanceof ApiError && error.status === 404
              ? "This note has been deleted or the link has expired."
              : error instanceof Error
                ? error.message
                : "Could not load this note.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveDocx = async (note: Note) => {
    setSaving(true);
    try {
      const { noteToDocxBlob } = await import("@/lib/note-docx");
      const blob = await noteToDocxBlob(note.title, note.content);
      downloadBlob(blob, `${slugify(note.title)}.docx`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/note-taking/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Notes
      </Link>

      {state.status === "loading" && (
        <div
          className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
          aria-hidden="true"
        />
      )}

      {state.status === "error" && (
        <div className="rounded-xl border border-slate-200 p-8 text-center dark:border-slate-800">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="text-slate-600 dark:text-slate-300">{state.message}</p>
        </div>
      )}

      {state.status === "ready" && (
        <article>
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                {state.note.title || "Untitled note"}
              </h1>
              <p className="text-sm text-slate-500">
                Shared {new Date(state.note.createdAt).toLocaleDateString()}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => saveDocx(state.note)}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {saving ? "Preparing…" : "Word (.docx)"}
            </Button>
          </header>

          <MarkdownView content={state.note.content} />
        </article>
      )}
    </main>
  );
}
