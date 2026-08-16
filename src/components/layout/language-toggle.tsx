"use client";

import { Languages } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export function LanguageToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      className={cn(
        "shrink-0 rounded-2xl border border-slate-200 bg-white/75 p-2 dark:border-slate-700 dark:bg-slate-900/55",
        compact ? "mt-2" : "mt-3",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        <Languages className="h-3.5 w-3.5" />
        {t("language.label", "Language")}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={cn(
            "rounded-xl px-3 py-2 text-xs font-bold transition-all",
            language === "en"
              ? "bg-teal-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
        >
          {t("language.en", "EN")}
        </button>
        <button
          type="button"
          onClick={() => setLanguage("am")}
          className={cn(
            "rounded-xl px-3 py-2 text-xs font-bold transition-all",
            language === "am"
              ? "bg-amber-500 text-slate-900 shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
        >
          {t("language.am", "አማ")}
        </button>
      </div>
    </div>
  );
}
