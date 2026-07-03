"use client";

import { useEffect } from "react";

/**
 * Minimal, production-only service worker registration.
 *
 * We intentionally keep caching logic out of this phase to avoid stale-data
 * risks for DB-backed routes. The initial goal is installability and a safe
 * base to extend in a later offline phase.
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
