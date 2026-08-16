/**
 * localStorage access that never throws.
 *
 * Browsers reject storage outright in some privacy modes — Safari's private
 * windows throw on both read and write — and every tool here keeps its data on the
 * device. A rejected read should degrade to "nothing saved yet", never take the
 * page down with it.
 */

export function readText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeText(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full; the in-memory state stays correct.
  }
}

/**
 * Reads and parses a JSON value, falling back whenever it is missing, unreadable,
 * corrupt, or the wrong shape. `isValid` guards against data written by an older
 * version of the app.
 */
export function readJson<T>(
  key: string,
  fallback: T,
  isValid?: (value: unknown) => value is T
): T {
  const raw = readText(key);
  if (raw === null) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValid && !isValid(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    writeText(key, JSON.stringify(value));
  } catch {
    // Value could not be serialised; nothing sensible to persist.
  }
}
