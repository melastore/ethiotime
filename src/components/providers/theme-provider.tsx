"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { readText, writeText } from "@/lib/storage";
import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeChoice,
} from "@/lib/theme";

// Types are erased at compile time, so re-exporting them costs nothing and
// callers keep importing the theme vocabulary from one place. Values are a
// different matter and stay in "@/lib/theme" — see the note there.
export type { ResolvedTheme, ThemeChoice };

type ThemeContextValue = {
  theme: ThemeChoice;
  resolvedTheme: ResolvedTheme;
  setTheme: (next: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // "system" is the server-rendered default, matching what the bootstrap script
  // falls back to when nothing has been stored.
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const stored = readText(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") setThemeState(stored);
    setRestored(true);
  }, []);

  // The OS preference is tracked whatever the choice is, and only consulted when
  // the choice is "system". Reading it inside a listener that also knows about
  // the choice would let a stale reading overwrite an explicit Light or Dark.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemTheme(media.matches ? "dark" : "light");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    // Until the stored choice has been read back the document already carries
    // what the bootstrap script worked out, and writing over it would only flash.
    if (!restored) return;
    applyTheme(resolvedTheme);
  }, [resolvedTheme, restored]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    writeText(THEME_STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
