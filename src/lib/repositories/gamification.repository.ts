import { prisma } from "@/lib/db/client";
import { differenceInCalendarDays, startOfDay } from "date-fns";

const PROFILE_ID = "singleton";

async function getOrCreateProfile() {
  return prisma.gamificationProfile.upsert({
    where: { id: PROFILE_ID },
    update: {},
    create: { id: PROFILE_ID },
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
