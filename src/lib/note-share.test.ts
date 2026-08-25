import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// Node exposes a localStorage global but throws on every call unless the runner
// was started with --localstorage-file, so the tests bring their own.
const store = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  },
});

const { forgetShare, loadShares, rememberShare } = await import("./note-share.ts");

const record = {
  id: "3hafHJ",
  url: "https://api.example/3hafHJ",
  editToken: "secret",
  expiresAt: 1,
};

describe("note shares", () => {
  beforeEach(() => {
    store.clear();
  });

  it("starts empty", () => {
    assert.deepEqual(loadShares(), {});
  });

  it("keeps one record per note", () => {
    rememberShare("note-1", record);
    rememberShare("note-1", { ...record, id: "abcdef" });

    assert.equal(Object.keys(loadShares()).length, 1);
    assert.equal(loadShares()["note-1"].id, "abcdef");
  });

  it("forgets a note without touching the others", () => {
    rememberShare("note-1", record);
    rememberShare("note-2", record);

    assert.deepEqual(Object.keys(forgetShare("note-1")), ["note-2"]);
  });

  it("ignores a stored value of the wrong shape", () => {
    store.set("shared-note-links", "[]");
    assert.deepEqual(loadShares(), {});
  });
})
