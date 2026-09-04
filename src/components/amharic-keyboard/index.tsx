"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  completedWords,
  replaceWord,
  suggestWords,
  wordAt,
} from "@/lib/amharic-suggest";
import {
  DEFAULT_COMBINE_TIMEOUT_MS,
  amharicTransliterate,
  singleCharInsertion,
} from "@/lib/amharicTransliterate";
import {
  flushQueuedWords,
  loadDictionary,
  queueWord,
  syncDictionary,
} from "@/lib/word-store";
import { readJson, readText, writeJson, writeText } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Languages,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  Sparkles,
  Type,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT_STORAGE_KEY = "ethiotime-amharic-text";
const TIMEOUT_STORAGE_KEY = "ethiotime-amharic-timeout";
const COPY_FEEDBACK_MS = 2000;
const REPORT_DELAY_MS = 2500;

type CopyState = "idle" | "success" | "error";
type TimeoutPreset = "0.2" | "0.4" | "0.8" | "2" | "custom";

interface TimeoutSetting {
  preset: TimeoutPreset;
  customSeconds: number;
}

const DEFAULT_TIMEOUT_SETTING: TimeoutSetting = {
  preset: "0.2",
  customSeconds: 0.2,
};

const TIMEOUT_OPTIONS: Array<{ value: TimeoutPreset; label: string; hint: string }> = [
  { value: "0.2", label: "0.2s", hint: "Fast (Default)" },
  { value: "0.4", label: "0.4s", hint: "Balanced" },
  { value: "0.8", label: "0.8s", hint: "Relaxed" },
  { value: "2", label: "2s", hint: "Slow" },
  { value: "custom", label: "Custom", hint: "Set own" },
];

const QUICK_CHEAT_SHEET = [
  { title: "Vowels (e.g. 's' base)", detail: "s=ስ, se=ሰ, su=ሱ, si=ሲ, sa=ሳ, sE=ሴ, so=ሶ" },
  { title: "Digraphs", detail: "sh=ሽ, ch=ች, gn/ny=ኝ, zh=ዥ, ts=ጽ, hh=ሕ, tt=ጥ, cc=ጭ" },
  { title: "Labialized (-wa)", detail: "kwa=ኳ, gwa=ጓ, swa=ሷ, lwa=ሏ, mwa=ሟ, fwa=ፏ" },
  { title: "Standalone Vowels", detail: "a=አ, u=ኡ, i=ኢ, aa=ኣ, E=ኤ, e=እ, o=ኦ" },
  { title: "Punctuation", detail: ":: = ። (Full stop), , = ፣ (Comma), ; = ፤ (Semicolon)" },
];

