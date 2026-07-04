"use client";

import { useEffect } from "react";
import { flushOutbox } from "@/lib/offline/sync";

/**
 * Mounted once at the root layout: flushes any answers/sessions queued while
 * offline as soon as the browser reports a connection — either because the
 * `online` event fires mid-visit, or because the app was reopened online
 * after being closed while offline with a non-empty outbox.
 */
export function OfflineSyncManager() {
  useEffect(() => {
    void flushOutbox();
    window.addEventListener("online", flushOutbox);
    return () => window.removeEventListener("online", flushOutbox);
  }, []);

  return null;
}
