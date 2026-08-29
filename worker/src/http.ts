export type Env = {
  DB: D1Database;
  SCHEDULER: DurableObjectNamespace;
  APP_URL: string;
  TELEGRAM_BOT: string;
  TELEGRAM_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
};

// The dev site runs on localhost and the real one on Pages, so both have to be
// let through by name: a wildcard would let any page on the internet read a
// shared note out of someone's browser.
const LOCALHOST = /^http:\/\/localhost(:\d+)?$/;

// The old Pages URL still reaches installed service workers and any bookmark that
// has not followed the redirect yet, so it stays permitted alongside APP_URL.
const LEGACY_ORIGIN = "https://melastore.github.io";

// The API is on a worker.dev subdomain, so every browser call is cross-origin.
export function cors(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = new URL(env.APP_URL).origin;
  const permitted =
    origin === allowed || origin === LEGACY_ORIGIN || LOCALHOST.test(origin)
      ? origin
      : allowed;

  return {
    "Access-Control-Allow-Origin": permitted,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Edit-Token,X-Account",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const json = (
  data: unknown,
  init: ResponseInit & { headers?: Record<string, string> } = {}
) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

// Bodies come straight off the internet, so nothing here trusts a shape.
export async function readJson(request: Request, limit = 256 * 1024) {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > limit) throw new HttpError(413, "too large");

  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, "too large");

  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object") throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "expected a JSON object");
  }
}

export function requireString(
  body: Record<string, unknown>,
  key: string,
  max: number
): string {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `${key} is required`);
  }
  if (value.length > max) throw new HttpError(413, `${key} is too long`);
  return value;
}
