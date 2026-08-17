"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  House,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EthiopianNow } from "@/components/layout/ethiopian-now";
import { useLanguage } from "@/components/providers/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { asset } from "@/lib/base-path";
import { TOOL_DEFINITIONS } from "@/lib/tool-registry";

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  defaultLabel: string;
  icon: LucideIcon;
  descriptionKey: TranslationKey;
  defaultDescription: string;
};

const navItems: NavItem[] = [
  {
    href: "/",
    labelKey: "nav.home",
    defaultLabel: "Home",
    icon: House,
    descriptionKey: "nav.overview",
    defaultDescription: "Overview",
  },
  ...TOOL_DEFINITIONS.map((tool) => ({
    href: tool.href,
    labelKey: tool.titleKey,
    defaultLabel: tool.title,
    icon: tool.icon,
    descriptionKey: tool.descriptionKey,
    defaultDescription: tool.navDescription,
  })),
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[18.5rem] lg:p-5">
        <div className="glass-surface flex h-full flex-col overflow-hidden rounded-[1.75rem] p-4">
          <Link
            href="/"
            className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/75"
          >
            <Image
              src={asset("/ethiotime-logo.svg")}
              alt="EthioTime"
              width={280}
              height={80}
              className="h-auto w-full max-w-[14.5rem]"
              priority
              unoptimized
            />
          </Link>

          <EthiopianNow compact className="mt-3 shrink-0" />

          {/* Only the link list scrolls, so the logo and clock stay put and the
              card's rounded corners are never cut by a scrollbar. */}
          <nav
            className="scrollbar-slim -mr-1.5 mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1.5"
            aria-label="Primary navigation"
          >
            {navItems.map((item, index) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "animate-rise flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-200",
                    "hover:-translate-y-0.5",
                    isActive
                      ? "border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-900 shadow-sm dark:border-teal-700/40 dark:from-teal-950/30 dark:to-cyan-950/20 dark:text-teal-100"
                      : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
                  )}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      isActive
                        ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold">
                      {t(item.labelKey, item.defaultLabel)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t(item.descriptionKey, item.defaultDescription)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

        </div>
      </aside>

      <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/50 bg-white/70 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={asset("/ethiotime-mark.svg")}
              alt="EthioTime"
              width={34}
              height={34}
              className="h-8 w-8"
              priority
            />
            <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              EthioTime
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-primary-navigation"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <nav
            id="mobile-primary-navigation"
            className="animate-rise mt-3 grid gap-2 pb-2"
            aria-label="Mobile primary navigation"
          >
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-100"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}
                  >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey, item.defaultLabel)}
                </Link>
              );
            })}
            <EthiopianNow compact />
          </nav>
        )}
      </div>
    </>
  );
}
