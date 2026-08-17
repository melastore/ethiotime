"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Cross,
  Download,
  Droplets,
  Flame,
  Flower2,
  HardHat,
  MoonStar,
  PartyPopper,
  Search,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Sunrise,
  Swords,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ETHIOPIAN_MONTHS,
  WEEKDAY_HEADERS,
  getCurrentEthiopianYear,
} from "@/lib/calendar-data";
import {
  type HolidayOccurrence,
  type HolidayTradition,
  getHolidayOccurrencesForEthiopianYear,
  getUpcomingHolidayOccurrences,
  gregorianYearsOfEthiopianYear,
} from "@/lib/ethiopian-holidays";
import { createIcsFileContent, downloadIcsContent } from "@/lib/ics";
import { cn } from "@/lib/utils";

type Festival = {
  icon: LucideIcon;
  /** Tailwind stops for the card, the badge and the hero of this feast. */
  gradient: string;
  glow: string;
};

/**
 * Every feast gets its own colour and glyph, so a year of them reads as a set
 * of festivals rather than a list of dates: fire for the Meskel bonfire, water
 * for the Timket blessing, the Adey Abeba daisy for the new year.
 */
const FESTIVALS: Record<string, Festival> = {
  enkutatash: {
    icon: Flower2,
    gradient: "from-amber-400 via-yellow-500 to-orange-500",
    glow: "shadow-amber-500/30",
  },
  meskel: {
    icon: Flame,
    gradient: "from-orange-500 via-rose-500 to-red-600",
    glow: "shadow-rose-500/30",
  },
  genna: {
    icon: Star,
    gradient: "from-indigo-500 via-violet-500 to-purple-600",
    glow: "shadow-violet-500/30",
  },
  siklet: {
    icon: Cross,
    gradient: "from-slate-600 via-slate-700 to-zinc-800",
    glow: "shadow-slate-600/30",
  },
  fasika: {
    icon: Sunrise,
    gradient: "from-fuchsia-500 via-purple-500 to-indigo-600",
    glow: "shadow-fuchsia-500/30",
  },
  nations: {
    icon: Users,
    gradient: "from-yellow-400 via-amber-500 to-red-500",
    glow: "shadow-amber-500/30",
  },
  timket: {
    icon: Droplets,
    gradient: "from-sky-400 via-cyan-500 to-blue-600",
    glow: "shadow-sky-500/30",
  },
  adwa: {
    icon: Swords,
    gradient: "from-emerald-500 via-green-600 to-lime-600",
    glow: "shadow-emerald-500/30",
  },
  patriots: {
    icon: Shield,
    gradient: "from-rose-500 via-red-600 to-orange-600",
    glow: "shadow-red-500/30",
  },
  labour: {
    icon: HardHat,
    gradient: "from-slate-500 via-slate-600 to-zinc-700",
    glow: "shadow-slate-500/30",
  },
  irreecha: {
    icon: Sprout,
    gradient: "from-lime-500 via-green-500 to-emerald-600",
    glow: "shadow-lime-500/30",
  },
  "eid-al-fitr": {
    icon: MoonStar,
    gradient: "from-teal-500 via-emerald-500 to-green-600",
    glow: "shadow-teal-500/30",
  },
  "eid-al-adha": {
    icon: MoonStar,
    gradient: "from-cyan-500 via-teal-500 to-emerald-600",
    glow: "shadow-cyan-500/30",
  },
  mawlid: {
    icon: Sparkles,
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    glow: "shadow-emerald-500/30",
  },
};

const DEFAULT_FESTIVAL: Festival = {
  icon: PartyPopper,
  gradient: "from-teal-500 via-cyan-500 to-sky-600",
  glow: "shadow-teal-500/30",
};

const festivalOf = (id: string) => FESTIVALS[id] ?? DEFAULT_FESTIVAL;

const TRADITIONS: { id: HolidayTradition | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "national", label: "National" },
  { id: "christian", label: "Christian" },
  { id: "muslim", label: "Muslim" },
  { id: "cultural", label: "Cultural" },
];

const TRADITION_LABELS: Record<HolidayTradition, string> = {
  national: "National",
  christian: "Christian",
  muslim: "Muslim",
  cultural: "Cultural",
};

const ONE_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** `WEEKDAY_HEADERS` starts on Monday; `getDay()` starts on Sunday. */
const weekdayOf = (date: Date) => WEEKDAY_HEADERS[(date.getDay() + 6) % 7];

const formatGregorian = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** The Gregorian years an Ethiopian year runs across, as "2025/26". */
const gregorianSpanOf = (ethiopianYear: number) => {
  const [start, end] = gregorianYearsOfEthiopianYear(ethiopianYear);
  return `${start}/${String(end).slice(-2)}`;
};

