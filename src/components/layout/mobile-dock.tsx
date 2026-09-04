"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, X } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { TOOL_DEFINITIONS } from "@/lib/tool-registry";
import { cn } from "@/lib/utils";

/*
 * Navigation for a thumb.
 *
 * A menu behind a hamburger at the top of the screen is the furthest point from
 * where a hand actually rests, and it hides every destination behind a tap. The
 * dock keeps the four places people return to within reach and gives the rest a
 * sheet that opens where the thumb already is — so the whole app is two taps
 * away at most, and the common half is one.
 */

/** The four that earn a permanent slot; the rest live behind "All". */
const PRIMARY = ["/date-converter", "/ethiopian-calendar", "/note-taking"];

export function MobileDock() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isSheetOpen, setSheetOpen] = useState(false);

  // A tap that navigates should close the sheet behind it.
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isSheetOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const primaryTools = PRIMARY.map((href) =>
    TOOL_DEFINITIONS.find((tool) => tool.href === href)
  ).filter((tool): tool is (typeof TOOL_DEFINITIONS)[number] => Boolean(tool));

  return (
    <>
      {isSheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t("palette.close", "close")}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("palette.tools", "Tools")}
            className="animate-rise absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto scrollbar-slim rounded-t-3xl border-t border-white/60 bg-white/95 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {t("palette.tools", "Tools")}
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={t("palette.close", "close")}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="grid grid-cols-2 gap-2.5">
              {TOOL_DEFINITIONS.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <li key={tool.href}>
                    <Link
                      href={tool.href}
                      aria-current={isActive(tool.href) ? "page" : undefined}
                      style={{ animationDelay: `${index * 30}ms` }}
                      className={cn(
                        "month-pop flex h-full flex-col gap-2 rounded-2xl border p-3 transition-colors",
                        isActive(tool.href)
                          ? "border-teal-300 bg-teal-50 dark:border-teal-700/60 dark:bg-teal-950/30"
                          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                          tool.tone
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
                        {t(tool.titleKey, tool.title)}
                      </span>
                      <span className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                        {t(tool.descriptionKey, tool.navDescription)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/60 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-slate-900/90"
      >
        <ul className="grid grid-cols-5">
          <DockItem
            href="/"
            icon={House}
            label={t("nav.home", "Home")}
            tone="from-slate-500 to-slate-700"
            active={pathname === "/"}
          />

          {primaryTools.map((tool) => (
            <DockItem
              key={tool.href}
              href={tool.href}
              icon={tool.icon}
              label={t(tool.titleKey, tool.title)}
              tone={tool.tone}
              active={isActive(tool.href)}
            />
          ))}

          <li>
            <button
              type="button"
              onClick={() => setSheetOpen((open) => !open)}
              aria-expanded={isSheetOpen}
              className="flex w-full flex-col items-center gap-1 px-1 py-2"
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200",
                  isSheetOpen
                    ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                <LayoutGrid className="h-5 w-5" aria-hidden="true" />
              </span>
              <span
                className={cn(
                  "truncate text-[10px] font-bold",
                  isSheetOpen
                    ? "text-teal-700 dark:text-teal-300"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {t("palette.tools", "Tools")}
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

function DockItem({
  href,
  icon: Icon,
  label,
  tone,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className="flex flex-col items-center gap-1 px-1 py-2"
      >
        {/* The pill grows under whichever item is current, so the eye can find it. */}
        <span
          className={cn(
            "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200",
            active
              ? cn("bg-gradient-to-br text-white shadow-md", tone)
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={cn(
            "w-full truncate text-center text-[10px] font-bold",
            active
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}
