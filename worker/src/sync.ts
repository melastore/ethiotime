import { HttpError, json, readJson, type Env } from "./http.ts";
import { requireAccount } from "./account.ts";

const MAX_PAYLOAD = 128 * 1024;
const MAX_BATCH = 200;

// The tools that sync. A bucket is a name and a rule for what may go in it, so
// a crafted request cannot invent somewhere new to store things.
const BUCKETS = new Set([
  "notes",
  "planner-events",
  "focus-sessions",
  "settings",
  "words",
]);

// Only notes keep a history. The others are either append-only or too small to
// be worth a second copy.
const VERSIONED = "notes";

type Incoming = {
  bucket: string;
  id: string;
  payload: string | null;
  updatedAt: number;
};

function readItems(body: Record<string, unknown>): Incoming[] {
  const raw = body.items;
  if (!Array.isArray(raw)) throw new HttpError(400, "items must be an array");
  if (raw.length > MAX_BATCH) throw new HttpError(413, "too many items at once");

  return raw.map((entry) => {
    const item = entry as Record<string, unknown>;
    const bucket = item.bucket;
    const id = item.id;
    const payload = item.payload ?? null;
    const updatedAt = item.updatedAt;

    if (typeof bucket !== "string" || !BUCKETS.has(bucket)) {
      throw new HttpError(400, "unknown bucket");
    }
    if (typeof id !== "string" || id.length === 0 || id.length > 200) {
      throw new HttpError(400, "bad id");
    }
    if (payload !== null && typeof payload !== "string") {
      throw new HttpError(400, "payload must be a string or null");
    }
    if (payload !== null && payload.length > MAX_PAYLOAD) {
      throw new HttpError(413, "payload too large");
    }
    if (typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) {
      throw new HttpError(400, "bad updatedAt");
    }

    return { bucket, id, payload, updatedAt };
  });
}

// Everything changed since the caller last looked, tombstones included: a
// delete has to travel as surely as an edit.
export async function pull(request: Request, url: URL, env: Env) {
  const account = await requireAccount(request, env);
  const since = Number(url.searchParams.get("since") ?? 0);

  const { results } = await env.DB.prepare(
    "SELECT bucket, id, payload, updated_at FROM items WHERE account = ? AND updated_at > ? ORDER BY updated_at LIMIT 2000"
  )
    .bind(account, Number.isFinite(since) ? since : 0)
    .all<{ bucket: string; id: string; payload: string | null; updated_at: number }>();

  return json({
    now: Date.now(),
    items: results.map((row) => ({
      bucket: row.bucket,
      id: row.id,
      payload: row.payload,
      updatedAt: row.updated_at,
    })),
  });
}

// Last write wins, decided per record. The stamp comes from the device, so two
// devices disagreeing about the clock disagree about the winner; for one
// person's own devices that is a fair trade for not needing a server round of
// negotiation on every keystroke.
export async function push(request: Request, env: Env) {
  const account = await requireAccount(request, env);
  const items = readItems(await readJson(request, MAX_PAYLOAD * 4));
  if (items.length === 0) return json({ written: 0, now: Date.now() });

  const statements = items.map((item) =>
    env.DB.prepare(
      `INSERT INTO items (account, bucket, id, payload, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (account, bucket, id) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at
       WHERE excluded.updated_at > items.updated_at`
    ).bind(account, item.bucket, item.id, item.payload, item.updatedAt)
  );

  // A version per save, for notes that still exist. A delete is not a version:
  // the last real text is already the newest one on record.
  for (const item of items) {
    if (item.bucket !== VERSIONED || item.payload === null) continue;

    statements.push(
      env.DB.prepare(
        "INSERT OR IGNORE INTO versions (account, id, saved_at, payload) VALUES (?, ?, ?, ?)"
      ).bind(account, item.id, item.updatedAt, item.payload)
    );
  }

  const results = await env.DB.batch(statements);
  const written = results.reduce((total, result) => total + result.meta.changes, 0);

  for (const item of items) {
    if (item.bucket === VERSIONED && item.payload !== null) {
      await thin(account, item.id, env);
    }
  }

  return json({ written, now: Date.now() });
}

// Every version for a day, then hourly for a week, daily for a month, and one
// after that. Recent history is what gets used, and keeping all of it forever
// would meet the database's size cap on its own.
export async function thin(account: string, id: string, env: Env) {
  const now = Date.now();
  const hour = 3_600_000;
  const day = 86_400_000;

  await env.DB.prepare(
    `DELETE FROM versions
     WHERE account = ? AND id = ? AND saved_at NOT IN (
       SELECT MAX(saved_at) FROM versions
       WHERE account = ? AND id = ?
       GROUP BY CASE
         WHEN saved_at > ? THEN saved_at
         WHEN saved_at > ? THEN saved_at / ?
         WHEN saved_at > ? THEN saved_at / ?
         ELSE 0
       END
     )`
  )
    .bind(account, id, account, id, now - day, now - 7 * day, hour, now - 30 * day, day)
    .run();
}

export async function listVersions(request: Request, url: URL, env: Env) {
  const account = await requireAccount(request, env);
  const id = url.searchParams.get("id") ?? "";
  if (id.length === 0) throw new HttpError(400, "id is required");

  // Lengths only: a history list is a list of dates, and sending every past
  // draft to draw it would be pointless traffic.
  const { results } = await env.DB.prepare(
    "SELECT saved_at, LENGTH(payload) AS size FROM versions WHERE account = ? AND id = ? ORDER BY saved_at DESC LIMIT 200"
  )
    .bind(account, id)
    .all<{ saved_at: number; size: number }>();

  return json({
    versions: results.map((row) => ({ savedAt: row.saved_at, size: row.size })),
  });
}

export async function readVersion(request: Request, url: URL, env: Env) {
  const account = await requireAccount(request, env);
  const id = url.searchParams.get("id") ?? "";
  const savedAt = Number(url.searchParams.get("savedAt") ?? 0);

  const row = await env.DB.prepare(
    "SELECT payload FROM versions WHERE account = ? AND id = ? AND saved_at = ?"
  )
    .bind(account, id, savedAt)
    .first<{ payload: string }>();

  if (!row) throw new HttpError(404, "no such version");
  return json({ savedAt, payload: row.payload });
}
