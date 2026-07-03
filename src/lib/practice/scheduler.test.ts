import { describe, expect, it } from "vitest";
import {
  applyAnswerResult,
  BOX_INTERVALS_DAYS,
  computeDueAt,
  isDue,
  MAX_BOX,
  nextBoxOnCorrect,
  nextBoxOnWrong,
  sortByMostOverdue,
} from "@/lib/practice/scheduler";

describe("nextBoxOnCorrect", () => {
  it("moves up a box", () => {
    expect(nextBoxOnCorrect(0)).toBe(1);
    expect(nextBoxOnCorrect(2)).toBe(3);
  });

  it("caps at the max box", () => {
    expect(nextBoxOnCorrect(MAX_BOX)).toBe(MAX_BOX);
    expect(nextBoxOnCorrect(MAX_BOX + 5)).toBe(MAX_BOX);
  });
});

describe("nextBoxOnWrong", () => {
  it("always drops back to box 0", () => {
    expect(nextBoxOnWrong()).toBe(0);
  });
});

describe("computeDueAt", () => {
  it("adds the correct number of days for each box", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    BOX_INTERVALS_DAYS.forEach((days, box) => {
      const due = computeDueAt(box, now);
      const expected = new Date(now);
      expected.setDate(expected.getDate() + days);
      expect(due.getTime()).toBe(expected.getTime());
    });
  });
});

describe("applyAnswerResult", () => {
  it("on correct: moves up a box and pushes dueAt out", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = applyAnswerResult({ box: 0 }, true, now);
    expect(result.box).toBe(1);
    expect(result.dueAt.getTime()).toBe(computeDueAt(1, now).getTime());
  });

  it("on wrong: drops to box 0 with dueAt = now", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = applyAnswerResult({ box: 4 }, false, now);
    expect(result.box).toBe(0);
    expect(result.dueAt.getTime()).toBe(now.getTime());
  });
});

describe("isDue", () => {
  it("returns true when dueAt is in the past or now", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(isDue(new Date("2025-12-31T00:00:00.000Z"), now)).toBe(true);
    expect(isDue(now, now)).toBe(true);
  });

  it("returns false when dueAt is in the future", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(isDue(new Date("2026-01-02T00:00:00.000Z"), now)).toBe(false);
  });
});

describe("sortByMostOverdue", () => {
  it("sorts ascending by dueAt (most overdue/oldest first)", () => {
    const words = [
      { id: "b", dueAt: new Date("2026-01-03T00:00:00.000Z") },
      { id: "a", dueAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: "c", dueAt: new Date("2026-01-02T00:00:00.000Z") },
    ];
    expect(sortByMostOverdue(words).map((w) => w.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the input array", () => {
    const words = [
      { id: "b", dueAt: new Date("2026-01-03T00:00:00.000Z") },
      { id: "a", dueAt: new Date("2026-01-01T00:00:00.000Z") },
    ];
    const original = [...words];
    sortByMostOverdue(words);
    expect(words).toEqual(original);
  });
});
