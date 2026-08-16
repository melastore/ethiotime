"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { EthiopianNow } from "@/components/layout/ethiopian-now";
import { useLanguage } from "@/components/providers/language-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TOOL_DEFINITIONS } from "@/lib/tool-registry";

export default function HomeLanding() {
  const { t } = useLanguage();

  const getLocalizedTool = (href: string, title: string, description: string) => {
    if (href === "/date-converter") {
      return {
        title: t("nav.dateConverter", title),
        description: t("nav.gregorianToEthiopian", description),
      };
    }
    if (href === "/age-calculator") {
      return {
        title: t("nav.ageCalculator", title),
        description: t("nav.liveAgeTimeline", description),
      };
    }
    if (href === "/ethiopian-calendar") {
      return {
        title: t("nav.ethiopianCalendar", title),
        description: t("nav.holidaysAndMonthView", description),
      };
    }
    if (href === "/amharic-keyboard") {
      return {
        title: t("nav.amharicKeyboard", title),
        description: t("nav.typeInFidel", description),
      };
    }
    if (href === "/note-taking") {
      return {
        title: t("nav.noteTaking", title),
        description: t("nav.fastPersonalNotes", description),
      };
    }
    if (href === "/event-planner") {
      return {
        title: t("nav.eventPlanner", title),
        description: t("nav.planAndReminders", description),
      };
    }
    if (href === "/date-difference") {
      return {
        title: t("nav.dateDifference", title),
        description: t("nav.daysAndWeeks", description),
      };
    }
    if (href === "/holidays") {
      return {
        title: t("nav.holidays", title),
        description: t("nav.historyAndDates", description),
      };
    }

    return {
      title: t("nav.ethiopianNow", title),
      description: t("nav.worldClock", description),
    };
  };

  return (
    <section className="pb-10 pt-2 sm:pt-4 lg:pt-0">
      <div className="glass-surface animate-rise relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-orange-300/25 blur-3xl" />

        <div className="relative">
          <h1 className="section-title max-w-3xl text-3xl font-black text-slate-900 sm:mt-1 sm:text-5xl lg:text-6xl dark:text-white">
            {t(
              "home.title",
              "Beautiful, practical tools for everyday Ethiopian workflows."
            )}
          </h1>
          <p className="mt-5 hidden max-w-2xl text-base text-slate-600 sm:block sm:text-lg dark:text-slate-300">
            {t(
              "home.subtitle",
              "Open a tool, get focused, and move fast. Everything is optimized for both desktop and mobile without feeling generic."
            )}
          </p>
          <EthiopianNow
            compact
            className="mt-4 border-white/60 bg-white/60 sm:hidden dark:border-white/15 dark:bg-slate-900/60"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOL_DEFINITIONS.map((tool, index) => {
          const Icon = tool.icon;
          const localized = getLocalizedTool(
            tool.href,
            tool.title,
            tool.description
          );
          return (
            <Link key={tool.href} href={tool.href} className="group">
              <Card
                className={cn(
                  "animate-rise relative h-full overflow-hidden rounded-3xl border-slate-200/70",
                  "transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
                  "dark:border-slate-700/70"
                )}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", tool.tone)} />
                <CardHeader className="space-y-4">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                      tool.tone
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center justify-between text-xl">
                      <span>{localized.title}</span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm leading-relaxed">
                      {localized.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
