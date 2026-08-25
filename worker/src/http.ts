export type Env = {
  DB: D1Database;
  APP_URL: string;
  TELEGRAM_BOT: string;
  TELEGRAM_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
};

// The site is served from GitHub Pages, so every browser call is cross-origin.
export function cors(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = new URL(env.APP_URL).origin;

  return {
    "Access-Control-Allow-Origin": origin === allowed ? origin : allowed,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Edit-Token",
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
