"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CommandPalette } from "@/components/layout/command-palette";

type CommandPaletteContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** True on Apple hardware, so the hint reads ⌘K rather than Ctrl K. */
  isApple: boolean;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/** Typing into one of these means the keystroke belongs to the page, not the palette. */
const isEditingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
};

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isApple, setIsApple] = useState(false);
  // Whatever had focus when the palette opened, so closing it hands focus back
  // rather than dropping the caller to the top of the document.
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    openerRef.current?.focus();
    openerRef.current = null;
  }, []);

  useEffect(() => {
    setIsApple(/mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((value) => {
          if (value) return false;
          openerRef.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          return true;
        });
        return;
      }

      // "/" is the other shortcut people reach for, but only where it is not
      // simply a character being typed into a field.
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isEditingTarget(event.target)) return;
        event.preventDefault();
        open();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const value = useMemo(
    () => ({ isOpen, open, close, isApple }),
    [close, isApple, isOpen, open]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette isOpen={isOpen} onClose={close} />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }

  return context;
}
