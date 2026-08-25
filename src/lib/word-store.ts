// The suggestion dictionary. The bundled list ships with the app so suggestions
// work on first load and offline; anything synced from the API is layered on top
// in IndexedDB, which localStorage is the wrong size for once the list grows past
// a few thousand words.

import { AMHARIC_WORDS } from "@/lib/amharic-words";
import { contributeWords, fetchWords, hasApi } from "@/lib/api";
import { isAmharicWord } from "@/lib/amharic-suggest";
import { readJson, writeJson } from "@/lib/storage";

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const DB_NAME = "ethiotime-words";
const STORE = "words";
const CURSOR_KEY = "words-sync-cursor";
const PENDING_KEY = "words-pending";
// A sync is a background nicety; once a day is plenty and it keeps the free tier
// free.
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_SYNC_KEY = "words-synced-at";
const MAX_PENDING = 200;

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = <T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
) =>
  new Promise<T>((resolve, reject) => {
    const request = work(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// Private browsing modes reject IndexedDB outright, and the bundled list is a
// perfectly good answer when that happens.
export async function loadDictionary(): Promise<readonly string[]> {
  try {
    const db = await open();
    const synced = await run<string[]>(db, "readonly", (store) =>
      store.getAll() as IDBRequest<string[]>
    );
    db.close();

    return synced.length > 0 ? [...AMHARIC_WORDS, ...synced] : AMHARIC_WORDS;
  } catch {
    return AMHARIC_WORDS;
  }
}

const bundled = new Set(AMHARIC_WORDS);

export async function syncDictionary({ force = false } = {}): Promise<number> {
  if (!hasApi()) return 0;

  const lastSync = readJson<number>(LAST_SYNC_KEY, 0);
  if (!force && Date.now() - lastSync < SYNC_INTERVAL_MS) return 0;

  try {
    const cursor = readJson<number>(CURSOR_KEY, 0);
    const { words, cursor: next } = await fetchWords(cursor);

    // The bundled words are already searched, so storing them again would only
    // make every lookup do the work twice.
    const fresh = words.filter((word) => !bundled.has(word));

    if (fresh.length > 0) {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, "readwrite");
        const store = transaction.objectStore(STORE);
        for (const word of fresh) store.put(word, word);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    }

    writeJson(CURSOR_KEY, next);
    writeJson(LAST_SYNC_KEY, Date.now());
    return fresh.length;
  } catch {
    return 0;
  }
}

// Words are queued rather than sent as they are typed: one request a session
// instead of one a word, and nothing leaves the device mid-sentence.
export function queueWord(word: string) {
  if (!hasApi() || bundled.has(word) || !isAmharicWord(word)) return;

  const pending = readJson<string[]>(PENDING_KEY, [], isStringList);
  if (pending.includes(word) || pending.length >= MAX_PENDING) return;

  writeJson(PENDING_KEY, [...pending, word]);
}

export async function flushQueuedWords(): Promise<number> {
  const pending = readJson<string[]>(PENDING_KEY, [], isStringList);
  if (!hasApi() || pending.length === 0) return 0;

  try {
    const { accepted } = await contributeWords(pending);
    writeJson(PENDING_KEY, []);
    return accepted;
  } catch {
    // Kept for the next attempt.
    return 0;
  }
}
