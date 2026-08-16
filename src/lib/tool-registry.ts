import {
  Clock3,
  CalendarRange,
  CalendarSync,
  GitCompareArrows,
  Keyboard,
  Landmark,
  ListChecks,
  NotebookPen,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type ToolDefinition = {
  href: string;
  title: string;
  description: string;
  navDescription: string;
  icon: LucideIcon;
  tone: string;
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    href: "/date-converter",
    title: "Date Converter",
    description: "Convert between Ethiopian and Gregorian dates instantly.",
    navDescription: "Gregorian <-> Ethiopian",
    icon: CalendarSync,
    tone: "from-teal-500 to-cyan-500",
  },
  {
    href: "/age-calculator",
    title: "Age Calculator",
    description: "See accurate age details with calendar-aware calculations.",
    navDescription: "Live age timeline",
    icon: UserRound,
    tone: "from-cyan-500 to-sky-500",
  },
  {
    href: "/ethiopian-calendar",
    title: "Ethiopian Calendar",
    description: "Browse months, weekdays, and holiday highlights.",
    navDescription: "Holidays and month view",
    icon: CalendarRange,
    tone: "from-orange-500 to-amber-500",
  },
  {
    href: "/amharic-keyboard",
    title: "Amharic Keyboard",
    description: "Write fidel quickly with transliteration support.",
    navDescription: "Type in fidel",
    icon: Keyboard,
    tone: "from-amber-500 to-orange-500",
  },
  {
    href: "/note-taking",
    title: "Note Taking",
    description: "Capture and organize notes with a clean, fast workflow.",
    navDescription: "Fast personal notes",
    icon: NotebookPen,
    tone: "from-emerald-500 to-teal-500",
  },
  {
    href: "/event-planner",
    title: "Event Planner",
    description:
      "Plan events in Ethiopian/Gregorian calendars with reminders and recurring rules.",
    navDescription: "Plan and reminders",
    icon: ListChecks,
    tone: "from-teal-500 to-emerald-500",
  },
  {
    href: "/date-difference",
    title: "Date Difference",
    description:
      "Measure days and weeks between two dates in both calendar systems.",
    navDescription: "Days and weeks",
    icon: GitCompareArrows,
    tone: "from-cyan-500 to-blue-500",
  },
  {
    href: "/holidays",
    title: "Holiday Guide",
    description:
      "Explore Ethiopian public holidays with yearly dates and context.",
    navDescription: "History and dates",
    icon: Landmark,
    tone: "from-amber-500 to-orange-500",
  },
  {
    href: "/ethiopian-now",
    title: "Ethiopian Now",
    description:
      "Check Ethiopian date and 12-hour clock for different world cities.",
    navDescription: "World clock",
    icon: Clock3,
    tone: "from-sky-500 to-cyan-500",
  },
];
