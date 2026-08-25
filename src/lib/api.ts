// The site is a static export with no server of its own, so anything that needs
// to be stored off the device goes through the Cloudflare Worker in ../worker.
// Unset means the build has no backend: every caller here treats that as
// "feature unavailable" rather than failing.
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export const hasApi = () => BASE.length > 0;

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new ApiError(0, "No backend is configured for this build.");

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }

  if (!response.ok) {
    const message = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => null);

    throw new ApiError(response.status, message ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export type SharedNote = { title: string; content: string; createdAt: number };
export type ShareResult = { id: string; url: string; editToken: string; expiresAt: number };

export const shareNote = (title: string, content: string) =>
  call<ShareResult>("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });

export const fetchSharedNote = (id: string) =>
  call<SharedNote>(`/api/notes/${encodeURIComponent(id)}`);

export const unshareNote = (id: string, editToken: string) =>
  call<{ deleted: boolean }>(`/api/notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "X-Edit-Token": editToken },
  });

export type LinkCode = { code: string; url: string; expiresAt: number };

export const startTelegramLink = (token: string) =>
  call<LinkCode>("/api/planner/link", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const telegramLinkStatus = (token: string) =>
  call<{ linked: boolean; chatName: string | null }>(
    `/api/planner/link?token=${encodeURIComponent(token)}`
  );

export const unlinkTelegram = (token: string) =>
  call<{ linked: boolean }>("/api/planner/link", {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });

export type RemindPayload = {
  key: string;
  title: string;
  notes: string;
  when: string;
  startAt: number;
  remindAt: number;
};

// `source` scopes the replace: pushing the timer's reminders must not clear the
// planner's, or the other way round.
export const pushReminders = (
  token: string,
  reminders: RemindPayload[],
  source: "planner" | "focus" = "planner"
) =>
  call<{ stored: number }>("/api/planner/reminders", {
    method: "PUT",
    body: JSON.stringify({ token, reminders, source }),
  });

export const fetchWords = (since: number) =>
  call<{ words: string[]; cursor: number; more: boolean }>(`/api/words?since=${since}`);

export const contributeWords = (words: string[]) =>
  call<{ accepted: number }>("/api/words", {
    method: "POST",
    body: JSON.stringify({ words }),
  });
