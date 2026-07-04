"use client";

import { useEffect } from "react";

/**
 * Production-only service worker registration. The worker itself
 * (public/sw.js) precaches the app shell and network-first-caches the
 * due-words API so the app can open and a practice session can boot while
 * offline; see src/lib/offline/ for the IndexedDB cache + outbox that
 * actually drives offline practice and sync-back.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent by design for a non-critical enhancement.
    });
  }, []);

  return null;
}
