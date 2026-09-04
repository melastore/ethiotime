"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Check,
  Copy,
  CornerDownLeft,
  Languages,
  Monitor,
  Moon,
  PartyPopper,
  Search,
  Sun,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { useTheme, type ThemeChoice } from "@/components/providers/theme-provider";
import { buildAnswers, type CommandAnswer } from "@/lib/command-answers";
import type { TranslationKey } from "@/lib/i18n";
import { TOOL_DEFINITIONS } from "@/lib/tool-registry";
import { cn } from "@/lib/utils";

/**
 * One list of things the palette can do. Answers, tools and settings all end up
 * as rows of this shape, so arrow keys and Enter need to know nothing about
 * which kind of row is under the cursor.
 */
type PaletteRow = {
  id: string;
  group: "answer" | "tool" | "setting";
  /** Rendered body. Answers draw their own layout; the rest are icon + label. */
  render: () => React.ReactNode;
  run: () => void;
  /** Kept open after running — copying should not throw the palette away. */
  keepOpen?: boolean;
};

const COPY_FEEDBACK_MS = 1600;

/* -------------------------------------------------------------------------- */

function AnswerShell({
  icon: Icon,
  tint,
  children,
}: {
  icon: LucideIcon;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
          tint
        )}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function AnswerRow({
  answer,
  isAmharic,
  t,
  copied,
}: {
  answer: CommandAnswer;
  isAmharic: boolean;
  t: (key: TranslationKey, fallback?: string) => string;
  copied: boolean;
}) {
  if (answer.kind === "date") {
    const { source, target, weekday } = answer;
    const sourceLabel = `${source.monthLabel} ${source.day}, ${source.year}`;
    const targetLabel = `${target.monthLabel} ${target.day}, ${target.year}`;
    const fromEthiopian = answer.from === "ethiopian";

    return (
      <AnswerShell
        icon={ArrowLeftRight}
        tint="bg-gradient-to-br from-teal-500 to-cyan-600"
      >
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[0.8125rem] font-medium text-slate-500 line-through decoration-slate-300/70 decoration-1 dark:text-slate-400 dark:decoration-slate-600">
            {sourceLabel}
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-white">
            {targetLabel}
          </span>
          {target.monthAmharic && (
            <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
              {target.monthAmharic} {target.day}
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {isAmharic ? weekday.amharic : weekday.full}
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          {fromEthiopian ? "Ethiopian → Gregorian" : "Gregorian → Ethiopian"}
          {answer.alternate && (
            <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              {t("palette.alsoReads", "also reads as")}
            </span>
          )}
        </p>
      </AnswerShell>
    );
  }

  if (answer.kind === "fidel") {
    return (
      <AnswerShell icon={Type} tint="bg-gradient-to-br from-amber-500 to-orange-600">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-bold leading-tight text-slate-900 dark:text-white">
            {answer.fidel}
          </span>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {answer.latin}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {t("palette.copied", "Copied")}
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              {t("palette.copy", "Copy")}
            </>
          )}
        </p>
      </AnswerShell>
    );
  }

  const { holiday, ethiopian, gregorianDate } = answer.occurrence;

  return (
    <AnswerShell icon={PartyPopper} tint="bg-gradient-to-br from-rose-500 to-amber-500">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-base font-bold text-slate-900 dark:text-white">
          {isAmharic ? holiday.amharic : holiday.name}
        </span>
        <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">
          {isAmharic ? holiday.name : holiday.amharic}
        </span>
      </p>
      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
        {ethiopian.monthLabel} {ethiopian.day}, {ethiopian.year}
        <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
        {gregorianDate.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </AnswerShell>
  );
}

/* -------------------------------------------------------------------------- */

const THEME_OPTIONS: { value: ThemeChoice; icon: LucideIcon; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Answers depend on the current date, which is not knowable on the server.
  // Pinned when the palette opens so results cannot shift under the cursor.
  const [now, setNow] = useState<Date | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  const isAmharic = language === "am";

  useEffect(() => {
    if (!isOpen) return;

    setQuery("");
    setActiveIndex(0);
    setCopiedId(null);
    setNow(new Date());

    // Focus after the open transition has begun, so the browser does not scroll
    // the page behind the overlay to reach the input.
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  // The page behind must not scroll while the overlay owns the screen.
  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [onClose, router]
  );

  const copy = useCallback((id: string, text: string) => {
    const done = () => {
      setCopiedId(id);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(
        () => setCopiedId(null),
        COPY_FEEDBACK_MS
      );
    };

    navigator.clipboard?.writeText(text).then(done, () => {
      /* Clipboard refused; the fidel is on screen to copy by hand. */
    });
  }, []);

  const rows = useMemo<PaletteRow[]>(() => {
    const trimmed = query.trim();
    const needle = trimmed.toLowerCase();
    const result: PaletteRow[] = [];

    const tools = TOOL_DEFINITIONS.filter((tool) => {
      if (!needle) return true;
      return `${tool.title} ${tool.description} ${t(tool.titleKey, tool.title)}`
        .toLowerCase()
        .includes(needle);
    });

    /** Settings surface only when asked for; they would crowd every search. */
    const settingMatches = (...terms: string[]) =>
      needle.length > 0 && terms.some((term) => term.toLowerCase().includes(needle));

    const namedSomething =
      tools.length > 0 ||
      settingMatches("Light", "Dark", "System", "theme", "appearance") ||
      settingMatches("English", "Amharic አማርኛ", "language");

    if (trimmed && now) {
      for (const answer of buildAnswers(trimmed, now, {
        includeFidel: !namedSomething,
      })) {
        result.push({
          id: answer.id,
          group: "answer",
          render: () => (
            <AnswerRow
              answer={answer}
              isAmharic={isAmharic}
              t={t}
              copied={copiedId === answer.id}
            />
          ),
          keepOpen: answer.kind === "fidel",
          run: () =>
            answer.kind === "fidel"
              ? copy(answer.id, answer.fidel)
              : go(answer.href),
        });
      }
    }

    for (const tool of tools) {
      const Icon = tool.icon;
      result.push({
        id: `tool-${tool.href}`,
        group: "tool",
        run: () => go(tool.href),
        render: () => (
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                tool.tone
              )}
            >
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                {t(tool.titleKey, tool.title)}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {t(tool.descriptionKey, tool.navDescription)}
              </span>
            </span>
          </div>
        ),
      });
    }

    for (const option of THEME_OPTIONS) {
      if (!settingMatches(option.label, "theme", "appearance", "dark", "light")) {
        continue;
      }
      const Icon = option.icon;
      result.push({
        id: `theme-${option.value}`,
        group: "setting",
        keepOpen: true,
        run: () => setTheme(option.value),
        render: () => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("theme.label", "Theme")}
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              {t(`theme.${option.value}`, option.label)}
            </span>
            {theme === option.value && (
              <Check className="ml-auto h-4 w-4 text-teal-600 dark:text-teal-400" />
            )}
          </div>
        ),
      });
    }

    for (const option of [
      { value: "en" as const, label: "English" },
      { value: "am" as const, label: "Amharic አማርኛ" },
    ]) {
      if (!settingMatches(option.label, "language")) continue;
      result.push({
        id: `language-${option.value}`,
        group: "setting",
        keepOpen: true,
        run: () => setLanguage(option.value),
        render: () => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Languages className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("language.label", "Language")}
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              {option.label}
            </span>
            {language === option.value && (
              <Check className="ml-auto h-4 w-4 text-teal-600 dark:text-teal-400" />
            )}
          </div>
        ),
      });
    }

    return result;
  }, [
    copiedId,
    copy,
    go,
    isAmharic,
    language,
    now,
    query,
    setLanguage,
    setTheme,
    t,
    theme,
  ]);

  // A shorter result list must not leave the cursor past the end of it.
  useEffect(() => {
    setActiveIndex((index) => (index < rows.length ? index : 0));
  }, [rows.length]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, rows.length]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      return;
    }

    if (rows.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + rows.length) % rows.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(rows.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      rows[activeIndex]?.run();
    }
  };

  if (!isOpen) return null;

  const groups: { key: PaletteRow["group"]; label: string }[] = [
    { key: "answer", label: t("palette.answers", "Answer") },
    { key: "tool", label: t("palette.tools", "Tools") },
    { key: "setting", label: t("palette.settings", "Appearance") },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 pt-4 sm:p-4 sm:pt-[14vh]">
      {/* Clicking away closes, but Escape is the accessible route: this layer is
          not focusable and is hidden from assistive technology. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in dark:bg-slate-950/70"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("palette.open", "Search")}
        className={cn(
          "relative flex max-h-[85vh] sm:max-h-[70vh] w-full max-w-[38rem] flex-col overflow-hidden rounded-3xl",
          "border border-white/70 bg-white/95 shadow-[0_40px_90px_-30px_rgba(15,23,42,0.55)] backdrop-blur-2xl",
          "dark:border-white/10 dark:bg-slate-900/95",
          "motion-safe:animate-rise"
        )}
      >
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 dark:border-slate-700/70">
          <Search
            className="h-4.5 w-4.5 shrink-0 text-slate-500 dark:text-slate-400"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={rows[activeIndex]?.id}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t(
              "palette.placeholder",
              "Type a date, a word, or a feast…"
            )}
            className="w-full bg-transparent py-4 text-[0.9375rem] text-slate-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400"
          />
          <kbd className="hidden shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-500 sm:block dark:border-slate-700 dark:text-slate-400">
            esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id="command-palette-results"
          role="listbox"
          aria-label={t("palette.open", "Search")}
          className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-2"
        >
          {groups.map((group) => {
            const groupRows = rows.filter((row) => row.group === group.key);
            if (groupRows.length === 0) return null;

            return (
              <div
                key={group.key}
                role="group"
                aria-label={group.label}
                className="mb-1 last:mb-0"
              >
                <p
                  aria-hidden="true"
                  className="px-3 pb-1 pt-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                >
                  {group.label}
                </p>
                {groupRows.map((row) => {
                  const index = rows.indexOf(row);
                  const isActive = index === activeIndex;

                  return (
                    <div
                      key={row.id}
                      id={row.id}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      tabIndex={-1}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => {
                        row.run();
                        if (!row.keepOpen) return;
                        inputRef.current?.focus();
                      }}
                      className={cn(
                        "cursor-pointer rounded-2xl px-3 py-2.5 transition-colors",
                        isActive
                          ? "bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-500/10 dark:ring-teal-500/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      )}
                    >
                      {row.render()}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {rows.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("palette.empty", "Nothing matched that.")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200/80 px-4 py-2.5 text-[0.6875rem] text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
          {query.trim() === "" ? (
            <>
              <span className="font-bold uppercase tracking-[0.12em]">
                {t("palette.hintTitle", "Try typing")}
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                1/1/2017
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                selam
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                fasika
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 px-1 font-mono dark:border-slate-700">
                  ↑↓
                </kbd>
                {t("palette.navigate", "to move")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 px-1 font-mono dark:border-slate-700">
                  <CornerDownLeft className="h-2.5 w-2.5" aria-hidden="true" />
                </kbd>
                {t("palette.select", "to open")}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
