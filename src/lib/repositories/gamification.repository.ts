import { prisma } from "@/lib/db/client";
import { differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";
import { checkNewAchievements, levelFromXp, type AchievementId } from "@/lib/practice/gamification";
import { getTotalMasteredCount } from "@/lib/repositories/progress.repository";

const PROFILE_ID = "singleton";

async function getOrCreateProfile() {
  return prisma.gamificationProfile.upsert({
    where: { id: PROFILE_ID },
    update: {},
    create: { id: PROFILE_ID },
  });
}

/** Read-only accessor for the dashboard — same singleton row `recordPracticeActivity` writes to. */
export async function getGamificationProfile() {
  return getOrCreateProfile();
}

export type SessionRewardsResult = {
  xp: number;
  level: number;
  leveledUp: boolean;
  newAchievements: AchievementId[];
};

/**
 * Applies session-end rewards to the singleton profile: adds XP, recomputes
 * level, and checks for newly unlocked achievements. Runs for every practice
 * mode (not just Gamified) since streak/mastery achievements aren't
 * mode-specific — Recall/Reverse pass `xpEarned: 0` per the documented
 * assumption that only Gamified mode grants XP. Call this *after*
 * `endSessionLog` so the just-finished session is already counted in
 * `sessionsCompleted`.
 */
export async function applySessionRewards(
  xpEarned: number,
  options?: { wordRushPerfectRound?: boolean },
): Promise<SessionRewardsResult> {
  const profile = await getOrCreateProfile();
  const [totalMasteredCount, sessionsCompleted] = await Promise.all([
    getTotalMasteredCount(),
    prisma.sessionLog.count({ where: { endedAt: { not: null } } }),
  ]);

  const existingAchievements = Array.isArray(profile.achievements)
    ? (profile.achievements as string[])
    : [];

  const newAchievements = checkNewAchievements(existingAchievements, {
    currentStreak: profile.currentStreak,
    totalMasteredCount,
    sessionsCompleted,
    wordRushPerfectRound: options?.wordRushPerfectRound,
  });

  const xp = profile.xp + xpEarned;
  const level = levelFromXp(xp);

  await prisma.gamificationProfile.update({
    where: { id: PROFILE_ID },
    data: { xp, level, achievements: [...existingAchievements, ...newAchievements] },
  });

  return { xp, level, leveledUp: level > profile.level, newAchievements };
}

export type MasteredOverTimePoint = { date: string; masteredCount: number };

/**
 * Daily count of words marked done (via `WordProgress.doneAt`) over the last
 * `days` days, for the dashboard's "words mastered over time" chart. Bucketed
 * in JS rather than a SQL date-trunc, since Prisma's SQLite connector doesn't
 * expose one portably.
 */
export async function getMasteredOverTime(days = 30): Promise<MasteredOverTimePoint[]> {
  const since = startOfDay(subDays(new Date(), days - 1));
  const rows = await prisma.wordProgress.findMany({
    where: { doneAt: { gte: since } },
    select: { doneAt: true },
  });

  const counts = new Map<string, number>();
  for (const { doneAt } of rows) {
    if (!doneAt) continue;
    const key = format(doneAt, "yyyy-MM-dd");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    const key = format(date, "yyyy-MM-dd");
    return { date: key, masteredCount: counts.get(key) ?? 0 };
  });
}

/**
 * Records that the user practiced "today" (any mode counts, per spec section
 * 7 — the daily streak is not gamified-mode-specific). Bumps the streak if
 * the last practice was yesterday, resets it to 1 if there's a gap, and
 * leaves it untouched if today was already counted.
 *
 * Assumption: Recall/Reverse do not award XP (XP is introduced with the
 * Gamified mode in a later phase), but they DO count toward the streak.
 */
export async function recordPracticeActivity(now: Date = new Date()) {
  const profile = await getOrCreateProfile();

  if (!profile.lastPracticedDate) {
    return prisma.gamificationProfile.update({
      where: { id: PROFILE_ID },
      data: {
        currentStreak: 1,
        longestStreak: Math.max(1, profile.longestStreak),
        lastPracticedDate: now,
      },
    });
  }

  const dayDiff = differenceInCalendarDays(startOfDay(now), startOfDay(profile.lastPracticedDate));
  if (dayDiff === 0) return profile; // already counted today

  const currentStreak = dayDiff === 1 ? profile.currentStreak + 1 : 1;
  const longestStreak = Math.max(profile.longestStreak, currentStreak);

  return prisma.gamificationProfile.update({
    where: { id: PROFILE_ID },
    data: { currentStreak, longestStreak, lastPracticedDate: now },
  });
}
