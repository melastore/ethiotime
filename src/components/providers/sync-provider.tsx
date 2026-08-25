"use client";

import { useEffect } from "react";

import { loadAccount } from "@/lib/account";
import { runSync } from "@/lib/sync-client";

// How long after the last change to send it. Typing writes to localStorage on
// every keystroke, and a row per keystroke would eat the daily write budget for
// no benefit.
const SETTLE_MS = 4000;

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

    timer = window.setInterval(() => void sync(true), SETTLE_MS * 15);

    // Leaving the tab is the moment a change is most likely to be lost.
    const onHide = () => {
      if (document.visibilityState === "hidden") void runSync().catch(() => {});
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return null;
}
