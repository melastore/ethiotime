"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AccountTrigger } from "@/components/layout/account-trigger";
import { CommandTrigger } from "@/components/layout/command-trigger";
import { MobileDock } from "@/components/layout/mobile-dock";
import { EthiopianNow } from "@/components/layout/ethiopian-now";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import { asset } from "@/lib/base-path";
import {
  TOOL_DEFINITIONS,
  TOOL_GROUP_LABELS,
  TOOL_GROUP_ORDER,
} from "@/lib/tool-registry";

export function Sidebar() {
  const pathname = usePathname();
  const { language, t } = useLanguage();

  const isCurrent = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[17.5rem] lg:py-5 lg:pl-5">
        <div className="glass-surface flex h-full flex-col overflow-hidden rounded-[1.75rem] px-3 py-4">
          {/* The mark carries the brand; a bordered card around it only added weight. */}
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition-opacity hover:opacity-80"
          >
            <Image
              src={asset("/ethiotime-mark.svg")}
              alt=""
              aria-hidden="true"
              width={34}
              height={34}
              className="h-8 w-8 shrink-0"
              priority
            />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                EthioTime
              </span>
              <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t("nav.overview", "Overview")}
              </span>
            </span>
          </Link>

          <CommandTrigger className="mt-3 shrink-0" />

          <EthiopianNow compact className="mt-2 shrink-0" />

          {/*
            * Grouped, and one line each. Nine equal blocks with a subtitle apiece
            * gave every destination the same weight and turned the rail into a
            * wall; the headings carry the structure instead, and a description
            * appears only for the page you are actually on.
            */}
          <nav
            className="scrollbar-slim -mr-1.5 mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1.5"
            aria-label="Primary navigation"
          >
            <RailLink
              href="/"
              icon={House}
              label={t("nav.home", "Home")}
              description={t("nav.overview", "Overview")}
              tone="from-slate-500 to-slate-700"
              active={pathname === "/"}
            />

            {TOOL_GROUP_ORDER.map((group) => {
              const tools = TOOL_DEFINITIONS.filter((tool) => tool.group === group);
              if (tools.length === 0) return null;

              const labels = TOOL_GROUP_LABELS[group];

              return (
                <div key={group} className="mt-4 first:mt-2">
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {language === "am" ? labels.amharic : labels.english}
                  </p>
                  {tools.map((tool) => (
                    <RailLink
                      key={tool.href}
                      href={tool.href}
                      icon={tool.icon}
                      label={t(tool.titleKey, tool.title)}
                      description={t(tool.descriptionKey, tool.navDescription)}
                      tone={tool.tone}
                      active={isCurrent(tool.href)}
                    />
                  ))}
                </div>
              );
            })}
          </nav>

          <Link
            href="/account"
            className={cn(
              "mt-3 flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              isCurrent("/account")
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            {language === "am" ? "መለያ" : "Account"}
          </Link>

          <ThemeToggle className="mt-2 shrink-0" />
        </div>
      </aside>

      <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/50 bg-white/70 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src={asset("/ethiotime-mark.svg")}
              alt="EthioTime"
              width={34}
              height={34}
              className="h-8 w-8"
              priority
            />
            <span className="hidden text-sm font-extrabold tracking-tight text-slate-900 min-[380px]:inline dark:text-slate-100">
              EthioTime
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <CommandTrigger compact />
            <AccountTrigger />
          </div>
        </div>
      </div>

      {/* Navigation itself lives at the bottom of the screen on a phone. */}
      <MobileDock />
    </>
  );
}

/**
 * One destination. Collapsed to a single line at rest so the rail reads as a
 * list rather than a stack of cards; the active row earns the extra line.
 */
function RailLink({
  href,
  icon: Icon,
  label,
  description,
  tone,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  tone: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl py-2 pl-3 pr-2 transition-colors duration-150",
        active
          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800/80 dark:text-white"
          : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b transition-opacity duration-200",
          tone,
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110",
          active
            ? cn("bg-gradient-to-br text-white shadow-sm", tone)
            : "text-slate-500 dark:text-slate-400",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight">
          {label}
        </span>
        {active && (
          <span className="block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </span>
    </Link>
  );
}
