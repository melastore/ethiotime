import { HttpError, json, readJson, requireString, type Env } from "./http.ts";
import { shortId } from "./id.ts";

const CODE_TTL_MS = 15 * 60_000;
const MAX_REMINDERS = 200;
// Anything older than this was missed while the worker was down; sending it now
// would be noise.
const LATE_CUTOFF_MS = 60 * 60_000;

const api = (env: Env, method: string, body: unknown) =>
  fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const send = (env: Env, chatId: string, text: string) =>
  api(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });

// Telegram treats < & > as markup even in plain text mode.
const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function startLink(request: Request, env: Env) {
  const body = await readJson(request);
  const token = requireString(body, "token", 64);
  const code = shortId();

  await env.DB.batch([
    env.DB.prepare("DELETE FROM planner_codes WHERE token = ?").bind(token),
    env.DB.prepare(
      "INSERT INTO planner_codes (code, token, created_at) VALUES (?, ?, ?)"
    ).bind(code, token, Date.now()),
  ]);

  return json({
    code,
    url: `https://t.me/${env.TELEGRAM_BOT}?start=${code}`,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
}

export async function linkStatus(url: URL, env: Env) {
  const token = url.searchParams.get("token") ?? "";
  if (!token) throw new HttpError(400, "token is required");

  const row = await env.DB.prepare(
    "SELECT chat_name FROM planner_devices WHERE token = ?"
  )
    .bind(token)
    .first<{ chat_name: string | null }>();

  return json({ linked: Boolean(row), chatName: row?.chat_name ?? null });
}

export async function unlink(request: Request, env: Env) {
  const body = await readJson(request);
  const token = requireString(body, "token", 64);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM planner_devices WHERE token = ?").bind(token),
    env.DB.prepare("DELETE FROM planner_codes WHERE token = ?").bind(token),
    env.DB.prepare("DELETE FROM reminders WHERE token = ?").bind(token),
  ]);

  return json({ linked: false });
}

type Incoming = {
  title?: unknown;
  notes?: unknown;
  when?: unknown;
  startAt?: unknown;
  remindAt?: unknown;
  key?: unknown;
};

// The device sends the whole upcoming window every time, so the stored set is
// replaced rather than merged: an event deleted on the device disappears here too.
export async function putReminders(request: Request, env: Env) {
  const body = await readJson(request);
  const token = requireString(body, "token", 64);
  const incoming = Array.isArray(body.reminders) ? body.reminders : [];
  if (incoming.length > MAX_REMINDERS) throw new HttpError(413, "too many reminders");

  const linked = await env.DB.prepare(
    "SELECT chat_id FROM planner_devices WHERE token = ?"
  )
    .bind(token)
    .first<{ chat_id: string }>();

  if (!linked) throw new HttpError(409, "this device is not linked to a chat");

  const now = Date.now();
  const rows = (incoming as Incoming[])
    .map((item) => ({
      key: String(item.key ?? ""),
      title: String(item.title ?? "").slice(0, 200),
      notes: String(item.notes ?? "").slice(0, 500),
      when: String(item.when ?? "").slice(0, 120),
      startAt: Number(item.startAt),
      remindAt: Number(item.remindAt),
    }))
    .filter(
      (item) =>
        item.key.length > 0 &&
        item.title.length > 0 &&
        Number.isFinite(item.startAt) &&
        Number.isFinite(item.remindAt) &&
        item.remindAt > now
    );

  const statements = [
    // Reminders already sent are kept so a resync does not fire them twice.
    env.DB.prepare(
      "DELETE FROM reminders WHERE token = ? AND sent_at IS NULL AND remind_at > ?"
    ).bind(token, now),
    ...rows.map((item) =>
      env.DB.prepare(
        "INSERT OR IGNORE INTO reminders (id, token, title, notes, when_text, start_at, remind_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        `${token}:${item.key}`,
        token,
        item.title,
        item.notes,
        item.when,
        item.startAt,
        item.remindAt
      )
    ),
  ];

  await env.DB.batch(statements);
  return json({ stored: rows.length });
}

