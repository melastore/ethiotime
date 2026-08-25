import assert from "node:assert/strict";
import test from "node:test";

import { addisWallClock, matchesAddis } from "@/lib/addis-time";

// 2026-08-25 20:31 UTC. Addis, at UTC+3, is on the 25th at 23:31.
const MOMENT = new Date("2026-08-25T20:31:00Z");

test("reads the Addis wall clock off an instant", () => {
  const there = addisWallClock(MOMENT);
  assert.equal(there.getFullYear(), 2026);
  assert.equal(there.getMonth(), 7);
  assert.equal(there.getDate(), 25);
  assert.equal(there.getHours(), 23);
  assert.equal(there.getMinutes(), 31);
});

test("crosses midnight where the device has not", () => {
  // 22:31 UTC is already the 26th in Addis.
  const there = addisWallClock(new Date("2026-08-25T22:31:00Z"));
  assert.equal(there.getDate(), 26);
  assert.equal(there.getHours(), 1);
});

test("Ethiopia keeps the same clock all year", () => {
  const january = addisWallClock(new Date("2026-01-15T12:00:00Z"));
  const july = addisWallClock(new Date("2026-07-15T12:00:00Z"));
  assert.equal(january.getHours(), 15);
  assert.equal(july.getHours(), 15);
});

test("matchesAddis follows the running timezone", () => {
  const local = new Date("2026-08-25T20:31:00.123Z");
  const offset = -local.getTimezoneOffset();
  assert.equal(matchesAddis(local), offset === 180);
});
