"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";

import { LanguageToggle } from "@/components/layout/language-toggle";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export function AppFooter({ className }: { className?: string }) {
  const { language } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className={cn("mt-8 pb-2", className)} aria-label="Site footer">
      <div className="glass-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
              <Globe2 className="h-4 w-4 text-teal-600 dark:text-teal-300" />
              EthioTime
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {language === "am"
                ? `© ${year} EthioTime. ክፍት ምንጭ የኢትዮጵያ መሳሪያዎች።`
                : `© ${year} EthioTime. Open-source Ethiopian daily tools.`}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
              <Link
                href="/sitemap.xml"
                className="text-slate-500 transition-colors hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300"
              >
                Sitemap
              </Link>
              <Link
                href="/robots.txt"
                className="text-slate-500 transition-colors hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300"
              >
                Robots
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-auto">
            <LanguageToggle compact className="!mt-0 w-full lg:w-[14rem]" />
          </div>
        </div>
      </div>
    </footer>
  );
}
