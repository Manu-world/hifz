"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

// The server has no concept of connectivity; assume online so the initial
// render always matches (avoids a hydration mismatch if the client happens
// to already be offline when it hydrates).
function getServerSnapshot() {
  return true;
}

/** Tracks browser online/offline state, for a small "offline" UI indicator. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
