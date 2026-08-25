// What the device keeps about the notes it has shared. The edit token is the
// only way to take a shared note down again, so it never leaves this device.

import { readJson, writeJson } from "@/lib/storage";

// How long a link may live. A month is the ceiling the worker enforces; these
// are the same keys it accepts.
export const TTL_CHOICES = [
  { id: "5m", label: "5 min" },
  { id: "1h", label: "1 hour" },
  { id: "1d", label: "1 day" },
  { id: "1w", label: "1 week" },
  { id: "1mo", label: "1 month" },
] as const;

export type ShareTtl = (typeof TTL_CHOICES)[number]["id"];

export const DEFAULT_TTL: ShareTtl = "1w";

export type ShareRecord = {
  id: string;
  url: string;
  editToken: string;
  expiresAt: number;
  ttl?: ShareTtl;
};

const KEY = "shared-note-links";

const isRecords = (value: unknown): value is Record<string, ShareRecord> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const loadShares = () =>
  readJson<Record<string, ShareRecord>>(KEY, {}, isRecords);

export function rememberShare(noteId: string, record: ShareRecord) {
  const shares = { ...loadShares(), [noteId]: record };
  writeJson(KEY, shares);
  return shares;
}

export function forgetShare(noteId: string) {
  const shares = { ...loadShares() };
  delete shares[noteId];
  writeJson(KEY, shares);
  return shares;
}
