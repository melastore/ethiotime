import { sendDueReminders } from "./telegram.ts";
import type { Env } from "./http.ts";

// Cron cannot run more often than once a minute, and Cloudflare fires it late on
// top of that: reminders were landing about 57 seconds after their time. An
// alarm is set for the exact millisecond instead, so the wait is a round trip
// rather than a polling interval.
//
// One alarm exists at a time, always for the earliest pending reminder. Sending
// re-arms for the next one.
export class ReminderScheduler {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  // Pinged whenever the pending set changes.
  async fetch(): Promise<Response> {
    await this.arm();
    return new Response(null, { status: 204 });
  }

  async alarm(): Promise<void> {
    await sendDueReminders(this.env);
    await this.arm();
  }

  private async arm(): Promise<void> {
    const next = await this.env.DB.prepare(
      "SELECT MIN(remind_at) AS at FROM reminders WHERE sent_at IS NULL"
    ).first<{ at: number | null }>();

    if (next?.at == null) {
      await this.state.storage.deleteAlarm();
      return;
    }

    // A second past the reminder, so the "remind_at <= now" test in the query is
    // certain to be true by the time the handler runs.
    const target = next.at + 1000;

    // Anything already overdue waits out a floor instead of firing at once: a
    // message Telegram keeps refusing would otherwise spin the alarm forever.
    await this.state.storage.setAlarm(
      target > Date.now() ? target : Date.now() + 30_000
    );
  }
}

// Re-arming needs no state of its own, so every caller shares one instance.
export const armScheduler = (env: Env) =>
  env.SCHEDULER.get(env.SCHEDULER.idFromName("reminders")).fetch(
    "https://scheduler/arm"
  );
