"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import Kenat from "kenat";

import { DateInputFields } from "@/components/shared/date-input-fields";
import { readJson, writeJson } from "@/lib/storage";
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
  type RecurrenceRule,
} from "@/lib/planner";
import { cn } from "@/lib/utils";

const EVENTS_STORAGE_KEY = "ethiotime-planner-events";
const NOTIFIED_STORAGE_KEY = "ethiotime-planner-notified";

const fieldClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const labelClass =
  "mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400";

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

/** Upper bound on remembered "already notified" keys, so the list cannot grow forever. */
const MAX_REMEMBERED_NOTIFICATIONS = 300;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const loadEvents = (): PlannerEvent[] =>
  readJson<PlannerEvent[]>(EVENTS_STORAGE_KEY, [], (value): value is PlannerEvent[] =>
    Array.isArray(value)
  );

const loadNotified = (): Set<string> =>
  new Set(readJson<string[]>(NOTIFIED_STORAGE_KEY, [], isStringArray));

function EventRow({
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
    <li className="flex items-start gap-4 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900 dark:text-white">{event.title}</p>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
          {formatGregorian(nextOccurrence.start)}
        </p>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {ethDate.day}/{ethDate.month}/{ethDate.year} Ethiopian
        </p>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {formatReminder(event.reminderMinutes)}
          {event.recurrence !== "none" && ` · repeats ${event.recurrence}`}
        </p>
        {event.notes && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {event.notes}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(event.id)}
        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Delete {event.title}</span>
      </button>
    </li>
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
  // Read after mount, not during render: the server has no Notification API, so
  // seeding from it directly makes the first client render disagree with the HTML.
  const [permission, setPermission] = useState<NotificationPermission>("denied");

  useEffect(() => {
    setMounted(true);
    setEvents(loadEvents());
    notifiedRef.current = loadNotified();
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    writeJson(EVENTS_STORAGE_KEY, events);
  }, [events, mounted]);

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
    // Keys are never removed as events pass, so keep only the most recent ones
    // rather than growing this list for the lifetime of the browser profile.
    if (notifiedRef.current.size > MAX_REMEMBERED_NOTIFICATIONS) {
      notifiedRef.current = new Set(
        Array.from(notifiedRef.current).slice(-MAX_REMEMBERED_NOTIFICATIONS)
      );
    }
    writeJson(NOTIFIED_STORAGE_KEY, Array.from(notifiedRef.current));

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
    return (
      <section className="mx-auto w-full max-w-3xl px-1 py-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Event Planner
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Plan events in either calendar and get a reminder before they start.
        </p>
        <div
          className="mt-8 h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
          aria-hidden="true"
        />
      </section>
    );
  }

  const notificationsOn = permission === "granted";

  return (
    <section className="mx-auto w-full max-w-3xl px-1 py-2">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Event Planner
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Plan events in either calendar and get a reminder before they start.
        </p>
      </header>

      {/* Add an event */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 inline-flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
          {calendarOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setDate((previous) =>
                  previous.calendar === item.value
                    ? previous
                    : convertPlannerDate(previous, item.value)
                )
              }
              aria-pressed={date.calendar === item.value}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                date.calendar === item.value
                  ? "bg-teal-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className={labelClass} htmlFor="event-title">
          Title
        </label>
        <input
          id="event-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={fieldClass}
          placeholder="Meeting, fasting day, birthday…"
        />

        <div className="mt-4">
          <DateInputFields
            calendar={date.calendar}
            day={date.day}
            month={date.month}
            year={date.year}
            onChange={(patch) =>
              setDate((previous) => ({ ...previous, ...patch }))
            }
          />
        </div>

        {convertedPreview && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Same day in the other calendar: {convertedPreview.day}/
            {convertedPreview.month}/{convertedPreview.year}{" "}
            {convertedPreview.calendar}
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="event-time">
              Time
            </label>
            <input
              id="event-time"
              type="time"
              value={date.time}
              onChange={(event) =>
                setDate((previous) => ({ ...previous, time: event.target.value }))
              }
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="event-repeat">
              Repeat
            </label>
            <select
              id="event-repeat"
              value={recurrence}
              onChange={(event) =>
                setRecurrence(event.target.value as RecurrenceRule)
              }
              className={fieldClass}
            >
              {recurrenceOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="event-reminder">
              Remind me
            </label>
            <select
              id="event-reminder"
              value={reminderMinutes}
              onChange={(event) =>
                setReminderMinutes(Number.parseInt(event.target.value, 10))
              }
              className={fieldClass}
            >
              {reminderOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatReminder(minutes)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass} htmlFor="event-notes">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="event-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={cn(fieldClass, "h-auto min-h-20 py-2.5")}
            placeholder="Anything worth remembering"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addEvent}
            disabled={!title.trim()}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add event
          </button>
          <button
            type="button"
            onClick={exportToIcs}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export .ics
          </button>
        </div>
      </div>

      {/* Reminder settings */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Reminders
            </h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {notificationsOn
                ? "Browser notifications are on."
                : "Notifications are off, so reminders only show while this page is open."}
            </p>
          </div>
          {!notificationsOn && (
            <button
              type="button"
              onClick={requestPermission}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Turn on
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={holidayReminderEnabled}
              onChange={(event) => setHolidayReminderEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-teal-600"
            />
            Also remind me about public holidays
          </label>
          {holidayReminderEnabled && (
            <select
              value={holidayReminderMinutes}
              onChange={(event) =>
                setHolidayReminderMinutes(Number.parseInt(event.target.value, 10))
              }
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label="Holiday reminder timing"
            >
              {reminderOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatReminder(minutes)}
                </option>
              ))}
            </select>
          )}
        </div>

        {alerts.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            {alerts.slice(0, 3).map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Events */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          Your events
        </h2>

        {events.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No events yet. Add one above.
          </p>
        ) : (
          <ul className="mt-2">
            {events.map((event) => (
              <EventRow key={event.id} event={event} onDelete={removeEvent} />
            ))}
          </ul>
        )}
      </div>

      {/* Next holidays */}
      {holidayReminderEnabled && upcomingHolidays.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Next holidays
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {upcomingHolidays.slice(0, 4).map((item: HolidayOccurrence) => (
              <li
                key={`${item.holiday.id}-${item.gregorianDate.toISOString()}`}
                className="flex justify-between gap-4"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {item.holiday.name}
                </span>
                <span className="shrink-0 text-slate-500 dark:text-slate-400">
                  {item.gregorianDate.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
