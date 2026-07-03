// Leitner-box spaced-repetition scheduler shared by all practice modes.
// See /memories/repo/original-prd.md section 5 for the exact spec this implements.

/** Box intervals in days: index 0 = same-day, then 1, 3, 7, 16, 35. Literal from spec. */
export const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 16, 35] as const;
export const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;

/** Correct answer: move up a box (capped at the last box). */
export function nextBoxOnCorrect(currentBox: number): number {
  return Math.min(currentBox + 1, MAX_BOX);
}

/** Wrong answer: drop back to box 0 for a near-term review. */
export function nextBoxOnWrong(): number {
  return 0;
}

/** Computes the next due date for a box, `days` after `now`. */
export function computeDueAt(box: number, now: Date = new Date()): Date {
  const days = BOX_INTERVALS_DAYS[box] ?? 0;
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  return due;
}

export type ScheduleResult = { box: number; dueAt: Date };

/** Applies an answer result to a word's current box, returning its new box + dueAt. */
export function applyAnswerResult(
  current: { box: number },
  isCorrect: boolean,
  now: Date = new Date(),
): ScheduleResult {
  const box = isCorrect ? nextBoxOnCorrect(current.box) : nextBoxOnWrong();
  return { box, dueAt: computeDueAt(box, now) };
}

export function isDue(dueAt: Date, now: Date = new Date()): boolean {
  return dueAt.getTime() <= now.getTime();
}

/** Sorts words by due date ascending, so the most overdue word comes first. */
export function sortByMostOverdue<T extends { dueAt: Date }>(words: T[]): T[] {
  return [...words].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
