"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  CalendarPlus,
  Check,
  ChevronDown,
  Download,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { PickerField } from "@/components/shared/picker-field";
import { daysBetween } from "@/lib/age";
import {
  hasApi,
  pushReminders,
  startTelegramLink,
  telegramLinkStatus,
  unlinkTelegram,
  type LinkCode,
} from "@/lib/api";
import { ETHIOPIAN_MONTHS, GREGORIAN_MONTHS } from "@/lib/calendar-data";
import {
  getUpcomingHolidayOccurrences,
  type HolidayOccurrence,
} from "@/lib/ethiopian-holidays";
import { createIcsFileContent, downloadIcsContent } from "@/lib/ics";
import {
  convertPlannerDate,
  getNextOccurrence,
  getPlannerDaysInMonth,
  getTodayPlannerDate,
  getUpcomingOccurrences,
  gregorianToPlannerDate,
  normalizePlannerEvent,
  plannerDateToGregorian,
  type PlannerCalendar,
  type PlannerDateInput,
  type PlannerEvent,
  type RecurrenceRule,
} from "@/lib/planner";
import { buildReminders, deviceToken, formatWhen } from "@/lib/planner-telegram";
import { readJson, writeJson } from "@/lib/storage";
import { cn } from "@/lib/utils";

// Events list first, form second.
//
// Events with no next occurrence go in the Past list rather than being filtered
// out. The old version returned null for them, which left them in localStorage
// with no way to delete them.

const EVENTS_STORAGE_KEY = "ethiotime-planner-events";
const NOTIFIED_STORAGE_KEY = "ethiotime-planner-notified";
const HOLIDAY_PREFS_KEY = "ethiotime-planner-holiday-reminders";

/** Upper bound on remembered "already notified" keys, so it cannot grow forever. */
const MAX_REMEMBERED_NOTIFICATIONS = 300;

const REMINDER_CHOICES = [0, 10, 30, 60, 180, 1440];

const RECURRENCE_CHOICES: Array<{
  value: RecurrenceRule;
  en: string;
  am: string;
}> = [
  { value: "none", en: "Once", am: "አንዴ" },
  { value: "monthly", en: "Monthly", am: "በየወሩ" },
  { value: "yearly", en: "Yearly", am: "በየዓመቱ" },
];

const CARD =
  "rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70";

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";

const FIELD =
  "h-12 w-full rounded-2xl border-2 border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

type HolidayPrefs = { enabled: boolean; minutes: number };

const DEFAULT_HOLIDAY_PREFS: HolidayPrefs = { enabled: true, minutes: 1440 };

const isHolidayPrefs = (value: unknown): value is HolidayPrefs =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as HolidayPrefs).enabled === "boolean" &&
  typeof (value as HolidayPrefs).minutes === "number";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const loadEvents = (): PlannerEvent[] =>
  readJson<PlannerEvent[]>(
    EVENTS_STORAGE_KEY,
    [],
    (value): value is PlannerEvent[] => Array.isArray(value)
  );

const formatGregorian = (date: Date) =>
  date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatClock = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function formatReminder(minutes: number, isAmharic: boolean) {
  if (minutes === 0) return isAmharic ? "ሲጀምር" : "At start";
  if (minutes < 60)
    return isAmharic ? `${minutes} ደቂቃ በፊት` : `${minutes} min before`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return isAmharic ? `${hours} ሰዓት በፊት` : `${hours} hr before`;
  }
  const days = Math.floor(minutes / 1440);
  return isAmharic ? `${days} ቀን በፊት` : `${days} day before`;
}

