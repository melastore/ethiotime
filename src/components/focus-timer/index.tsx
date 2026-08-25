"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  Coffee,
  Flame,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SkipForward,
  Target,
  Zap,
  Send,
} from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { hasApi, pushReminders, telegramLinkStatus } from "@/lib/api";
import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";
import {
  DEFAULT_SETTINGS,
  type FocusPhase,
  type FocusSettings,
  type HeatmapDay,
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
import { deviceToken } from "@/lib/planner-telegram";
import { readJson, writeJson } from "@/lib/storage";
import { cn } from "@/lib/utils";

// Pomodoro timer. Sessions are logged to localStorage and summarised below the
// clock (today / this note / streak / heatmap).
//
// Presets and lengths sit in the setup card next to the clock rather than in a
// dropdown, which kept opening below the fold.

const SETTINGS_KEY = "focus-timer-settings";
const SESSIONS_KEY = "focus-timer-sessions";
const TIMER_KEY = "focus-timer-state";
const CHIME_KEY = "focus-timer-chime";
const AUTOSTART_KEY = "focus-timer-autostart";

const MAX_SESSIONS = 2000;
const HEATMAP_DAYS = 91;

type PhaseTheme = {
  en: string;
  am: string;
  short: string;
  icon: typeof Target;
  /** The card behind the ring. */
  hero: string;
  /** Both stops of the ring's gradient. */
  from: string;
  to: string;
  glow: string;
};

const PHASE: Record<FocusPhase, PhaseTheme> = {
  focus: {
    en: "Focus",
    am: "ትኩረት",
    short: "Focus",
    icon: Target,
    hero: "from-teal-600 via-emerald-700 to-slate-900",
    // Token, so the ring follows the dark palette like teal-* does.
    from: "var(--accent-soft)",
    to: "var(--accent-deep)",
    glow: "bg-teal-300",
  },
  shortBreak: {
    en: "Short break",
    am: "አጭር እረፍት",
    short: "Short",
    icon: Coffee,
    hero: "from-sky-500 via-blue-700 to-slate-900",
    from: "#7dd3fc",
    to: "#0ea5e9",
    glow: "bg-sky-300",
  },
  longBreak: {
    en: "Long break",
    am: "ረጅም እረፍት",
    short: "Long",
    icon: Moon,
    hero: "from-amber-500 via-orange-700 to-slate-900",
    from: "#fcd34d",
    to: "#f59e0b",
    glow: "bg-amber-300",
  },
};

const PHASE_ORDER: FocusPhase[] = ["focus", "shortBreak", "longBreak"];

/** Common presets. */
const PRESETS: Array<{ name: string; settings: FocusSettings }> = [
  {
    name: "Classic",
    settings: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      cyclesBeforeLongBreak: 4,
    },
  },
  {
    name: "Deep",
    settings: {
      focusMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 25,
      cyclesBeforeLongBreak: 3,
    },
  },
  {
    name: "Sprint",
    settings: {
      focusMinutes: 15,
      shortBreakMinutes: 3,
      longBreakMinutes: 12,
      cyclesBeforeLongBreak: 4,
    },
  },
  {
    name: "Ultradian",
    settings: {
      focusMinutes: 90,
      shortBreakMinutes: 20,
      longBreakMinutes: 30,
      cyclesBeforeLongBreak: 2,
    },
  },
];

/**
 * A preset laid out end to end, so it can be drawn as a bar: focus, short
 * break, focus, ... and the long break last.
 */
function roundShape(settings: FocusSettings) {
  const rounds = Math.max(1, settings.cyclesBeforeLongBreak);

  return Array.from({ length: rounds * 2 }, (_, index) => {
    const focus = index % 2 === 0;
    const last = index === rounds * 2 - 1;

    return {
      focus,
      minutes: focus
        ? settings.focusMinutes
        : last
          ? settings.longBreakMinutes
          : settings.shortBreakMinutes,
    };
  });
}

