"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { useTheme, type ThemeChoice } from "@/components/providers/theme-provider";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: ThemeChoice;
  icon: LucideIcon;
  labelKey: TranslationKey;
  fallback: string;
}[] = [
  { value: "light", icon: Sun, labelKey: "theme.light", fallback: "Light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark", fallback: "Dark" },
  { value: "system", icon: Monitor, labelKey: "theme.system", fallback: "System" },
];

/**
 * Three states rather than a switch: "system" is a real choice, and a two-way
 * toggle silently drops it the first time it is touched.
 */
export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={t("theme.label", "Theme")}
      className={cn(
        "flex items-center rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50",
        compact ? "gap-0.5 p-0.5" : "gap-1 p-1",
        className
      )}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;
        const label = t(option.labelKey, option.fallback);

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center justify-center transition-colors",
              compact ? "h-8 w-8 rounded-lg" : "flex-1 rounded-xl py-1.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
              isActive
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
