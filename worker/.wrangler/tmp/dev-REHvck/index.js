var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/http.ts
var LOCALHOST = /^http:\/\/localhost(:\d+)?$/;
function cors(env, request) {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = new URL(env.APP_URL).origin;
  const permitted = origin === allowed || LOCALHOST.test(origin) ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": permitted,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Edit-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
__name(cors, "cors");
var json = /* @__PURE__ */ __name((data, init = {}) => new Response(JSON.stringify(data), {
  ...init,
  headers: { "Content-Type": "application/json", ...init.headers }
}), "json");
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
  static {
    __name(this, "HttpError");
  }
};
async function readJson(request, limit = 256 * 1024) {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > limit) throw new HttpError(413, "too large");
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, "too large");
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object") throw new Error();
    return value;
  } catch {
    throw new HttpError(400, "expected a JSON object");
  }
}
__name(readJson, "readJson");
function requireString(body, key, max) {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `${key} is required`);
  }
  if (value.length > max) throw new HttpError(413, `${key} is too long`);
  return value;
}
__name(requireString, "requireString");

// src/id.ts
var ALPHABET = "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
function shortId(length = 6) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}
__name(shortId, "shortId");
var isShortId = /* @__PURE__ */ __name((value) => value.length === 6 && [...value].every((char) => ALPHABET.includes(char)), "isShortId");
var secretToken = /* @__PURE__ */ __name(() => shortId(32), "secretToken");

// src/notes.ts
var MAX_CONTENT = 200 * 1024;
var MAX_TITLE = 200;
var NOTE_TTL_DAYS = 180;
async function createNote(request, env) {
  const body = await readJson(request, MAX_CONTENT + 8 * 1024);
  const title = typeof body.title === "string" ? body.title.slice(0, MAX_TITLE) : "";
  const content = requireString(body, "content", MAX_CONTENT);
  const now = Date.now();
  const editToken = secretToken();
  const expiresAt = now + NOTE_TTL_DAYS * 864e5;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = shortId();
    try {
      await env.DB.prepare(
        "INSERT INTO notes (id, title, content, edit_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(id, title, content, editToken, now, expiresAt).run();
      const url = `${new URL(request.url).origin}/${id}`;
      return json({ id, url, editToken, expiresAt }, { status: 201 });
    } catch (error) {
      if (!String(error).includes("UNIQUE")) throw error;
    }
  }
  throw new HttpError(503, "could not allocate an id");
}
__name(createNote, "createNote");
async function readNote(id, env) {
  if (!isShortId(id)) throw new HttpError(404, "no such note");
  const row = await env.DB.prepare(
    "SELECT title, content, created_at, expires_at FROM notes WHERE id = ?"
  ).bind(id).first();
  if (!row || row.expires_at !== null && row.expires_at < Date.now()) {
    throw new HttpError(404, "no such note");
  }
  const counted = env.DB.prepare("UPDATE notes SET views = views + 1 WHERE id = ?").bind(id).run();
  return { row, counted };
}
__name(readNote, "readNote");
async function deleteNote(id, request, env) {
  const token = request.headers.get("X-Edit-Token") ?? "";
  if (!isShortId(id) || token.length === 0) throw new HttpError(404, "no such note");
  const result = await env.DB.prepare(
    "DELETE FROM notes WHERE id = ? AND edit_token = ?"
  ).bind(id, token).run();
  if (result.meta.changes === 0) throw new HttpError(404, "no such note");
  return json({ deleted: true });
}
__name(deleteNote, "deleteNote");
var sweepNotes = /* @__PURE__ */ __name((env) => env.DB.prepare("DELETE FROM notes WHERE expires_at IS NOT NULL AND expires_at < ?").bind(Date.now()).run(), "sweepNotes");

