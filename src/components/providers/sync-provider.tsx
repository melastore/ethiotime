"use client";

import { useEffect } from "react";

import { loadAccount } from "@/lib/account";
import { runSync } from "@/lib/sync-client";

// Typing writes to localStorage on every keystroke, and a row per keystroke
// would eat the daily write budget for no benefit, so changes are gathered up
// and sent on this beat instead.
const BEAT_MS = 20_000;

// Syncs in the background while the app is open. A pull that changes what is on
// the device reloads the page, because every tool reads its storage when it
// mounts and would otherwise carry on showing the old copy.
export function SyncProvider() {
  useEffect(() => {
    if (!loadAccount()) return;

    let timer = 0;
    let running = false;

    const sync = async (reloadOnChange: boolean) => {
      if (running || document.visibilityState === "hidden") return;
      running = true;

      try {
        const outcome = await runSync();
        if (reloadOnChange && outcome?.changed) window.location.reload();
      } catch {
        // Offline, or the account was closed elsewhere. The device keeps its
        // own copy either way, so there is nothing to report here.
      } finally {
        running = false;
      }
    };

    // The first one does not reload: the pages are mounting right now and will
    // read whatever it writes.
    void sync(false);

    timer = window.setInterval(() => void sync(true), BEAT_MS);

    // Coming back to the tab is when the other device's work is most likely to
    // be waiting, and leaving it is when this device's is most likely to be
    // lost. The hidden case sends without reloading a page nobody is looking at.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void runSync().catch(() => {});
      } else {
        void sync(true);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, []);

  return null;
}
