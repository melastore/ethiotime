"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { hasApi } from "@/lib/api";
import { loadAccount } from "@/lib/account";
import { cn } from "@/lib/utils";

// The phone has no sidebar, so this is the only way to the account from a
// small screen. The dot is the whole status: signed in, or not.
export function AccountTrigger({ className }: { className?: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    setMounted(true);
    setSignedIn(loadAccount() !== null);
  }, []);

  if (!hasApi()) return null;

  const label = signedIn
    ? language === "am"
      ? "መለያ"
      : "Account"
    : language === "am"
      ? "ግባ"
      : "Sign in";

  return (
    <Link
      href="/account"
      aria-label={label}
      title={label}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-slate-600 transition-colors hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:text-teal-400",
        className
      )}
    >
      <UserRound className="h-4 w-4" aria-hidden="true" />
      {mounted && signedIn && (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-teal-500 dark:border-slate-900"
        />
      )}
    </Link>
  );
}
