import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import * as sync from "./sync";

// The db connection is a module singleton (see db.ts), so instead of
// recreating it per test (which would hang on `deleteDatabase` while the
// previous connection is still open), each test starts from empty stores.
async function freshSync() {
  const db = await getDb();
  await db.clear("wordCache");
  await db.clear("outbox");
  return sync;
}

function mockFetchSequence(responses: Array<{ ok: boolean; json?: unknown }>) {
  let call = 0;
  return vi.fn(async () => {
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return {
      ok: response.ok,
      json: async () => response.json ?? {},
    } as Response;
  });
}

describe("offline outbox", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("does nothing when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const sync = await freshSync();
    await sync.queueAnswer({ wordId: "w1", isCorrect: true });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sync.flushOutbox();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("replays a queued answer once back online", async () => {
    const sync = await freshSync();
    await sync.queueAnswer({ wordId: "w1", isCorrect: true, awardXp: true, speedFraction: 0.5 });
    expect(await sync.getOutboxSize()).toBe(1);

    const fetchMock = mockFetchSequence([{ ok: true, json: { xpEarned: 5 } }]);
    vi.stubGlobal("fetch", fetchMock);

    await sync.flushOutbox();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/progress/answer",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await sync.getOutboxSize()).toBe(0);
  });

  it("stops at the first failure, preserving order for retry", async () => {
    const sync = await freshSync();
    await sync.queueAnswer({ wordId: "w1", isCorrect: true });
    await sync.queueAnswer({ wordId: "w2", isCorrect: false });

    const fetchMock = mockFetchSequence([{ ok: false }, { ok: true }]);
    vi.stubGlobal("fetch", fetchMock);

    await sync.flushOutbox();

    // First entry failed, so the second is never attempted and both remain queued.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await sync.getOutboxSize()).toBe(2);
  });

  it("replays a full offline session as create-then-end", async () => {
    const sync = await freshSync();
    await sync.queueFullSession({
      mode: "gamified",
      categoryId: "cat1",
      isRevision: false,
      wordsShown: 3,
      correctCount: 2,
      xpEarned: 12,
      wordRushPerfectRound: false,
    });

    const fetchMock = mockFetchSequence([
      { ok: true, json: { session: { id: "real-session-1" } } },
      { ok: true, json: { rewards: { newAchievements: [] } } },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await sync.flushOutbox();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/sessions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/sessions/real-session-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(await sync.getOutboxSize()).toBe(0);
  });

  it("caches and reads back the due-words queue for a category", async () => {
    const sync = await freshSync();
    await sync.cacheWords("cat1", [{ id: "w1" }], [{ id: "w2" }]);

    const cached = await sync.getCachedWords("cat1");

    expect(cached?.words).toEqual([{ id: "w1" }]);
    expect(cached?.pool).toEqual([{ id: "w2" }]);
  });
});
