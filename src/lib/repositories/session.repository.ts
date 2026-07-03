import { prisma } from "@/lib/db/client";
import type { PracticeMode } from "@/generated/prisma/client";

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