const countdownOf = (days: number | null) => {
  if (days === null) return null;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
};

const icsEventOf = (item: HolidayOccurrence) => {
  const start = new Date(item.gregorianDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + ONE_DAY - 60 * 1000);

  return {
    uid: `${item.holiday.id}-${item.ethiopian.year}@ethiotime`,
    title: `${item.holiday.name} · ${item.holiday.amharic}`,
    description: `${item.holiday.description} ${item.holiday.history} (${item.ethiopian.day} ${item.ethiopian.monthLabel} ${item.ethiopian.year} E.C.)`,
    start,
    end,
  };
};

/** A soft light and a watermark glyph, the same on the hero and in the dialog. */
function FestivalWash({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.38),transparent_58%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.22),transparent_60%)]"
      />
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rotate-12 text-white/15"
        strokeWidth={1.25}
      />
    </>
  );
}

function HolidayCard({
  item,
  days,
  onOpen,
}: {
  item: HolidayOccurrence;
  days: number | null;
  onOpen: () => void;
}) {
  const festival = festivalOf(item.holiday.id);
  const Icon = festival.icon;
  const weekday = weekdayOf(item.gregorianDate);
  const isToday = days === 0;
  const isPast = days !== null && days < 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border bg-white p-3.5 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:bg-slate-900 dark:focus-visible:ring-offset-slate-950",
        isToday
          ? "border-transparent ring-2 ring-teal-500 dark:ring-teal-400"
          : "border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
        // A feast that has been and gone steps back, but keeps its colours:
        // most of a year is in the past, and a page of grey is not a festival.
        isPast && "opacity-80 hover:opacity-100"
      )}
    >
      {/* The feast's colour, along the edge of its card. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1 bg-gradient-to-b",
          festival.gradient
        )}
      />

      <span
        className={cn(
          "relative ml-1 flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
          festival.gradient,
          festival.glow
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
          {weekday.short}
        </span>
        <span className="text-2xl font-bold leading-none tabular-nums">
          {item.ethiopian.day}
        </span>
        <span className="mt-0.5 max-w-full truncate px-1 text-[9px] text-white/80">
          {item.ethiopian.monthAmharic}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <Icon
            className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <span className="truncate font-semibold text-slate-900 dark:text-white">
            {item.holiday.name}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-slate-600 dark:text-slate-300">
          {item.holiday.amharic}
        </span>
        {/* The Gregorian reading of the same day, one size down. */}
        <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-slate-500">
          {weekday.full}, {formatGregorian(item.gregorianDate)}
        </span>
      </span>

      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums",
          isToday
            ? "bg-teal-600 text-white"
            : isPast
              ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        )}
      >
        {countdownOf(days) ?? item.ethiopian.day}
      </span>
    </button>
  );
}

