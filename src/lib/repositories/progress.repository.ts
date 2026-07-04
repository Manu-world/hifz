import { prisma } from "@/lib/db/client";
import { applyAnswerResult, MAX_BOX } from "@/lib/practice/scheduler";

export type DueWord = {
  id: string;
  categoryId: string;
  arabic: string;
  english: string;
  exampleArabic: string | null;
  exampleEnglish: string | null;
  progress: {
    box: number;
    dueAt: Date;
    correctCount: number;
    wrongCount: number;
    isDone: boolean;
  };
};

/**
 * Returns the practice pool for a category, most-overdue word first.
 *
 * Normal mode: only words that are not marked done and are currently due.
 * Revision mode ("Revise All", Phase 3): ignores both `isDone` and `dueAt`
 * and returns the full word set for the category, per the original spec.
 */
export async function getDueWords(
  categoryId: string,
  options?: { revise?: boolean },
): Promise<DueWord[]> {
  const revise = options?.revise ?? false;
  const now = new Date();

  const words = await prisma.vocabWord.findMany({
    where: {
      categoryId,
      ...(revise ? {} : { progress: { is: { isDone: false, dueAt: { lte: now } } } }),
    },
    include: { progress: true },
  });

  const withProgress = words.filter(
    (word): word is typeof word & { progress: NonNullable<typeof word.progress> } =>
      word.progress !== null,
  );

  // Most overdue (oldest dueAt) first. `sortByMostOverdue` in scheduler.ts
  // expects a flat `dueAt` field, but here it's nested under `progress`, so
  // sort inline rather than reusing that helper.
  return [...withProgress].sort((a, b) => a.progress.dueAt.getTime() - b.progress.dueAt.getTime());
}

/**
 * Records the result of a practice attempt: advances/resets the Leitner box,
 * pushes dueAt out (or to now, if wrong), and updates the attempt tallies.
 * Returns the box the word was in *before* this answer alongside the updated
 * progress, since XP weighting (harder/lower box = worth more) is priced off
 * the pre-answer difficulty, not the post-answer one.
 */
export async function recordAnswer(wordId: string, isCorrect: boolean) {
  const progress = await prisma.wordProgress.findUniqueOrThrow({ where: { wordId } });
  const { box, dueAt } = applyAnswerResult({ box: progress.box }, isCorrect);

  const updated = await prisma.wordProgress.update({
    where: { wordId },
    data: {
      box,
      dueAt,
      correctCount: { increment: isCorrect ? 1 : 0 },
      wrongCount: { increment: isCorrect ? 0 : 1 },
      lastSeenAt: new Date(),
    },
  });

  return { progress: updated, previousBox: progress.box };
}

/** Manual "I know this" toggle. Independent of box/dueAt. */
export async function setWordDone(wordId: string, isDone: boolean) {
  return prisma.wordProgress.update({
    where: { wordId },
    data: { isDone, doneAt: isDone ? new Date() : null },
  });
}

/** Total words considered mastered (manually done, or graduated to the top Leitner box). */
export async function getTotalMasteredCount(): Promise<number> {
  const rows = await prisma.wordProgress.findMany({ select: { isDone: true, box: true } });
  return rows.filter((row) => row.isDone || row.box >= MAX_BOX).length;
}
