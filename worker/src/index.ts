import { cors, HttpError, json, type Env } from "./http.ts";
import { isShortId } from "./id.ts";
import {
  createNote,
  deleteNote,
  readNote,
  setNoteExpiry,
  sweepNotes,
} from "./notes.ts";
import {
  linkStatus,
  putReminders,
  sendDueReminders,
  startLink,
  sweepReminders,
  unlink,
  webhook,
} from "./telegram.ts";
import { armScheduler, ReminderScheduler } from "./scheduler.ts";
import { contributeWords, listWords } from "./words.ts";
import { accountInfo, createAccount, deleteAccount } from "./account.ts";
import { listVersions, pull, push, readVersion } from "./sync.ts";

export { ReminderScheduler };

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method;

  if (method === "POST" && path === "/api/notes") return createNote(request, env);

  if (method === "GET" && path.startsWith("/api/notes/")) {
    const { row, counted } = await readNote(path.slice("/api/notes/".length), env);
    await counted;
    return json({ title: row.title, content: row.content, createdAt: row.created_at });
  }

  if (method === "PATCH" && path.startsWith("/api/notes/")) {
    return setNoteExpiry(path.slice("/api/notes/".length), request, env);
  }

  if (method === "DELETE" && path.startsWith("/api/notes/")) {
    return deleteNote(path.slice("/api/notes/".length), request, env);
  }

  if (method === "POST" && path === "/api/account") return createAccount(env);
  if (method === "GET" && path === "/api/account") return accountInfo(request, env);
  if (method === "DELETE" && path === "/api/account") return deleteAccount(request, env);

  if (method === "GET" && path === "/api/sync") return pull(request, url, env);
  if (method === "POST" && path === "/api/sync") return push(request, env);
  if (method === "GET" && path === "/api/history") return listVersions(request, url, env);
  if (method === "GET" && path === "/api/version") return readVersion(request, url, env);

  if (method === "POST" && path === "/api/planner/link") return startLink(request, env);
  if (method === "GET" && path === "/api/planner/link") return linkStatus(url, env);
  if (method === "DELETE" && path === "/api/planner/link") return unlink(request, env);
  if (method === "PUT" && path === "/api/planner/reminders") {
    return putReminders(request, env);
  }

  if (method === "POST" && path === "/api/telegram/webhook") return webhook(request, env);

  if (method === "GET" && path === "/api/words") return listWords(url, env);
  if (method === "POST" && path === "/api/words") return contributeWords(request, env);

  // The short link itself. Rendering happens in the app, which already has the
  // Markdown and KaTeX pipeline.
  const id = path.slice(1);
  if (method === "GET" && isShortId(id)) {
    return Response.redirect(`${env.APP_URL}/note-taking/shared/?id=${id}`, 302);
  }

  throw new HttpError(404, "not found");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(env, request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    try {
      const response = await route(request, env);
      // Redirect responses are immutable, so rebuild rather than mutate.
      if (response.status === 302) {
        return new Response(null, {
          status: 302,
          headers: { ...headers, Location: response.headers.get("Location") ?? env.APP_URL },
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
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        await sendDueReminders(env);
        await armScheduler(env);
        await sweepReminders(env);
        await sweepNotes(env);
      })()
    );
  },
};