function HolidayDialog({
  item,
  days,
  onClose,
}: {
  item: HolidayOccurrence | null;
  days: number | null;
  onClose: () => void;
}) {
  const festival = festivalOf(item?.holiday.id ?? "");
  const Icon = festival.icon;

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92%] max-w-md overflow-hidden rounded-3xl border-none bg-white p-0 shadow-2xl outline-none [&>button]:hidden dark:bg-slate-900">
        {item && (
          <>
            <div
              className={cn(
                "relative overflow-hidden bg-gradient-to-br px-5 pb-5 pt-4 text-white",
                festival.gradient
              )}
            >
              <FestivalWash icon={Icon} />

              <DialogClose className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </DialogClose>

              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                  {TRADITION_LABELS[item.holiday.tradition]} feast
                  {countdownOf(days) ? ` · ${countdownOf(days)}` : ""}
                </p>

                <DialogTitle className="mt-1.5 text-2xl font-bold leading-tight">
                  {item.holiday.name}
                </DialogTitle>
                <p className="text-base text-white/85">{item.holiday.amharic}</p>

                <div className="mt-4 flex items-end gap-3 border-t border-white/25 pt-3">
                  <span className="text-4xl font-bold leading-none tabular-nums">
                    {item.ethiopian.day}
                  </span>
                  <span className="min-w-0 pb-0.5">
                    <span className="block truncate font-semibold leading-tight">
                      {item.ethiopian.monthAmharic} {item.ethiopian.year}
                    </span>
                    <span className="block truncate text-xs text-white/75">
                      {item.ethiopian.monthLabel} {item.ethiopian.year} E.C.
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-right text-xs text-white/80">
                    <span className="block">
                      {weekdayOf(item.gregorianDate).full}
                    </span>
                    <span className="block font-semibold">
                      {formatGregorian(item.gregorianDate)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-5 pb-5 pt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-white">
                {item.holiday.description}
              </p>
              <p>{item.holiday.history}</p>

              {item.holiday.calendar === "islamic" && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  {item.islamic.day} {item.islamic.monthLabel}{" "}
                  {item.islamic.year} AH. The observed date can shift by a day
                  with the moon sighting.
                </p>
              )}

              <button
                type="button"
                onClick={() =>
                  downloadIcsContent(
                    `${item.holiday.id}-${item.ethiopian.year}.ics`,
                    createIcsFileContent([icsEventOf(item)], item.holiday.name)
                  )
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Add to my calendar
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Beal() {
  const currentYear = getCurrentEthiopianYear();
  const [year, setYear] = useState(currentYear);
  const [query, setQuery] = useState("");
  const [tradition, setTradition] = useState<HolidayTradition | "all">("all");
  const [selected, setSelected] = useState<HolidayOccurrence | null>(null);
  // Resolved after mount so the server and the browser cannot disagree about
  // what "today" is and trip a hydration mismatch.
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => setToday(startOfDay(new Date())), []);

  // The Ethiopian year is the unit here, so a year of feasts runs Meskerem
  // through Pagume rather than January through December.
  const occurrences = useMemo(
    () => getHolidayOccurrencesForEthiopianYear(year),
    [year]
  );

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    return occurrences.filter((item) => {
      if (tradition !== "all" && item.holiday.tradition !== tradition) {
        return false;
      }
      if (!lowered) return true;

      return `${item.holiday.name} ${item.holiday.amharic} ${item.ethiopian.monthLabel} ${item.ethiopian.monthAmharic} ${item.holiday.description} ${item.holiday.history}`
        .toLowerCase()
        .includes(lowered);
    });
  }, [occurrences, query, tradition]);

  // Grouped by Ethiopian month, so the year reads as an Ethiopian calendar does.
  const groups = useMemo(() => {
    const result: {
      month: number;
      label: string;
      amharic: string;
      span: string;
      items: HolidayOccurrence[];
    }[] = [];

    for (const item of filtered) {
      if (result[result.length - 1]?.month !== item.ethiopian.month) {
        result.push({
          month: item.ethiopian.month,
          label: item.ethiopian.monthLabel,
          amharic: item.ethiopian.monthAmharic,
          span: ETHIOPIAN_MONTHS[item.ethiopian.month - 1]?.gregorianSpan ?? "",
          items: [],
        });
      }
      result[result.length - 1].items.push(item);
    }

    return result;
  }, [filtered]);

  /** How many feasts each Ethiopian month holds, for the year rail. */
  const byMonth = useMemo(() => {
    const counts = new Array(13).fill(0) as number[];
    for (const item of occurrences) counts[item.ethiopian.month - 1] += 1;
    return counts;
  }, [occurrences]);

  const counts = useMemo(() => {
    const result = new Map<HolidayTradition | "all", number>([
      ["all", occurrences.length],
    ]);
    for (const item of occurrences) {
      const key = item.holiday.tradition;
      result.set(key, (result.get(key) ?? 0) + 1);
    }
    return result;
  }, [occurrences]);

  // Taken from the running calendar rather than from the listed year: at the
  // end of Pagume the next feast is Enkutatash, which belongs to the year after
  // the one on screen.
  const nextUp = useMemo(() => {
    if (today === null) return null;
    return getUpcomingHolidayOccurrences(new Date(today), 1)[0] ?? null;
  }, [today]);

  const daysUntil = (date: Date) =>
    today === null ? null : Math.round((startOfDay(date) - today) / ONE_DAY);

  const remaining = useMemo(
    () =>
      today === null
        ? null
        : occurrences.filter((item) => startOfDay(item.gregorianDate) >= today)
            .length,
    [occurrences, today]
  );

  const hero = nextUp ?? occurrences[0] ?? null;
  const heroFestival = festivalOf(hero?.holiday.id ?? "");
  const HeroIcon = heroFestival.icon;
  const heroDays = hero ? daysUntil(hero.gregorianDate) : null;

  const exportYear = () =>
    downloadIcsContent(
      `beal-${year}.ics`,
      createIcsFileContent(occurrences.map(icsEventOf), `Beal ${year} E.C.`)
    );

  return (
    <section className="mx-auto w-full max-w-5xl px-1 py-2">
      <header className="mb-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Beal
          </h1>
          <span className="text-2xl font-semibold text-teal-600 dark:text-teal-400">
            በዓል
          </span>
        </div>
        <p className="mt-1.5 max-w-2xl text-slate-600 dark:text-slate-400">
          Every Ethiopian feast day of the year — dated in the Ethiopian
          calendar, with the Gregorian date underneath and the story behind it.
        </p>
      </header>

      {hero && (
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-xl sm:p-7",
            heroFestival.gradient,
            heroFestival.glow
          )}
        >
          <FestivalWash icon={HeroIcon} />

          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {nextUp ? "Next feast" : `Opens the year ${year}`}
              </p>
              <p className="mt-1.5 text-3xl font-bold leading-tight sm:text-4xl">
                {hero.holiday.name}
              </p>
              <p className="text-lg text-white/85">{hero.holiday.amharic}</p>

              <p className="mt-3 text-sm font-semibold">
                {weekdayOf(hero.gregorianDate).amharic} · {hero.ethiopian.day}{" "}
                {hero.ethiopian.monthAmharic} {hero.ethiopian.year}
              </p>
              <p className="text-xs text-white/75">
                {weekdayOf(hero.gregorianDate).full},{" "}
                {formatGregorian(hero.gregorianDate)}
              </p>
            </div>

            <div className="flex items-end gap-4">
              {heroDays !== null && (
                <div className="text-right">
                  <p className="text-5xl font-black leading-none tabular-nums sm:text-6xl">
                    {Math.abs(heroDays)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
                    {heroDays === 0
                      ? "today"
                      : Math.abs(heroDays) === 1
                        ? "day away"
                        : "days away"}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelected(hero)}
                className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/30"
              >
                The story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Year rail: the whole Ethiopian year at a glance, a dot per feast. */}
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {ETHIOPIAN_MONTHS.map((month, index) => {
          const total = byMonth[index];
          return (
            <button
              key={month.value}
              type="button"
              disabled={total === 0}
              onClick={() =>
                document
                  .getElementById(`beal-month-${index + 1}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className={cn(
                "flex min-w-[3.9rem] flex-1 flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors",
                total > 0
                  ? "border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-600 dark:hover:bg-teal-950/40"
                  : "cursor-default border-dashed border-slate-200 bg-transparent opacity-50 dark:border-slate-800"
              )}
            >
              <span className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {month.amharic}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {Array.from({ length: total }, (_, dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-teal-500"
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="sticky top-[3.25rem] z-20 -mx-1 mt-4 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-3 backdrop-blur-xl lg:top-2 dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setYear((value) => value - 1)}
              aria-label="Previous Ethiopian year"
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-[5.5rem] text-center leading-tight">
              <span className="block text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                {year}
              </span>
              <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                {gregorianSpanOf(year)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setYear((value) => value + 1)}
              aria-label="Next Ethiopian year"
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Narrow screens give the search a line of its own; from `sm` up the
              three controls sit on one row, search in the middle. */}
          <div className="relative order-last w-full sm:order-none sm:w-auto sm:min-w-[10rem] sm:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search feasts"
              placeholder="Adwa, Timket, እንቁጣጣሽ…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={exportYear}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:border-teal-500 hover:text-teal-700 sm:ml-0 dark:border-slate-800 dark:text-slate-300 dark:hover:text-teal-400"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Export year</span>
          </button>
        </div>

        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {TRADITIONS.map((option) => {
            const total = counts.get(option.id) ?? 0;
            const isActive = tradition === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTradition(option.id)}
                aria-pressed={isActive}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                  total === 0 && !isActive && "opacity-45"
                )}
              >
                {option.label}
                <span className="ml-1.5 tabular-nums opacity-60">{total}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-900 dark:text-white">
          {filtered.length}
        </span>{" "}
        {filtered.length === 1 ? "feast" : "feasts"} in {year}
        {remaining !== null && year === currentYear && (
          <> · {remaining} still to come</>
        )}
      </p>

      {groups.map((group) => (
        <section key={group.month} id={`beal-month-${group.month}`} className="mt-6 scroll-mt-32">
          <div className="mb-3 flex items-baseline gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {group.amharic}
            </h2>
            <span className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
              {group.label}
            </span>
            <span className="hidden text-xs text-slate-400 dark:text-slate-600 sm:inline">
              {group.span}
            </span>
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800"
            />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {group.items.map((item) => (
              <HolidayCard
                key={`${item.holiday.id}-${item.ethiopian.month}-${item.ethiopian.day}`}
                item={item}
                days={daysUntil(item.gregorianDate)}
                onOpen={() => setSelected(item)}
              />
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No feast matched {query ? `“${query}”` : "that filter"} in {year}.
        </p>
      )}

      <HolidayDialog
        item={selected}
        days={selected ? daysUntil(selected.gregorianDate) : null}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