const AmharicKeyboard = () => {
  const [text, setText] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [cursor, setCursor] = useState(0);
  const [dictionary, setDictionary] = useState<readonly string[]>([]);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);

  // Combine timeout settings
  const [timeoutSetting, setTimeoutSetting] = useState<TimeoutSetting>(DEFAULT_TIMEOUT_SETTING);
  const [customInputStr, setCustomInputStr] = useState("0.2");
  const [isCombining, setIsCombining] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastKeyPressTimeRef = useRef(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const combineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);
  const pendingCursorRef = useRef<number | null>(null);

  // Restore text and timeout setting on mount
  useEffect(() => {
    const savedText = readText(TEXT_STORAGE_KEY);
    if (savedText) setText(savedText);

    const savedSetting = readJson<TimeoutSetting>(
      TIMEOUT_STORAGE_KEY,
      DEFAULT_TIMEOUT_SETTING,
      (val): val is TimeoutSetting =>
        typeof val === "object" &&
        val !== null &&
        typeof (val as TimeoutSetting).preset === "string" &&
        typeof (val as TimeoutSetting).customSeconds === "number"
    );

    if (savedSetting) {
      setTimeoutSetting(savedSetting);
      setCustomInputStr(String(savedSetting.customSeconds ?? 0.2));
    }

    restoredRef.current = true;
  }, []);

  // Persist text changes
  useEffect(() => {
    if (!restoredRef.current) return;
    writeText(TEXT_STORAGE_KEY, text);
  }, [text]);

  // Persist timeout setting changes
  useEffect(() => {
    if (!restoredRef.current) return;
    writeJson(TIMEOUT_STORAGE_KEY, timeoutSetting);
  }, [timeoutSetting]);

  useEffect(() => {
    return () => {
      const copyTimer = copyTimerRef.current;
      const combineTimer = combineTimerRef.current;
      if (copyTimer) clearTimeout(copyTimer);
      if (combineTimer) clearTimeout(combineTimer);
    };
  }, []);

  // Compute effective milliseconds for combining letters
  const activeTimeoutMs = useMemo(() => {
    if (timeoutSetting.preset === "custom") {
      const parsed = parseFloat(customInputStr);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.max(50, Math.min(10_000, Math.round(parsed * 1000)));
      }
      return DEFAULT_COMBINE_TIMEOUT_MS;
    }
    const val = parseFloat(timeoutSetting.preset);
    return Number.isFinite(val) && val > 0
      ? Math.round(val * 1000)
      : DEFAULT_COMBINE_TIMEOUT_MS;
  }, [timeoutSetting.preset, customInputStr]);

  // Dictionary loading & syncing
  useEffect(() => {
    let cancelled = false;

    loadDictionary().then((words) => {
      if (!cancelled) setDictionary(words);
    });

    syncDictionary().then((added) => {
      if (added > 0) {
        loadDictionary().then((words) => {
          if (!cancelled) setDictionary(words);
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const fragment = wordAt(text, cursor).text;
    return fragment ? suggestWords(fragment, 6, dictionary) : [];
  }, [text, cursor, dictionary]);

  // Words reported for dictionary queue
  useEffect(() => {
    if (!text) return;

    const timer = window.setTimeout(() => {
      for (const word of completedWords(text, cursor)) queueWord(word);
      flushQueuedWords();
    }, REPORT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [text, cursor]);

  const applySuggestion = useCallback(
    (word: string) => {
      const span = wordAt(text, cursor);
      const next = replaceWord(text, span, word);

      lastKeyPressTimeRef.current = 0;
      setIsCombining(false);
      pendingCursorRef.current = next.cursor;
      setCursor(next.cursor);
      setText(next.text);
      textareaRef.current?.focus();
    },
    [text, cursor]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Tab" || suggestions.length === 0) return;

      event.preventDefault();
      applySuggestion(suggestions[0]);
    },
    [applySuggestion, suggestions]
  );

  // Sync cursor and reset keypress timing when cursor position moves explicitly
  const syncCursor = useCallback((event: { currentTarget: HTMLTextAreaElement }) => {
    lastKeyPressTimeRef.current = 0;
    setIsCombining(false);
    setCursor(event.currentTarget.selectionStart);
  }, []);

  useEffect(() => {
    const position = pendingCursorRef.current;
    if (position === null) return;
    pendingCursorRef.current = null;
    textareaRef.current?.setSelectionRange(position, position);
  }, [text]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      const previousValue = text;

      const edit = singleCharInsertion(previousValue, nextValue);
      if (!edit) {
        // Non-character change: deletion, paste, or bulk IME change
        lastKeyPressTimeRef.current = 0;
        setIsCombining(false);
        setCursor(event.target.selectionStart);
        setText(nextValue);
        return;
      }

      const now = Date.now();
      const timeSinceLastPress =
        lastKeyPressTimeRef.current === 0 ? undefined : now - lastKeyPressTimeRef.current;
      lastKeyPressTimeRef.current = now;

      // Visual combine indicator: show combining feedback for activeTimeoutMs
      if (combineTimerRef.current) clearTimeout(combineTimerRef.current);
      setIsCombining(true);
      combineTimerRef.current = setTimeout(() => {
        setIsCombining(false);
      }, activeTimeoutMs);

      const { newText, newCursorPos } = amharicTransliterate(
        previousValue,
        edit.char,
        edit.start,
        edit.end,
        timeSinceLastPress,
        activeTimeoutMs
      );

      pendingCursorRef.current = newCursorPos;
      setCursor(newCursorPos);
      setText(newText);
    },
    [text, activeTimeoutMs]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyState("idle"), COPY_FEEDBACK_MS);
  };

  const handleDownload = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ethiotime-amharic-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const handleShare = async () => {
    if (!text) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Amharic Notes - EthioTime",
          text,
        });
        return;
      } catch {
        // User dismissed or aborted share
      }
    }
    await handleCopy();
  };

  const handleClear = () => {
    lastKeyPressTimeRef.current = 0;
    setIsCombining(false);
    setText("");
    setCopyState("idle");
    textareaRef.current?.focus();
  };

  const handlePresetSelect = (preset: TimeoutPreset) => {
    setTimeoutSetting((prev) => ({
      ...prev,
      preset,
    }));
  };

  const handleCustomChange = (value: string) => {
    setCustomInputStr(value);
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setTimeoutSetting({
        preset: "custom",
        customSeconds: Math.round(parsed * 100) / 100,
      });
    }
  };

  const adjustCustom = (delta: number) => {
    const current = parseFloat(customInputStr) || 0.2;
    const next = Math.max(0.05, Math.min(10, Math.round((current + delta) * 100) / 100));
    setCustomInputStr(String(next));
    setTimeoutSetting({
      preset: "custom",
      customSeconds: next,
    });
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const copyLabel =
    copyState === "success"
      ? "Copied!"
      : copyState === "error"
        ? "Copy failed"
        : "Copy";

  return (
    <div className="animate-rise py-1">
      <Card className="glass-surface mx-auto w-full max-w-4xl overflow-hidden rounded-[1.8rem] border border-slate-200/80 shadow-lg dark:border-slate-800">
        <CardHeader className="border-b border-slate-200/70 bg-gradient-to-r from-teal-50/90 via-cyan-50/70 to-orange-50/90 p-5 sm:p-6 dark:border-slate-700/60 dark:from-teal-950/30 dark:via-cyan-950/20 dark:to-orange-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700 shadow-sm backdrop-blur-sm dark:bg-slate-900/70 dark:text-teal-200">
              <Sparkles className="h-3.5 w-3.5 text-teal-500" />
              Transliteration Studio
            </div>
            {/* Active Combining Pulse Indicator */}
            {isCombining ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-3 py-1 text-[11px] font-bold text-amber-800 shadow-sm ring-1 ring-amber-300/60 animate-pulse dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60">
                <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                Combining active ({activeTimeoutMs}ms)
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100/70 px-2.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
                <Clock className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                Timeout: {(activeTimeoutMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Amharic Keyboard
          </h1>
          <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Type naturally in English phonetics and get instant, accurate Amharic fidel transliteration.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Words
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                <Type className="h-4 w-4 text-teal-500" aria-hidden="true" />
                {wordCount}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Characters
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                <Languages className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                {charCount}
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-xl border border-teal-100/90 bg-teal-50/80 px-3.5 py-2.5 text-[11px] font-medium text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
              <span>
                Works best with combinations: <span className="font-bold">sh, ch, gn, ny, zh, ts</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCheatSheetOpen((prev) => !prev)}
                className="ml-2 inline-flex shrink-0 items-center gap-1 font-bold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-white"
              >
                {isCheatSheetOpen ? "Hide" : "Cheat sheet"}
                {isCheatSheetOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Quick Cheat Sheet Drawer */}
          {isCheatSheetOpen && (
            <div className="animate-rise rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Quick Fidel Transliteration Reference
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {QUICK_CHEAT_SHEET.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/40"
                  >
                    <span className="block text-xs font-bold text-teal-700 dark:text-teal-300">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[11px] font-mono leading-relaxed text-slate-700 dark:text-slate-300">
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combine Word Timeout Setting Control Bar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-300">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Combine Word Timeout
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Delay before a character settles and stops combining with following vowels
                  </p>
                </div>
              </div>

              {/* Presets and Custom option pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {TIMEOUT_OPTIONS.map((opt) => {
                  const isActive = timeoutSetting.preset === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handlePresetSelect(opt.value)}
                      title={opt.hint}
                      className={cn(
                        "rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all",
                        isActive
                          ? "bg-teal-600 text-white shadow-sm shadow-teal-600/30 dark:bg-teal-500"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom timeout input stepper */}
            {timeoutSetting.preset === "custom" && (
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200/60 pt-3 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Custom duration:
                </span>
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => adjustCustom(-0.05)}
                    aria-label="Decrease custom timeout"
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="10"
                    value={customInputStr}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    className="w-16 bg-transparent px-1 text-center text-xs font-bold tabular-nums text-slate-900 outline-none dark:text-white"
                  />
                  <span className="pr-1 text-xs font-semibold text-slate-400">sec</span>
                  <button
                    type="button"
                    onClick={() => adjustCustom(0.05)}
                    aria-label="Increase custom timeout"
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ({activeTimeoutMs} ms)
                </span>
              </div>
            )}
          </div>

          {/* Main Textarea */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              className="min-h-[220px] sm:min-h-[300px] w-full resize-y rounded-2xl border-slate-200/80 bg-white/90 p-4 text-base sm:text-lg leading-relaxed shadow-inner transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-800 dark:bg-slate-900/80"
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onKeyUp={syncCursor}
              onClick={syncCursor}
              onSelect={syncCursor}
              onBlur={() => {
                lastKeyPressTimeRef.current = 0;
                setIsCombining(false);
              }}
              placeholder="Start typing in English to see Amharic (e.g. selam, ityopya, adis abeba)..."
              aria-label="Amharic text area"
            />
          </div>

          {/* Word Suggestions (Horizontal scrollable on mobile) */}
          {suggestions.length > 0 && (
            <div
              className="-mt-1 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-slim"
              role="listbox"
              aria-label="Word suggestions"
            >
              <Sparkles
                className="h-3.5 w-3.5 shrink-0 text-teal-500"
                aria-hidden="true"
              />
              {suggestions.map((word, index) => (
                <button
                  key={word}
                  type="button"
                  role="option"
                  aria-selected={index === 0}
                  onClick={() => applySuggestion(word)}
                  className="shrink-0 rounded-full border border-teal-200 bg-teal-50/90 px-3 py-1 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100 active:scale-95 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-900/60"
                >
                  {word}
                </button>
              ))}
              <span className="ml-1 hidden shrink-0 text-[11px] font-medium text-slate-400 sm:inline">
                Tab for the first
              </span>
            </div>
          )}

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleClear}
                variant="outline"
                disabled={!text}
                size="sm"
                className="rounded-xl border-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                disabled={!text}
                size="sm"
                className="rounded-xl border-slate-200 dark:border-slate-700"
                title="Download text file"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                disabled={!text}
                size="sm"
                className="rounded-xl border-slate-200 dark:border-slate-700"
                title="Share text"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                Share
              </Button>
              <Button
                onClick={handleCopy}
                disabled={!text}
                size="sm"
                className={cn(
                  "min-w-[7.5rem] rounded-xl font-bold transition-all",
                  copyState === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-teal-600 hover:bg-teal-700 text-white"
                )}
              >
                {copyState === "success" ? (
                  <Check className="mr-1.5 h-4 w-4" />
                ) : (
                  <Copy className="mr-1.5 h-4 w-4" />
                )}
                {copyLabel}
              </Button>
            </div>
          </div>

          <p aria-live="polite" className="sr-only">
            {copyState === "success"
              ? "Text copied to clipboard"
              : copyState === "error"
                ? "Copying to clipboard failed"
                : ""}
          </p>

          {/* Guide Explanations */}
          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-xs sm:text-sm text-slate-700 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-slate-300">
            <p className="font-bold text-slate-900 dark:text-white">How it works</p>
            <ul className="mt-2 list-inside list-disc space-y-1.5">
              <li>
                Type English letters to form fidel — <code>selam</code> becomes{" "}
                <span className="font-bold text-teal-700 dark:text-teal-300">ሰላም</span>.
              </li>
              <li>
                Vowels <code>a, e, i, o, u</code> combine with the consonant before them within the{" "}
                <span className="font-bold">{(activeTimeoutMs / 1000).toFixed(1)}s combine window</span>.
              </li>
              <li>
                Digraphs form single fidel: <code>sh</code> (ሽ), <code>ch</code> (ች),{" "}
                <code>gn</code> / <code>ny</code> (ኝ), <code>zh</code> (ዥ), <code>ts</code> (ጽ).
              </li>
              <li>
                Capital <code>E</code> or <code>ee</code>/<code>ie</code> reaches the 5th form (Hamis) — <code>sE</code> becomes{" "}
                <span className="font-bold text-teal-700 dark:text-teal-300">ሴ</span>.
              </li>
              <li>
                Add <code>wa</code> for labialized forms — <code>kwa</code> becomes{" "}
                <span className="font-bold text-teal-700 dark:text-teal-300">ኳ</span>.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmharicKeyboard;
