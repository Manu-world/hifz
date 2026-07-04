import { getDb, type OutboxEntry } from "./db";

export async function cacheWords(categoryId: string, words: unknown[], pool?: unknown[]) {
  try {
    const db = await getDb();
    await db.put("wordCache", {
      categoryId,
      words,
      pool: pool ?? null,
      cachedAt: new Date().toISOString(),
    });
  } catch {
    // IndexedDB unavailable (e.g. private browsing) — caching is best-effort.
  }
}

export async function getCachedWords(categoryId: string) {
  try {
    const db = await getDb();
    return await db.get("wordCache", categoryId);
  } catch {
    return undefined;
  }
}

async function queue(entry: OutboxEntry) {
  try {
    const db = await getDb();
    await db.add("outbox", entry);
  } catch {
    // Nothing we can do without IndexedDB — the mutation is lost, same as it
    // would be if this were a plain offline fetch() failure without a queue.
  }
}

export function queueAnswer(payload: Extract<OutboxEntry, { type: "answer" }>["payload"]) {
  return queue({ type: "answer", payload, createdAt: new Date().toISOString() });
}

export function queueSessionEnd(
  sessionId: string,
  payload: Extract<OutboxEntry, { type: "sessionEnd" }>["payload"],
) {
  return queue({ type: "sessionEnd", sessionId, payload, createdAt: new Date().toISOString() });
}

export function queueFullSession(payload: Extract<OutboxEntry, { type: "session" }>["payload"]) {
  return queue({ type: "session", payload, createdAt: new Date().toISOString() });
}

export async function getOutboxSize(): Promise<number> {
  try {
    const db = await getDb();
    return await db.count("outbox");
  } catch {
    return 0;
  }
}

let flushing = false;

/**
 * Replays queued mutations against the real API, oldest first, stopping at
 * the first failure to preserve ordering (single-user app: last-write-wins
 * is fine once entries land, but they must land in the order they happened).
 * Safe to call opportunistically (on the `online` event, on mount) — it's a
 * no-op while offline or already running.
 */
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  flushing = true;
  try {
    const db = await getDb();
    const keys = await db.getAllKeys("outbox");
    for (const key of keys) {
      const entry = await db.get("outbox", key);
      if (!entry) continue;
      const ok = await replay(entry);
      if (!ok) break;
      await db.delete("outbox", key);
    }
  } catch {
    // IndexedDB unavailable — nothing queued, nothing to flush.
  } finally {
    flushing = false;
  }
}

async function replay(entry: OutboxEntry): Promise<boolean> {
  try {
    if (entry.type === "answer") {
      const res = await fetch("/api/progress/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      return res.ok;
    }

    if (entry.type === "sessionEnd") {
      const res = await fetch(`/api/sessions/${entry.sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      return res.ok;
    }

    // "session": the session never got a real id while offline, so replay
    // creates it and immediately closes it with the tally we collected.
    const { mode, categoryId, isRevision, ...tally } = entry.payload;
    const createRes = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, categoryId, isRevision }),
    });
    if (!createRes.ok) return false;
    const { session } = (await createRes.json()) as { session: { id: string } };

    const endRes = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tally),
    });
    return endRes.ok;
  } catch {
    return false;
  }
}
