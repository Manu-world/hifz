// Builds the personal data-backup payload (PRD section 8: "export all vocab
// + progress as JSON"). Composes existing repository reads rather than
// querying Prisma directly, keeping the DB access layer centralized.

import { listCategories } from "@/lib/repositories/category.repository";
import { listAllWords } from "@/lib/repositories/word.repository";
import { listAllSessions } from "@/lib/repositories/session.repository";
import { getGamificationProfile } from "@/lib/repositories/gamification.repository";

export type BackupData = {
  exportedAt: string;
  version: 1;
  categories: { id: string; name: string; createdAt: string }[];
  words: {
    id: string;
    categoryId: string;
    arabic: string;
    english: string;
    exampleArabic: string | null;
    exampleEnglish: string | null;
    createdAt: string;
    progress: {
      box: number;
      dueAt: string;
      correctCount: number;
      wrongCount: number;
      isDone: boolean;
      doneAt: string | null;
      lastSeenAt: string | null;
    } | null;
  }[];
  sessions: {
    id: string;
    mode: string;
    categoryId: string | null;
    isRevision: boolean;
    startedAt: string;
    endedAt: string | null;
    wordsShown: number;
    correctCount: number;
    xpEarned: number;
  }[];
  gamificationProfile: {
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    lastPracticedDate: string | null;
    achievements: unknown;
  };
};

export async function buildBackup(): Promise<BackupData> {
  const [categories, words, sessions, profile] = await Promise.all([
    listCategories(),
    listAllWords(),
    listAllSessions(),
    getGamificationProfile(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt.toISOString(),
    })),
    words: words.map((w) => ({
      id: w.id,
      categoryId: w.categoryId,
      arabic: w.arabic,
      english: w.english,
      exampleArabic: w.exampleArabic,
      exampleEnglish: w.exampleEnglish,
      createdAt: w.createdAt.toISOString(),
      progress: w.progress
        ? {
            box: w.progress.box,
            dueAt: w.progress.dueAt.toISOString(),
            correctCount: w.progress.correctCount,
            wrongCount: w.progress.wrongCount,
            isDone: w.progress.isDone,
            doneAt: w.progress.doneAt?.toISOString() ?? null,
            lastSeenAt: w.progress.lastSeenAt?.toISOString() ?? null,
          }
        : null,
    })),
    sessions: sessions.map((s) => ({
      id: s.id,
      mode: s.mode,
      categoryId: s.categoryId,
      isRevision: s.isRevision,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      wordsShown: s.wordsShown,
      correctCount: s.correctCount,
      xpEarned: s.xpEarned,
    })),
    gamificationProfile: {
      xp: profile.xp,
      level: profile.level,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      lastPracticedDate: profile.lastPracticedDate?.toISOString() ?? null,
      achievements: profile.achievements,
    },
  };
}
