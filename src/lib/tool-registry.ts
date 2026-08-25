import {
  CalendarRange,
  CalendarSync,
  Keyboard,
  PartyPopper,
  ListChecks,
  Timer,
  NotebookPen,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n";

/** What a tool is for, which is how the sidebar groups them. */
export type ToolGroup = "calendar" | "workspace" | "writing";

export const TOOL_GROUP_LABELS: Record<ToolGroup, { english: string; amharic: string }> = {
  calendar: { english: "Calendar", amharic: "የቀን መቁጠሪያ" },
  workspace: { english: "Workspace", amharic: "የሥራ ቦታ" },
  writing: { english: "Writing", amharic: "መጻፊያ" },
};

/** Render order for the groups. */
export const TOOL_GROUP_ORDER: ToolGroup[] = ["calendar", "workspace", "writing"];

export type ToolDefinition = {
  href: string;
  /** English fallback, used when a translation is missing. */
  title: string;
  description: string;
  navDescription: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: LucideIcon;
  tone: string;
  group: ToolGroup;
};

/**
 * Single source of truth for the tool list: the home grid, the sidebar and the
 * sitemap all read from here, so adding or removing a tool is one entry.
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    href: "/date-converter",
    title: "Date Converter",
    description: "Convert between Ethiopian and Gregorian dates instantly.",
    navDescription: "Gregorian <-> Ethiopian",
    titleKey: "nav.dateConverter",
    descriptionKey: "nav.gregorianToEthiopian",
    icon: CalendarSync,
    tone: "from-teal-500 to-cyan-500",
    group: "calendar",
  },
  {
    href: "/age-calculator",
    title: "Age Calculator",
    description: "See accurate age details with calendar-aware calculations.",
    navDescription: "Live age timeline",
    titleKey: "nav.ageCalculator",
    descriptionKey: "nav.liveAgeTimeline",
    icon: UserRound,
    tone: "from-cyan-500 to-sky-500",
    group: "calendar",
  },
  {
    href: "/ethiopian-calendar",
    title: "Ethiopian Calendar",
    description: "Browse months, weekdays, and holiday highlights.",
    navDescription: "Holidays and month view",
    titleKey: "nav.ethiopianCalendar",
    descriptionKey: "nav.holidaysAndMonthView",
    icon: CalendarRange,
    tone: "from-orange-500 to-amber-500",
    group: "calendar",
  },
  {
    href: "/amharic-keyboard",
    title: "Amharic Keyboard",
    description: "Write fidel quickly with transliteration support.",
    navDescription: "Type in fidel",
    titleKey: "nav.amharicKeyboard",
    descriptionKey: "nav.typeInFidel",
    icon: Keyboard,
    tone: "from-amber-500 to-orange-500",
    group: "writing",
  },
  {
    href: "/note-taking",
    title: "Note Taking",
    description: "Capture and organize notes with a clean, fast workflow.",
    navDescription: "Fast personal notes",
    titleKey: "nav.noteTaking",
    descriptionKey: "nav.fastPersonalNotes",
    icon: NotebookPen,
    tone: "from-emerald-500 to-teal-500",
    group: "workspace",
  },
  {
    href: "/focus",
    title: "Focus Timer",
    description: "Study a note in timed rounds and keep the hours behind it.",
    navDescription: "Timed study rounds",
    titleKey: "nav.focusTimer",
    descriptionKey: "nav.timedStudyRounds",
    icon: Timer,
    tone: "from-teal-600 to-emerald-400",
    group: "workspace",
  },
  {
    href: "/event-planner",
    title: "Event Planner",
    description:
      "Plan events in Ethiopian/Gregorian calendars with reminders and recurring rules.",
    navDescription: "Plan and reminders",
    titleKey: "nav.eventPlanner",
    descriptionKey: "nav.planAndReminders",
    icon: ListChecks,
    tone: "from-teal-500 to-emerald-500",
    group: "workspace",
  },
  {
    href: "/holidays",
    title: "Holidays",
    description:
      "Every Ethiopian feast day of the year, in both calendars, with the story behind it.",
    navDescription: "Feast days and stories",
    titleKey: "nav.holidays",
    descriptionKey: "nav.historyAndDates",
    icon: PartyPopper,
    tone: "from-amber-500 to-rose-500",
    group: "calendar",
  },
];