// src/scheduler.ts
var ReminderScheduler = class {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  state;
  env;
  static {
    __name(this, "ReminderScheduler");
  }
  // Pinged whenever the pending set changes.
  async fetch() {
    await this.arm();
    return new Response(null, { status: 204 });
  }
  async alarm() {
    await sendDueReminders(this.env);
    await this.arm();
  }
  async arm() {
    const next = await this.env.DB.prepare(
      "SELECT MIN(remind_at) AS at FROM reminders WHERE sent_at IS NULL"
    ).first();
    if (next?.at == null) {
      await this.state.storage.deleteAlarm();
      return;
    }
    const target = next.at + 1e3;
    await this.state.storage.setAlarm(
      target > Date.now() ? target : Date.now() + 3e4
    );
  }
};
var armScheduler = /* @__PURE__ */ __name((env) => env.SCHEDULER.get(env.SCHEDULER.idFromName("reminders")).fetch(
  "https://scheduler/arm"
), "armScheduler");

// src/telegram.ts
var CODE_TTL_MS = 15 * 6e4;
var MAX_REMINDERS = 200;
var SOURCES = ["planner", "focus"];
var LATE_CUTOFF_MS = 60 * 6e4;
var api = /* @__PURE__ */ __name((env, method, body) => fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
}), "api");
var send = /* @__PURE__ */ __name((env, chatId, text) => api(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" }), "send");
var escape = /* @__PURE__ */ __name((text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), "escape");
async function startLink(request, env) {
  const body = await readJson(request);
  const token = requireString(body, "token", 64);
  const code = shortId();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM planner_codes WHERE token = ?").bind(token),
    env.DB.prepare(
      "INSERT INTO planner_codes (code, token, created_at) VALUES (?, ?, ?)"
    ).bind(code, token, Date.now())
  ]);
  return json({
    code,
    url: `https://t.me/${env.TELEGRAM_BOT}?start=${code}`,
    expiresAt: Date.now() + CODE_TTL_MS
  });
}
__name(startLink, "startLink");
async function linkStatus(url, env) {
  const token = url.searchParams.get("token") ?? "";
  if (!token) throw new HttpError(400, "token is required");
  const row = await env.DB.prepare(
    "SELECT chat_name FROM planner_devices WHERE token = ?"
  ).bind(token).first();
  return json({ linked: Boolean(row), chatName: row?.chat_name ?? null });
}
__name(linkStatus, "linkStatus");
async function unlink(request, env) {
  const body = await readJson(request);
  const token = requireString(body, "token", 64);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM planner_devices WHERE token = ?").bind(token),
    env.DB.prepare("DELETE FROM planner_codes WHERE token = ?").bind(token),
    env.DB.prepare("DELETE FROM reminders WHERE token = ?").bind(token)
  ]);
  return json({ linked: false });
}
__name(unlink, "unlink");
async function putReminders(request, env) {
  const body = await readJson(request);
  const token = requireString(body, "token", 64);
  const source = typeof body.source === "string" ? body.source : "planner";
  if (!SOURCES.includes(source)) throw new HttpError(400, "unknown source");
  const incoming = Array.isArray(body.reminders) ? body.reminders : [];
  if (incoming.length > MAX_REMINDERS) throw new HttpError(413, "too many reminders");
  const linked = await env.DB.prepare(
    "SELECT chat_id FROM planner_devices WHERE token = ?"
  ).bind(token).first();
  if (!linked) throw new HttpError(409, "this device is not linked to a chat");
  const now = Date.now();
  const rows = incoming.map((item) => ({
    key: String(item.key ?? ""),
    title: String(item.title ?? "").slice(0, 200),
    notes: String(item.notes ?? "").slice(0, 500),
    when: String(item.when ?? "").slice(0, 120),
    startAt: Number(item.startAt),
    remindAt: Number(item.remindAt)
  })).filter(
    (item) => item.key.length > 0 && item.title.length > 0 && Number.isFinite(item.startAt) && Number.isFinite(item.remindAt) && item.remindAt > now
  );
  const statements = [
    // Reminders already sent are kept so a resync does not fire them twice.
    env.DB.prepare(
      "DELETE FROM reminders WHERE token = ? AND source = ? AND sent_at IS NULL AND remind_at > ?"
    ).bind(token, source, now),
    ...rows.map(
      (item) => env.DB.prepare(
        "INSERT OR IGNORE INTO reminders (id, token, source, title, notes, when_text, start_at, remind_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        `${token}:${item.key}`,
        token,
        source,
        item.title,
        item.notes,
        item.when,
        item.startAt,
        item.remindAt
      )
    )
  ];
  await env.DB.batch(statements);
  await armScheduler(env);
  return json({ stored: rows.length });
}
__name(putReminders, "putReminders");
async function webhook(request, env) {
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) {
    throw new HttpError(403, "bad secret");
  }
  const update = await readJson(request, 64 * 1024);
  const chat = update.message?.chat;
  const text = update.message?.text ?? "";
  if (!chat?.id) return json({ ok: true });
  const chatId = String(chat.id);
  const chatName = chat.title ?? chat.first_name ?? null;
  const code = /^\/start(?:@\w+)?\s+(\S+)/.exec(text)?.[1];
  if (text.startsWith("/stop")) {
    await env.DB.prepare("DELETE FROM planner_devices WHERE chat_id = ?").bind(chatId).run();
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
  ).bind(code).first();
  if (!pending || Date.now() - pending.created_at > CODE_TTL_MS) {
    await send(env, chatId, "That code has expired. Generate a new one in the planner.");
    return json({ ok: true });
  }
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO planner_devices (token, chat_id, chat_name, linked_at) VALUES (?, ?, ?, ?) ON CONFLICT(token) DO UPDATE SET chat_id = excluded.chat_id, chat_name = excluded.chat_name, linked_at = excluded.linked_at"
    ).bind(pending.token, chatId, chatName, Date.now()),
    env.DB.prepare("DELETE FROM planner_codes WHERE code = ?").bind(code)
  ]);
  await send(env, chatId, "Linked. I will message you before each event.");
  return json({ ok: true });
}
__name(webhook, "webhook");
async function sendDueReminders(env) {
  const now = Date.now();
  const due = await env.DB.prepare(
    "SELECT r.id, r.title, r.notes, r.when_text, d.chat_id FROM reminders r JOIN planner_devices d ON d.token = r.token WHERE r.sent_at IS NULL AND r.remind_at <= ? AND r.remind_at > ? LIMIT 100"
  ).bind(now, now - LATE_CUTOFF_MS).all();
  for (const row of due.results ?? []) {
    const lines = [`<b>${escape(row.title)}</b>`];
    if (row.when_text) lines.push(escape(row.when_text));
    if (row.notes) lines.push(escape(row.notes));
    const response = await send(env, row.chat_id, lines.join("\n"));
    if (response.status === 403) {
      await env.DB.prepare("DELETE FROM planner_devices WHERE chat_id = ?").bind(row.chat_id).run();
      continue;
    }
    if (!response.ok) {
      console.error(
        `sendMessage ${response.status} for ${row.id}: ${await response.text()}`
      );
      continue;
    }
    await env.DB.prepare("UPDATE reminders SET sent_at = ? WHERE id = ?").bind(Date.now(), row.id).run();
  }
  return due.results?.length ?? 0;
}
__name(sendDueReminders, "sendDueReminders");
var sweepReminders = /* @__PURE__ */ __name((env) => env.DB.batch([
  env.DB.prepare("DELETE FROM reminders WHERE remind_at < ?").bind(
    Date.now() - 7 * 864e5
  ),
  env.DB.prepare("DELETE FROM planner_codes WHERE created_at < ?").bind(
    Date.now() - CODE_TTL_MS
  )
]), "sweepReminders");

