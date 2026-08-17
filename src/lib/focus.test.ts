import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SETTINGS,
  MINUTE_MS,
  buildHeatmap,
  currentStreak,
  formatDuration,
  formatTotal,
  idleState,
  intensityOf,
  nextPhase,
  pause,
  remainingMs,
  resume,
  secondsByDay,
  secondsForNote,
  sessionFor,
  startPhase,
  type StudySession,
} from "./focus.ts";

const T0 = new Date("2026-08-16T09:00:00").getTime();
const DAY = 24 * 60 * 60 * 1000;

const session = (startedAt: number, seconds: number, noteId = "n1"): StudySession => ({
  id: `s-${startedAt}`,
  noteId,
  noteTitle: "Chapter 5",
  startedAt,
  seconds,
});

test("remaining time comes from the clock, not from counting ticks", () => {
  const running = startPhase(idleState(), "focus", DEFAULT_SETTINGS, T0);

  assert.equal(remainingMs(running, T0), 25 * MINUTE_MS);
  assert.equal(remainingMs(running, T0 + 10 * MINUTE_MS), 15 * MINUTE_MS);
});

test("a phase that ran out while the tab slept reads as zero, never negative", () => {
  const running = startPhase(idleState(), "focus", DEFAULT_SETTINGS, T0);
  assert.equal(remainingMs(running, T0 + 90 * MINUTE_MS), 0);
});

test("pausing freezes the remaining time and resuming restores it", () => {
  const running = startPhase(idleState(), "focus", DEFAULT_SETTINGS, T0);
  const paused = pause(running, T0 + 10 * MINUTE_MS);

  assert.equal(paused.status, "paused");
  assert.equal(remainingMs(paused, T0 + 10 * MINUTE_MS), 15 * MINUTE_MS);
  // An hour goes by while paused; nothing is lost.
  assert.equal(remainingMs(paused, T0 + 70 * MINUTE_MS), 15 * MINUTE_MS);

  const resumed = resume(paused, T0 + 70 * MINUTE_MS);
  assert.equal(remainingMs(resumed, T0 + 70 * MINUTE_MS), 15 * MINUTE_MS);
  assert.equal(remainingMs(resumed, T0 + 75 * MINUTE_MS), 10 * MINUTE_MS);
});

test("a completed focus phase logs its full length", () => {
  const running = startPhase(idleState(), "focus", DEFAULT_SETTINGS, T0);
  const logged = sessionFor(running, DEFAULT_SETTINGS, "Chapter 5", T0 + 25 * MINUTE_MS);

  assert.equal(logged?.seconds, 25 * 60);
});

test("a focus phase stopped early logs only the time spent", () => {
  const running = startPhase(idleState(), "focus", DEFAULT_SETTINGS, T0);
  const logged = sessionFor(running, DEFAULT_SETTINGS, "Chapter 5", T0 + 8 * MINUTE_MS);

  assert.equal(logged?.seconds, 8 * 60);
});

test("time spent paused is not credited as study", () => {
  const running = startPhase(idleState(), "focus", DEFAULT_SETTINGS, T0);
  const paused = pause(running, T0 + 5 * MINUTE_MS);
  const logged = sessionFor(paused, DEFAULT_SETTINGS, "Chapter 5", T0 + 65 * MINUTE_MS);

  assert.equal(logged?.seconds, 5 * 60);
});

test("a phase that slept past its end credits the phase length and no more", () => {
  const running = startPhase(idleState(), "focus", DEFAULT_SETTINGS, T0);
  const logged = sessionFor(running, DEFAULT_SETTINGS, "Chapter 5", T0 + 3 * 60 * MINUTE_MS);

  assert.equal(logged?.seconds, 25 * 60);
});

