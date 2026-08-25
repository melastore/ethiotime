"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * A labelled field with a list behind it.
 *
 * An earlier version of this made the giant date itself the control, which read
 * as a puzzle: nothing said which number was the month, and opening one covered
 * the rest. So this is the ordinary thing — a label, a box, a list — sized
 * generously and laid out so a day picker looks like a month and a year picker
 * opens on the year you are already on.
 */

export type PickerOption = {
  value: number;
  label: string;
  /** Shown under the label in a single-column list. */
  hint?: string;
};

type PickerFieldProps = {
  value: number;
  display: string;
  options: PickerOption[];
  onCommit: (next: number) => void;
  /** Sits above the box, so every field says what it is. */
  label: string;
  columns: number;
  width: string;
  className?: string;
};

export function PickerField({
  value,
  display,
  options,
  onCommit,
  label,
  columns,
  width,
  className,
}: PickerFieldProps) {
  const hasHints = options.some((option) => option.hint);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Open on the current value rather than at the top of a long list.
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "center" });

    const onAway = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative min-w-0", className)}>
      <p className="mb-1.5 px-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <button
        type="button"
        aria-label={`${label}: ${display}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-2xl border-2 bg-white px-4 py-3.5 text-left transition-colors",
          "hover:border-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
          "dark:bg-slate-900 dark:focus-visible:ring-offset-slate-900",
          open
            ? "border-teal-500 dark:border-teal-400"
            : "border-slate-200 dark:border-slate-700"
        )}
      >
        <span className="truncate text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
          {display}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
            open && "rotate-180 text-teal-600 dark:text-teal-400"
          )}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          style={{ width }}
          className="month-pop absolute left-0 top-full z-40 mt-1.5 max-h-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onCommit(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-xl px-2 py-2.5 text-sm font-semibold tabular-nums transition-colors",
                  columns === 1 && hasHints ? "text-left" : "text-center",
                  option.value === value
                    ? "bg-teal-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                )}
              >
                <span className="block truncate">{option.label}</span>
                {columns === 1 && option.hint && (
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[11px] font-medium",
                      option.value === value
                        ? "text-teal-100"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {option.hint}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