// src/words.ts
var ETHIOPIC = /^[\u1200-\u135A]+$/;
var MIN_LENGTH = 2;
var MAX_LENGTH = 24;
var MAX_PER_REQUEST = 200;
var PAGE = 2e3;
var MIN_USES = 3;
var isCandidate = /* @__PURE__ */ __name((word) => word.length >= MIN_LENGTH && word.length <= MAX_LENGTH && ETHIOPIC.test(word), "isCandidate");
async function listWords(url, env) {
  const since = Number(url.searchParams.get("since") ?? 0);
  const rows = await env.DB.prepare(
    "SELECT word, added_at FROM words WHERE uses >= ? AND added_at > ? ORDER BY added_at LIMIT ?"
  ).bind(MIN_USES, Number.isFinite(since) ? since : 0, PAGE).all();
  const results = rows.results ?? [];
  return json(
    {
      words: results.map((row) => row.word),
      // Not Date.now(): resuming from the last row is what makes the paging
      // safe when there are more than PAGE words to catch up on.
      cursor: results.at(-1)?.added_at ?? since,
      more: results.length === PAGE
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
__name(listWords, "listWords");
async function contributeWords(request, env) {
  const body = await readJson(request, 32 * 1024);
  const words = Array.isArray(body.words) ? body.words : [];
  if (words.length > MAX_PER_REQUEST) throw new HttpError(413, "too many words");
  const accepted = [
    ...new Set(
      words.filter((word) => typeof word === "string" && isCandidate(word))
    )
  ];
  if (accepted.length === 0) return json({ accepted: 0 });
  const now = Date.now();
  await env.DB.batch(
    accepted.map(
      (word) => env.DB.prepare(
        "INSERT INTO words (word, uses, added_at) VALUES (?, 1, ?) ON CONFLICT(word) DO UPDATE SET uses = uses + 1, added_at = CASE WHEN uses + 1 = ? THEN ? ELSE added_at END"
      ).bind(word, now, 3, now)
    )
  );
  return json({ accepted: accepted.length });
}
__name(contributeWords, "contributeWords");

// src/index.ts
async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method;
  if (method === "POST" && path === "/api/notes") return createNote(request, env);
  if (method === "GET" && path.startsWith("/api/notes/")) {
    const { row, counted } = await readNote(path.slice("/api/notes/".length), env);
    await counted;
    return json({ title: row.title, content: row.content, createdAt: row.created_at });
  }
  if (method === "DELETE" && path.startsWith("/api/notes/")) {
    return deleteNote(path.slice("/api/notes/".length), request, env);
  }
  if (method === "POST" && path === "/api/planner/link") return startLink(request, env);
  if (method === "GET" && path === "/api/planner/link") return linkStatus(url, env);
  if (method === "DELETE" && path === "/api/planner/link") return unlink(request, env);
  if (method === "PUT" && path === "/api/planner/reminders") {
    return putReminders(request, env);
  }
  if (method === "POST" && path === "/api/telegram/webhook") return webhook(request, env);
  if (method === "GET" && path === "/api/words") return listWords(url, env);
  if (method === "POST" && path === "/api/words") return contributeWords(request, env);
  const id = path.slice(1);
  if (method === "GET" && isShortId(id)) {
    return Response.redirect(`${env.APP_URL}/note-taking/shared/?id=${id}`, 302);
  }
  throw new HttpError(404, "not found");
}
__name(route, "route");
var src_default = {
  async fetch(request, env) {
    const headers = cors(env, request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    try {
      const response = await route(request, env);
      if (response.status === 302) {
        return new Response(null, {
          status: 302,
          headers: { ...headers, Location: response.headers.get("Location") ?? env.APP_URL }
        });
      }
      for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      return response;
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      return json(
        { error: error instanceof HttpError ? error.message : "server error" },
        { status, headers }
      );
    }
  },
  // The alarm does the timing; this is the backstop for anything it dropped,
  // and where the housekeeping lives.
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        await sendDueReminders(env);
        await armScheduler(env);
        await sweepReminders(env);
        await sweepNotes(env);
      })()
    );
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-EObOS9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-EObOS9/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  ReminderScheduler,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
