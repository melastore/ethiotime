import assert from "node:assert/strict";
import test from "node:test";

import { calculateWorkingDays, addWorkingDays, isWeekend } from "./business-days.ts";

test("isWeekend correctly identifies Saturday and Sunday", () => {
  // 2026-09-05 is Saturday
  const sat = new Date(2026, 8, 5);
  // 2026-09-06 is Sunday
  const sun = new Date(2026, 8, 6);
  // 2026-09-07 is Monday
  const mon = new Date(2026, 8, 7);

  assert.equal(isWeekend(sat, false), true);
  assert.equal(isWeekend(sat, true), false); // includeSaturdaysAsWorkday
  assert.equal(isWeekend(sun, false), true);
  assert.equal(isWeekend(sun, true), true);
  assert.equal(isWeekend(mon, false), false);
});

test("calculateWorkingDays excludes weekends and public holidays", () => {
  // Monday Sep 7, 2026 to Friday Sep 11, 2026 (Enkutatash is Sep 11)
  const start = new Date(2026, 8, 7); // Monday
  const end = new Date(2026, 8, 11); // Friday (Enkutatash Ethiopian New Year)

  const result = calculateWorkingDays(start, end);
  assert.equal(result.totalDays, 5);
  assert.equal(result.holidayDays, 1); // Enkutatash
  assert.equal(result.workingDays, 4);
});

test("addWorkingDays advances date skipping weekends and holidays", () => {
  // From Friday Sep 4, 2026 + 2 working days
  // Friday -> Sat (skip) -> Sun (skip) -> Monday Sep 7 (1) -> Tuesday Sep 8 (2)
  const start = new Date(2026, 8, 4);
  const result = addWorkingDays(start, 2);

  assert.equal(result.getDate(), 8);
  assert.equal(result.getMonth(), 8);
  assert.equal(result.getFullYear(), 2026);
});
