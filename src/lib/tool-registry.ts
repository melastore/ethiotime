import {
  CalendarRange,
  CalendarSync,
  Keyboard,
  Landmark,
  ListChecks,
  Timer,
  NotebookPen,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n";

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
  },
  {
    href: "/focus",
    title: "Focus Timer",
    description: "Study a note in timed rounds and keep the hours behind it.",
    navDescription: "Timed study rounds",
    titleKey: "nav.focusTimer",
    descriptionKey: "nav.timedStudyRounds",
    icon: Timer,
    tone: "from-emerald-500 to-green-500",
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
  },
  {
    href: "/holidays",
    title: "Holiday Guide",
    description:
      "Explore Ethiopian public holidays with yearly dates and context.",
    navDescription: "History and dates",
    titleKey: "nav.holidays",
    descriptionKey: "nav.historyAndDates",
    icon: Landmark,
    tone: "from-amber-500 to-orange-500",
  },
];
