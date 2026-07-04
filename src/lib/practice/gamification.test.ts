import { describe, expect, it } from "vitest";
import { awardXp, checkNewAchievements, levelFromXp } from "@/lib/practice/gamification";
import { MAX_BOX } from "@/lib/practice/scheduler";

describe("awardXp", () => {
  it("awards nothing for a wrong answer", () => {
    expect(awardXp(0, false)).toBe(0);
    expect(awardXp(MAX_BOX, false)).toBe(0);
  });

  it("weights lower boxes (harder words) higher than higher boxes", () => {
    const box0Xp = awardXp(0, true);
    const maxBoxXp = awardXp(MAX_BOX, true);
    expect(box0Xp).toBeGreaterThan(maxBoxXp);
  });

  it("clamps out-of-range boxes instead of throwing", () => {
    expect(() => awardXp(-1, true)).not.toThrow();
    expect(() => awardXp(MAX_BOX + 10, true)).not.toThrow();
  });

  it("adds a speed bonus for fast answers, scaled 0-1", () => {
    const noBonus = awardXp(0, true, 0);
    const fullBonus = awardXp(0, true, 1);
    expect(fullBonus).toBeGreaterThan(noBonus);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 xp", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("increases every 100 xp", () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
  });

  it("never returns a level below 1", () => {
    expect(levelFromXp(-50)).toBe(1);
  });
});

describe("checkNewAchievements", () => {
  it("unlocks first_session on the first completed session", () => {
    const result = checkNewAchievements([], {
      currentStreak: 1,
      totalMasteredCount: 0,
      sessionsCompleted: 1,
    });
    expect(result).toContain("first_session");
  });

  it("does not re-unlock an achievement already earned", () => {
    const result = checkNewAchievements(["first_session"], {
      currentStreak: 1,
      totalMasteredCount: 0,
      sessionsCompleted: 5,
    });
    expect(result).not.toContain("first_session");
  });

  it("unlocks streak_7 once the streak reaches 7 days", () => {
    const result = checkNewAchievements([], {
      currentStreak: 7,
      totalMasteredCount: 0,
      sessionsCompleted: 10,
    });
    expect(result).toContain("streak_7");
  });

  it("unlocks mastered_50 once 50 words are mastered", () => {
    const result = checkNewAchievements([], {
      currentStreak: 0,
      totalMasteredCount: 50,
      sessionsCompleted: 10,
    });
    expect(result).toContain("mastered_50");
  });

  it("unlocks word_rush_perfect only when the round was flagged perfect", () => {
    const notPerfect = checkNewAchievements([], {
      currentStreak: 0,
      totalMasteredCount: 0,
      sessionsCompleted: 1,
      wordRushPerfectRound: false,
    });
    expect(notPerfect).not.toContain("word_rush_perfect");

    const perfect = checkNewAchievements([], {
      currentStreak: 0,
      totalMasteredCount: 0,
      sessionsCompleted: 1,
      wordRushPerfectRound: true,
    });
    expect(perfect).toContain("word_rush_perfect");
  });

  it("can unlock multiple achievements in a single check", () => {
    const result = checkNewAchievements([], {
      currentStreak: 7,
      totalMasteredCount: 50,
      sessionsCompleted: 1,
    });
    expect(result).toEqual(expect.arrayContaining(["first_session", "streak_7", "mastered_50"]));
  });
});
