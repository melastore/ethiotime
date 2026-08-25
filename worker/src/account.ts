import { HttpError, json, type Env } from "./http.ts";

// Sixteen digits, said in fours. Long enough that guessing one is hopeless,
// short enough to copy off a screen onto paper.
const DIGITS = 16;

export function newAccountNumber(): string {
  const bytes = new Uint8Array(DIGITS);
  crypto.getRandomValues(bytes);

  let number = "";
  // 250 is the largest multiple of 10 below 256: anything above it is redrawn
  // rather than folded, which would make 0 to 5 likelier than the rest.
  for (const byte of bytes) {
    number += byte < 250 ? byte % 10 : Math.floor(Math.random() * 10);
  }
  return number;
}

export const isAccountNumber = (value: string) =>
  value.length === DIGITS && /^\d+$/.test(value);

// The number never lands in the database. A dump of the accounts table is a
// list of hashes, not a list of working logins.
export async function accountId(number: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`ethiotime:${number}`)
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Every synced request carries the number. Over TLS that is the same bargain as
// a password field, and it saves holding a second secret on the device.
export async function requireAccount(request: Request, env: Env): Promise<string> {
  const number = request.headers.get("X-Account") ?? "";
  if (!isAccountNumber(number)) throw new HttpError(401, "no account");

  const id = await accountId(number);
  const row = await env.DB.prepare("SELECT id FROM accounts WHERE id = ?")
    .bind(id)
    .first<{ id: string }>();

  if (!row) throw new HttpError(401, "no account");

  // Not awaited: the caller is not waiting on a timestamp.
  env.DB.prepare("UPDATE accounts SET last_seen = ? WHERE id = ?")
    .bind(Date.now(), id)
    .run();

  return id;
}

export async function createAccount(env: Env) {
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const number = newAccountNumber();

    try {
      await env.DB.prepare(
        "INSERT INTO accounts (id, created_at, last_seen) VALUES (?, ?, ?)"
      )
        .bind(await accountId(number), now, now)
        .run();

      // The only time the number is ever sent. It cannot be looked up again.
      return json({ number, createdAt: now }, { status: 201 });
    } catch (error) {
      if (!String(error).includes("UNIQUE")) throw error;
    }
  }

  throw new HttpError(503, "could not allocate an account");
}

export async function accountInfo(request: Request, env: Env) {
  const id = await requireAccount(request, env);

  const account = await env.DB.prepare(
    "SELECT created_at FROM accounts WHERE id = ?"
  )
    .bind(id)
    .first<{ created_at: number }>();

  const stored = await env.DB.prepare(
    "SELECT COUNT(*) AS items, COALESCE(SUM(LENGTH(payload)), 0) AS bytes FROM items WHERE account = ? AND payload IS NOT NULL"
  )
    .bind(id)
    .first<{ items: number; bytes: number }>();

  const versions = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM versions WHERE account = ?"
  )
    .bind(id)
    .first<{ n: number }>();

  return json({
    createdAt: account?.created_at ?? 0,
    items: stored?.items ?? 0,
    bytes: stored?.bytes ?? 0,
    versions: versions?.n ?? 0,
  });
}

// Closing an account takes everything with it, which is the whole promise.
export async function deleteAccount(request: Request, env: Env) {
  const id = await requireAccount(request, env);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM versions WHERE account = ?").bind(id),
    env.DB.prepare("DELETE FROM items WHERE account = ?").bind(id),
    env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(id),
  ]);

  return json({ deleted: true });
}
