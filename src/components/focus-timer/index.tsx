"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
} from "lucide-react";

import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";
import {
  DEFAULT_SETTINGS,
  type FocusPhase,
  type FocusSettings,
  type HeatmapDay,
  MINUTE_MS,
  type StudySession,
  type TimerState,
  buildHeatmap,
  currentStreak,
  dayKey,
  formatDuration,
  formatTotal,
  idleState,
  intensityOf,
  nextPhase,
  pause,
  phaseDurationMs,
  remainingMs,
  resume,
  secondsByDay,
  secondsForNote,
  sessionFor,
  startPhase,
} from "@/lib/focus";
import { type Note, loadNotes, noteHeading } from "@/lib/notes";
import { readJson, writeJson } from "@/lib/storage";
import { cn } from "@/lib/utils";

const SETTINGS_KEY = "focus-timer-settings";
const SESSIONS_KEY = "focus-timer-sessions";
const TIMER_KEY = "focus-timer-state";
const CHIME_KEY = "focus-timer-chime";

const MAX_SESSIONS = 2000;
const HEATMAP_DAYS = 91;

const PHASE_LABELS: Record<FocusPhase, string> = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

const PHASE_RING: Record<FocusPhase, string> = {
  focus: "stroke-teal-500",
  shortBreak: "stroke-sky-500",
  longBreak: "stroke-amber-500",
};

const INTENSITY_CLASSES = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-teal-200 dark:bg-teal-900",
  "bg-teal-300 dark:bg-teal-700",
  "bg-teal-500 dark:bg-teal-500",
  "bg-teal-600 dark:bg-teal-400",
] as const;

const ethiopianMonthLabel = (month: number) =>
  ETHIOPIAN_MONTHS[month - 1]?.label ?? `Month ${month}`;

const isSessionArray = (value: unknown): value is StudySession[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as StudySession).seconds === "number" &&
      typeof (item as StudySession).startedAt === "number"
  );

const isSettings = (value: unknown): value is FocusSettings =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as FocusSettings).focusMinutes === "number";

const isTimerState = (value: unknown): value is TimerState =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as TimerState).status === "string" &&
  typeof (value as TimerState).endsAt === "number";

/** A two-tone chime, so no audio file has to ship. */
function playChime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    const context = new Ctor();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.connect(context.destination);

    for (const [index, frequency] of [660, 880].entries()) {
      const at = context.currentTime + index * 0.18;
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, at);
      oscillator.connect(gain);
      oscillator.start(at);
      oscillator.stop(at + 0.16);
    }

    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // No audio output.
  }
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    new Notification(title, { body });
  } catch {
    // Notifications blocked.
  }
}