/** "Today", "Tomorrow", "in 6 days" — the part people actually read. */
function countdownLabel(daysAway: number, isAmharic: boolean) {
  if (daysAway <= 0) return isAmharic ? "ዛሬ" : "Today";
  if (daysAway === 1) return isAmharic ? "ነገ" : "Tomorrow";
  if (daysAway < 7)
    return isAmharic ? `በ${daysAway} ቀን` : `in ${daysAway} days`;
  if (daysAway < 30) {
    const weeks = Math.round(daysAway / 7);
    return isAmharic
      ? `በ${weeks} ሳምንት`
      : `in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }
  const months = Math.round(daysAway / 30);
  return isAmharic
    ? `በ${months} ወር`
    : `in ${months} ${months === 1 ? "month" : "months"}`;
}

/** Nearer events read hotter, so the list can be scanned by colour alone. */
function urgencyTone(daysAway: number) {
  if (daysAway <= 0) return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";
  if (daysAway <= 1)
    return "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300";
  if (daysAway <= 7)
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

const GROUPS = [
  { id: "today", limit: 0, en: "Today", am: "ዛሬ" },
  { id: "tomorrow", limit: 1, en: "Tomorrow", am: "ነገ" },
  { id: "week", limit: 7, en: "This week", am: "በዚህ ሳምንት" },
  { id: "month", limit: 31, en: "This month", am: "በዚህ ወር" },
  { id: "later", limit: Infinity, en: "Later", am: "ወደፊት" },
] as const;

const numbers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }));

const yearRun = (current: number) =>
  Array.from({ length: 31 }, (_, index) => current - 5 + index);

type Draft = {
  title: string;
  notes: string;
  date: PlannerDateInput;
  recurrence: RecurrenceRule;
  reminderMinutes: number;
};

const emptyDraft = (calendar: PlannerCalendar): Draft => ({
  title: "",
  notes: "",
  date: getTodayPlannerDate(calendar),
  recurrence: "none",
  reminderMinutes: 0,
});

export default function EventPlanner() {
  const { language } = useLanguage();
  const isAmharic = language === "am";

  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [alerts, setAlerts] = useState<Array<{ id: string; text: string }>>([]);
  const [holidayPrefs, setHolidayPrefs] = useState<HolidayPrefs>(
    DEFAULT_HOLIDAY_PREFS
  );
  const [permission, setPermission] = useState<NotificationPermission>("denied");
  const [telegram, setTelegram] = useState<{ linked: boolean; chatName: string | null }>({
    linked: false,
    chatName: null,
  });
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  const [draft, setDraft] = useState<Draft>(() => emptyDraft("gregorian"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEvents(loadEvents());
    notifiedRef.current = new Set(
      readJson<string[]>(NOTIFIED_STORAGE_KEY, [], isStringArray)
    );
    setHolidayPrefs(
      readJson(HOLIDAY_PREFS_KEY, DEFAULT_HOLIDAY_PREFS, isHolidayPrefs)
    );
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) writeJson(EVENTS_STORAGE_KEY, events);
  }, [events, mounted]);

  // Persisted; these used to reset to the default on every reload.
  useEffect(() => {
    if (mounted) writeJson(HOLIDAY_PREFS_KEY, holidayPrefs);
  }, [holidayPrefs, mounted]);

  const pushAlert = useCallback((text: string) => {
    setAlerts((previous) =>
      [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text }, ...previous].slice(
        0,
        4
      )
    );
  }, []);

  useEffect(() => {
    if (!mounted || !hasApi()) return;

    telegramLinkStatus(deviceToken())
      .then(setTelegram)
      .catch(() => {
        // The planner works without it; nothing to say until the user asks.
      });
  }, [mounted]);

  // Polled only while a code is on screen: linking happens in Telegram, so the
  // page has no other way to find out it worked.
  useEffect(() => {
    if (!linkCode) return;

    const timer = window.setInterval(async () => {
      if (Date.now() > linkCode.expiresAt) {
        setLinkCode(null);
        return;
      }

      try {
        const status = await telegramLinkStatus(deviceToken());
        if (!status.linked) return;

        setTelegram(status);
        setLinkCode(null);
      } catch {
        // Try again on the next tick.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [linkCode]);

  // Every edit resends the whole upcoming window, which is what lets an event
  // deleted here stop firing there.
  useEffect(() => {
    if (!mounted || !telegram.linked) return;

    const timer = window.setTimeout(() => {
      const reminders = buildReminders(events, new Date(), formatWhen);

      pushReminders(deviceToken(), reminders).catch(() => {
        // Offline or rate limited; the next edit tries again.
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [events, mounted, telegram.linked]);

  const linkTelegram = async () => {
    setTelegramBusy(true);
    setTelegramError(null);

    try {
      const code = await startTelegramLink(deviceToken());
      setLinkCode(code);
      window.open(code.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setTelegramError(
        error instanceof Error ? error.message : "Could not reach the server."
      );
    } finally {
      setTelegramBusy(false);
    }
  };

  const disconnectTelegram = async () => {
    setTelegramBusy(true);

    try {
      await unlinkTelegram(deviceToken());
    } catch {
      // Already gone, or unreachable; either way stop showing it as linked.
    } finally {
      setTelegram({ linked: false, chatName: null });
      setLinkCode(null);
      setTelegramBusy(false);
    }
  };

  const notify = useCallback(
    (titleText: string, body: string, key: string) => {
      if (notifiedRef.current.has(key)) return;

      notifiedRef.current.add(key);
      // Keys are never removed as events pass, so keep only the most recent ones
      // rather than growing this list for the lifetime of the browser profile.
      if (notifiedRef.current.size > MAX_REMEMBERED_NOTIFICATIONS) {
        notifiedRef.current = new Set(
          Array.from(notifiedRef.current).slice(-MAX_REMEMBERED_NOTIFICATIONS)
        );
      }
      writeJson(NOTIFIED_STORAGE_KEY, Array.from(notifiedRef.current));

      if (permission === "granted") {
        new Notification(titleText, { body, icon: "/ethiotime-mark.svg" });
      }

      pushAlert(`${titleText}: ${body}`);
    },
    [permission, pushAlert]
  );

  useEffect(() => {
    if (!mounted) return;

    const checkReminders = () => {
      const now = new Date();
      const oneMinuteAhead = now.getTime() + 60 * 1000;

      for (const event of events) {
        const fromWindow = new Date(
          now.getTime() - event.reminderMinutes * 60 * 1000 - 90 * 1000
        );
        const next = getNextOccurrence(event, fromWindow);
        if (!next) continue;

        const reminderAt =
          next.start.getTime() - event.reminderMinutes * 60 * 1000;

        if (reminderAt >= now.getTime() && reminderAt <= oneMinuteAhead) {
          notify(
            "Event reminder",
            `${event.title} at ${formatGregorian(next.start)}`,
            next.occurrenceKey
          );
        }
      }

      if (holidayPrefs.enabled) {
        const holidays = getUpcomingHolidayOccurrences(
          new Date(now.getTime() - holidayPrefs.minutes * 60 * 1000),
          20
        );

        for (const holiday of holidays) {
          const reminderAt =
            holiday.gregorianDate.getTime() - holidayPrefs.minutes * 60 * 1000;

          if (reminderAt >= now.getTime() && reminderAt <= oneMinuteAhead) {
            notify(
              "Holiday reminder",
              `${holiday.holiday.name} on ${holiday.gregorianDate.toLocaleDateString()}`,
              `holiday:${holiday.holiday.id}:${holiday.gregorianDate.getFullYear()}`
            );
          }
        }
      }
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 30 * 1000);
    return () => window.clearInterval(timer);
  }, [events, holidayPrefs, mounted, notify]);

  const upcomingHolidays = useMemo(
    () => (mounted ? getUpcomingHolidayOccurrences(new Date(), 8) : []),
    [mounted]
  );

  // Events with their next occurrence, soonest first. One-offs whose day has
  // gone have no next occurrence and go to `past` rather than being dropped.
  const { upcoming, past } = useMemo(() => {
    if (!mounted) return { upcoming: [], past: [] as PlannerEvent[] };

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const withNext = events.map((event) => ({
      event,
      next: getNextOccurrence(event, startOfToday),
    }));

    return {
      upcoming: withNext
        .filter(
          (entry): entry is { event: PlannerEvent; next: NonNullable<typeof entry.next> } =>
            entry.next !== null
        )
        .map((entry) => ({
          ...entry,
          daysAway: daysBetween(now, entry.next.start),
        }))
        .sort((a, b) => a.next.start.getTime() - b.next.start.getTime()),
      past: withNext
        .filter((entry) => entry.next === null)
        .map((entry) => entry.event)
        .sort((a, b) => b.createdAt - a.createdAt),
    };
  }, [events, mounted]);

  const grouped = useMemo(() => {
    return GROUPS.map((group, index) => {
      const floor = index === 0 ? -Infinity : GROUPS[index - 1].limit;
      return {
        group,
        entries: upcoming.filter(
          (entry) => entry.daysAway > floor && entry.daysAway <= group.limit
        ),
      };
    }).filter((bucket) => bucket.entries.length > 0);
  }, [upcoming]);

  const convertedPreview = useMemo(() => {
    const other: PlannerCalendar =
      draft.date.calendar === "gregorian" ? "ethiopian" : "gregorian";
    try {
      return convertPlannerDate(draft.date, other);
    } catch {
      return null;
    }
  }, [draft.date]);

  const setDate = (patch: Partial<PlannerDateInput>) =>
    setDraft((current) => {
      const next = { ...current.date, ...patch };
      // A day that does not exist in the new month is pulled back to the last
      // one that does, rather than throwing when the event is saved.
      return {
        ...current,
        date: { ...next, day: Math.min(next.day, getPlannerDaysInMonth(next)) },
      };
    });

  const switchCalendar = (calendar: PlannerCalendar) =>
    setDraft((current) =>
      current.date.calendar === calendar
        ? current
        : { ...current, date: convertPlannerDate(current.date, calendar) }
    );

  const resetForm = () => {
    setDraft(emptyDraft(draft.date.calendar));
    setEditingId(null);
  };

  const submit = () => {
    if (!draft.title.trim()) return;

    try {
      plannerDateToGregorian(draft.date);
    } catch {
      pushAlert(
        isAmharic ? "የተመረጠው ቀን ትክክል አይደለም።" : "Please choose a valid date."
      );
      return;
    }

    const body = {
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      date: draft.date,
      recurrence: draft.recurrence,
      reminderMinutes: draft.reminderMinutes,
    };

    if (editingId) {
      // Keep id and createdAt: the notified-keys are built from the id.
      setEvents((previous) =>
        previous.map((event) =>
          event.id === editingId
            ? { ...event, ...body, updatedAt: Date.now() }
            : event
        )
      );
      pushAlert(isAmharic ? "ተስተካክሏል።" : `Updated “${body.title}”.`);
    } else {
      setEvents((previous) => [normalizePlannerEvent(body), ...previous]);
    }

    resetForm();
  };

  const beginEdit = (event: PlannerEvent) => {
    setDraft({
      title: event.title,
      notes: event.notes,
      date: event.date,
      recurrence: event.recurrence,
      reminderMinutes: event.reminderMinutes,
    });
    setEditingId(event.id);
    setConfirmingDelete(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const removeEvent = (id: string) => {
    setEvents((previous) => previous.filter((entry) => entry.id !== id));
    setConfirmingDelete(null);
    if (editingId === id) resetForm();
  };

  /** Seed the form from an upcoming feast. */
  const planHoliday = (holiday: HolidayOccurrence) => {
    setDraft({
      title: isAmharic ? holiday.holiday.amharic : holiday.holiday.name,
      notes: holiday.holiday.description ?? "",
      date: {
        ...gregorianToPlannerDate(holiday.gregorianDate, draft.date.calendar),
        time: "09:00",
      },
      recurrence: "none",
      reminderMinutes: 1440,
    });
    setEditingId(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const exportToIcs = () => {
    const now = new Date();
    const lines = events.flatMap((event) =>
      getUpcomingOccurrences(event, now, event.recurrence === "none" ? 1 : 18)
    );

    if (lines.length === 0) {
      pushAlert(
        isAmharic ? "ወደፊት የሚላክ ክስተት የለም።" : "No upcoming events to export."
      );
      return;
    }

    downloadIcsContent(
      "ethiotime-events.ics",
      createIcsFileContent(
        lines.map((entry) => ({
          uid: `${entry.occurrenceKey}@ethiotime.com`,
          title: entry.title,
          description: entry.notes,
          start: entry.start,
        })),
        "EthioTime Planner"
      )
    );
  };

  if (!mounted) {
    return (
      <section className="mx-auto w-full max-w-5xl pb-4 pt-2">
        <p className={EYEBROW}>{isAmharic ? "ክስተት እቅድ" : "Event planner"}</p>
        <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {isAmharic ? "የሚመጣውን ያቅዱ" : "What is coming up"}
        </h1>
        <div
          className="mt-6 h-64 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/50"
          aria-hidden="true"
        />
      </section>
    );
  }

  const isGregorian = draft.date.calendar === "gregorian";
  const ethiopianMonth = ETHIOPIAN_MONTHS[draft.date.month - 1];
  const gregorianMonth = GREGORIAN_MONTHS[draft.date.month - 1];
  const next = upcoming[0];

  return (
    <section className="mx-auto w-full max-w-5xl pb-4 pt-2">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>{isAmharic ? "ክስተት እቅድ" : "Event planner"}</p>
          <h1 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {isAmharic ? "የሚመጣውን ያቅዱ" : "What is coming up"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
            {isAmharic
              ? "በሁለቱም የቀን አቆጣጠር ያቅዱ፤ ከመድረሱ በፊት ማስታወሻ ይደርስዎታል።"
              : "Plan in either calendar and get a reminder before it starts."}
          </p>
        </div>

        <button
          type="button"
          onClick={exportToIcs}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {isAmharic ? "ወደ .ics" : "Export .ics"}
        </button>
      </header>

      {alerts.length > 0 && (
        <ul className="mb-4 space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex items-start gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
            >
              <BellRing className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{alert.text}</span>
              <button
                type="button"
                onClick={() =>
                  setAlerts((previous) =>
                    previous.filter((entry) => entry.id !== alert.id)
                  )
                }
                aria-label={isAmharic ? "አጥፋ" : "Dismiss"}
                className="shrink-0 rounded-full p-0.5 text-teal-600 transition-colors hover:bg-teal-100 dark:text-teal-400 dark:hover:bg-teal-900"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr] lg:items-start">
        {/* What is planned. */}
        <div className="space-y-4">
          {next && (
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 via-emerald-700 to-slate-900 p-6 text-white shadow-lg">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-300/25 blur-3xl"
              />
              <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                {isAmharic ? "ቀጣይ" : "Next up"}
              </p>
              <p className="relative mt-2 truncate text-3xl font-black tracking-tight sm:text-4xl">
                {next.event.title}
              </p>
              <p className="relative mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-semibold text-white/80">
                <span className="rounded-full bg-white/20 px-3 py-0.5 font-bold">
                  {countdownLabel(next.daysAway, isAmharic)}
                </span>
                <span>{formatGregorian(next.next.start)}</span>
              </p>
              <p className="relative mt-2 border-t border-white/20 pt-2.5 text-sm text-white/70">
                {ETHIOPIAN_MONTHS[next.next.ethiopian.month - 1]?.label}{" "}
                {ETHIOPIAN_MONTHS[next.next.ethiopian.month - 1]?.amharic}{" "}
                {next.next.ethiopian.day}, {next.next.ethiopian.year}{" "}
                {isAmharic ? "ዓ.ም" : "E.C."}
              </p>
            </section>
          )}

          {upcoming.length === 0 ? (
            <section className={cn(CARD, "text-center")}>
              <CalendarPlus
                className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                {isAmharic ? "ገና ምንም አልታቀደም።" : "Nothing planned yet."}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isAmharic
                  ? "በቀኙ በኩል አንድ ይጨምሩ፣ ወይም ከሚመጡት በዓላት ይምረጡ።"
                  : "Add one on the right, or plan around an upcoming feast."}
              </p>
            </section>
          ) : (
            grouped.map(({ group, entries }) => (
              <section key={group.id}>
                <h2 className={cn(EYEBROW, "mb-2 px-1")}>
                  {isAmharic ? group.am : group.en}
                  <span className="ml-1.5 text-slate-300 dark:text-slate-600">
                    {entries.length}
                  </span>
                </h2>

                <ul className="space-y-2">
                  {entries.map(({ event, next: occurrence, daysAway }) => (
                    <li
                      key={event.id}
                      className={cn(
                        CARD,
                        "p-4 transition-colors",
                        editingId === event.id &&
                          "border-teal-400 ring-2 ring-teal-500/20 dark:border-teal-600"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Tear-off day block. */}
                        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-slate-100 py-2 dark:bg-slate-800">
                          <span className="text-xl font-black leading-none tabular-nums text-slate-900 dark:text-white">
                            {occurrence.ethiopian.day}
                          </span>
                          <span className="mt-0.5 truncate px-1 text-[10px] font-bold uppercase tracking-wide text-teal-600 dark:text-teal-400">
                            {ETHIOPIAN_MONTHS[occurrence.ethiopian.month - 1]?.label}
                          </span>
                          <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                            {formatClock(occurrence.start)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-base font-black text-slate-900 dark:text-white">
                              {event.title}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                                urgencyTone(daysAway)
                              )}
                            >
                              {countdownLabel(daysAway, isAmharic)}
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {formatGregorian(occurrence.start)}
                          </p>

                          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <BellRing className="h-3 w-3" aria-hidden="true" />
                              {formatReminder(event.reminderMinutes, isAmharic)}
                            </span>
                            {event.recurrence !== "none" && (
                              <span className="inline-flex items-center gap-1">
                                <Repeat className="h-3 w-3" aria-hidden="true" />
                                {
                                  RECURRENCE_CHOICES.find(
                                    (choice) => choice.value === event.recurrence
                                  )?.[isAmharic ? "am" : "en"]
                                }
                              </span>
                            )}
                          </p>

                          {event.notes && (
                            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                              {event.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => beginEdit(event)}
                            aria-label={`${isAmharic ? "አስተካክል" : "Edit"} ${event.title}`}
                            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>

                          {/* Two taps: there's no undo. */}
                          <button
                            type="button"
                            onClick={() =>
                              confirmingDelete === event.id
                                ? removeEvent(event.id)
                                : setConfirmingDelete(event.id)
                            }
                            onBlur={() => setConfirmingDelete(null)}
                            aria-label={`${isAmharic ? "አጥፋ" : "Delete"} ${event.title}`}
                            className={cn(
                              "rounded-xl p-2 transition-colors",
                              confirmingDelete === event.id
                                ? "bg-rose-600 text-white"
                                : "text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            )}
                          >
                            {confirmingDelete === event.id ? (
                              <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          {/* Past events. Previously filtered out, which stranded them in storage. */}
          {past.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowPast((open) => !open)}
                aria-expanded={showPast}
                className="flex w-full items-center gap-1.5 rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/60 dark:hover:bg-slate-800/60"
              >
                <span className={EYEBROW}>
                  {isAmharic ? "ያለፉ" : "Past"}
                  <span className="ml-1.5 text-slate-300 dark:text-slate-600">
                    {past.length}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-3.5 w-3.5 text-slate-500 transition-transform",
                    showPast && "rotate-180"
                  )}
                />
              </button>

              {showPast && (
                <ul className="mt-2 space-y-2">
                  {past.map((event) => (
                    <li
                      key={event.id}
                      className={cn(CARD, "flex items-center gap-3 p-3 opacity-70")}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-700 line-through dark:text-slate-300">
                          {event.title}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {event.date.day}/{event.date.month}/{event.date.year}{" "}
                          {event.date.calendar === "ethiopian"
                            ? isAmharic
                              ? "ዓ.ም"
                              : "E.C."
                            : ""}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => beginEdit(event)}
                        aria-label={`${isAmharic ? "አስተካክል" : "Edit"} ${event.title}`}
                        className="shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirmingDelete === event.id
                            ? removeEvent(event.id)
                            : setConfirmingDelete(event.id)
                        }
                        onBlur={() => setConfirmingDelete(null)}
                        aria-label={`${isAmharic ? "አጥፋ" : "Delete"} ${event.title}`}
                        className={cn(
                          "shrink-0 rounded-xl p-2 transition-colors",
                          confirmingDelete === event.id
                            ? "bg-rose-600 text-white"
                            : "text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        )}
                      >
                        {confirmingDelete === event.id ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* Making one. */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <section ref={formRef} className={CARD}>
            <div className="flex items-center justify-between gap-2">
              <p className={EYEBROW}>
                {editingId
                  ? isAmharic
                    ? "ማስተካከያ"
                    : "Editing"
                  : isAmharic
                    ? "አዲስ ክስተት"
                    : "New event"}
              </p>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {isAmharic ? "ተወው" : "Cancel"}
                </button>
              )}
            </div>

            <div
              role="tablist"
              aria-label={isAmharic ? "የቀን አቆጣጠር" : "Calendar"}
              className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/60"
            >
              {(["gregorian", "ethiopian"] as const).map((option) => {
                const active = draft.date.calendar === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchCalendar(option)}
                    className={cn(
                      "rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200",
                      active
                        ? option === "gregorian"
                          ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md"
                          : "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    {option === "gregorian"
                      ? "Gregorian"
                      : isAmharic
                        ? "ኢትዮጵያ"
                        : "Ethiopian"}
                  </button>
                );
              })}
            </div>

            <label htmlFor="event-title" className={cn(EYEBROW, "mt-4 block")}>
              {isAmharic ? "ርዕስ" : "Title"}
            </label>
            <input
              id="event-title"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              className={cn(FIELD, "mt-1.5")}
              placeholder={
                isAmharic ? "ስብሰባ፣ ልደት፣ የጾም ቀን…" : "Meeting, birthday, fasting day…"
              }
            />

            <div className="mt-4 flex items-end gap-2">
              <PickerField
                label={isAmharic ? "ቀን" : "Day"}
                value={draft.date.day}
                display={String(draft.date.day)}
                options={numbers(getPlannerDaysInMonth(draft.date))}
                onCommit={(day) => setDate({ day })}
                columns={6}
                width="17rem"
                className="w-[5.5rem] shrink-0"
              />
              <PickerField
                label={isAmharic ? "ወር" : "Month"}
                value={draft.date.month}
                display={
                  isGregorian
                    ? (gregorianMonth?.label ?? "")
                    : `${ethiopianMonth?.label ?? ""} ${ethiopianMonth?.amharic ?? ""}`
                }
                options={
                  isGregorian
                    ? GREGORIAN_MONTHS.map((item, index) => ({
                        value: index + 1,
                        label: item.label,
                      }))
                    : ETHIOPIAN_MONTHS.map((item, index) => ({
                        value: index + 1,
                        label: `${item.label} · ${item.amharic}`,
                        hint: item.gregorianSpan,
                      }))
                }
                onCommit={(month) => setDate({ month })}
                columns={isGregorian ? 2 : 1}
                width="20rem"
                className="min-w-0 flex-1"
              />
              <PickerField
                label={isAmharic ? "ዓመት" : "Year"}
                value={draft.date.year}
                display={String(draft.date.year)}
                options={yearRun(draft.date.year).map((year) => ({
                  value: year,
                  label: String(year),
                }))}
                onCommit={(year) => setDate({ year })}
                columns={1}
                width="9rem"
                className="w-[7.75rem] shrink-0"
              />
            </div>

            {convertedPreview && (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isAmharic ? "በሌላኛው አቆጣጠር" : "In the other calendar"}:{" "}
                <span className="text-slate-700 dark:text-slate-200">
                  {convertedPreview.calendar === "ethiopian"
                    ? `${ETHIOPIAN_MONTHS[convertedPreview.month - 1]?.label} ${convertedPreview.day}, ${convertedPreview.year} ${isAmharic ? "ዓ.ም" : "E.C."}`
                    : `${GREGORIAN_MONTHS[convertedPreview.month - 1]?.label} ${convertedPreview.day}, ${convertedPreview.year}`}
                </span>
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="event-time" className={cn(EYEBROW, "block")}>
                  {isAmharic ? "ሰዓት" : "Time"}
                </label>
                <input
                  id="event-time"
                  type="time"
                  value={draft.date.time}
                  onChange={(event) => setDate({ time: event.target.value })}
                  className={cn(FIELD, "mt-1.5 tabular-nums")}
                />
              </div>
              <div>
                <label htmlFor="event-reminder" className={cn(EYEBROW, "block")}>
                  {isAmharic ? "አስታውሰኝ" : "Remind me"}
                </label>
                <select
                  id="event-reminder"
                  value={draft.reminderMinutes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      reminderMinutes: Number.parseInt(event.target.value, 10),
                    }))
                  }
                  className={cn(FIELD, "mt-1.5")}
                >
                  {REMINDER_CHOICES.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatReminder(minutes, isAmharic)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className={cn(EYEBROW, "mt-4")}>{isAmharic ? "ድግግሞሽ" : "Repeat"}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/60">
              {RECURRENCE_CHOICES.map((choice) => {
                const active = draft.recurrence === choice.value;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        recurrence: choice.value,
                      }))
                    }
                    className={cn(
                      "rounded-xl px-2 py-2 text-sm font-bold transition-colors",
                      active
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    )}
                  >
                    {isAmharic ? choice.am : choice.en}
                  </button>
                );
              })}
            </div>

            <label htmlFor="event-notes" className={cn(EYEBROW, "mt-4 block")}>
              {isAmharic ? "ማስታወሻ" : "Notes"}
            </label>
            <textarea
              id="event-notes"
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              rows={2}
              className={cn(FIELD, "mt-1.5 h-auto py-2.5 font-normal")}
              placeholder={
                isAmharic ? "ማንኛውም የሚታወስ ነገር" : "Anything worth remembering"
              }
            />

            <button
              type="button"
              onClick={submit}
              disabled={!draft.title.trim()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
            >
              {editingId ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {isAmharic ? "አስቀምጥ" : "Save changes"}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {isAmharic ? "ክስተት ጨምር" : "Add event"}
                </>
              )}
            </button>
          </section>

          <section className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={EYEBROW}>{isAmharic ? "ማስታወሻዎች" : "Reminders"}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {permission === "granted"
                    ? isAmharic
                      ? "የአሳሽ ማሳወቂያ በርቷል።"
                      : "Browser notifications are on."
                    : isAmharic
                      ? "ማሳወቂያ ጠፍቷል፤ ገጹ ክፍት ሲሆን ብቻ ይታያል።"
                      : "Off, so reminders only show while this page is open."}
                </p>
              </div>

              {permission !== "granted" && (
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof Notification === "undefined") return;
                    setPermission(await Notification.requestPermission());
                  }}
                  className="shrink-0 rounded-xl border-2 border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {isAmharic ? "አብራ" : "Turn on"}
                </button>
              )}
            </div>

            {hasApi() && (
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Telegram
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                      {telegram.linked
                        ? isAmharic
                          ? `ወደ ${telegram.chatName ?? "ቴሌግራም"} ይላካል።`
                          : `Sent to ${telegram.chatName ?? "your chat"}, even with this page closed.`
                        : isAmharic
                          ? "ገጹ ተዘግቶም ማስታወሻ ለመቀበል ቴሌግራምን አገናኝ።"
                          : "Link a chat to get reminders when this page is closed."}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={telegramBusy}
                    onClick={telegram.linked ? disconnectTelegram : linkTelegram}
                    className="shrink-0 rounded-xl border-2 border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {telegram.linked
                      ? isAmharic
                        ? "አቋርጥ"
                        : "Disconnect"
                      : isAmharic
                        ? "አገናኝ"
                        : "Link"}
                  </button>
                </div>

                {linkCode && (
                  <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {isAmharic
                      ? "ቴሌግራም ላይ ጀምር የሚለውን ተጫን።"
                      : "Press Start in Telegram. If it did not open, send"}{" "}
                    <code className="font-mono font-bold">/start {linkCode.code}</code>{" "}
                    {isAmharic ? "" : "to the bot."}
                  </p>
                )}

                {telegramError && (
                  <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                    {telegramError}
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setHolidayPrefs((current) => ({
                    ...current,
                    enabled: !current.enabled,
                  }))
                }
                aria-pressed={holidayPrefs.enabled}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  holidayPrefs.enabled
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                {isAmharic ? "የበዓል ማስታወሻ" : "Holiday reminders"}
              </button>

              {holidayPrefs.enabled && (
                <select
                  value={holidayPrefs.minutes}
                  onChange={(event) =>
                    setHolidayPrefs((current) => ({
                      ...current,
                      minutes: Number.parseInt(event.target.value, 10),
                    }))
                  }
                  aria-label={isAmharic ? "የበዓል ማስታወሻ ጊዜ" : "Holiday reminder timing"}
                  className="h-9 rounded-xl border-2 border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {REMINDER_CHOICES.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatReminder(minutes, isAmharic)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </section>

          {upcomingHolidays.length > 0 && (
            <section className={CARD}>
              <p className={EYEBROW}>{isAmharic ? "የሚመጡ በዓላት" : "Next feasts"}</p>
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingHolidays.slice(0, 5).map((item) => {
                  const away = daysBetween(new Date(), item.gregorianDate);
                  return (
                    <li
                      key={`${item.holiday.id}-${item.gregorianDate.toISOString()}`}
                      className="flex items-center gap-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                          {isAmharic ? item.holiday.amharic : item.holiday.name}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {item.gregorianDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {countdownLabel(away, isAmharic)}
                        </span>
                      </span>

                      {/* Seeds the form with this feast. */}
                      <button
                        type="button"
                        onClick={() => planHoliday(item)}
                        aria-label={`${isAmharic ? "አቅድ" : "Plan around"} ${item.holiday.name}`}
                        className="shrink-0 rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40 dark:hover:text-teal-400"
                      >
                        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