type Update = {
  message?: { chat?: { id?: number; title?: string; first_name?: string }; text?: string };
};

export async function webhook(request: Request, env: Env) {
  if (
    request.headers.get("X-Telegram-Bot-Api-Secret-Token") !==
    env.TELEGRAM_WEBHOOK_SECRET
  ) {
    throw new HttpError(403, "bad secret");
  }

  const update = (await readJson(request, 64 * 1024)) as Update;
  const chat = update.message?.chat;
  const text = update.message?.text ?? "";
  if (!chat?.id) return json({ ok: true });

  const chatId = String(chat.id);
  const chatName = chat.title ?? chat.first_name ?? null;
  const code = /^\/start(?:@\w+)?\s+(\S+)/.exec(text)?.[1];

  if (text.startsWith("/stop")) {
    await env.DB.prepare("DELETE FROM planner_devices WHERE chat_id = ?")
      .bind(chatId)
      .run();
    await send(env, chatId, "Reminders off. Send the link again to turn them back on.");
    return json({ ok: true });
  }

  if (!code) {
    await send(
      env,
      chatId,
      `Open the event planner at ${escape(env.APP_URL)} and tap "Send reminders to Telegram" to link this chat.`
    );
    return json({ ok: true });
  }

  const pending = await env.DB.prepare(
    "SELECT token, created_at FROM planner_codes WHERE code = ?"
  )
    .bind(code)
    .first<{ token: string; created_at: number }>();

  if (!pending || Date.now() - pending.created_at > CODE_TTL_MS) {
    await send(env, chatId, "That code has expired. Generate a new one in the planner.");
    return json({ ok: true });
  }

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO planner_devices (token, chat_id, chat_name, linked_at) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(token) DO UPDATE SET chat_id = excluded.chat_id, chat_name = excluded.chat_name, linked_at = excluded.linked_at"
    ).bind(pending.token, chatId, chatName, Date.now()),
    env.DB.prepare("DELETE FROM planner_codes WHERE code = ?").bind(code),
  ]);

  await send(env, chatId, "Linked. I will message you before each event.");
  return json({ ok: true });
}

type DueRow = {
  id: string;
  title: string;
  notes: string;
  when_text: string;
  chat_id: string;
};

export async function sendDueReminders(env: Env) {
  const now = Date.now();

  const due = await env.DB.prepare(
    "SELECT r.id, r.title, r.notes, r.when_text, d.chat_id FROM reminders r " +
      "JOIN planner_devices d ON d.token = r.token " +
      "WHERE r.sent_at IS NULL AND r.remind_at <= ? AND r.remind_at > ? LIMIT 100"
  )
    .bind(now, now - LATE_CUTOFF_MS)
    .all<DueRow>();

  for (const row of due.results ?? []) {
    const lines = [`<b>${escape(row.title)}</b>`];
    if (row.when_text) lines.push(escape(row.when_text));
    if (row.notes) lines.push(escape(row.notes));

    const response = await send(env, row.chat_id, lines.join("\n"));

    // A chat the user has blocked or deleted answers 403; drop the link rather
    // than retrying it every five minutes forever.
    if (response.status === 403) {
      await env.DB.prepare("DELETE FROM planner_devices WHERE chat_id = ?")
        .bind(row.chat_id)
        .run();
      continue;
    }

    await env.DB.prepare("UPDATE reminders SET sent_at = ? WHERE id = ?")
      .bind(Date.now(), row.id)
      .run();
  }

  return due.results?.length ?? 0;
}

export const sweepReminders = (env: Env) =>
  env.DB.batch([
    env.DB.prepare("DELETE FROM reminders WHERE remind_at < ?").bind(
      Date.now() - 7 * 86_400_000
    ),
    env.DB.prepare("DELETE FROM planner_codes WHERE created_at < ?").bind(
      Date.now() - CODE_TTL_MS
    ),
  ]);
