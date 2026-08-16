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

import { readText, writeText } from "@/lib/storage";

import {
  translate,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (next: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
};

const STORAGE_KEY = "ethiotime-language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // English is the default; a stored preference is applied after mount. This must
  // match the `lang` attribute the server renders on <html>.
  const [language, setLanguageState] = useState<Language>("en");

  const restoredRef = useRef(false);

  useEffect(() => {
    const stored = readText(STORAGE_KEY);
    if (stored === "en" || stored === "am") {
      setLanguageState(stored);
    }
    restoredRef.current = true;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.setAttribute("data-lang", language);

    // Skip the first pass so the default does not overwrite a stored choice
    // before it has been read back.
    if (!restoredRef.current) return;
    writeText(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string) =>
      translate(language, key, fallback),
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
