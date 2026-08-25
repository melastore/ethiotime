"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  accountInfo,
  closeAccount,
  createAccount,
  hasApi,
  type AccountInfo,
} from "@/lib/api";
import {
  cleanAccountNumber,
  formatAccountNumber,
  forgetAccount,
  isAccountNumber,
  loadAccount,
  saveAccount,
} from "@/lib/account";
import { clearSyncState, prepareForSignIn, runSync } from "@/lib/sync-client";
import { cn } from "@/lib/utils";

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";

const CARD =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AccountPanel() {
  const [mounted, setMounted] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  // Shown once, on the screen that made it. After this it is only on paper.
  const [fresh, setFresh] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [typed, setTyped] = useState("");
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAccount(loadAccount());
  }, []);

  const refresh = useCallback(async (number: string) => {
    try {
      setInfo(await accountInfo(number));
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    if (account) void refresh(account);
  }, [account, refresh]);

  const make = async () => {
    setBusy(true);
    setError(null);

    try {
      const { number } = await createAccount();
      setFresh(number);
      setAcknowledged(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not make an account.");
    } finally {
      setBusy(false);
    }
  };

  // Signing in merges rather than replaces: whatever is already on this device
  // joins the account instead of being written over by it.
  const signIn = async (number: string) => {
    setBusy(true);
    setError(null);

    try {
      await accountInfo(number);
      prepareForSignIn();
      saveAccount(number);
      setAccount(number);
      setFresh(null);
      setTyped("");

      const outcome = await runSync();
      setStatus(
        outcome?.changed
          ? "Signed in. This device now has everything on the account."
          : "Signed in."
      );
      // The tools read their storage when they mount, so a page that is already
      // open is showing what was there before the merge.
      if (outcome?.changed) window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "That number did not work."
      );
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const outcome = await runSync();
      if (!outcome) return;

      setStatus(
        `Sent ${outcome.sent}, received ${outcome.received}.` +
          (outcome.changed ? " Reloading to show the new state." : "")
      );
      if (account) await refresh(account);
      if (outcome.changed) window.setTimeout(() => window.location.reload(), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sync.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    forgetAccount();
    clearSyncState();
    setAccount(null);
    setInfo(null);
    setStatus("Signed out. Everything stays on this device.");
  };

  const close = async () => {
    if (!account) return;
    if (!confirmClose) {
      setConfirmClose(true);
      return;
    }

    setBusy(true);
    try {
      await closeAccount(account);
      forgetAccount();
      clearSyncState();
      setAccount(null);
      setInfo(null);
      setConfirmClose(false);
      setStatus("Account closed. What was on the server is gone.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not close it.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Write it down instead.");
    }
  };

  const download = (number: string) => {
    const text = [
      "ethiotime account number",
      "",
      formatAccountNumber(number),
      "",
      "This is the only way back to your notes. There is no email, no password",
      "and no reset. Keep this file somewhere you will still have it later.",
      "",
    ].join("\n");

    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ethiotime-account.txt";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  if (!mounted) return null;

  if (!hasApi()) {
    return (
      <div className={CARD}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This build has no backend, so accounts are switched off. Everything
          stays on the device.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-10">
      <header>
        <p className={EYEBROW}>Account</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          A number, and nothing else
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          No email, no password. The number is the account. Sign in with it on
          another device and your notes, events, focus history and settings come
          with you.
        </p>
      </header>

      {fresh && (
        <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-500/40 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Write this down
          </p>

          <p className="mt-3 select-all font-mono text-2xl font-black tracking-wider text-slate-900 sm:text-3xl dark:text-white">
            {formatAccountNumber(fresh)}
          </p>

          <p className="mt-3 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            This is shown once. It is not stored anywhere we can read it back, so
            if it is lost the notes on it are lost with it.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => copy(fresh)}>
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" variant="outline" onClick={() => download(fresh)}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </Button>
          </div>

          <label className="mt-4 flex items-start gap-2.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            I have saved it somewhere safe
          </label>

          <Button
            type="button"
            className="mt-4 w-full"
            disabled={!acknowledged || busy}
            onClick={() => signIn(fresh)}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Use this account on this device
          </Button>
        </div>
      )}

      {account ? (
        <div className={CARD}>
          <p className={EYEBROW}>Signed in</p>
          <p className="mt-1.5 font-mono text-xl font-black tracking-wider text-slate-900 dark:text-white">
            {formatAccountNumber(account)}
          </p>

          {info && (
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "records", value: String(info.items) },
                { label: "stored", value: formatBytes(info.bytes) },
                { label: "versions", value: String(info.versions) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-slate-50 px-2 py-3 dark:bg-slate-800/60"
                >
                  <dd className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
                    {stat.value}
                  </dd>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={syncNow}>
              <RefreshCw
                className={cn("h-4 w-4", busy && "animate-spin")}
                aria-hidden="true"
              />
              Sync now
            </Button>
            <Button type="button" variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50",
                confirmClose
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              )}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {confirmClose ? "Yes, delete everything" : "Close this account"}
            </button>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {confirmClose
                ? "Every record on the server goes, history included. This device keeps its own copy."
                : "Deletes everything the server holds for this number."}
            </p>
          </div>
        </div>
      ) : (
        !fresh && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={CARD}>
              <p className={EYEBROW}>New</p>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                Makes a 16-digit number. Whatever is already on this device joins
                it.
              </p>
              <Button
                type="button"
                className="mt-4 w-full"
                disabled={busy}
                onClick={make}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Make an account
              </Button>
            </div>

            <div className={CARD}>
              <p className={EYEBROW}>Existing</p>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={formatAccountNumber(typed)}
                onChange={(event) =>
                  setTyped(cleanAccountNumber(event.target.value).slice(0, 16))
                }
                placeholder="0000 0000 0000 0000"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-base tracking-wider outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800/60"
              />
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                disabled={busy || !isAccountNumber(typed)}
                onClick={() => signIn(typed)}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in
              </Button>
            </div>
          </div>
        )
      )}

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {status && !error && (
        <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          {status}
        </p>
      )}
    </div>
  );
}
