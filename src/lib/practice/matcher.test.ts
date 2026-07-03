import { describe, expect, it } from "vitest";
import {
  normalizeAndMatch,
  normalizeArabic,
  normalizeEnglish,
  splitSynonyms,
} from "@/lib/practice/matcher";

describe("normalizeEnglish", () => {
  it("lowercases and trims", () => {
    expect(normalizeEnglish("  To Go  ")).toBe("go");
  });

  it("strips a leading 'to ' from the value", () => {
    expect(normalizeEnglish("to write")).toBe("write");
    expect(normalizeEnglish("write")).toBe("write");
  });
});

describe("normalizeArabic", () => {
  it("strips diacritics/tashkeel", () => {
    expect(normalizeArabic("يَذْهَبُ")).toBe("يذهب");
  });

  it("normalizes alef forms to ا", () => {
    expect(normalizeArabic("أحمد")).toBe("احمد");
    expect(normalizeArabic("إحسان")).toBe("احسان");
    expect(normalizeArabic("آدم")).toBe("ادم");
  });

  it("treats ta marbuta and ha as equivalent", () => {
    expect(normalizeArabic("مدرسة")).toBe(normalizeArabic("مدرسه"));
  });
});

describe("splitSynonyms", () => {
  it("splits English on '/' or ','", () => {
    expect(splitSynonyms("To stand / rise", "english")).toEqual(["To stand", "rise"]);
    expect(splitSynonyms("go, leave", "english")).toEqual(["go", "leave"]);
  });

  it("splits Arabic only on '/'", () => {
    expect(splitSynonyms("يجيء / ياتي", "arabic")).toEqual(["يجيء", "ياتي"]);
  });
});

describe("normalizeAndMatch", () => {
  it("matches English regardless of a leading 'to' on either side", () => {
    expect(normalizeAndMatch("go", "To go", "english")).toBe(true);
    expect(normalizeAndMatch("to go", "go", "english")).toBe(true);
  });

  it("matches any English synonym", () => {
    expect(normalizeAndMatch("rise", "To stand / rise", "english")).toBe(true);
    expect(normalizeAndMatch("stand", "To stand / rise", "english")).toBe(true);
    expect(normalizeAndMatch("sit", "To stand / rise", "english")).toBe(false);
  });

  it("is case-insensitive for English", () => {
    expect(normalizeAndMatch("GO", "to go", "english")).toBe(true);
  });

  it("matches Arabic ignoring diacritics", () => {
    expect(normalizeAndMatch("يذهب", "يَذْهَبُ", "arabic")).toBe(true);
  });

  it("matches any Arabic synonym", () => {
    expect(normalizeAndMatch("ياتي", "يجيء / ياتي", "arabic")).toBe(true);
    expect(normalizeAndMatch("يجيء", "يجيء / ياتي", "arabic")).toBe(true);
    expect(normalizeAndMatch("يكتب", "يجيء / ياتي", "arabic")).toBe(false);
  });

  it("treats alef variants and ta marbuta/ha as equivalent in Arabic", () => {
    expect(normalizeAndMatch("احمد", "أحمد", "arabic")).toBe(true);
    expect(normalizeAndMatch("مدرسه", "مدرسة", "arabic")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(normalizeAndMatch("", "go", "english")).toBe(false);
    expect(normalizeAndMatch("   ", "يذهب", "arabic")).toBe(false);
  });
});
