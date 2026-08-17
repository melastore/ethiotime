/**
 * The stored note shape, shared by the note editor and the focus timer.
 *
 * Both read the same localStorage key, so the key, the shape and the rule for
 * naming an untitled note live here rather than being copied.
 */

import { readJson } from "@/lib/storage";

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  isFavorite: boolean;
  updatedAt: number;
}

export const NOTES_STORAGE_KEY = "modern-notes-data";

export const loadNotes = (): Note[] =>
  readJson<Note[]>(NOTES_STORAGE_KEY, [], (value): value is Note[] =>
    Array.isArray(value)
  );

/** A note has no title field any more, so the first meaningful line names it. */
export function noteHeading(note: Note): string {
  if (note.title.trim()) return note.title.trim();

  const firstLine = note.content.split("\n").find((line) => line.trim());
  return firstLine?.replace(/^#+\s*/, "").trim().slice(0, 80) || "Note";
}
