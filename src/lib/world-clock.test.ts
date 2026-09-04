import assert from "node:assert/strict";
import test from "node:test";

import { WORLD_CITIES, getCityTime } from "./world-clock.ts";

test("WORLD_CITIES includes Addis Ababa and major diaspora hubs", () => {
  const ids = WORLD_CITIES.map((c) => c.id);
  assert.ok(ids.includes("addis"));
  assert.ok(ids.includes("dc"));
  assert.ok(ids.includes("london"));
  assert.ok(ids.includes("dubai"));
});

test("getCityTime calculates correct dual-time and Addis offset", () => {
  // 12:00 UTC = 15:00 in Addis Ababa (UTC+3)
  const utcNoon = new Date(Date.UTC(2026, 8, 4, 12, 0, 0));
  const addis = WORLD_CITIES.find((c) => c.id === "addis")!;
  const info = getCityTime(addis, utcNoon);

  assert.equal(info.offsetHoursFromAddis, 0);
  // In Addis at 15:00 (3:00 PM), Ethiopian clock is 9:00 (ከሰዓት 9:00)
  assert.equal(info.ethiopianClock, "9:00");
  assert.equal(info.callStatus, "good");
});
