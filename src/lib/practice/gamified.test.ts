import { describe, expect, it } from "vitest";
import {
  blankSentence,
  buildWordRushOptions,
  comboMultiplier,
  firstSynonym,
  pickDistractors,
  pickSubGame,
} from "@/lib/practice/gamified";

describe("pickSubGame", () => {
  it("rotates word rush, type sprint, sentence weaver in order", () => {
    const options = { hasExample: true, poolSize: 10 };
    expect(pickSubGame(0, options)).toBe("wordRush");
    expect(pickSubGame(1, options)).toBe("typeSprint");
    expect(pickSubGame(2, options)).toBe("sentenceWeaver");
    expect(pickSubGame(3, options)).toBe("wordRush");
  });

  it("falls back to type sprint for sentence weaver without an example", () => {
    expect(pickSubGame(2, { hasExample: false, poolSize: 10 })).toBe("typeSprint");
  });

  it("falls back to type sprint for word rush without enough distractors", () => {
    expect(pickSubGame(0, { hasExample: true, poolSize: 2 })).toBe("typeSprint");
  });
});

describe("firstSynonym", () => {
  it("returns the first option from a synonym list", () => {
    expect(firstSynonym("To come/To arrive")).toBe("To come");
  });

  it("returns the value unchanged when there is no synonym delimiter", () => {
    expect(firstSynonym("To go")).toBe("To go");
  });
});

describe("pickDistractors", () => {
  const pool = [
    { english: "To eat" },
    { english: "To drink" },
    { english: "To sleep" },
    { english: "To go" },
  ];

  it("excludes the correct answer from the distractor pool", () => {
    const distractors = pickDistractors("To go", pool);
    expect(distractors).not.toContain("To go");
  });

  it("returns at most `count` distractors", () => {
    expect(pickDistractors("To go", pool, 3)).toHaveLength(3);
  });

  it("returns fewer distractors when the pool is too small", () => {
    expect(pickDistractors("To go", [{ english: "To eat" }])).toHaveLength(1);
  });
});

describe("buildWordRushOptions", () => {
  const pool = [{ english: "To eat" }, { english: "To drink" }, { english: "To sleep" }];

  it("includes the correct answer among the options", () => {
    const options = buildWordRushOptions("To go", pool);
    expect(options).toContain("To go");
  });

  it("returns up to 4 unique options", () => {
    const options = buildWordRushOptions("To go", pool);
    expect(options.length).toBeLessThanOrEqual(4);
    expect(new Set(options).size).toBe(options.length);
  });
});

describe("blankSentence", () => {
  it("blanks the exact word when found in the sentence", () => {
    const result = blankSentence("انا اذهب الى السوق", "اذهب");
    expect(result.found).toBe(true);
    expect(result.text).toBe("انا ____ الى السوق");
  });

  it("tries each synonym variant separated by '/'", () => {
    const result = blankSentence("هو يجيء كل يوم", "يذهب / يجيء");
    expect(result.found).toBe(true);
    expect(result.text).toBe("هو ____ كل يوم");
  });

  it("falls back to the unblanked sentence when no variant matches", () => {
    const result = blankSentence("جملة أخرى بالكامل", "غير موجود");
    expect(result.found).toBe(false);
    expect(result.text).toBe("جملة أخرى بالكامل");
  });
});

describe("comboMultiplier", () => {
  it("is 1x with no combo", () => {
    expect(comboMultiplier(0)).toBe(1);
  });

  it("grows with combo count, capped at 5", () => {
    expect(comboMultiplier(3)).toBeCloseTo(1.3);
    expect(comboMultiplier(5)).toBeCloseTo(1.5);
    expect(comboMultiplier(50)).toBeCloseTo(1.5);
  });
});
