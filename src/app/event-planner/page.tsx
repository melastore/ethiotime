import type { Metadata } from "next";

import EventPlanner from "@/components/event-planner";

export const metadata: Metadata = {
  title: "Event Planner",
  description:
    "Plan events in Ethiopian and Gregorian calendars with reminders, recurring rules, and ICS export.",
};

export const dynamic = "force-dynamic";

export default function EventPlannerPage() {
  return <EventPlanner />;
}
