"use client";

import { Search } from "lucide-react";

import { useCommandPalette } from "@/components/providers/command-palette-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

/**
 * The visible way into the palette, for anyone who does not know the shortcut.
 * `compact` is the icon-only form used in the mobile bar, where there is no room
 * for the full field.
 */
export function CommandTrigger({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { open, isApple } = useCommandPalette();
  const { t } = useLanguage();
  const label = t("palette.open", "Search");

  if (compact) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label={label}
        className={cn(
          "rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors",
          "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
          className
        )}
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-left transition-colors",
        "hover:border-teal-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
        "dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-teal-600/60 dark:hover:bg-slate-900",
        className
      )}
    >
      <Search
        className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-teal-600 dark:text-slate-400 dark:group-hover:text-teal-400"
        aria-hidden="true"
      />
      <span className="flex-1 truncate text-sm text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {/* Rendered only once the platform is known, so the server and the browser
          never disagree about which modifier this machine uses. */}
      <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        {isApple ? "⌘" : "Ctrl"} K
      </kbd>
    </button>
  );
}
