/**
 * Focus timer state and study history. Phases store when they end rather than
 * counting ticks, so a throttled or reloaded tab keeps the right time.
 */

import { toEC } from "kenat";

export type FocusPhase = "focus" | "shortBreak" | "longBreak";

export type FocusSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
};

export const DEFAULT_SETTINGS: FocusSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
};

export type TimerState = {
  status: "idle" | "running" | "paused";
  phase: FocusPhase;
  /** Epoch ms the current phase ends; meaningful while running. */
  endsAt: number;
  /** What is left of the phase; meaningful while paused. */
  remainingMs: number;
  /** Epoch ms the current phase began, for logging a session cut short. */
  startedAt: number;
  noteId: string | null;
  /** Focus phases finished since the last long break. */
  focusDone: number;
};

export type StudySession = {
  id: string;
  noteId: string | null;
  noteTitle: string;
  startedAt: number;
  seconds: number;
};

export const MINUTE_MS = 60_000;

export const idleState = (noteId: string | null = null): TimerState => ({
  status: "idle",
  phase: "focus",
  endsAt: 0,
  remainingMs: 0,
  startedAt: 0,
  noteId,
  focusDone: 0,
});

export function phaseDurationMs(
  phase: FocusPhase,
  settings: FocusSettings
): number {
  const minutes =
    phase === "focus"
      ? settings.focusMinutes
      : phase === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;

  return Math.max(1, minutes) * MINUTE_MS;
}

/** Never negative: a phase that ran out while the tab slept reads as zero. */
export function remainingMs(state: TimerState, now: number): number {
  if (state.status === "running") return Math.max(0, state.endsAt - now);
  if (state.status === "paused") return Math.max(0, state.remainingMs);
  return 0;
}

export function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** "4h 20m", or "35m" when there is no hour to show. */
export function formatTotal(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function startPhase(
  state: TimerState,
  phase: FocusPhase,
  settings: FocusSettings,
  now: number
): TimerState {
  return {
    ...state,
    status: "running",
    phase,
    startedAt: now,
    endsAt: now + phaseDurationMs(phase, settings),
    remainingMs: 0,
  };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== "running") return state;
  return { ...state, status: "paused", remainingMs: remainingMs(state, now) };
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== "paused") return state;
  // `startedAt` records when the phase began, which is what history buckets on.
  return { ...state, status: "running", endsAt: now + state.remainingMs };
}

/** Breaks return to focus; enough focus phases lead to a long break. */
export function nextPhase(
  state: TimerState,
  settings: FocusSettings
): { phase: FocusPhase; focusDone: number } {
  if (state.phase !== "focus") {
    return {
      phase: "focus",
      focusDone: state.phase === "longBreak" ? 0 : state.focusDone,
    };
  }

  const focusDone = state.focusDone + 1;
  const isLongBreak = focusDone >= Math.max(1, settings.cyclesBeforeLongBreak);

  return { phase: isLongBreak ? "longBreak" : "shortBreak", focusDone };
}

/** The session to record, or null for a break or a sitting under a minute. */
export function sessionFor(
  state: TimerState,
  settings: FocusSettings,
  noteTitle: string,
  now: number,
  minimumSeconds = 60
): StudySession | null {
  if (state.phase !== "focus" || state.startedAt === 0) return null;

  // From what is left, not the wall clock, so pauses and sleep are not credited.
  const elapsedMs =
    phaseDurationMs(state.phase, settings) - remainingMs(state, now);
  const seconds = Math.round(elapsedMs / 1000);

  if (seconds < minimumSeconds) return null;

  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `session-${now}-${Math.random().toString(36).slice(2)}`,
    noteId: state.noteId,
    noteTitle,
    startedAt: state.startedAt,
    seconds,
  };
}

/** Local calendar day, as `YYYY-M-D`, used to bucket sessions. */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function secondsByDay(sessions: StudySession[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const session of sessions) {
    const key = dayKey(session.startedAt);
    totals.set(key, (totals.get(key) ?? 0) + session.seconds);
  }

  return totals;
}

export function secondsForNote(
  sessions: StudySession[],
  noteId: string
): { seconds: number; count: number } {
  let seconds = 0;
  let count = 0;

  for (const session of sessions) {
    if (session.noteId !== noteId) continue;
    seconds += session.seconds;
    count += 1;
  }

  return { seconds, count };
}

/** Days in a row, ending yesterday when today has not been studied yet. */
export function currentStreak(
  totals: Map<string, number>,
  now: number
): number {
  const day = 24 * 60 * 60 * 1000;
  let cursor = now;

  if (!totals.has(dayKey(cursor))) {
    cursor -= day;
    if (!totals.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (totals.has(dayKey(cursor))) {
    streak += 1;
    cursor -= day;
  }

  return streak;
}

export type HeatmapDay = {
  timestamp: number;
  seconds: number;
  ethiopian: { year: number; month: number; day: number };
};

/** The last `days` days, oldest first, each with its Ethiopian date. */
export function buildHeatmap(
  totals: Map<string, number>,
  now: number,
  days = 91
): HeatmapDay[] {
  const result: HeatmapDay[] = [];
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const timestamp = date.getTime();

    result.push({
      timestamp,
      seconds: totals.get(dayKey(timestamp)) ?? 0,
      ethiopian: toEC(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      ) as HeatmapDay["ethiopian"],
    });
  }

  return result;
}

/** Five buckets scaled against the busiest day. */
export function intensityOf(seconds: number, busiest: number): 0 | 1 | 2 | 3 | 4 {
  if (seconds <= 0) return 0;
  if (busiest <= 0) return 1;

  const ratio = seconds / busiest;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
