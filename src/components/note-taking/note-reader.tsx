"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";

import { MarkdownView } from "@/components/note-taking/markdown-lazy";
import { readJson, writeJson } from "@/lib/storage";
import { cn } from "@/lib/utils";

const THEMES = ["light", "sepia", "dark"] as const;
export type ReaderTheme = (typeof THEMES)[number];

const SETTINGS_KEY = "note-reader-settings";
const MIN_SIZE = 15;
const MAX_SIZE = 26;

type ReaderSettings = { theme: ReaderTheme; fontSize: number };

const DEFAULT_SETTINGS: ReaderSettings = { theme: "light", fontSize: 18 };

const isSettings = (value: unknown): value is ReaderSettings =>
  typeof value === "object" &&
  value !== null &&
  THEMES.includes((value as ReaderSettings).theme) &&
  typeof (value as ReaderSettings).fontSize === "number";

const THEME_SWATCH: Record<ReaderTheme, string> = {
  light: "bg-white border-slate-300",
  sepia: "bg-[#f4ecd8] border-[#d8c9a8]",
  dark: "bg-[#1b1d22] border-[#3a3e46]",
};

export function NoteReader({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setSettings(readJson(SETTINGS_KEY, DEFAULT_SETTINGS, isSettings));
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) writeJson(SETTINGS_KEY, settings);
  }, [settings, isMounted]);

  // Escape closes, and the page behind must not scroll while this is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const setFontSize = (delta: number) =>
    setSettings((current) => ({
      ...current,
      fontSize: Math.min(MAX_SIZE, Math.max(MIN_SIZE, current.fontSize + delta)),
    }));

  // A portal, so an ancestor with a transform cannot turn `fixed` into
  // something anchored halfway down the page.
  return createPortal(
    <div
      className="note-reader fixed inset-0 z-50 flex flex-col"
      data-reader-theme={settings.theme}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex flex-none items-center gap-3 border-b px-4 py-2.5 sm:px-6">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>

        <div className="flex flex-none items-center gap-1" role="group" aria-label="Text size">
          <button
            type="button"
            onClick={() => setFontSize(-1)}
            disabled={settings.fontSize <= MIN_SIZE}
            className="note-reader-control"
            aria-label="Smaller text"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setFontSize(1)}
            disabled={settings.fontSize >= MAX_SIZE}
            className="note-reader-control"
            aria-label="Larger text"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-none items-center gap-1" role="group" aria-label="Reading theme">
          {THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setSettings((current) => ({ ...current, theme }))}
              aria-pressed={settings.theme === theme}
              title={theme}
              className={cn(
                "h-6 w-6 rounded-full border-2 capitalize transition-transform",
                THEME_SWATCH[theme],
                settings.theme === theme
                  ? "scale-110 ring-2 ring-teal-500 ring-offset-1"
                  : "hover:scale-105"
              )}
            >
              <span className="sr-only">{theme}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="note-reader-control flex-none"
          aria-label="Close reader"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-12">
        <div
          className="mx-auto w-full max-w-[75rem]"
          style={{ fontSize: `${settings.fontSize}px` }}
        >
          <h1 className="note-reader-title mb-6">{title}</h1>
          <MarkdownView content={content} className="note-reading" />
        </div>
      </div>
    </div>,
    document.body
  );
}