const SETTING_ROWS: Array<{ key: keyof FocusSettings; en: string; am: string }> = [
  { key: "focusMinutes", en: "Focus", am: "ትኩረት" },
  { key: "shortBreakMinutes", en: "Short break", am: "አጭር እረፍት" },
  { key: "longBreakMinutes", en: "Long break", am: "ረጅም እረፍት" },
  { key: "cyclesBeforeLongBreak", en: "Rounds to a long break", am: "ዙሮች" },
];

const INTENSITY = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-teal-200 dark:bg-teal-900",
  "bg-teal-300 dark:bg-teal-700",
  "bg-teal-500 dark:bg-teal-500",
  "bg-teal-600 dark:bg-teal-400",
] as const;

const CARD =
  "rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70";

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";

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

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

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

/** "14:32", the clock time the running phase runs out. */
const endsAtLabel = (endsAt: number) =>
  new Date(endsAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

function TimerRing({
  phase,
  progress,
  live,
  children,
}: {
  phase: FocusPhase;
  progress: number;
  /** Running, as opposed to idle or paused. Only then is the head drawn. */
  live: boolean;
  children: React.ReactNode;
}) {
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const theme = PHASE[phase];

  // The svg is turned a quarter, so the arc starts at twelve o'clock; the head
  // is placed in the turned frame and comes along with it.
  const angle = progress * 2 * Math.PI;
  const head = {
    x: 96 + radius * Math.cos(angle),
    y: 96 + radius * Math.sin(angle),
  };

  return (
    <div className="relative aspect-square w-56 shrink-0 sm:w-64">
      <svg viewBox="0 0 192 192" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={`ring-${phase}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.from} />
            <stop offset="100%" stopColor={theme.to} />
          </linearGradient>
        </defs>

        <circle
          cx="96"
          cy="96"
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-white/15"
        />
        <circle
          cx="96"
          cy="96"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={`url(#ring-${phase})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
          style={{ filter: "drop-shadow(0 0 7px rgb(255 255 255 / 0.35))" }}
        />

        {live && progress > 0.01 && (
          <circle
            cx={head.x}
            cy={head.y}
            r="7"
            className="fill-white transition-[cx,cy] duration-500 ease-linear motion-reduce:transition-none"
            style={{ filter: "drop-shadow(0 0 8px rgb(255 255 255 / 0.75))" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function Heatmap({ days, isAmharic }: { days: HeatmapDay[]; isAmharic: boolean }) {
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
            className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400"
          >
            {group.label}
          </span>
        ))}
      </div>

      <div className="mt-1.5 flex gap-1">
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex flex-1 flex-col gap-1">
            {column.map((day, rowIndex) => {
              if (!day) return <div key={rowIndex} className="aspect-square" />;

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
                    "aspect-square rounded-[4px] transition-transform hover:scale-125",
                    INTENSITY[intensityOf(day.seconds, busiest)]
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>{isAmharic ? "ትንሽ" : "Less"}</span>
        {INTENSITY.map((tone, index) => (
          <span key={index} className={cn("h-2.5 w-2.5 rounded-[3px]", tone)} />
        ))}
        <span>{isAmharic ? "ብዙ" : "More"}</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn(CARD, "p-4")}>
      <p className={EYEBROW}>{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-2xl font-black tabular-nums text-slate-900 dark:text-white">
        {icon}
        {value}
      </p>
      <p className="truncate text-sm text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

export default function FocusTimer() {
  const { language } = useLanguage();
  const isAmharic = language === "am";

  const [isMounted, setIsMounted] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [settings, setSettings] = useState<FocusSettings>(DEFAULT_SETTINGS);
  const [timer, setTimer] = useState<TimerState>(() => idleState());
  const [noteId, setNoteId] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [chimeOn, setChimeOn] = useState(true);
  const [autoStart, setAutoStart] = useState(true);
  const [showTuner, setShowTuner] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<keyof FocusSettings, string>>>(
    {}
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [telegramOn, setTelegramOn] = useState(false);

  // Linked in the planner, used here too: one chat per device, not per tool.
  useEffect(() => {
    if (!hasApi()) return;

    telegramLinkStatus(deviceToken())
      .then((status) => setTelegramOn(status.linked))
      .catch(() => {
        // The timer works without it.
      });
  }, []);

  // Read after mount: the server cannot render the clock or localStorage.
  useEffect(() => {
    setNotes(loadNotes());
    setSessions(readJson(SESSIONS_KEY, [], isSessionArray));
    setSettings(readJson(SETTINGS_KEY, DEFAULT_SETTINGS, isSettings));
    setChimeOn(readJson(CHIME_KEY, true, isBoolean));
    setAutoStart(readJson(AUTOSTART_KEY, true, isBoolean));

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

  useEffect(() => {
    if (isMounted) writeJson(AUTOSTART_KEY, autoStart);
  }, [autoStart, isMounted]);

  // The number shown comes from the clock, so a late interval costs nothing.
  useEffect(() => {
    if (timer.status !== "running") return;

    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.status]);

  // Clear the saved-session message instead of leaving it up all session.
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === noteId) ?? null,
    [notes, noteId]
  );
  const activeTitle = activeNote
    ? noteHeading(activeNote)
    : isAmharic
      ? "አጠቃላይ ትኩረት"
      : "General focus";

  const left = remainingMs(timer, now);
  // The running phase is pushed as a single reminder for the moment it ends, so
  // a closed tab still gets told. Pausing or stopping clears it: the browser
  // notification only ever fired while this page was open, which is the one
  // time you do not need telling.
  useEffect(() => {
    if (!isMounted || !telegramOn) return;

    const running = timer.status === "running" && timer.endsAt > Date.now();

    const reminders = running
      ? [
          {
            key: `focus:${timer.endsAt}`,
            title:
              timer.phase === "focus"
                ? isAmharic
                  ? "የትኩረት ጊዜ አልቋል"
                  : "Focus done"
                : isAmharic
                  ? "ዕረፍቱ አልቋል"
                  : "Break over",
            notes: timer.phase === "focus" ? activeTitle : "",
            when: new Date(timer.endsAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }),
            startAt: timer.endsAt,
            remindAt: timer.endsAt,
          },
        ]
      : [];

    pushReminders(deviceToken(), reminders, "focus").catch(() => {
      // Offline; the next start or stop tries again.
    });
  }, [
    isMounted,
    telegramOn,
    timer.status,
    timer.endsAt,
    timer.phase,
    activeTitle,
    isAmharic,
  ]);

  const total = phaseDurationMs(timer.phase, settings);
  const isIdle = timer.status === "idle";
  const progress = isIdle ? 0 : 1 - left / total;
  const theme = PHASE[timer.phase];

  // Kept in refs so finishPhase can stay outside the setTimer updater. It used
  // to run inside one, and Strict Mode double-invokes updaters, so every round
  // was logged twice and chimed twice.
  const titleRef = useRef(activeTitle);
  titleRef.current = activeTitle;
  const timerRef = useRef(timer);
  timerRef.current = timer;
  /** Guards against finishing the same phase twice. */
  const finishedRef = useRef(0);

  const finishPhase = useCallback(
    (at: number, announce: boolean) => {
      const current = timerRef.current;
      if (current.status === "idle") return;

      const logged = sessionFor(current, settings, titleRef.current, at);
      if (logged) {
        setSessions((history) => [...history, logged].slice(-MAX_SESSIONS));
      }

      const { phase, focusDone } = nextPhase(current, settings);

      if (announce) {
        if (chimeOn) playChime();
        notify(
          current.phase === "focus" ? "Focus done" : "Break over",
          phase === "focus"
            ? `Back to ${titleRef.current}.`
            : `Time for a ${PHASE[phase].en.toLowerCase()}.`
        );
      }

      // Off, the next phase is queued but not started.
      setTimer(
        autoStart
          ? startPhase({ ...current, focusDone }, phase, settings, at)
          : { ...idleState(current.noteId), phase, focusDone }
      );
      setNow(at);
    },
    [settings, chimeOn, autoStart]
  );

  // Ended by the clock, so a sleeping tab still ends exactly one phase.
  useEffect(() => {
    if (timer.status !== "running") return;
    if (remainingMs(timer, now) > 0) return;
    if (finishedRef.current === timer.endsAt) return;

    finishedRef.current = timer.endsAt;
    finishPhase(timer.endsAt, true);
  }, [timer, now, finishPhase]);

  useEffect(() => {
    if (!isMounted) return;
    if (timer.status === "idle") return;

    const previous = document.title;
    document.title = `${formatDuration(left)} · ${PHASE[timer.phase].en}`;
    return () => {
      document.title = previous;
    };
  }, [isMounted, timer.status, timer.phase, left]);

  const start = useCallback(() => {
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
  }, [noteId, settings]);

  const togglePause = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setTimer((current) =>
      current.status === "running" ? pause(current, at) : resume(current, at)
    );
  }, []);

  const skip = useCallback(() => finishPhase(Date.now(), false), [finishPhase]);

  const stop = useCallback(() => {
    const at = Date.now();
    const logged = sessionFor(timerRef.current, settings, titleRef.current, at);
    if (logged) setSessions((history) => [...history, logged].slice(-MAX_SESSIONS));

    setNow(at);
    setTimer(idleState(timerRef.current.noteId));
    setNotice(
      logged
        ? isAmharic
          ? `${formatTotal(logged.seconds)} ተቀምጧል።`
          : `Saved ${formatTotal(logged.seconds)} on ${logged.noteTitle}.`
        : isAmharic
          ? "ከአንድ ደቂቃ ያነሰ ዙር አይቀመጥም።"
          : "Under a minute, so nothing was kept."
    );
  }, [settings, isAmharic]);

  // Space toggles the timer. Skipped while typing so it doesn't hijack inputs.
  useEffect(() => {
    if (!isMounted) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (timerRef.current.status === "idle") start();
        else togglePause();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMounted, start, togglePause]);

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

  const roundsToLong = Math.max(1, settings.cyclesBeforeLongBreak);

  const commitSetting = (key: keyof FocusSettings, value: number) =>
    setSettings((current) => ({
      ...current,
      [key]: Math.min(180, Math.max(1, Math.round(value))),
    }));

  const nudge = (key: keyof FocusSettings, delta: number) => {
    setDrafts((current) => {
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
    commitSetting(key, settings[key] + delta);
  };

  /**
   * What is in the box while it is being typed in.
   *
   * The stored lengths are numbers and can never be empty, so reading the box
   * straight back into them means clearing it puts a 1 there — and the 1 cannot
   * then be deleted to type a length of its own. The typed text is kept as text
   * instead: the box may be empty mid-edit, a length is only stored once it is
   * a usable number, and leaving the box brings back the stored one.
   */
  const editSetting = (key: keyof FocusSettings, text: string) => {
    setDrafts((current) => ({ ...current, [key]: text }));

    const parsed = Number.parseInt(text, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 180) {
      commitSetting(key, parsed);
    }
  };

  const settleSetting = (key: keyof FocusSettings) => {
    const parsed = Number.parseInt(drafts[key] ?? "", 10);
    if (Number.isFinite(parsed)) commitSetting(key, parsed);

    setDrafts((current) => {
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
  };

  const activePreset = PRESETS.find(
    (preset) =>
      preset.settings.focusMinutes === settings.focusMinutes &&
      preset.settings.shortBreakMinutes === settings.shortBreakMinutes &&
      preset.settings.longBreakMinutes === settings.longBreakMinutes &&
      preset.settings.cyclesBeforeLongBreak === settings.cyclesBeforeLongBreak
  );

  return (
    <section className="mx-auto w-full max-w-5xl pb-4 pt-2">
      <header className="mb-5">
        <p className={EYEBROW}>{isAmharic ? "የትኩረት ሰዓት" : "Focus timer"}</p>
        <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {isAmharic ? "አንድ ዙር በአንድ ጊዜ" : "One round at a time"}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
          {isAmharic
            ? "አንድ ማስታወሻ በሰዓት ተከፍሎ ያጥኑ። የተጠናቀቀ ዙር ሁሉ ይቀመጣል።"
            : "Study one note in timed rounds. Every finished round is kept, so the hours behind a subject are there to see."}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        {/* The round. */}
        <section
          className={cn(
            "relative overflow-hidden rounded-[2rem] bg-gradient-to-br p-5 text-white shadow-lg transition-[background] duration-700 sm:p-6",
            theme.hero
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full opacity-25 blur-3xl transition-colors duration-700",
              theme.glow,
              timer.status === "running" && "animate-breathe"
            )}
          />

          {/* Where you are in the cycle. Idle, the phase can be chosen. */}
          <div
            role="tablist"
            aria-label={isAmharic ? "ደረጃ" : "Phase"}
            className="relative grid grid-cols-3 gap-1 rounded-2xl bg-black/20 p-1 backdrop-blur-sm"
          >
            {PHASE_ORDER.map((option) => {
              const active = timer.phase === option;
              const Icon = PHASE[option].icon;

              return (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={!isIdle}
                  onClick={() =>
                    setTimer((current) => ({ ...current, phase: option }))
                  }
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors sm:text-sm",
                    active
                      ? "bg-white/95 text-slate-900 shadow-sm"
                      : isIdle
                        ? "text-white/70 hover:bg-white/10 hover:text-white"
                        : "cursor-not-allowed text-white/60"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="truncate">
                    {isAmharic ? PHASE[option].am : PHASE[option].short}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative mt-5 flex flex-col items-center">
            <TimerRing
              phase={timer.phase}
              progress={progress}
              live={timer.status === "running"}
            >
              <span className="text-[3.25rem] font-black leading-none tabular-nums tracking-tight sm:text-6xl">
                {isMounted ? formatDuration(isIdle ? total : left) : "--:--"}
              </span>
              <span className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                {isAmharic ? theme.am : theme.en}
              </span>
              {timer.status === "running" && (
                <span className="mt-1 text-xs font-semibold tabular-nums text-white/50">
                  {isAmharic ? "ይጠናቀቃል" : "ends"} {endsAtLabel(timer.endsAt)}
                </span>
              )}
              {timer.status === "paused" && (
                <span className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                  {isAmharic ? "ቆሟል" : "Paused"}
                </span>
              )}
            </TimerRing>

            {/* Rounds finished since the last long break. */}
            <div className="mt-4 flex items-center gap-1.5">
              {Array.from({ length: roundsToLong }, (_, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index < timer.focusDone
                      ? "w-6 bg-white"
                      : "w-2 bg-white/25"
                  )}
                />
              ))}
              <span className="ml-2 text-xs font-semibold text-white/60">
                {timer.focusDone}/{roundsToLong}
              </span>
            </div>

            <div className="mt-5 flex w-full max-w-sm items-center gap-2">
              {isIdle ? (
                <button
                  type="button"
                  onClick={start}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-900 shadow-lg transition-transform hover:scale-[1.02] active:scale-100"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  {isAmharic ? "ጀምር" : "Start"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={togglePause}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-900 shadow-lg transition-transform hover:scale-[1.02] active:scale-100"
                  >
                    {timer.status === "running" ? (
                      <>
                        <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                        {isAmharic ? "ያቁሙ" : "Pause"}
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                        {isAmharic ? "ይቀጥሉ" : "Resume"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={skip}
                    aria-label={isAmharic ? "ዝለል" : "Skip"}
                    title={isAmharic ? "ዝለል" : "Skip"}
                    className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-white transition-colors hover:bg-white/25"
                  >
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={stop}
                    aria-label={isAmharic ? "አቁም" : "Stop"}
                    title={isAmharic ? "አቁም" : "Stop"}
                    className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-white transition-colors hover:bg-white/25"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            <p className="mt-2.5 text-[11px] font-medium text-white/60">
              {isAmharic ? "ክፍተት ቁልፍ ይጀምራል / ያቆማል" : "Space starts and pauses"}
            </p>
          </div>

          {notice && (
            <p className="relative mt-4 flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2.5 text-sm font-semibold text-white">
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}
        </section>

        {/* What the round is for, and how it is set up. */}
        <div className="space-y-4">
          <section className={CARD}>
            <label htmlFor="focus-note" className={EYEBROW}>
              {isAmharic ? "የሚያጠኑት" : "Studying"}
            </label>
            <select
              id="focus-note"
              value={noteId ?? ""}
              disabled={!isIdle}
              onChange={(event) => setNoteId(event.target.value || null)}
              className="mt-1.5 h-12 w-full rounded-2xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">
                {isAmharic ? "አጠቃላይ ትኩረት" : "General focus (no note)"}
              </option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {noteHeading(note)}
                </option>
              ))}
            </select>

            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {!isIdle
                ? isAmharic
                  ? "ሌላ ማስታወሻ ለማጥናት ዙሩን ያቁሙ።"
                  : "Stop the round to study a different note."
                : isMounted && notes.length === 0
                  ? isAmharic
                    ? "ገና ማስታወሻ የለም — አጠቃላይ ዙርም ይቆጠራል።"
                    : "No notes yet — a general round is still counted."
                  : ""}
            </p>

            {/* Round length.
                Presets used to live in a popover hung off a chip down here.
                On anything but a tall window it opened below the fold, so the
                preset you had just picked was the one thing you couldn't see.
                They sit in the card now, in normal flow. */}
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-baseline justify-between gap-2">
                <p className={EYEBROW}>{isAmharic ? "የዙር ርዝመት" : "Round length"}</p>
                <p className="text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                  {settings.focusMinutes} · {settings.shortBreakMinutes} ·{" "}
                  {settings.longBreakMinutes} {isAmharic ? "ደቂቃ" : "min"}
                </p>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => {
                  const active = activePreset?.name === preset.name;

                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setDrafts({});
                        setSettings(preset.settings);
                      }}
                      aria-pressed={active}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-[transform,box-shadow,border-color,background-color] duration-200",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
                        active
                          ? "-translate-y-0.5 border-transparent bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-600/25"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-teal-600"
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-1">
                        <span
                          className={cn(
                            "text-[13px] font-black",
                            active ? "text-white" : "text-slate-800 dark:text-slate-100"
                          )}
                        >
                          {preset.name}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-bold tabular-nums",
                            active ? "text-white/75" : "text-slate-500 dark:text-slate-400"
                          )}
                        >
                          {preset.settings.focusMinutes}/
                          {preset.settings.shortBreakMinutes}
                        </span>
                      </span>

                      {/* The whole cycle to the long break, to scale. */}
                      <span aria-hidden="true" className="mt-2 flex h-1.5 gap-0.5">
                        {roundShape(preset.settings).map((block, index) => (
                          <span
                            key={index}
                            style={{ flexGrow: block.minutes }}
                            className={cn(
                              "rounded-full",
                              block.focus
                                ? active
                                  ? "bg-white"
                                  : "bg-teal-500 dark:bg-teal-400"
                                : active
                                  ? "bg-white/35"
                                  : "bg-slate-200 dark:bg-slate-700"
                            )}
                          />
                        ))}
                      </span>

                      <span
                        className={cn(
                          "mt-1.5 block text-[11px] font-semibold tabular-nums",
                          active ? "text-white/75" : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {preset.settings.cyclesBeforeLongBreak}×{" "}
                        {isAmharic ? "ከዚያ" : "then"} {preset.settings.longBreakMinutes}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowTuner((open) => !open)}
                aria-expanded={showTuner}
                className={cn(
                  "mt-2 flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                  !activePreset
                    ? "border-teal-500 bg-teal-50 dark:border-teal-600 dark:bg-teal-950/40"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600"
                )}
              >
                <Settings2
                  className={cn(
                    "h-4 w-4 shrink-0",
                    !activePreset
                      ? "text-teal-700 dark:text-teal-300"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-[13px] font-black text-slate-800 dark:text-slate-100">
                  {isAmharic ? "የራስዎ" : "Custom"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400",
                    showTuner && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>

              {showTuner && (
                <div className="mt-2 space-y-1 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  {SETTING_ROWS.map(({ key, en, am }) => (
                    <div key={key} className="flex items-center gap-2">
                      <label
                        htmlFor={`focus-${key}`}
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {isAmharic ? am : en}
                      </label>

                      <button
                        type="button"
                        onClick={() => nudge(key, -1)}
                        aria-label={`${isAmharic ? am : en} −1`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <input
                        id={`focus-${key}`}
                        type="number"
                        min={1}
                        max={180}
                        inputMode="numeric"
                        value={drafts[key] ?? String(settings[key])}
                        onChange={(event) => editSetting(key, event.target.value)}
                        onBlur={() => settleSetting(key)}
                        className="h-8 w-14 shrink-0 rounded-lg border border-slate-200 bg-white text-center text-sm font-bold tabular-nums text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />

                      <button
                        type="button"
                        onClick={() => nudge(key, 1)}
                        aria-label={`${isAmharic ? am : en} +1`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}

                  <p className="pt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {isAmharic
                      ? "አዲስ ርዝመት ከሚቀጥለው ዙር ይጀምራል።"
                      : "New lengths apply to the next round; the one running keeps the length it started with."}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setChimeOn((on) => !on)}
                aria-pressed={chimeOn}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  chimeOn
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {chimeOn ? (
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isAmharic ? "ድምፅ" : "Chime"}
              </button>

              <button
                type="button"
                onClick={() => setAutoStart((on) => !on)}
                aria-pressed={autoStart}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  autoStart
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                {isAmharic ? "በራስ ጀምር" : "Auto-start"}
              </button>

              {/* Not a toggle: linking happens once, in the planner. */}
              {hasApi() && telegramOn && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  {isAmharic ? "ቴሌግራም" : "Telegram"}
                </span>
              )}
            </div>
          </section>

          <div className="grid grid-cols-3 gap-3">
            <Stat
              label={isAmharic ? "ዛሬ" : "Today"}
              value={formatTotal(today)}
              hint={isAmharic ? "ሁሉም ማስታወሻ" : "every note"}
            />
            <Stat
              label={isAmharic ? "ይህ ማስታወሻ" : "This note"}
              value={formatTotal(thisNote.seconds)}
              hint={`${thisNote.count} ${
                isAmharic ? "ዙር" : thisNote.count === 1 ? "round" : "rounds"
              }`}
            />
            <Stat
              label={isAmharic ? "ተከታታይ" : "Streak"}
              value={String(streak)}
              hint={isAmharic ? "ቀናት" : streak === 1 ? "day" : "days"}
              icon={
                <Flame
                  className={cn(
                    "h-5 w-5",
                    streak > 0
                      ? "text-amber-500"
                      : "text-slate-300 dark:text-slate-700"
                  )}
                  aria-hidden="true"
                />
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className={CARD}>
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            {isAmharic ? "ያለፉት 13 ሳምንታት" : "Last 13 weeks"}
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            {isAmharic ? "በኢትዮጵያ ወራት የተደረደረ።" : "Laid out in Ethiopian months."}
          </p>
          {isMounted && heatmap.length > 0 ? (
            <Heatmap days={heatmap} isAmharic={isAmharic} />
          ) : (
            <div
              className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50"
              aria-hidden="true"
            />
          )}
        </section>

        <section className={CARD}>
          <h2 className="mb-3 text-sm font-black text-slate-900 dark:text-white">
            {isAmharic ? "ሰዓቱ የት ሄደ" : "Where the time went"}
          </h2>

          {leaderboard.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {isAmharic
                ? "ገና የተጠናቀቀ ዙር የለም።"
                : "No finished rounds yet."}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {leaderboard.map((entry, index) => (
                <li key={`${entry.title}-${index}`} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {entry.title}
                    </span>
                    <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                        style={{
                          width: `${Math.round(
                            (entry.seconds / leaderboard[0].seconds) * 100
                          )}%`,
                        }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-black tabular-nums text-slate-900 dark:text-white">
                    {formatTotal(entry.seconds)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        {isAmharic
          ? "ከአንድ ደቂቃ ያነሱ ዙሮች አይቀመጡም፤ ሁሉም መረጃ በዚህ መሣሪያ ላይ ይቀራል።"
          : "Rounds shorter than a minute are not kept, and everything stays on this device."}
      </p>
    </section>
  );
}
