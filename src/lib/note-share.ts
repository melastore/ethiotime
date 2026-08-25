// What the device keeps about the notes it has shared. The edit token is the
// only way to take a shared note down again, so it never leaves this device.

import { readJson, writeJson } from "@/lib/storage";

export type ShareRecord = {
  id: string;
  url: string;
  editToken: string;
  expiresAt: number;
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
