import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { NOTES_STORAGE_KEY } from "@/lib/notes";
import {
  localRows,
  merge,
  outgoing,
  rowKey,
  toShadow,
  writeRows,
  type Shadow,
  type SyncRow,
} from "@/lib/sync";

const note = (id: string, content: string, updatedAt: number) => ({
  id,
  title: "",
  content,
  color: "amber",
  tags: [],
  isFavorite: false,
  updatedAt,
});

describe("reading the device", () => {
  it("turns a notes array into one row per note", () => {
    const store: Record<string, string> = {
      [NOTES_STORAGE_KEY]: JSON.stringify([note("a", "one", 10), note("b", "two", 20)]),
    };

    const rows = localRows((key) => store[key] ?? null);
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((row) => [row.bucket, row.id, row.updatedAt]),
      [
        ["notes", "a", 10],
        ["notes", "b", 20],
      ]
    );
  });

  it("survives a corrupt value instead of losing the rest", () => {
    const store: Record<string, string> = {
      [NOTES_STORAGE_KEY]: "{not json",
      "ethiotime-theme": '"dark"',
    };

    const rows = localRows((key) => store[key] ?? null);
    assert.deepEqual(rows, [
      { bucket: "settings", id: "ethiotime-theme", payload: '"dark"', updatedAt: 0 },
    ]);
  });
});

describe("what to send", () => {
  const row = (id: string, payload: string, updatedAt: number): SyncRow => ({
    bucket: "notes",
    id,
    payload,
    updatedAt,
  });

  it("sends nothing when the device matches the shadow", () => {
    const rows = [row("a", "one", 10)];
    assert.deepEqual(outgoing(rows, toShadow(rows), 99), []);
  });

  it("sends a record the shadow has never seen", () => {
    assert.deepEqual(outgoing([row("a", "one", 10)], {}, 99), [row("a", "one", 10)]);
  });

  it("dates a changed payload now when its own stamp did not move", () => {
    const shadow: Shadow = toShadow([row("a", "one", 10)]);
    const [sent] = outgoing([row("a", "two", 10)], shadow, 99);

    assert.equal(sent.payload, "two");
    assert.equal(sent.updatedAt, 99, "a stale stamp would lose to the server copy");
  });

  it("keeps a stamp that is already newer", () => {
    const shadow: Shadow = toShadow([row("a", "one", 10)]);
    assert.equal(outgoing([row("a", "two", 50)], shadow, 99)[0].updatedAt, 50);
  });

  it("sends a tombstone for a record that is gone", () => {
    const shadow: Shadow = toShadow([row("a", "one", 10)]);
    assert.deepEqual(outgoing([], shadow, 99), [
      { bucket: "notes", id: "a", payload: null, updatedAt: 99 },
    ]);
  });

  it("does not send a tombstone twice", () => {
    const shadow: Shadow = {
      [rowKey("notes", "a")]: { bucket: "notes", id: "a", payload: null, updatedAt: 10 },
    };
    assert.deepEqual(outgoing([], shadow, 99), []);
  });
});

describe("merging what came back", () => {
  const mine: SyncRow = { bucket: "notes", id: "a", payload: "mine", updatedAt: 50 };

  it("keeps the newer side", () => {
    const theirs: SyncRow = { ...mine, payload: "theirs", updatedAt: 80 };
    assert.deepEqual(merge([mine], [theirs]), [theirs]);
  });

  it("leaves an older remote copy alone", () => {
    const theirs: SyncRow = { ...mine, payload: "theirs", updatedAt: 20 };
    assert.deepEqual(merge([mine], [theirs]), [mine]);
  });

  it("takes a record only the server has", () => {
    const theirs: SyncRow = { bucket: "notes", id: "b", payload: "new", updatedAt: 1 };
    assert.equal(merge([mine], [theirs]).length, 2);
  });

  it("lets a tombstone win when it is newer", () => {
    const gone: SyncRow = { ...mine, payload: null, updatedAt: 80 };
    assert.deepEqual(merge([mine], [gone]), [gone]);
  });
});

describe("writing back", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
  });

  it("drops tombstones and sorts newest first", () => {
    writeRows(
      [
        { bucket: "notes", id: "a", payload: JSON.stringify(note("a", "one", 10)), updatedAt: 10 },
        { bucket: "notes", id: "b", payload: JSON.stringify(note("b", "two", 30)), updatedAt: 30 },
        { bucket: "notes", id: "c", payload: null, updatedAt: 40 },
      ],
      (key, value) => {
        store[key] = value;
      }
    );

    const written = JSON.parse(store[NOTES_STORAGE_KEY]) as { id: string }[];
    assert.deepEqual(
      written.map((record) => record.id),
      ["b", "a"]
    );
  });

  it("refuses a settings key it does not know", () => {
    writeRows(
      [{ bucket: "settings", id: "evil-key", payload: "x", updatedAt: 1 }],
      (key, value) => {
        store[key] = value;
      }
    );

    assert.equal(store["evil-key"], undefined);
  });
});
