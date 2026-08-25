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
  amharicTransliterate,
  singleCharInsertion,
} from "@/lib/amharicTransliterate";
import {
  flushQueuedWords,
  loadDictionary,
  queueWord,
  syncDictionary,
} from "@/lib/word-store";
import { readText, writeText } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Languages, Sparkles, Type } from "lucide-react";

const STORAGE_KEY = "ethiotime-amharic-text";
const COPY_FEEDBACK_MS = 2000;
// Long enough that words are reported once the sentence has settled, not on
// every keystroke.
const REPORT_DELAY_MS = 2500;

type CopyState = "idle" | "success" | "error";

const AmharicKeyboard = () => {
  const [text, setText] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [cursor, setCursor] = useState(0);
  const [dictionary, setDictionary] = useState<readonly string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastKeyPressTimeRef = useRef(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Restoring from storage happens after the first paint; until it has run we must
  // not persist, or the initial empty value overwrites what was saved.
  const restoredRef = useRef(false);
  const pendingCursorRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = readText(STORAGE_KEY);
    if (saved) setText(saved);
    restoredRef.current = true;
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    writeText(STORAGE_KEY, text);
  }, [text]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // The bundled list is enough to suggest from straight away; anything synced
  // from the shared dictionary is layered on when it arrives.
  useEffect(() => {
    let cancelled = false;

    loadDictionary().then((words) => {
      if (!cancelled) setDictionary(words);
    });

    syncDictionary().then((added) => {
      if (added > 0) loadDictionary().then((words) => {
        if (!cancelled) setDictionary(words);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const fragment = wordAt(text, cursor).text;
    return fragment ? suggestWords(fragment, 6, dictionary) : [];
  }, [text, cursor, dictionary]);

  // Words are reported after a pause rather than as they are typed: one request
  // for a sentence instead of one per keystroke.
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

      pendingCursorRef.current = next.cursor;
      setCursor(next.cursor);
      setText(next.text);
      textareaRef.current?.focus();
    },
    [text, cursor]
  );

  // Tab takes the first suggestion. Enter is left alone: it is a newline here.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Tab" || suggestions.length === 0) return;

      event.preventDefault();
      applySuggestion(suggestions[0]);
    },
    [applySuggestion, suggestions]
  );

  const syncCursor = useCallback((event: { currentTarget: HTMLTextAreaElement }) => {
    setCursor(event.currentTarget.selectionStart);
  }, []);

  // The cursor has to be restored after React has committed the new value,
  // otherwise the browser parks it at the end of the textarea.
  useEffect(() => {
    const position = pendingCursorRef.current;
    if (position === null) return;
    pendingCursorRef.current = null;
    textareaRef.current?.setSelectionRange(position, position);
  }, [text]);

  /**
   * Transliteration runs off the resulting value rather than off `keydown`, so it
   * works the same on a physical keyboard and an on-screen one (which reports every
   * key as `Unidentified`). Comparing the old and new values tells us exactly what
   * the edit was; anything that is not a single typed character — deleting, pasting,
   * a phone keyboard replacing a whole word — is left alone.
   */
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      const previousValue = text;

      const edit = singleCharInsertion(previousValue, nextValue);
      if (!edit) {
        setCursor(event.target.selectionStart);
        setText(nextValue);
        return;
      }

      const now = Date.now();
      const timeSinceLastPress = now - lastKeyPressTimeRef.current;
      lastKeyPressTimeRef.current = now;

      const { newText, newCursorPos } = amharicTransliterate(
        previousValue,
        edit.char,
        edit.start,
        edit.end,
        timeSinceLastPress
      );

      pendingCursorRef.current = newCursorPos;
      setCursor(newCursorPos);
      setText(newText);
    },
    [text]
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

  const handleClear = () => {
    setText("");
    setCopyState("idle");
    textareaRef.current?.focus();
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const copyLabel =
    copyState === "success"
      ? "Copied!"
      : copyState === "error"
        ? "Copy failed"
        : "Copy to Clipboard";

  return (
    <div className="animate-rise py-1">
      <Card className="glass-surface mx-auto w-full max-w-4xl overflow-hidden rounded-[1.8rem]">
        <CardHeader className="border-b border-slate-200/70 bg-gradient-to-r from-teal-50/90 via-cyan-50/70 to-orange-50/90 dark:border-slate-700/60 dark:from-teal-950/30 dark:via-cyan-950/20 dark:to-orange-950/20">
          <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700 shadow-sm dark:bg-slate-900/60 dark:text-teal-200">
            <Sparkles className="h-3.5 w-3.5" />
            Transliteration Studio
          </div>
          <CardTitle className="text-2xl sm:text-3xl">Amharic Keyboard</CardTitle>
          <CardDescription>
            Type naturally in English and get instant Amharic transliteration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/70 bg-white/75 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Words
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                <Type className="h-4 w-4 text-teal-500" aria-hidden="true" />
                {wordCount}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/75 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Characters
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                <Languages className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                {charCount}
              </div>
            </div>
            <div className="col-span-2 rounded-xl border border-teal-100/80 bg-teal-50/70 px-3 py-2 text-[11px] font-medium text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-200">
              Works best with combinations like{" "}
              <span className="font-bold">sh, ch, gn, zh</span>.
            </div>
          </div>
          <Textarea
            ref={textareaRef}
            className="min-h-[300px] w-full resize-y rounded-2xl border-slate-200/80 bg-white/85 p-4 text-base leading-relaxed shadow-inner dark:border-slate-700/80 dark:bg-slate-900/70"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={syncCursor}
            onClick={syncCursor}
            onSelect={syncCursor}
            placeholder="Start typing in English to see Amharic..."
            aria-label="Amharic text area"
          />

          {suggestions.length > 0 && (
            <div
              className="-mt-1 flex flex-wrap items-center gap-1.5"
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
                  className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-900/40"
                >
                  {word}
                </button>
              ))}
              <span className="ml-1 hidden text-[11px] font-medium text-slate-400 sm:inline">
                Tab for the first
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              onClick={handleClear}
              variant="outline"
              disabled={!text}
              className="min-w-32"
            >
              Clear
            </Button>
            <Button onClick={handleCopy} disabled={!text} className="min-w-40">
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              {copyLabel}
            </Button>
          </div>
          <p aria-live="polite" className="sr-only">
            {copyState === "success"
              ? "Text copied to clipboard"
              : copyState === "error"
                ? "Copying to clipboard failed"
                : ""}
          </p>
          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-slate-700 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">How to use</p>
            <ul className="mt-2 list-inside list-disc space-y-1.5">
              <li>
                Type English letters to get fidel — <code>selam</code> becomes{" "}
                <span className="font-semibold">ሰላም</span>.
              </li>
              <li>
                The vowels <code>a</code>, <code>e</code>, <code>i</code>,{" "}
                <code>o</code>, <code>u</code> reshape the consonant before them.
              </li>
              <li>
                Letter pairs give the second family: <code>sh</code>,{" "}
                <code>ch</code>, <code>gn</code>, <code>zh</code>, <code>ts</code>.
              </li>
              <li>
                A capital <code>E</code> reaches the Hamis form — <code>sE</code>{" "}
                becomes <span className="font-semibold">ሴ</span>.
              </li>
              <li>
                Add <code>wa</code> for the labialized forms — <code>kwa</code>{" "}
                becomes <span className="font-semibold">ኳ</span>.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmharicKeyboard;
