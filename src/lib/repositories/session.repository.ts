import { prisma } from "@/lib/db/client";
import type { PracticeMode } from "@/generated/prisma/client";
import { format, startOfDay, subDays } from "date-fns";

/** Opens a new SessionLog row when a practice session actually starts (non-empty queue). */
export async function createSessionLog(
  mode: PracticeMode,
  categoryId: string | null,
  isRevision = false,
) {
  return prisma.sessionLog.create({
    data: { mode, categoryId, isRevision },
  });
}

/** Closes out a SessionLog with final tallies once the practice session ends. */
export async function endSessionLog(
  id: string,
  data: { wordsShown: number; correctCount: number; xpEarned: number },
) {
  return prisma.sessionLog.update({
    where: { id },
    data: { ...data, endedAt: new Date() },
  });
}

/** Every session log ever recorded — used for the full JSON data export. */
export async function listAllSessions() {
  return prisma.sessionLog.findMany({ orderBy: { startedAt: "asc" } });
}

export type AccuracyTrendPoint = { date: string; accuracyPct: number | null; wordsShown: number };

/**
 * Daily accuracy (%) across all completed sessions over the last `days`
 * days, for the dashboard's accuracy trend chart. Days with no completed
 * sessions get `accuracyPct: null` so the chart can show a gap rather than a
 * misleading 0%.
 */
export async function getAccuracyTrend(days = 30): Promise<AccuracyTrendPoint[]> {
  const since = startOfDay(subDays(new Date(), days - 1));
  const sessions = await prisma.sessionLog.findMany({
    where: { endedAt: { not: null }, startedAt: { gte: since } },
    select: { startedAt: true, correctCount: true, wordsShown: true },
  });

  const byDay = new Map<string, { correct: number; shown: number }>();
  for (const session of sessions) {
    const key = format(session.startedAt, "yyyy-MM-dd");
    const entry = byDay.get(key) ?? { correct: 0, shown: 0 };
    entry.correct += session.correctCount;
    entry.shown += session.wordsShown;
    byDay.set(key, entry);
  }

  return Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    const key = format(date, "yyyy-MM-dd");
    const entry = byDay.get(key);
    return {
      date: key,
      wordsShown: entry?.shown ?? 0,
      accuracyPct:
        entry && entry.shown > 0 ? Math.round((entry.correct / entry.shown) * 100) : null,
    };
  });
}
