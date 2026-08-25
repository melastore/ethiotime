import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildReminders } from "./planner-telegram.ts";
import type { PlannerEvent } from "./planner.ts";

// `month` is 1-based here, as it is everywhere in the planner.
const at = (year: number, month: number, day: number, time: string): PlannerEvent => ({
  id: `${year}-${month}-${day}-${time}`,
  title: "Standup",
  notes: "",
  date: { calendar: "gregorian", year, month, day, time },
  recurrence: "none",
  reminderMinutes: 30,
  createdAt: 0,
});

const now = new Date(2026, 0, 1, 9, 0);
const when = () => "1 Jan";

describe("buildReminders", () => {
  it("subtracts the event's own lead time", () => {
    const [reminder] = buildReminders([at(2026, 1, 2, "10:00")], now, when);

    assert.equal(reminder.startAt - reminder.remindAt, 30 * 60_000);
  });

  it("drops an occurrence whose reminder has already passed", () => {
    // 09:15 today: the 30 minute warning was due at 08:45, before `now`.
    assert.deepEqual(buildReminders([at(2026, 1, 1, "09:15")], now, when), []);
  });

  it("drops an occurrence past the horizon", () => {
    const far = at(2026, 6, 1, "10:00");

    assert.equal(buildReminders([far], now, when).length, 0);
    assert.equal(buildReminders([far], now, when, { horizonDays: 365 }).length, 1);
  });

  it("returns them soonest first and caps the list", () => {
    const events = [at(2026, 1, 20, "10:00"), at(2026, 1, 5, "10:00")];
    const built = buildReminders(events, now, when);

    assert.deepEqual(
      built.map((item) => item.startAt),
      [...built.map((item) => item.startAt)].sort((a, b) => a - b)
    );
    assert.equal(buildReminders(events, now, when, { max: 1 }).length, 1);
  });

  it("follows a repeating event forward", () => {
    const monthly: PlannerEvent = {
      ...at(2026, 1, 15, "10:00"),
      recurrence: "monthly",
    };

    assert.equal(buildReminders([monthly], now, when).length, 2);
  });
})
