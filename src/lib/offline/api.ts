// Offline-aware replacements for the raw `fetch()` calls practice sessions
// make. Each function tries the network first (so online behavior is
// unchanged) and only falls back to the IndexedDB cache/outbox when the
// request fails — typically because the device is offline.
"use client";

import { cacheWords, getCachedWords, queueAnswer, queueFullSession, queueSessionEnd } from "./sync";

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export async function fetchDueWords<TWord, TPool = never>(
  categoryId: string,
  opts: { revise?: boolean; mode?: "gamified" } = {},
): Promise<{ words: TWord[]; pool: TPool[]; fromCache: boolean }> {
  const params = new URLSearchParams({ categoryId });
  if (opts.revise) params.set("revise", "1");
  if (opts.mode) params.set("mode", opts.mode);

  if (!isOffline()) {
    try {
      const res = await fetch(`/api/words/due?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { words: TWord[]; pool?: TPool[] };
        await cacheWords(categoryId, data.words as unknown[], data.pool as unknown[] | undefined);
        return { words: data.words, pool: data.pool ?? [], fromCache: false };
      }
    } catch {
      // fall through to cache
    }
  }

  const cached = await getCachedWords(categoryId);
  return {
    words: (cached?.words as TWord[] | undefined) ?? [],
    pool: (cached?.pool as TPool[] | undefined) ?? [],
    fromCache: true,
  };
}

export type SessionHandle = {
  id: string;
  isLocal: boolean;
  mode: string;
  categoryId: string | null;
  isRevision: boolean;
};

export async function createSession(payload: {
  mode: string;
  categoryId: string | null;
  isRevision: boolean;
}): Promise<SessionHandle> {
  if (!isOffline()) {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { session } = (await res.json()) as { session: { id: string } };
        return { id: session.id, isLocal: false, ...payload };
      }
    } catch {
      // fall through to local placeholder
    }
  }

  return { id: `local:${crypto.randomUUID()}`, isLocal: true, ...payload };
}

/**
 * Recall/Reverse award 0 XP by design; only Gamified mode sets `awardXp`.
 * Offline, we can't compute the authoritative box-weighted XP (that lives in
 * the DB), so the queued answer just returns 0 — the real value lands once
 * the outbox syncs and the server recomputes it from the then-current box.
 */
export async function submitAnswer(payload: {
  wordId: string;
  isCorrect: boolean;
  awardXp?: boolean;
  speedFraction?: number;
}): Promise<{ xpEarned: number }> {
  if (!isOffline()) {
    try {
      const res = await fetch("/api/progress/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()) as { xpEarned: number };
      }
    } catch {
      // fall through to queue
    }
  }

  await queueAnswer(payload);
  return { xpEarned: 0 };
}

export async function endSession(
  session: SessionHandle,
  payload: {
    wordsShown: number;
    correctCount: number;
    xpEarned: number;
    wordRushPerfectRound?: boolean;
  },
): Promise<{ rewards?: { newAchievements: string[] } }> {
  if (!session.isLocal && !isOffline()) {
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()) as { rewards?: { newAchievements: string[] } };
      }
    } catch {
      // fall through to queue
    }
  }

  if (session.isLocal) {
    await queueFullSession({
      mode: session.mode,
      categoryId: session.categoryId,
      isRevision: session.isRevision,
      ...payload,
    });
  } else {
    await queueSessionEnd(session.id, payload);
  }
  return {};
}
