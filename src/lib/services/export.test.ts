import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/category.repository", () => ({
  listCategories: vi.fn(async () => [
    { id: "cat1", name: "Animals", createdAt: new Date("2026-01-01T00:00:00.000Z") },
  ]),
}));

vi.mock("@/lib/repositories/word.repository", () => ({
  listAllWords: vi.fn(async () => [
    {
      id: "w1",
      categoryId: "cat1",
      arabic: "قطة",
      english: "Cat",
      exampleArabic: null,
      exampleEnglish: null,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      progress: {
        box: 2,
        dueAt: new Date("2026-01-10T00:00:00.000Z"),
        correctCount: 3,
        wrongCount: 1,
        isDone: false,
        doneAt: null,
        lastSeenAt: new Date("2026-01-05T00:00:00.000Z"),
      },
    },
    {
      id: "w2",
      categoryId: "cat1",
      arabic: "كلب",
      english: "Dog",
      exampleArabic: "الكلب يجري",
      exampleEnglish: "The dog runs",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      progress: null,
    },
  ]),
}));

vi.mock("@/lib/repositories/session.repository", () => ({
  listAllSessions: vi.fn(async () => [
    {
      id: "s1",
      mode: "recall",
      categoryId: "cat1",
      isRevision: false,
      startedAt: new Date("2026-01-05T00:00:00.000Z"),
      endedAt: new Date("2026-01-05T00:05:00.000Z"),
      wordsShown: 5,
      correctCount: 4,
      xpEarned: 12,
    },
  ]),
}));

vi.mock("@/lib/repositories/gamification.repository", () => ({
  getGamificationProfile: vi.fn(async () => ({
    xp: 120,
    level: 2,
    currentStreak: 3,
    longestStreak: 5,
    lastPracticedDate: new Date("2026-01-05T00:00:00.000Z"),
    achievements: ["first_session"],
  })),
}));

const { buildBackup } = await import("./export");

describe("buildBackup", () => {
  it("serializes all dates to ISO strings", async () => {
    const backup = await buildBackup();

    expect(backup.categories[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(backup.words[0].progress?.dueAt).toBe("2026-01-10T00:00:00.000Z");
    expect(backup.sessions[0].startedAt).toBe("2026-01-05T00:00:00.000Z");
    expect(backup.gamificationProfile.lastPracticedDate).toBe("2026-01-05T00:00:00.000Z");
  });

  it("keeps null progress/timestamps as null rather than throwing", async () => {
    const backup = await buildBackup();

    const wordWithoutProgress = backup.words.find((w) => w.id === "w2");
    expect(wordWithoutProgress?.progress).toBeNull();
    expect(backup.words[0].progress?.doneAt).toBeNull();
  });

  it("stamps the export with the current time and a version", async () => {
    const before = Date.now();
    const backup = await buildBackup();
    const after = Date.now();

    expect(backup.version).toBe(1);
    const exportedAtMs = new Date(backup.exportedAt).getTime();
    expect(exportedAtMs).toBeGreaterThanOrEqual(before);
    expect(exportedAtMs).toBeLessThanOrEqual(after);
  });
});
