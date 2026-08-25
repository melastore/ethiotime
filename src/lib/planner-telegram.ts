// Browser notifications only fire while the planner is open in a tab, which is
// exactly when the user does not need reminding. Telegram delivers when the tab
// is closed, so the upcoming occurrences are pushed to the API and sent from
// there.

import type { RemindPayload } from "@/lib/api";
import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";
import { getUpcomingOccurrences, type PlannerEvent, type PlannerOccurrence } from "@/lib/planner";
import { readText, writeText } from "@/lib/storage";

const TOKEN_KEY = "planner-device-token";

// Identifies this browser to the API and nothing else: no account, no email.
export function deviceToken(): string {
  const existing = readText(TOKEN_KEY);
  if (existing && existing.length >= 16) return existing;

  const token = crypto.randomUUID();
  writeText(TOKEN_KEY, token);
  return token;
}

// Both calendars, because the message arrives away from the app and there is
// nothing else on screen to read the date against.
export function formatWhen(occurrence: PlannerOccurrence): string {
  const gregorian = occurrence.start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const month = ETHIOPIAN_MONTHS[occurrence.ethiopian.month - 1];
  if (!month) return gregorian;

  return `${gregorian}\n${month.amharic} ${occurrence.ethiopian.day}, ${occurrence.ethiopian.year} ዓ.ም.`;
}

export type ReminderWindow = {
  perEvent?: number;
  horizonDays?: number;
  max?: number;
};

export function buildReminders(
  events: PlannerEvent[],
  now: Date,
  formatWhen: (occurrence: PlannerOccurrence) => string,
  { perEvent = 3, horizonDays = 60, max = 200 }: ReminderWindow = {}
): RemindPayload[] {
  const horizon = now.getTime() + horizonDays * 86_400_000;

  const reminders = events.flatMap((event) =>
    getUpcomingOccurrences(event, now, perEvent)
      .map((occurrence) => ({
        key: occurrence.occurrenceKey,
        title: event.title,
        notes: event.notes,
        when: formatWhen(occurrence),
        startAt: occurrence.start.getTime(),
        remindAt: occurrence.start.getTime() - event.reminderMinutes * 60_000,
      }))
      // A reminder whose moment has already gone would fire the instant it
      // arrived, and one past the horizon can wait for the next sync.
      .filter((item) => item.remindAt > now.getTime() && item.startAt <= horizon)
  );

  return reminders.sort((a, b) => a.remindAt - b.remindAt).slice(0, max);
}
