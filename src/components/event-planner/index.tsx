"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarClock,
  CalendarSync,
  Download,
  Repeat,
  Trash2,
} from "lucide-react";
import Kenat from "kenat";

import { DateInputFields } from "@/components/shared/date-input-fields";
import { createIcsFileContent, downloadIcsContent } from "@/lib/ics";
import {
  getUpcomingHolidayOccurrences,
  type HolidayOccurrence,
} from "@/lib/ethiopian-holidays";
import {
  convertPlannerDate,
  getNextOccurrence,
  getTodayPlannerDate,
  getUpcomingOccurrences,
  normalizePlannerEvent,
  plannerDateToGregorian,
  type PlannerCalendar,
  type PlannerDateInput,
  type PlannerEvent,
  type PlannerOccurrence,
  type RecurrenceRule,
} from "@/lib/planner";
import { cn } from "@/lib/utils";

const EVENTS_STORAGE_KEY = "ethiotime-planner-events";
const NOTIFIED_STORAGE_KEY = "ethiotime-planner-notified";

const reminderOptions = [0, 10, 30, 60, 180, 1440];

const recurrenceOptions: Array<{ value: RecurrenceRule; label: string }> = [
  { value: "none", label: "No repeat" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const calendarOptions: Array<{ value: PlannerCalendar; label: string }> = [
  { value: "gregorian", label: "Gregorian" },
  { value: "ethiopian", label: "Ethiopian" },
];

const formatGregorian = (date: Date) =>
  date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatReminder = (minutes: number) => {
  if (minutes === 0) return "At start";
  if (minutes < 60) return `${minutes} min before`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr before`;
  return `${Math.floor(minutes / 1440)} day before`;
};

const loadEvents = (): PlannerEvent[] => {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlannerEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadNotified = (): Set<string> => {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

function EventCard({
  event,
  onDelete,
}: {
  event: PlannerEvent;
  onDelete: (id: string) => void;
}) {
  const nextOccurrence = useMemo(
    () => getNextOccurrence(event, new Date()),
    [event]
  );

  if (!nextOccurrence) {
    return null;
  }

  const ethDate = new Kenat(nextOccurrence.start).getEthiopian();

  return (
    <article className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-700/70 dark:bg-slate-900/65">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{event.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {formatGregorian(nextOccurrence.start)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
          aria-label="Delete event"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-xs">
        <p className="rounded-lg border border-teal-100 bg-teal-50/80 px-2.5 py-2 text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/25 dark:text-teal-200">
          Ethiopian: {ethDate.day}/{ethDate.month}/{ethDate.year}
        </p>
        <p className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
          Reminder: {formatReminder(event.reminderMinutes)} · {event.recurrence}
        </p>
      </div>

      {event.notes && (
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {event.notes}
        </p>
      )}
    </article>
  );
}

export default function EventPlanner() {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [mounted, setMounted] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [holidayReminderEnabled, setHolidayReminderEnabled] = useState(true);
  const [holidayReminderMinutes, setHolidayReminderMinutes] = useState(1440);
  const notifiedRef = useRef<Set<string>>(new Set());

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<PlannerDateInput>(() =>
    getTodayPlannerDate("gregorian")
  );
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("none");
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification === "undefined" ? "denied" : Notification.permission
  );

  useEffect(() => {
    setMounted(true);
    setEvents(loadEvents());
    notifiedRef.current = loadNotified();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  }, [events, mounted]);

  const upcomingOccurrences = useMemo(() => {
    const from = new Date();
    const all = events.flatMap((event) =>
      getUpcomingOccurrences(event, from, event.recurrence === "none" ? 1 : 8)
    );

    return all
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 18);
  }, [events]);

  const upcomingHolidays = useMemo(
    () => getUpcomingHolidayOccurrences(new Date(), 6),
    []
  );

  const convertedPreview = useMemo(() => {
    const otherCalendar: PlannerCalendar =
      date.calendar === "gregorian" ? "ethiopian" : "gregorian";

    try {
      return convertPlannerDate(date, otherCalendar);
    } catch {
      return null;
    }
  }, [date]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const pushAlert = useCallback((message: string) => {
    setAlerts((previous) => [message, ...previous].slice(0, 12));
  }, []);

  const notify = useCallback((titleText: string, body: string, key: string) => {
    if (notifiedRef.current.has(key)) {
      return;
    }

    notifiedRef.current.add(key);
    localStorage.setItem(
      NOTIFIED_STORAGE_KEY,
      JSON.stringify(Array.from(notifiedRef.current))
    );

    if (permission === "granted") {
      new Notification(titleText, {
        body,
        icon: "/ethiotime-mark.svg",
      });
    }

    pushAlert(`${titleText}: ${body}`);
  }, [permission, pushAlert]);

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

        const reminderAt = next.start.getTime() - event.reminderMinutes * 60 * 1000;

        if (reminderAt >= now.getTime() && reminderAt <= oneMinuteAhead) {
          notify(
            "Event reminder",
            `${event.title} at ${formatGregorian(next.start)}`,
            next.occurrenceKey
          );
        }
      }

      if (holidayReminderEnabled) {
        const holidays = getUpcomingHolidayOccurrences(
          new Date(now.getTime() - holidayReminderMinutes * 60 * 1000),
          20
        );

        for (const holiday of holidays) {
          const reminderAt =
            holiday.gregorianDate.getTime() - holidayReminderMinutes * 60 * 1000;

          if (reminderAt >= now.getTime() && reminderAt <= oneMinuteAhead) {
            const key = `holiday:${holiday.holiday.id}:${holiday.gregorianDate.getFullYear()}`;
            notify(
              "Holiday reminder",
              `${holiday.holiday.name} on ${holiday.gregorianDate.toLocaleDateString()}`,
              key
            );
          }
        }
      }
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 30 * 1000);
    return () => window.clearInterval(timer);
  }, [
    events,
    holidayReminderEnabled,
    holidayReminderMinutes,
    mounted,
    notify,
  ]);

  const addEvent = () => {
    if (!title.trim()) return;

    try {
      plannerDateToGregorian(date);
    } catch {
      pushAlert("Please choose a valid date.");
      return;
    }

    const normalized = normalizePlannerEvent({
      title: title.trim(),
      notes: notes.trim(),
      date,
      recurrence,
      reminderMinutes,
    });

    setEvents((previous) => [normalized, ...previous]);
    setTitle("");
    setNotes("");
    setDate(getTodayPlannerDate(date.calendar));
    setRecurrence("none");
    setReminderMinutes(30);
  };

  const removeEvent = (id: string) => {
    setEvents((previous) => previous.filter((entry) => entry.id !== id));
  };

  const exportToIcs = () => {
    const now = new Date();
    const lines = events.flatMap((event) =>
      getUpcomingOccurrences(event, now, event.recurrence === "none" ? 1 : 18)
    );

    if (lines.length === 0) {
      pushAlert("No upcoming events to export.");
      return;
    }

    const content = createIcsFileContent(
      lines.map((entry) => ({
        uid: `${entry.occurrenceKey}@ethiotime.com`,
        title: entry.title,
        description: entry.notes,
        start: entry.start,
      })),
      "EthioTime Planner"
    );

    downloadIcsContent("ethiotime-events.ics", content);
  };

  if (!mounted) {
    return null;
  }

  return (
    <section className="animate-rise space-y-4 pb-8">
      <header className="glass-surface rounded-[1.8rem] p-5 sm:p-7">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:border-teal-800/50 dark:bg-teal-950/30 dark:text-teal-200">
          <CalendarClock className="h-3.5 w-3.5" />
          Planner + Reminders
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Dual-calendar Event Planner
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Create events in Gregorian or Ethiopian calendar, auto-convert instantly,
          add recurrence, and get reminder notifications.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-surface rounded-[1.6rem] p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {calendarOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setDate((previous) => {
                    if (previous.calendar === item.value) return previous;
                    return convertPlannerDate(previous, item.value);
                  })
                }
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-bold transition-all",
                  date.calendar === item.value
                    ? "border-teal-300 bg-white text-teal-700 shadow-sm dark:border-teal-700 dark:bg-slate-900 dark:text-teal-200"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 px-3.5 text-sm font-medium outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                placeholder="Meeting, fasting day, birthday..."
              />
            </div>

            <DateInputFields
              calendar={date.calendar}
              day={date.day}
              month={date.month}
              year={date.year}
              onChange={(patch) =>
                setDate((previous) => ({
                  ...previous,
                  ...patch,
                }))
              }
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Time
                </label>
                <input
                  type="time"
                  value={date.time}
                  onChange={(event) =>
                    setDate((previous) => ({ ...previous, time: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Recurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(event) =>
                    setRecurrence(event.target.value as RecurrenceRule)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  {recurrenceOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Reminder
                </label>
                <select
                  value={reminderMinutes}
                  onChange={(event) =>
                    setReminderMinutes(Number.parseInt(event.target.value, 10))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  {reminderOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatReminder(minutes)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {convertedPreview && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/75 px-3.5 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                <div className="mb-1.5 flex items-center gap-1.5 font-bold uppercase tracking-[0.12em]">
                  <CalendarSync className="h-3.5 w-3.5" />
                  Auto-converted
                </div>
                {convertedPreview.day}/{convertedPreview.month}/{convertedPreview.year} ({convertedPreview.calendar})
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-slate-200/80 bg-white/85 px-3.5 py-2.5 text-sm font-medium outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                placeholder="Optional details"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addEvent}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700"
              >
                Save Event
              </button>
              <button
                type="button"
                onClick={exportToIcs}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              >
                <Download className="h-4 w-4" />
                Export .ics
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-surface rounded-[1.6rem] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Reminder Center
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Browser notification status: {permission}
                </p>
              </div>
              <button
                type="button"
                onClick={requestPermission}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-200"
              >
                <BellRing className="h-3.5 w-3.5" />
                Enable
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Holiday reminders
                </p>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={holidayReminderEnabled}
                    onChange={(event) => setHolidayReminderEnabled(event.target.checked)}
                  />
                  Enabled
                </label>
              </div>

              <select
                value={holidayReminderMinutes}
                onChange={(event) =>
                  setHolidayReminderMinutes(Number.parseInt(event.target.value, 10))
                }
                className="h-10 w-full rounded-lg border border-slate-200/80 bg-white/90 px-2.5 text-xs font-semibold outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900"
              >
                {reminderOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatReminder(minutes)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-2">
              {upcomingHolidays.map((item: HolidayOccurrence) => (
                <div
                  key={`${item.holiday.id}-${item.gregorianDate.toISOString()}`}
                  className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs dark:border-slate-700/60 dark:bg-slate-900/60"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    {item.holiday.name} · {item.holiday.amharic}
                  </p>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                    {item.gregorianDate.toLocaleDateString()} · {item.ethiopian.day}/{item.ethiopian.month}/{item.ethiopian.year}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-surface rounded-[1.6rem] p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Live alerts</h2>
              <Bell className="h-4 w-4 text-teal-500" />
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                  Reminder activity appears here while the app is open.
                </p>
              ) : (
                alerts.map((entry, index) => (
                  <p
                    key={`${entry}-${index}`}
                    className="rounded-xl border border-teal-100 bg-teal-50/80 px-3 py-2 text-xs font-medium text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/25 dark:text-teal-200"
                  >
                    {entry}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-surface rounded-[1.6rem] p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Upcoming occurrences
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            <Repeat className="h-3 w-3" />
            recurring engine active
          </span>
        </div>

        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-400">
            Add your first event to enable reminders, recurrence, and ICS export.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={removeEvent} />
            ))}
          </div>
        )}

        {upcomingOccurrences.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/70">
                <tr>
                  <th className="px-3 py-2 font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-300">Event</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-300">Gregorian</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-300">Ethiopian</th>
                </tr>
              </thead>
              <tbody>
                {upcomingOccurrences.slice(0, 12).map((entry: PlannerOccurrence) => (
                  <tr
                    key={entry.occurrenceKey}
                    className="border-t border-slate-200/70 dark:border-slate-700/60"
                  >
                    <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-100">
                      {entry.title}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {formatGregorian(entry.start)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {entry.ethiopian.day}/{entry.ethiopian.month}/{entry.ethiopian.year}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
