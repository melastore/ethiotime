import { HttpError, json, readJson, type Env } from "./http.ts";

// The syllabary only: the Ethiopic block runs on into punctuation and numerals
// past U+135A, and neither is a word.
const ETHIOPIC = /^[\u1200-\u135A]+$/;
const MIN_LENGTH = 2;
const MAX_LENGTH = 24;
const MAX_PER_REQUEST = 200;
const PAGE = 2000;
// A word reaches everyone only once this many devices have typed it, which is
// what keeps one person's typo out of the shared list.
const MIN_USES = 3;

export const isCandidate = (word: string) =>
  word.length >= MIN_LENGTH && word.length <= MAX_LENGTH && ETHIOPIC.test(word);

// `since` is the caller's high-water mark, so a device that already synced pulls
// only what has crossed the threshold since.
export async function listWords(url: URL, env: Env) {
  const since = Number(url.searchParams.get("since") ?? 0);

  const rows = await env.DB.prepare(
    "SELECT word, added_at FROM words WHERE uses >= ? AND added_at > ? ORDER BY added_at LIMIT ?"
  )
    .bind(MIN_USES, Number.isFinite(since) ? since : 0, PAGE)
    .all<{ word: string; added_at: number }>();

  const results = rows.results ?? [];

  return json(
    {
      words: results.map((row) => row.word),
      // Not Date.now(): resuming from the last row is what makes the paging
      // safe when there are more than PAGE words to catch up on.
      cursor: results.at(-1)?.added_at ?? since,
      more: results.length === PAGE,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}

export async function contributeWords(request: Request, env: Env) {
  const body = await readJson(request, 32 * 1024);
  const words = Array.isArray(body.words) ? body.words : [];
  if (words.length > MAX_PER_REQUEST) throw new HttpError(413, "too many words");

  const accepted = [
    ...new Set(
      words.filter((word): word is string => typeof word === "string" && isCandidate(word))
    ),
  ];

  if (accepted.length === 0) return json({ accepted: 0 });

  const now = Date.now();
  await env.DB.batch(
    accepted.map((word) =>
      env.DB.prepare(
        "INSERT INTO words (word, uses, added_at) VALUES (?, 1, ?) " +
          // added_at moves to the moment the word became publishable, so devices
          // syncing on `since` pick it up exactly once.
          "ON CONFLICT(word) DO UPDATE SET uses = uses + 1, " +
          "added_at = CASE WHEN uses + 1 = ? THEN ? ELSE added_at END"
      ).bind(word, now, 3, now)
    )
  );

  return json({ accepted: accepted.length });
}
