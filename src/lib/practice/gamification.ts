// XP, leveling, and achievement rules for Gamified Mode (PRD section 7).
// Recall/Reverse sessions intentionally award 0 XP (see README "Known
// Assumptions") — this module is exercised by the gamified sub-games and by
// the session-end achievement check, which runs for every mode since streak
// and mastery-based achievements aren't gamified-mode-specific.

import { MAX_BOX } from "./scheduler";

const BASE_XP = 5;

/**
 * XP for a correct answer, weighted by box: a box-0 word (the hardest, most
 * error-prone) is worth `(MAX_BOX + 1) * BASE_XP`; the top box is worth just
 * `BASE_XP`. Wrong answers earn nothing — XP rewards actually knowing the
 * word, not attempts. An optional 0-1 `speedFraction` (fraction of the time
 * limit remaining) adds a small bonus for fast recall, used by Word Rush.
 */
export function awardXp(box: number, isCorrect: boolean, speedFraction = 0): number {
  if (!isCorrect) return 0;
  const clampedBox = Math.min(Math.max(box, 0), MAX_BOX);
  const base = (MAX_BOX + 1 - clampedBox) * BASE_XP;
  const speedBonus = Math.round(Math.min(Math.max(speedFraction, 0), 1) * BASE_XP);
  return base + speedBonus;
}

const XP_PER_LEVEL = 100;

/** Simple linear leveling curve: every 100 XP is a new level, starting at level 1. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(xp, 0) / XP_PER_LEVEL) + 1;
}

export const ACHIEVEMENTS = {
  first_session: "First practice session",
  streak_7: "7-day streak",
  mastered_50: "50 words mastered",
  word_rush_perfect: "Perfect Word Rush round",
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;

export type AchievementCheckInput = {
  currentStreak: number;
  totalMasteredCount: number;
  sessionsCompleted: number;
  wordRushPerfectRound?: boolean;
};

/** Returns achievement ids newly earned this check, excluding ones already unlocked. */
export function checkNewAchievements(
  alreadyUnlocked: string[],
  input: AchievementCheckInput,
): AchievementId[] {
  const has = (id: AchievementId) => alreadyUnlocked.includes(id);
  const newlyUnlocked: AchievementId[] = [];

  if (!has("first_session") && input.sessionsCompleted >= 1) newlyUnlocked.push("first_session");
  if (!has("streak_7") && input.currentStreak >= 7) newlyUnlocked.push("streak_7");
  if (!has("mastered_50") && input.totalMasteredCount >= 50) newlyUnlocked.push("mastered_50");
  if (!has("word_rush_perfect") && input.wordRushPerfectRound) {
    newlyUnlocked.push("word_rush_perfect");
  }

  return newlyUnlocked;
}