test("breaks and very short sittings are not logged", () => {
  const breakPhase = startPhase(idleState(), "shortBreak", DEFAULT_SETTINGS, T0);
  assert.equal(sessionFor(breakPhase, DEFAULT_SETTINGS, "x", T0 + 5 * MINUTE_MS), null);

  const brief = startPhase(idleState(), "focus", DEFAULT_SETTINGS, T0);
  assert.equal(sessionFor(brief, DEFAULT_SETTINGS, "x", T0 + 20_000), null);
});

test("a long break arrives only after the configured number of focus phases", () => {
  let state = { ...idleState(), phase: "focus" as const, focusDone: 0 };

  for (let round = 1; round <= 3; round += 1) {
    const next = nextPhase(state, DEFAULT_SETTINGS);
    assert.equal(next.phase, "shortBreak", `round ${round}`);
    state = { ...state, phase: "focus", focusDone: next.focusDone };
  }

  assert.equal(nextPhase(state, DEFAULT_SETTINGS).phase, "longBreak");
});

test("a long break resets the count and breaks return to focus", () => {
  const afterLong = nextPhase(
    { ...idleState(), phase: "longBreak", focusDone: 4 },
    DEFAULT_SETTINGS
  );
  assert.deepEqual(afterLong, { phase: "focus", focusDone: 0 });

  const afterShort = nextPhase(
    { ...idleState(), phase: "shortBreak", focusDone: 2 },
    DEFAULT_SETTINGS
  );
  assert.deepEqual(afterShort, { phase: "focus", focusDone: 2 });
});

test("sessions are totalled per day and per note", () => {
  const sessions = [
    session(T0, 1500),
    session(T0 + 2 * 60 * MINUTE_MS, 900),
    session(T0 - DAY, 1200, "n2"),
  ];

  const byDay = secondsByDay(sessions);
  assert.equal([...byDay.values()].reduce((a, b) => a + b), 3600);
  assert.equal(secondsForNote(sessions, "n1").seconds, 2400);
  assert.equal(secondsForNote(sessions, "n1").count, 2);
  assert.equal(secondsForNote(sessions, "n2").count, 1);
});

test("a streak counts consecutive days of study", () => {
  const totals = secondsByDay([
    session(T0, 600),
    session(T0 - DAY, 600),
    session(T0 - 2 * DAY, 600),
    // A gap here, so anything older does not extend the streak.
    session(T0 - 5 * DAY, 600),
  ]);

  assert.equal(currentStreak(totals, T0), 3);
});

test("a streak survives a day that has not been studied yet", () => {
  const totals = secondsByDay([session(T0 - DAY, 600), session(T0 - 2 * DAY, 600)]);
  assert.equal(currentStreak(totals, T0), 2);
});

test("a streak is broken once a whole day has gone by", () => {
  const totals = secondsByDay([session(T0 - 2 * DAY, 600)]);
  assert.equal(currentStreak(totals, T0), 0);
  assert.equal(currentStreak(new Map(), T0), 0);
});

test("the heatmap ends today and carries Ethiopian dates", () => {
  const days = buildHeatmap(secondsByDay([session(T0, 1800)]), T0, 7);

  assert.equal(days.length, 7);
  assert.equal(days.at(-1)?.seconds, 1800);
  // 16 August 2026 is Nehase 10, 2018 in the Ethiopian calendar.
  assert.deepEqual(days.at(-1)?.ethiopian, { year: 2018, month: 12, day: 10 });
  assert.equal(days[0].seconds, 0);
});

test("intensity is scaled against the busiest day", () => {
  assert.equal(intensityOf(0, 3600), 0);
  assert.equal(intensityOf(3600, 3600), 4);
  assert.equal(intensityOf(600, 3600), 1);
  // With no history at all, any study still registers.
  assert.equal(intensityOf(600, 0), 1);
});

test("durations are formatted for a clock and for a total", () => {
  assert.equal(formatDuration(25 * MINUTE_MS), "25:00");
  assert.equal(formatDuration(61_000), "01:01");
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatTotal(2100), "35m");
  assert.equal(formatTotal(15_600), "4h 20m");
});