function TimerRing({
  phase,
  progress,
  children,
}: {
  phase: FocusPhase;
  progress: number;
  children: React.ReactNode;
}) {
  const radius = 82;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-52 w-52 shrink-0">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={cn(
            PHASE_RING[phase],
            "transition-[stroke-dashoffset] duration-500 ease-linear"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function Heatmap({ days }: { days: HeatmapDay[] }) {
  const busiest = useMemo(
    () => days.reduce((most, day) => Math.max(most, day.seconds), 0),
    [days]
  );

  // Weeks starting on Sunday, so a weekday keeps its row and rhythms show up.
  const columns = useMemo(() => {
    const result: (HeatmapDay | null)[][] = [];
    const lead = new Date(days[0]?.timestamp ?? Date.now()).getDay();
    let column: (HeatmapDay | null)[] = Array.from({ length: lead }, () => null);

    for (const day of days) {
      column.push(day);
      if (column.length === 7) {
        result.push(column);
        column = [];
      }
    }
    if (column.length > 0) {
      while (column.length < 7) column.push(null);
      result.push(column);
    }

    return result;
  }, [days]);

  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = [];

    for (const column of columns) {
      const first = column.find((day): day is HeatmapDay => day !== null);
      const label = first ? ethiopianMonthLabel(first.ethiopian.month) : "";

      if (groups.at(-1)?.label === label) groups[groups.length - 1].span += 1;
      else groups.push({ label, span: 1 });
    }

    return groups;
  }, [columns]);

  return (
    <div>
      <div className="flex gap-1">
        {monthGroups.map((group, index) => (
          <span
            key={`${group.label}-${index}`}
            style={{ flexGrow: group.span, flexBasis: 0 }}
            className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500"
          >
            {group.label}
          </span>
        ))}
      </div>

      <div className="mt-1 flex gap-1">
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex flex-1 flex-col gap-1">
            {column.map((day, rowIndex) => {
              if (!day) {
                return <div key={rowIndex} className="aspect-square" />;
              }

              const minutes = Math.round(day.seconds / 60);
              const label = `${day.ethiopian.day} ${ethiopianMonthLabel(
                day.ethiopian.month
              )} ${day.ethiopian.year} — ${minutes} min`;

              return (
                <div
                  key={rowIndex}
                  title={label}
                  aria-label={label}
                  className={cn(
                    "aspect-square rounded-[3px]",
                    INTENSITY_CLASSES[intensityOf(day.seconds, busiest)]
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        <span>Less</span>
        {INTENSITY_CLASSES.map((tone, index) => (
          <span key={index} className={cn("h-2.5 w-2.5 rounded-[3px]", tone)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export default function FocusTimer() {
  const [isMounted, setIsMounted] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [settings, setSettings] = useState<FocusSettings>(DEFAULT_SETTINGS);
  const [timer, setTimer] = useState<TimerState>(() => idleState());
  const [noteId, setNoteId] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [chimeOn, setChimeOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Read after mount: the server cannot render the clock or localStorage.
  useEffect(() => {
    setNotes(loadNotes());
    setSessions(readJson(SESSIONS_KEY, [], isSessionArray));
    setSettings(readJson(SETTINGS_KEY, DEFAULT_SETTINGS, isSettings));
    setChimeOn(readJson(CHIME_KEY, true, (v): v is boolean => typeof v === "boolean"));

    const saved = readJson<TimerState | null>(TIMER_KEY, null, isTimerState);
    if (saved) {
      setTimer(saved);
      setNoteId(saved.noteId);
    }

    setNow(Date.now());
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) writeJson(SESSIONS_KEY, sessions);
  }, [sessions, isMounted]);

  useEffect(() => {
    if (isMounted) writeJson(SETTINGS_KEY, settings);
  }, [settings, isMounted]);

  useEffect(() => {
    if (isMounted) writeJson(TIMER_KEY, timer);
  }, [timer, isMounted]);

  useEffect(() => {
    if (isMounted) writeJson(CHIME_KEY, chimeOn);
  }, [chimeOn, isMounted]);

  // The number shown comes from the clock, so a late interval costs nothing.
  useEffect(() => {
    if (timer.status !== "running") return;

    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.status]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === noteId) ?? null,
    [notes, noteId]
  );
  const activeTitle = activeNote ? noteHeading(activeNote) : "General focus";

  const left = remainingMs(timer, now);
  const total = phaseDurationMs(timer.phase, settings);
  const progress = timer.status === "idle" ? 0 : 1 - left / total;

  // In a ref so editing a note does not re-run the phase-end effect.
  const titleRef = useRef(activeTitle);
  titleRef.current = activeTitle;

  const finishPhase = useCallback(
    (at: number, announce: boolean) => {
      setTimer((current) => {
        if (current.status === "idle") return current;

        const logged = sessionFor(current, settings, titleRef.current, at);
        if (logged) {
          setSessions((history) =>
            [...history, logged].slice(-MAX_SESSIONS)
          );
        }

        const { phase, focusDone } = nextPhase(current, settings);

        if (announce) {
          if (chimeOn) playChime();
          notify(
            current.phase === "focus" ? "Focus done" : "Break over",
            phase === "focus"
              ? `Back to ${titleRef.current}.`
              : `Time for a ${PHASE_LABELS[phase].toLowerCase()}.`
          );
        }

        return startPhase({ ...current, focusDone }, phase, settings, at);
      });
      setNow(at);
    },
    [settings, chimeOn]
  );

  // Ended by the clock, so a sleeping tab still ends exactly one phase.
  useEffect(() => {
    if (timer.status !== "running") return;
    if (remainingMs(timer, now) > 0) return;

    finishPhase(timer.endsAt, true);
  }, [timer, now, finishPhase]);

  useEffect(() => {
    if (!isMounted) return;
    if (timer.status === "idle") return;

    const previous = document.title;
    document.title = `${formatDuration(left)} · ${PHASE_LABELS[timer.phase]}`;
    return () => {
      document.title = previous;
    };
  }, [isMounted, timer.status, timer.phase, left]);

  const start = () => {
    const at = Date.now();

    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        void Notification.requestPermission();
      }
    } catch {
      // The timer works without notifications.
    }

    setNow(at);
    setTimer((current) =>
      startPhase({ ...current, noteId }, current.phase, settings, at)
    );
  };

  const togglePause = () => {
    const at = Date.now();
    setNow(at);
    setTimer((current) =>
      current.status === "running" ? pause(current, at) : resume(current, at)
    );
  };

  const skip = () => finishPhase(Date.now(), false);

  const stop = () => {
    const at = Date.now();
    const logged = sessionFor(timer, settings, activeTitle, at);
    if (logged) setSessions((history) => [...history, logged].slice(-MAX_SESSIONS));

    setNow(at);
    setTimer(idleState(noteId));
    setNotice(
      logged ? `Saved ${formatTotal(logged.seconds)} on ${logged.noteTitle}.` : null
    );
  };

  const totals = useMemo(() => secondsByDay(sessions), [sessions]);
  const heatmap = useMemo(
    () => (isMounted ? buildHeatmap(totals, now, HEATMAP_DAYS) : []),
    [totals, now, isMounted]
  );
  const today = isMounted ? (totals.get(dayKey(now)) ?? 0) : 0;
  const streak = isMounted ? currentStreak(totals, now) : 0;
  const thisNote = useMemo(
    () => (noteId ? secondsForNote(sessions, noteId) : { seconds: 0, count: 0 }),
    [sessions, noteId]
  );

  // Named from the session, so a deleted note still accounts for its hours.
  const leaderboard = useMemo(() => {
    const byNote = new Map<string, { title: string; seconds: number }>();

    for (const session of sessions) {
      const key = session.noteId ?? "general";
      const entry = byNote.get(key) ?? { title: session.noteTitle, seconds: 0 };
      entry.seconds += session.seconds;
      entry.title = session.noteTitle;
      byNote.set(key, entry);
    }

    return [...byNote.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 5);
  }, [sessions]);

  const isIdle = timer.status === "idle";
  const dots = Array.from(
    { length: Math.max(1, settings.cyclesBeforeLongBreak) },
    (_, index) => index < timer.focusDone
  );

  const updateSetting = (key: keyof FocusSettings, value: number) =>
    setSettings((current) => ({
      ...current,
      [key]: Math.min(180, Math.max(1, Math.round(value) || 1)),
    }));

  return (
    <section className="mx-auto w-full max-w-3xl px-1 py-2">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Focus Timer
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Study one note at a time in timed rounds. Every finished round is kept,
          so the hours behind a subject are there to see.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <label
          htmlFor="focus-note"
          className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400"
        >
          Studying
        </label>
        <select
          id="focus-note"
          value={noteId ?? ""}
          disabled={!isIdle}
          onChange={(event) => setNoteId(event.target.value || null)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">General focus (no note)</option>
          {notes.map((note) => (
            <option key={note.id} value={note.id}>
              {noteHeading(note)}
            </option>
          ))}
        </select>
        {!isIdle && (
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            Stop the round to study a different note.
          </p>
        )}
        {isMounted && notes.length === 0 && (
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            No notes yet — a general round is still counted.
          </p>
        )}

        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
          <TimerRing phase={timer.phase} progress={progress}>
            <span className="text-5xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {isMounted ? formatDuration(isIdle ? total : left) : "--:--"}
            </span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {PHASE_LABELS[timer.phase]}
            </span>
          </TimerRing>

          <div className="flex w-full max-w-xs flex-col gap-3">
            <div className="flex items-center justify-center gap-1.5 sm:justify-start">
              {dots.map((done, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    done
                      ? "bg-teal-500"
                      : "bg-slate-200 dark:bg-slate-700"
                  )}
                  aria-hidden="true"
                />
              ))}
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                {timer.focusDone} of {Math.max(1, settings.cyclesBeforeLongBreak)}{" "}
                to a long break
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {isIdle ? (
                <button
                  type="button"
                  onClick={start}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Start
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={togglePause}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    {timer.status === "running" ? (
                      <>
                        <Pause className="h-4 w-4" aria-hidden="true" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" aria-hidden="true" />
                        Resume
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={skip}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={stop}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Stop
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setChimeOn((on) => !on)}
                className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {chimeOn ? (
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {chimeOn ? "Chime on" : "Chime off"}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings((open) => !open)}
                aria-expanded={showSettings}
                className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                Lengths
              </button>
            </div>
          </div>
        </div>

        {showSettings && (
          <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-4">
            {(
              [
                ["focusMinutes", "Focus"],
                ["shortBreakMinutes", "Short break"],
                ["longBreakMinutes", "Long break"],
                ["cyclesBeforeLongBreak", "Rounds"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label
                  htmlFor={`focus-${key}`}
                  className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {label}
                </label>
                <input
                  id={`focus-${key}`}
                  type="number"
                  min={1}
                  max={180}
                  value={settings[key]}
                  onChange={(event) =>
                    updateSetting(key, Number.parseInt(event.target.value, 10))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm tabular-nums text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            ))}
            <p className="text-xs text-slate-400 dark:text-slate-500 sm:col-span-4">
              New lengths apply to the next round; the one running keeps the
              length it started with.
            </p>
          </div>
        )}

        {notice && (
          <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            {notice}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            This note
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatTotal(thisNote.seconds)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {thisNote.count} {thisNote.count === 1 ? "round" : "rounds"} on{" "}
            {activeTitle}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Today
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatTotal(today)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            across every note
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Streak
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            <Flame
              className={cn(
                "h-5 w-5",
                streak > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-700"
              )}
              aria-hidden="true"
            />
            {streak}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {streak === 1 ? "day in a row" : "days in a row"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Last 13 weeks
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Laid out in Ethiopian months.
        </p>
        {isMounted && heatmap.length > 0 ? (
          <Heatmap days={heatmap} />
        ) : (
          <div className="h-24 rounded-lg bg-slate-50 dark:bg-slate-800/50" />
        )}
      </div>

      {leaderboard.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
            Where the time went
          </h2>
          <ul className="space-y-2">
            {leaderboard.map((entry, index) => (
              <li key={`${entry.title}-${index}`} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-700 dark:text-slate-200">
                    {entry.title}
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span
                      className="block h-full rounded-full bg-teal-500"
                      style={{
                        width: `${Math.round(
                          (entry.seconds / leaderboard[0].seconds) * 100
                        )}%`,
                      }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatTotal(entry.seconds)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        Rounds shorter than a minute are not kept, and everything stays on this
        device. A default round is {DEFAULT_SETTINGS.focusMinutes} minutes —{" "}
        {formatDuration(DEFAULT_SETTINGS.focusMinutes * MINUTE_MS)}.
      </p>
    </section>
  );
}
