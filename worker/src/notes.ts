import { HttpError, json, readJson, requireString, type Env } from "./http.ts";
import { isShortId, secretToken, shortId } from "./id.ts";

const MAX_CONTENT = 200 * 1024;
const MAX_TITLE = 200;
// A shared link is a handoff, not storage. Notes older than this are swept up by
// the cron job.
export const NOTE_TTL_DAYS = 180;

type NoteRow = {
  title: string;
  content: string;
  created_at: number;
  expires_at: number | null;
};

export async function createNote(request: Request, env: Env) {
  const body = await readJson(request, MAX_CONTENT + 8 * 1024);
  const title = typeof body.title === "string" ? body.title.slice(0, MAX_TITLE) : "";
  const content = requireString(body, "content", MAX_CONTENT);

  const now = Date.now();
  const editToken = secretToken();
  const expiresAt = now + NOTE_TTL_DAYS * 86_400_000;

  // Six characters is 57^6 ids, so a clash is rare but not impossible; take the
  // next one rather than overwriting somebody's note.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = shortId();

    try {
      await env.DB.prepare(
        "INSERT INTO notes (id, title, content, edit_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(id, title, content, editToken, now, expiresAt)
        .run();

      // The worker's own origin is the short link; it redirects to the app.
      const url = `${new URL(request.url).origin}/${id}`;
      return json({ id, url, editToken, expiresAt }, { status: 201 });
    } catch (error) {
      if (!String(error).includes("UNIQUE")) throw error;
    }
  }

  throw new HttpError(503, "could not allocate an id");
}

export async function readNote(id: string, env: Env) {
  if (!isShortId(id)) throw new HttpError(404, "no such note");

  const row = await env.DB.prepare(
    "SELECT title, content, created_at, expires_at FROM notes WHERE id = ?"
  )
    .bind(id)
    .first<NoteRow>();

  if (!row || (row.expires_at !== null && row.expires_at < Date.now())) {
    throw new HttpError(404, "no such note");
  }

  // Counted after the row is known to exist, and not awaited: a view count is
  // never worth delaying the note for.
  const counted = env.DB.prepare("UPDATE notes SET views = views + 1 WHERE id = ?")
    .bind(id)
    .run();

  return { row, counted };
}

export async function deleteNote(id: string, request: Request, env: Env) {
  const token = request.headers.get("X-Edit-Token") ?? "";
  if (!isShortId(id) || token.length === 0) throw new HttpError(404, "no such note");

  const result = await env.DB.prepare(
    "DELETE FROM notes WHERE id = ? AND edit_token = ?"
  )
    .bind(id, token)
    .run();

  if (result.meta.changes === 0) throw new HttpError(404, "no such note");
  return json({ deleted: true });
}

export const sweepNotes = (env: Env) =>
  env.DB.prepare("DELETE FROM notes WHERE expires_at IS NOT NULL AND expires_at < ?")
    .bind(Date.now())
    .run();
