"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { amharicTransliterate } from "@/lib/amharicTransliterate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Languages, Sparkles, Type, X } from "lucide-react";

const STORAGE_KEY = "ethiotime-amharic-text";

const NAVIGATION_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Tab",
  "Enter",
  "CapsLock",
  "Escape",
]);

const queueCursorPosition = (
  textarea: HTMLTextAreaElement,
  position: number
) => {
  setTimeout(() => textarea.setSelectionRange(position, position), 0);
};

const AmharicKeyboard = () => {
  const [text, setText] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastKeyPressTimeRef = useRef<number>(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setText(saved);
      }
    } catch {
      // Ignore storage access issues in restricted environments.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // Ignore storage access issues in restricted environments.
    }
  }, [text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd } = textarea;
    const key = e.key;

    const currentTime = Date.now();
    const timeSinceLastPress = currentTime - lastKeyPressTimeRef.current;
    lastKeyPressTimeRef.current = currentTime;

    // Let default behavior for control keys (except backspace)
    if (e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    if (key === "Backspace") {
      e.preventDefault();
      const { newText, newCursorPos } = amharicTransliterate(
        text,
        "Backspace",
        selectionStart,
        selectionEnd
      );
      setText(newText);
      queueCursorPosition(textarea, newCursorPos);
      return;
    }

    if (NAVIGATION_KEYS.has(key)) {
      return;
    }

    e.preventDefault();
    const { newText, newCursorPos } = amharicTransliterate(
      text,
      key,
      selectionStart,
      selectionEnd,
      timeSinceLastPress
    );

    if (text !== newText) {
      setText(newText);
      queueCursorPosition(textarea, newCursorPos);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }

    setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleClear = () => {
    setText("");
    setCopyState("idle");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

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
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Words</div>
              <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                <Type className="h-4 w-4 text-teal-500" />
                {wordCount}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/75 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Characters</div>
              <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                <Languages className="h-4 w-4 text-cyan-500" />
                {charCount}
              </div>
            </div>
            <div className="col-span-2 rounded-xl border border-teal-100/80 bg-teal-50/70 px-3 py-2 text-[11px] font-medium text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-200">
              Works best with combinations like <span className="font-bold">sh, ch, gn, zh</span>.
            </div>
          </div>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              className="min-h-[300px] w-full resize-y rounded-2xl border-slate-200/80 bg-white/85 p-4 text-base leading-relaxed shadow-inner dark:border-slate-700/80 dark:bg-slate-900/70"
              value={text}
              onKeyDown={handleKeyDown}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing in English to see Amharic..."
              aria-label="Amharic text area"
            />
            {text && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-8 w-8 rounded-xl bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear text</span>
              </Button>
            )}
          </div>
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
              <Copy className="mr-2 h-4 w-4" />
              {copyState === "success"
                ? "Copied!"
                : copyState === "error"
                  ? "Copy failed"
                  : "Copy to Clipboard"}
            </Button>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-slate-700 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">How to use</p>
            <ul className="mt-2 list-disc list-inside space-y-1.5">
              <li>
                Type English letters to get Amharic characters (`selam` becomes
                `ሰላም`).
              </li>
              <li>Vowels `a, e, i, o, u` modify the preceding consonant.</li>
              <li>Use letter pairs such as `sh`, `ch`, `gn`, and `zh`.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmharicKeyboard;
