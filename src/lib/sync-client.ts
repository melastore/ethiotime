// Running a sync: read the device, send what changed, take back what did not
// come from here. The merge rules live in sync.ts and are pure; this is the
// part that talks to the network and to localStorage.

import { hasApi, pullSync, pushSync } from "@/lib/api";
import { loadAccount } from "@/lib/account";
import { readJson, readText, writeJson, writeText } from "@/lib/storage";
import {
  CURSOR_KEY,
  SHADOW_KEY,
  localRows,
  merge,
  outgoing,
  toShadow,
  writeRows,
  type Shadow,
  type SyncRow,
} from "@/lib/sync";

const isShadow = (value: unknown): value is Shadow =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number => typeof value === "number";

export type SyncOutcome = {
  sent: number;
  received: number;
  // Whether anything the tools read has moved under them. The pages read
  // localStorage when they mount, so a caller acts on this before they do.
  changed: boolean;
};

export async function runSync(): Promise<SyncOutcome | null> {
  const account = loadAccount();
  if (!hasApi() || !account) return null;

  const shadow = readJson<Shadow>(SHADOW_KEY, {}, isShadow);
  const cursor = readJson<number>(CURSOR_KEY, 0, isNumber);

  const rows = localRows(readText);
  const sending = outgoing(rows, shadow, Date.now());
  if (sending.length > 0) await pushSync(account, sending);

  // Pulled after the push so the reply already carries whatever was just sent
  // back in its settled form, and one round trip settles both directions.
  const { now, items } = await pullSync(account, cursor);

  const sent = merge(rows, sending);
  const merged = merge(sent, items);
  const changed = items.some((row) => {
    const mine = sent.find(
      (candidate) => candidate.bucket === row.bucket && candidate.id === row.id
    );
    return !mine || mine.payload !== row.payload;
  });

  if (changed) writeRows(merged, writeText);

  writeJson(SHADOW_KEY, toShadow(merged));
  writeJson(CURSOR_KEY, now);

  return { sent: sending.length, received: items.length, changed };
}

// Signing in on a device that already has notes on it. Nothing local is thrown
// away: the account's records and the device's are merged, which is the only
// answer that cannot lose a note someone wrote before signing in.
export function prepareForSignIn() {
  writeJson(SHADOW_KEY, {});
  writeJson(CURSOR_KEY, 0);
}

// Signing out leaves the data where it is. It is the device's copy as much as
// the account's, and deleting it would surprise anyone who only meant to stop
// syncing.
export function clearSyncState() {
  writeJson(SHADOW_KEY, {});
  writeJson(CURSOR_KEY, 0);
}

export const syncedRowCount = () => localRows(readText).length;

export type { SyncRow };
