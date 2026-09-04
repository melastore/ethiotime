// Syncing the device's own storage, one record at a time.
//
// Every tool here keeps its state in localStorage, so the sync works at that
// level rather than reaching into each component. A collection key holds an
// array of records with ids and is synced per record, which is what lets a note
// written on a phone and a note written on a laptop both survive. Everything
// else is a single document under its own key.

import { NOTES_STORAGE_KEY } from "@/lib/notes";
import { readText, writeText } from "@/lib/storage";

export type SyncRow = {
  bucket: string;
  id: string;
  payload: string | null;
  updatedAt: number;
};

type Collection = {
  bucket: string;
  key: string;
  // When a record last changed. Notes carry it; an append-only log uses the
  // moment it was written; anything else falls back to nothing changing.
  stamp: (record: Record<string, unknown>) => number;
};

const number = (value: unknown) => (typeof value === "number" ? value : 0);

export const COLLECTIONS: Collection[] = [
  {
    bucket: "notes",
    key: NOTES_STORAGE_KEY,
    stamp: (record) => number(record.updatedAt),
  },
  {
    bucket: "planner-events",
    key: "ethiotime-planner-events",
    stamp: (record) => number(record.updatedAt) || number(record.createdAt),
  },
  {
    bucket: "focus-sessions",
    key: "focus-timer-sessions",
    stamp: (record) => number(record.startedAt),
  },
];

// Single values. The id is the storage key itself, so one row holds one setting
// and two devices changing different settings do not fight.
export const DOCUMENTS = [
  "ethiotime-theme",
  "ethiotime-language",
  "focus-timer-settings",
  "focus-timer-chime",
  "focus-timer-autostart",
  "ethiotime-amharic-timeout",
];

const DOCUMENT_BUCKET = "settings";

// Version in the name. The cursor used to be a millisecond stamp and is now a
// counter, so an old value would be read as a counter far in the future and
// nothing would ever be pulled again. A new name starts everyone from zero.
export const SHADOW_KEY = "ethiotime-sync-shadow-2";
export const CURSOR_KEY = "ethiotime-sync-cursor-2";

export type Shadow = Record<string, SyncRow>;

export const rowKey = (bucket: string, id: string) => `${bucket}:${id}`;

// What is on the device right now, in the shape the server speaks.
export function localRows(read = readText): SyncRow[] {
  const rows: SyncRow[] = [];

  for (const collection of COLLECTIONS) {
    const raw = read(collection.key);
    if (raw === null) continue;

    let records: unknown;
    try {
      records = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(records)) continue;

    for (const record of records) {
      if (!record || typeof record !== "object") continue;
      const item = record as Record<string, unknown>;
      if (typeof item.id !== "string") continue;

      rows.push({
        bucket: collection.bucket,
        id: item.id,
        payload: JSON.stringify(item),
        updatedAt: collection.stamp(item),
      });
    }
  }

  for (const key of DOCUMENTS) {
    const raw = read(key);
    if (raw === null) continue;
    rows.push({ bucket: DOCUMENT_BUCKET, id: key, payload: raw, updatedAt: 0 });
  }

  return rows;
}

// What changed here since the last sync. The shadow is the copy of what the
// server was last known to hold, so a record matching it is not sent again and
// one that has vanished is sent as a tombstone.
export function outgoing(rows: SyncRow[], shadow: Shadow, now: number): SyncRow[] {
  const changes: SyncRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key = rowKey(row.bucket, row.id);
    seen.add(key);

    const known = shadow[key];
    if (known && known.payload === row.payload) continue;

    // A settings row has no stamp of its own, and a record whose stamp did not
    // move still has to beat what the server holds, so a changed payload is
    // dated now.
    const stamp =
      row.updatedAt > (known?.updatedAt ?? 0) ? row.updatedAt : now;

    changes.push({ ...row, updatedAt: stamp });
  }

  for (const [key, known] of Object.entries(shadow)) {
    if (seen.has(key) || known.payload === null) continue;
    changes.push({ ...known, payload: null, updatedAt: now });
  }

  return changes;
}

// The server's version of a record wins only if it is newer than the device's.
export function merge(rows: SyncRow[], remote: SyncRow[]): SyncRow[] {
  const byKey = new Map(rows.map((row) => [rowKey(row.bucket, row.id), row]));

  for (const row of remote) {
    const key = rowKey(row.bucket, row.id);
    const mine = byKey.get(key);
    if (mine && mine.updatedAt > row.updatedAt) continue;
    byKey.set(key, row);
  }

  return [...byKey.values()];
}

// Back into localStorage, in the shapes the tools expect to read.
export function writeRows(rows: SyncRow[], write = writeText) {
  for (const collection of COLLECTIONS) {
    const records = rows
      .filter((row) => row.bucket === collection.bucket && row.payload !== null)
      .map((row) => {
        try {
          return JSON.parse(row.payload as string) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((record): record is Record<string, unknown> => record !== null)
      .sort((a, b) => collection.stamp(b) - collection.stamp(a));

    write(collection.key, JSON.stringify(records));
  }

  for (const row of rows) {
    if (row.bucket !== DOCUMENT_BUCKET || row.payload === null) continue;
    if (!DOCUMENTS.includes(row.id)) continue;
    write(row.id, row.payload);
  }
}

export const toShadow = (rows: SyncRow[]): Shadow =>
  Object.fromEntries(rows.map((row) => [rowKey(row.bucket, row.id), row]));
