"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  Hash,
  Link2,
  NotebookPen,
  Pencil,
  Printer,
  Search,
  Send,
  Share2,
  Sigma,
  Star,
  Table2,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownView } from "@/components/note-taking/markdown-lazy";
import { NoteReader } from "@/components/note-taking/note-reader";
import { hasApi, shareNote, unshareNote } from "@/lib/api";
import {
  forgetShare,
  loadShares,
  rememberShare,
  type ShareRecord,
} from "@/lib/note-share";
import { previewOf } from "@/lib/markdown-preview";
import {
  NOTES_STORAGE_KEY,
  type Note,
  loadNotes,
  noteHeading,
} from "@/lib/notes";
import { writeJson } from "@/lib/storage";
import { cn } from "@/lib/utils";

type NotesTab = "all" | "favorites";

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";

/** Icon button in a note's action row. */
const ICON_BUTTON =
  "rounded-xl p-2 text-slate-500 transition-colors dark:text-slate-400";

/** Long notes are cut short until the reader asks for more. */
const COLLAPSED_HEIGHT = "max-h-[11rem]";

// A date on its own says nothing about how long is left, which is the part
// people read an expiry for.
function expiryLabel(expiresAt: number) {
  const days = Math.ceil((expiresAt - Date.now()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "note";

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
function NoteBody({
  content,
  title,
  isExpanded,
  onToggle,
  onRead,
}: {
  content: string;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRead: () => void;
}) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // A collapsed card shows a few lines, so only those are parsed and typeset.
  // Rendering the whole note and hiding the rest in CSS meant a feed of long
  // notes spent seconds typesetting formulas nobody could see.
  const preview = useMemo(() => previewOf(content), [content]);
  const canExpand = preview.truncated || isOverflowing;

  // Collapsing a long note pulls everything below it upwards, which can leave
  // the reader looking at a completely different part of the feed.
  const handleToggle = () => {
    const wasExpanded = isExpanded;
    onToggle();

    if (wasExpanded) {
      requestAnimationFrame(() =>
        rootRef.current?.scrollIntoView({ block: "nearest" })
      );
    }
  };

  useEffect(() => {
    const element = bodyRef.current;
    // Once expanded the element no longer overflows, so skip re-measuring and
    // keep the toggle available for collapsing again.
    if (!element || isExpanded || preview.truncated) return;

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
  }, [content, isExpanded, preview.truncated]);

  return (
    <div ref={rootRef}>
      <div
        ref={bodyRef}
        className={cn(
          "relative overflow-hidden",
          isExpanded ? "note-reading" : COLLAPSED_HEIGHT
        )}
      >
        {title && (
          <p className="mb-1 font-semibold text-slate-900 dark:text-white">
            {title}
          </p>
        )}
        <MarkdownView content={isExpanded ? content : preview.text} />

        {/* Fades the cut line so it reads as truncated, not as a hard crop. */}
        {!isExpanded && canExpand && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent dark:from-slate-900"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        {canExpand && (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={isExpanded}
            className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-950"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
        <button
          type="button"
          onClick={onRead}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Read
        </button>
      </div>
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
  // Held here rather than inside the note so the card itself can widen: an
  // expanded note is being read, not scanned, and a formula, a code listing or
  // a wide table has no room in a half-width column. A set rather than a single
  // id, so opening one note does not collapse another out from under the reader.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [readerNote, setReaderNote] = useState<Note | null>(null);
  const [printNote, setPrintNote] = useState<Note | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shares, setShares] = useState<Record<string, ShareRecord>>({});
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareNoteId, setShareNoteId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

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
    setNotes(loadNotes());
    setShares(loadShares());
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) writeJson(NOTES_STORAGE_KEY, notes);
  }, [notes, isMounted]);

  useEffect(() => {
    if (!copiedId) return;
    const timer = window.setTimeout(() => setCopiedId(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copiedId]);

  // "/" to search, "n" to write. Ignored while typing so they stay out of the way.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "n") {
        event.preventDefault();
        composerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        return `${note.title} ${note.content} ${note.tags.join(" ")}`
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, searchQuery, activeTab, activeTag]);

  const sharedNote = notes.find((note) => note.id === shareNoteId);
  const sharedLink = shareNoteId ? shares[shareNoteId] : undefined;

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

  // Shared links are stored per note, so re-sharing the same note reuses its
  // link instead of leaving a trail of dead ones.
  const share = async (note: Note) => {
    setConfirmStop(false);
    const existing = shares[note.id];
    if (existing) {
      setShareNoteId(note.id);
      return;
    }

    setSharingId(note.id);
    setExportError(null);

    try {
      const result = await shareNote(noteHeading(note), note.content);
      setShares(rememberShare(note.id, result));
      setShareNoteId(note.id);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Could not share that note."
      );
    } finally {
      setSharingId(null);
    }
  };

  // Two taps, like deleting. The link cannot be brought back.
  const stopSharing = async (noteId: string) => {
    const record = shares[noteId];
    if (!record) return;

    if (!confirmStop) {
      setConfirmStop(true);
      return;
    }

    setSharingId(noteId);

    try {
      await unshareNote(record.id, record.editToken);
    } catch {
      // Already gone from the server, or unreachable. Either way the link is of
      // no further use to this device.
    } finally {
      setShares(forgetShare(noteId));
      setShareNoteId(null);
      setConfirmStop(false);
      setSharingId(null);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setExportError("Could not copy the link. Select it and copy by hand.");
    }
  };

  // The phone share sheet, which is how a link like this usually travels. It
  // rejects when the sheet is dismissed, which is not worth reporting.
  const sendLink = (title: string, url: string) => {
    navigator.share({ title, url }).catch(() => {});
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

  const copyNote = async (note: Note) => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopiedId(note.id);
    } catch {
      setExportError("Could not copy that note to the clipboard.");
    }
  };

  // Two taps. Deleting was immediate and there is no undo.
  const deleteNote = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setNotes((previous) => previous.filter((note) => note.id !== id));
    setConfirmDeleteId(null);
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
        <header className="mb-5 lg:col-start-1 lg:row-start-1">
          <p className={EYEBROW}>Notes</p>
          <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Everything, in one place
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Markdown, LaTeX and code, saved on this device. Export to Word or PDF.
          </p>

          {isMounted && notes.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[
                { value: notes.length, label: notes.length === 1 ? "note" : "notes" },
                { value: notes.filter((note) => note.isFavorite).length, label: "starred" },
                { value: allTags.length, label: allTags.length === 1 ? "tag" : "tags" },
              ].map((stat) => (
                <span
                  key={stat.label}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span className="tabular-nums">{stat.value}</span>{" "}
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </span>
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Composer — a single line until it is being used. */}
        <div
          className={cn(
            "overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition-all duration-200 lg:col-start-1 lg:row-start-2 dark:bg-slate-900",
            editingId
              ? "border-teal-500 ring-4 ring-teal-500/15 dark:border-teal-500"
              : isComposerOpen
                ? "border-slate-300 shadow-md dark:border-slate-600"
                : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
          )}
        >
          {isPreview ? (
            <div className="min-h-[6rem] px-4 py-3.5">
              {draft.trim() ? (
                <MarkdownView content={draft} />
              ) : (
                <p className="text-sm text-slate-500">Nothing to preview yet.</p>
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
              className="scrollbar-slim block max-h-80 min-h-[3rem] w-full resize-none overflow-y-auto bg-transparent px-4 py-3.5 font-mono text-[14px] leading-relaxed text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-500 dark:text-slate-100"
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
                    className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
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
                    "ml-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                    isPreview
                      ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  Preview
                </button>
              </div>

              <span className="ml-auto hidden items-center gap-2 pl-1 text-xs text-slate-500 sm:inline-flex dark:text-slate-400">
                {draft.trim() && (
                  <span className="tabular-nums">
                    {draft.trim().split(/\s+/).length} words
                  </span>
                )}
                <span>
                  {editingId ? "Editing · Esc to cancel" : "Ctrl + Enter to save"}
                </span>
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
                  className="rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 px-5 py-2 text-sm font-black text-white shadow-sm transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
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
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search notes"
                  aria-label="Search notes"
                  className="h-11 w-full rounded-2xl border-2 border-slate-200 bg-white pl-9 pr-9 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <kbd
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 px-1.5 py-0.5 font-sans text-[10px] font-bold text-slate-500 lg:block dark:border-slate-700 dark:text-slate-400"
                  >
                    /
                  </kbd>
                )}
              </div>

              <div className="inline-flex shrink-0 rounded-2xl bg-slate-100 p-1 lg:w-full dark:bg-slate-800/60">
                {(["all", "favorites"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-bold capitalize transition-colors lg:flex-1",
                      activeTab === tab
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
                        "inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors",
                        isActive
                          ? "border-transparent bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-400"
                      )}
                    >
                      #{tag}
                      <span
                        className={cn(
                          "tabular-nums",
                          isActive
                            ? "text-teal-100"
                            : "text-slate-500 dark:text-slate-600"
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
            <div className="rounded-3xl border-2 border-dashed border-slate-300 px-5 py-14 text-center dark:border-slate-700">
              <span
                aria-hidden="true"
                className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg"
              >
                <NotebookPen className="h-6 w-6" />
              </span>
              <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
                {notes.length === 0 ? "Nothing written yet" : "No matches"}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {notes.length === 0
                  ? "Write your first note above. Press n to jump to it."
                  : "Try a different search or clear the filters."}
              </p>
            </div>
          ) : (
            /* Clamped cards keep a bounded height, so a wide screen can show two
               columns without the ragged gaps a masonry layout would leave. */
            <ul className="grid gap-2.5 xl:grid-cols-2">
              {visibleNotes.map((note, index) => (
                <li
                  key={note.id}
                  /* Capped so a long list does not trickle in for seconds. */
                  style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                  className={cn(
                    "animate-rise group flex flex-col rounded-3xl border-2 bg-white shadow-sm",
                    "transition-[transform,box-shadow,border-color] duration-200",
                    "hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900",
                    expandedIds.has(note.id)
                      ? "px-5 py-4 sm:px-7 sm:py-6 xl:col-span-2"
                      : "px-4 py-3.5",
                    note.isFavorite
                      ? "border-amber-300 bg-gradient-to-br from-amber-50/60 to-transparent dark:border-amber-500/40 dark:from-amber-950/20"
                      : "border-slate-200 hover:border-teal-300 dark:border-slate-800 dark:hover:border-teal-700"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <time
                        className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400"
                        dateTime={new Date(note.updatedAt).toISOString()}
                      >
                        {relativeTime(note.updatedAt, now)}
                      </time>
                      {note.tags.slice(0, 2).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                          className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-teal-100 hover:text-teal-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-teal-950 dark:hover:text-teal-300"
                        >
                          <Hash className="mr-0.5 h-2.5 w-2.5" aria-hidden="true" />
                          {tag}
                        </button>
                      ))}
                    </div>

                    {/* Always visible: hover-only controls are unreachable on touch. */}
                    <div className="-mr-1 flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        title="Copy Markdown"
                        onClick={() => copyNote(note)}
                        className={cn(
                          ICON_BUTTON,
                          copiedId === note.id
                            ? "text-teal-600 dark:text-teal-400"
                            : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        )}
                      >
                        {copiedId === note.id ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {copiedId === note.id ? "Copied" : "Copy Markdown"}
                        </span>
                      </button>
                      {hasApi() && (
                        <button
                          type="button"
                          title={
                            shares[note.id]
                              ? "Shared: show the link"
                              : "Share with a link"
                          }
                          disabled={sharingId === note.id}
                          onClick={() => share(note)}
                          className={cn(
                            ICON_BUTTON,
                            "hover:bg-slate-100 disabled:animate-pulse dark:hover:bg-slate-800",
                            shares[note.id]
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "hover:text-emerald-600 dark:hover:text-emerald-400"
                          )}
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">
                            {shares[note.id] ? "Shared" : "Share"}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        title="Export as Word (.docx)"
                        disabled={exportingId === note.id}
                        onClick={() => exportDocx(note)}
                        className={cn(
                          ICON_BUTTON,
                          "hover:bg-slate-100 hover:text-blue-600 disabled:animate-pulse dark:hover:bg-slate-800 dark:hover:text-blue-400"
                        )}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Export as Word</span>
                      </button>
                      <button
                        type="button"
                        title="Export as PDF"
                        onClick={() => setPrintNote(note)}
                        className={cn(
                          ICON_BUTTON,
                          "hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                        )}
                      >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Export as PDF</span>
                      </button>
                      <button
                        type="button"
                        title="Download Markdown (.md)"
                        onClick={() => exportMarkdown(note)}
                        className={cn(
                          ICON_BUTTON,
                          "hidden hover:bg-slate-100 hover:text-slate-900 sm:block dark:hover:bg-slate-800 dark:hover:text-white"
                        )}
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Download Markdown</span>
                      </button>

                      <span
                        className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700"
                        aria-hidden="true"
                      />

                      <button
                        type="button"
                        onClick={() => toggleFavorite(note.id)}
                        aria-pressed={note.isFavorite}
                        className={cn(
                          ICON_BUTTON,
                          "hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-950/30"
                        )}
                      >
                        <Star
                          className={cn(
                            "h-4 w-4 transition-transform",
                            note.isFavorite &&
                              "scale-110 fill-amber-400 text-amber-400"
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
                        title="Edit"
                        onClick={() => startEditing(note)}
                        className={cn(
                          ICON_BUTTON,
                          "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        )}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Edit note</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        onBlur={() => setConfirmDeleteId(null)}
                        title={
                          confirmDeleteId === note.id ? "Tap again to delete" : "Delete"
                        }
                        className={cn(
                          "rounded-xl p-2 transition-colors",
                          confirmDeleteId === note.id
                            ? "bg-rose-600 text-white"
                            : "text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        )}
                      >
                        {confirmDeleteId === note.id ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {confirmDeleteId === note.id
                            ? "Confirm delete"
                            : "Delete note"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <NoteBody
                    content={note.content}
                    title={note.title}
                    isExpanded={expandedIds.has(note.id)}
                    onToggle={() => toggleExpanded(note.id)}
                    onRead={() => setReaderNote(note)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {readerNote && (
        <NoteReader
          title={noteHeading(readerNote)}
          content={readerNote.content}
          onClose={() => setReaderNote(null)}
        />
      )}

      {shareNoteId && sharedNote && sharedLink && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (open) return;
            setShareNoteId(null);
            setConfirmStop(false);
          }}
        >
          <DialogContent className="w-[92%] max-w-md overflow-hidden rounded-3xl border-none bg-white p-0 shadow-2xl outline-none [&>button]:hidden dark:bg-slate-900">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-600 to-slate-900 px-5 pb-5 pt-4 text-white">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/20 blur-3xl"
              />

              <DialogClose className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </DialogClose>

              <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                Shared link
              </p>

              <p className="relative mt-1.5 font-mono text-4xl font-black leading-none">
                {sharedLink.id}
              </p>

              <p className="relative mt-2 truncate pr-8 text-sm font-semibold text-white/85">
                {noteHeading(sharedNote)}
              </p>

              <p className="relative mt-3 border-t border-white/20 pt-2.5 text-sm text-white/75">
                Anyone with the link can read it. Stops working{" "}
                {expiryLabel(sharedLink.expiresAt)}.
              </p>
            </div>

            <DialogTitle className="sr-only">
              Share link {sharedLink.id}
            </DialogTitle>

            <div className="space-y-2 px-5 pb-4 pt-4">
              <button
                type="button"
                onClick={() => copyLink(sharedLink.url)}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800"
              >
                <Link2
                  className="h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700 dark:text-slate-200">
                  {sharedLink.url}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  {linkCopied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {linkCopied ? "Copied" : "Copy"}
                </span>
              </button>

              {isMounted && typeof navigator.share === "function" && (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => sendLink(noteHeading(sharedNote), sharedLink.url)}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send it
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                {confirmStop
                  ? "The link dies for good. Tap again."
                  : "The note stays on this device either way."}
              </p>

              <button
                type="button"
                disabled={sharingId === shareNoteId}
                onClick={() => stopSharing(shareNoteId)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50",
                  confirmStop
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                )}
              >
                Stop sharing
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
