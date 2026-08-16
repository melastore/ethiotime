"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { TodayHero } from "@/components/home/today-hero";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import { TOOL_DEFINITIONS } from "@/lib/tool-registry";

export default function HomeLanding() {
  const { t } = useLanguage();

  return (
    <section className="pb-12 pt-2 sm:pt-4 lg:pt-0">
      <div className="animate-rise">
        <TodayHero />
      </div>

      <div className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
              {t("home.toolsTitle", "All tools")}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              {t(
                "home.toolsSubtitle",
                "Everything works offline and keeps your data on this device."
              )}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:inline-block">
            {TOOL_DEFINITIONS.length}
          </span>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_DEFINITIONS.map((tool, index) => {
            const Icon = tool.icon;

            return (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5",
                    "shadow-sm transition-all duration-300",
                    "hover:-translate-y-1 hover:border-transparent hover:shadow-xl",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                    "dark:border-slate-700/70 dark:bg-slate-900/70 dark:focus-visible:ring-offset-slate-950",
                    "animate-rise"
                  )}
                  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-70 transition-opacity duration-300 group-hover:opacity-100",
                      tool.tone
                    )}
                  />

                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105",
                      tool.tone
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <span className="mt-4 flex items-start justify-between gap-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {t(tool.titleKey, tool.title)}
                    </span>
                    <ArrowUpRight
                      className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-600 dark:text-slate-600 dark:group-hover:text-teal-400"
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {t(tool.descriptionKey, tool.description)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
