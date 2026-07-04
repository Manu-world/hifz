// IndexedDB schema for offline practice (PRD section 1/6). Two stores:
//  - wordCache: last-fetched due-word queue per category, used as a
//    read-through fallback when the network is unavailable.
//  - outbox: pending mutations queued while offline, flushed FIFO once back
//    online (see sync.ts).
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type OutboxEntry =
  | {
      type: "answer";
      payload: { wordId: string; isCorrect: boolean; awardXp?: boolean; speedFraction?: number };
      createdAt: string;
    }
  | {
      type: "sessionEnd";
      sessionId: string;
      payload: {
        wordsShown: number;
        correctCount: number;
        xpEarned: number;
        wordRushPerfectRound?: boolean;
      };
      createdAt: string;
    }
  | {
      type: "session";
      payload: {
        mode: string;
        categoryId: string | null;
        isRevision: boolean;
        wordsShown: number;
        correctCount: number;
        xpEarned: number;
        wordRushPerfectRound?: boolean;
      };
      createdAt: string;
    };

interface HifzDB extends DBSchema {
  wordCache: {
    key: string;
    value: { categoryId: string; words: unknown[]; pool: unknown[] | null; cachedAt: string };
  };
  outbox: {
    key: number;
    value: OutboxEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<HifzDB>> | null = null;

export function getDb() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is not available."));
  }
  if (!dbPromise) {
    dbPromise = openDB<HifzDB>("hifz-offline", 1, {
      upgrade(db) {
        db.createObjectStore("wordCache", { keyPath: "categoryId" });
        db.createObjectStore("outbox", { autoIncrement: true });
      },
    });
  }
  return dbPromise;
}
