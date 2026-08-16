"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Code2,
  Download,
  FileText,
  NotebookPen,
  Printer,
  Search,
  Sigma,
  Star,
  Table2,
  Trash2,
  X,
} from "lucide-react";

import dynamic from "next/dynamic";

import { readJson, writeJson } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * The renderer carries the TeX typesetter and the syntax highlighter, which
 * together outweigh everything else on the page. Notes are read from this
 * device after mount anyway, so nothing is lost by fetching it separately.
 */
const MarkdownView = dynamic(
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

/**
 * The stored shape is kept as-is so notes written by earlier versions keep
 * working; `title` and `color` are no longer authored, only displayed.
 */
interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  isFavorite: boolean;
  updatedAt: number;
}

const STORAGE_KEY = "modern-notes-data";

type NotesTab = "all" | "favorites";

/** Long notes are cut short until the reader asks for more. */
const COLLAPSED_HEIGHT = "max-h-[11rem]";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "note";

/** A note has no title field any more, so the first meaningful line names it. */
function noteHeading(note: Note): string {
  if (note.title.trim()) return note.title.trim();

  const firstLine = note.content.split("\n").find((line) => line.trim());
  return firstLine?.replace(/^#+\s*/, "").trim().slice(0, 80) || "Note";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked late: Firefox cancels the download if the URL dies too soon.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const loadNotesFromStorage = (): Note[] =>
  readJson<Note[]>(STORAGE_KEY, [], (value): value is Note[] =>
    Array.isArray(value)
  );

/** Tags are written inline as #hashtags and pulled out of the text on save. */
function extractTags(content: string): string[] {
  const matches = content.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return Array.from(new Set(matches.map((tag) => tag.slice(1).toLowerCase())));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function relativeTime(timestamp: number, now: number): string {
  const elapsed = now - timestamp;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Note text with #tags highlighted, clamped to a few lines while it overflows.
 * Whether the note is actually too tall is measured rather than guessed, so
 * short notes never get a pointless "Show more".
 */
function NoteBody({ content, title }: { content: string; title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = bodyRef.current;
    // Once expanded the element no longer overflows, so skip re-measuring and
    // keep the toggle available for collapsing again.
    if (!element || isExpanded) return;

    const measure = () =>
      setIsOverflowing(element.scrollHeight > element.clientHeight + 4);

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // Formulas and highlighted code settle a frame after the markup lands, and
    // the note is taller once they do.
    const settle = window.setTimeout(measure, 250);

    return () => {
      observer.disconnect();
      window.clearTimeout(settle);
    };
  }, [content, isExpanded]);

  return (
    <div>
      <div
        ref={bodyRef}
        className={cn(
          "relative overflow-hidden",
          !isExpanded && COLLAPSED_HEIGHT
        )}
      >
        {title && (
          <p className="mb-1 font-semibold text-slate-900 dark:text-white">
            {title}
          </p>
        )}
        <MarkdownView content={content} />

        {/* Fades the cut line so it reads as truncated, not as a hard crop. */}
        {!isExpanded && isOverflowing && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent dark:from-slate-900"
            aria-hidden="true"
          />
        )}
      </div>

      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          aria-expanded={isExpanded}
          className="mt-1 text-xs font-semibold text-teal-600 transition-colors hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function NoteTaking() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<NotesTab>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isPreview, setIsPreview] = useState(false);
  const [printNote, setPrintNote] = useState<Note | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // PDF goes through the browser's print pipeline, which keeps formulas as
  // selectable vector text instead of a screenshot. The note is mounted into a
  // print-only region first, then handed over once it has typeset.
  useEffect(() => {
    if (!printNote) return;

    const timer = window.setTimeout(() => {
      window.print();
      setPrintNote(null);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [printNote]);

  useEffect(() => {
    setNotes(loadNotesFromStorage());
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) writeJson(STORAGE_KEY, notes);
  }, [notes, isMounted]);

  // Keeps the "5m ago" stamps honest without re-rendering constantly.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE);
    return () => window.clearInterval(timer);
  }, []);

  // The composer grows with the text.
  useEffect(() => {
    const element = composerRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
  }, [draft]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      for (const tag of note.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notes
      .filter((note) => {
        if (activeTab === "favorites" && !note.isFavorite) return false;
        if (activeTag && !note.tags.includes(activeTag)) return false;
        if (!query) return true;
        return `${note.title} ${note.content}`.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, searchQuery, activeTab, activeTag]);

  const isComposerOpen = isComposerFocused || draft.length > 0 || isPreview;
  // The wide two-column layout only earns its place once there is a feed and a
  // filter rail to put in it.
  const hasNotes = isMounted && notes.length > 0;

  const exportMarkdown = (note: Note) => {
    downloadBlob(
      new Blob([note.content], { type: "text/markdown;charset=utf-8" }),
      `${slugify(noteHeading(note))}.md`
    );
  };

  const exportDocx = async (note: Note) => {
    setExportingId(note.id);
    setExportError(null);

    try {
      // Loaded on demand: the writer and the TeX typesetter together are far
      // larger than the rest of this page.
      const { noteToDocxBlob } = await import("@/lib/note-docx");
      const blob = await noteToDocxBlob(noteHeading(note), note.content);
      downloadBlob(blob, `${slugify(noteHeading(note))}.docx`);
    } catch {
      setExportError("Could not build the Word file for that note.");
    } finally {
      setExportingId(null);
    }
  };

  /** Wraps the selection, or drops in a placeholder when nothing is selected. */
  const insertSnippet = (before: string, after: string, placeholder: string) => {
    const element = composerRef.current;
    if (!element) return;

    const { selectionStart, selectionEnd } = element;
    const selected = draft.slice(selectionStart, selectionEnd) || placeholder;

    setDraft(
      draft.slice(0, selectionStart) +
        before +
        selected +
        after +
        draft.slice(selectionEnd)
    );

    // The textarea has not re-rendered with the new value yet, so the selection
    // has to be restored once it has.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(
        selectionStart + before.length,
        selectionStart + before.length + selected.length
      );
    });
  };

  const saveDraft = () => {
    const content = draft.trim();
    if (!content) return;

    if (editingId) {
      setNotes((previous) =>
        previous.map((note) =>
          note.id === editingId
            ? { ...note, content, tags: extractTags(content), updatedAt: Date.now() }
            : note
        )
      );
      setEditingId(null);
    } else {
      setNotes((previous) => [
        {
          id:
            globalThis.crypto?.randomUUID?.() ??
            `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: "",
          content,
          color: "default",
          tags: extractTags(content),
          isFavorite: false,
          updatedAt: Date.now(),
        },
        ...previous,
      ]);
    }

    setDraft("");
    setIsPreview(false);
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setDraft(note.content);
    setIsPreview(false);
    composerRef.current?.focus();
    composerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft("");
    setIsPreview(false);
  };

  const toggleFavorite = (id: string) => {
    setNotes((previous) =>
      previous.map((note) =>
        note.id === id ? { ...note, isFavorite: !note.isFavorite } : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes((previous) => previous.filter((note) => note.id !== id));
    if (editingId === id) cancelEditing();
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      saveDraft();
    }
    if (event.key === "Escape" && editingId) cancelEditing();
  };

  return (
    <section
      className={cn(
        "mx-auto w-full max-w-2xl px-1 py-2",
        hasNotes && "lg:max-w-6xl"
      )}
    >
      <div
        className={cn(
          hasNotes &&
            "lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-x-8"
        )}
      >
        <header className="mb-5 flex items-end justify-between gap-4 lg:col-start-1 lg:row-start-1">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notes
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              Markdown, LaTeX and code, saved on this device. Export to Word or
              PDF.
            </p>
          </div>
          {isMounted && notes.length > 0 && (
            <span className="shrink-0 pb-1 text-sm tabular-nums text-slate-400 dark:text-slate-500">
              {notes.length}
            </span>
          )}
        </header>

        {/* Composer — a single line until it is being used. */}
        <div
          className={cn(
            "rounded-2xl border bg-white transition-colors lg:col-start-1 lg:row-start-2 dark:bg-slate-900",
            editingId
              ? "border-teal-500 dark:border-teal-600"
              : isComposerOpen
                ? "border-slate-300 dark:border-slate-700"
                : "border-slate-200 dark:border-slate-800"
          )}
        >
          {isPreview ? (
            <div className="min-h-[6rem] px-4 py-3.5">
              {draft.trim() ? (
                <MarkdownView content={draft} />
              ) : (
                <p className="text-sm text-slate-400">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <textarea
              ref={composerRef}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Write a note…  **bold**, $E=mc^2$, ```python"
              aria-label={editingId ? "Edit note" : "Write a new note"}
              className="scrollbar-slim block max-h-80 min-h-[3rem] w-full resize-none overflow-y-auto bg-transparent px-4 py-3.5 font-mono text-[14px] leading-relaxed text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 dark:text-slate-100"
            />
          )}

          {isComposerOpen && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
              <div className="flex items-center gap-0.5">
                {[
                  {
                    icon: Sigma,
                    label: "Inline formula",
                    args: ["$", "$", "E = mc^2"] as const,
                  },
                  {
                    icon: FileText,
                    label: "Display formula",
                    args: ["\n$$\n", "\n$$\n", "\\int_0^1 x\\,dx"] as const,
                  },
                  {
                    icon: Code2,
                    label: "Code block",
                    args: ["\n```python\n", "\n```\n", "print(1)"] as const,
                  },
                  {
                    icon: Table2,
                    label: "Table",
                    args: ["\n| ", " |  |\n| --- | --- |\n|  |  |\n", "a"] as const,
                  },
                ].map(({ icon: Icon, label, args }) => (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    disabled={isPreview}
                    onClick={() => insertSnippet(args[0], args[1], args[2])}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{label}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsPreview((value) => !value)}
                  aria-pressed={isPreview}
                  className={cn(
                    "ml-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    isPreview
                      ? "bg-teal-600 text-white"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}
                >
                  Preview
                </button>
              </div>

              <span className="ml-auto hidden pl-1 text-xs text-slate-400 sm:inline dark:text-slate-500">
                {editingId ? "Editing · Esc to cancel" : "Ctrl + Enter to save"}
              </span>
              <div className="flex items-center gap-1.5">
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!draft.trim()}
                  className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters — hidden until there is something to filter; on a wide screen
            they move into a sticky rail instead of stacking over the feed. */}
        {hasNotes && (
          <aside className="mt-5 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0">
            <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search notes"
                  aria-label="Search notes"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5 lg:w-full dark:bg-slate-800">
                {(["all", "favorites"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors lg:flex-1",
                      activeTab === tab
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              /* One scrolling row on narrow screens so a long tag list never
                 pushes the feed down; in the rail it simply wraps. */
              <div className="scrollbar-slim mt-2.5 flex gap-1.5 overflow-x-auto pb-1.5 lg:flex-wrap lg:overflow-x-visible lg:pb-0">
                {allTags.map(([tag, count]) => {
                  const isActive = activeTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag(isActive ? null : tag)}
                      aria-pressed={isActive}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        isActive
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-200 text-slate-600 hover:border-teal-500 hover:text-teal-700 dark:border-slate-800 dark:text-slate-400 dark:hover:text-teal-400"
                      )}
                    >
                      #{tag}
                      <span
                        className={cn(
                          "tabular-nums",
                          isActive
                            ? "text-teal-100"
                            : "text-slate-400 dark:text-slate-600"
                        )}
                      >
                        {count}
                      </span>
                      {isActive && <X className="h-3 w-3" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>
        )}

        {/* Feed */}
        <div className="mt-4 lg:col-start-1 lg:row-start-3">
          {!isMounted ? (
            <div
              className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              aria-hidden="true"
            />
          ) : visibleNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-800">
              <NotebookPen
                className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {notes.length === 0
                  ? "No notes yet. Write your first one above."
                  : "Nothing matches those filters."}
              </p>
            </div>
          ) : (
            /* Clamped cards keep a bounded height, so a wide screen can show two
               columns without the ragged gaps a masonry layout would leave. */
            <ul className="grid gap-2.5 xl:grid-cols-2">
              {visibleNotes.map((note) => (
                <li
                  key={note.id}
                  className={cn(
                    "group flex flex-col rounded-2xl border bg-white px-4 py-3 transition-colors dark:bg-slate-900",
                    note.isFavorite
                      ? "border-amber-200 dark:border-amber-500/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <time
                      className="text-xs text-slate-400 dark:text-slate-500"
                      dateTime={new Date(note.updatedAt).toISOString()}
                    >
                      {relativeTime(note.updatedAt, now)}
                    </time>

                    {/* Always visible: hover-only controls are unreachable on touch. */}
                    <div className="-mr-1.5 flex items-center gap-0.5">
                      <button
                        type="button"
                        title="Export as Word (.docx)"
                        disabled={exportingId === note.id}
                        onClick={() => exportDocx(note)}
                        className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:animate-pulse dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Export as Word</span>
                      </button>
                      <button
                        type="button"
                        title="Export as PDF"
                        onClick={() => setPrintNote(note)}
                        className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                      >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Export as PDF</span>
                      </button>
                      <button
                        type="button"
                        title="Download Markdown (.md)"
                        onClick={() => exportMarkdown(note)}
                        className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Download Markdown</span>
                      </button>

                      <span
                        className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700"
                        aria-hidden="true"
                      />

                      <button
                        type="button"
                        onClick={() => toggleFavorite(note.id)}
                        aria-pressed={note.isFavorite}
                        className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-amber-500 dark:text-slate-600 dark:hover:bg-slate-800"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            note.isFavorite && "fill-amber-400 text-amber-400"
                          )}
                          aria-hidden="true"
                        />
                        <span className="sr-only">
                          {note.isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditing(note)}
                        className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Delete note</span>
                      </button>
                    </div>
                  </div>

                  <NoteBody content={note.content} title={note.title} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {exportError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {exportError}
        </p>
      )}

      {/* Mounted only while a PDF is being produced, and shown only to the
          printer — the stylesheet hides everything else on the page. */}
      {printNote && (
        <div id="note-print-root" className="hidden print:block">
          <h1 className="mb-4 text-2xl font-bold">{noteHeading(printNote)}</h1>
          <MarkdownView content={printNote.content} />
        </div>
      )}
    </section>
  );
}
