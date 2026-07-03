import { describe, expect, it } from "vitest";
import { parseVocabCsv } from "@/lib/services/csv-parser";

describe("parseVocabCsv", () => {
  it("parses a well-formed CSV with all four columns", () => {
    const csv = [
      "Arabic Verb,English Meaning,Arabic Example,English Example",
      "يذهب,To go,انا اذهب الى السوق,I go to the market",
      "يجيء / ياتي,To come,هو يجيء كل يوم,He comes every day",
    ].join("\n");

    const result = parseVocabCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.invalidRows).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      arabic: "يذهب",
      english: "To go",
      exampleArabic: "انا اذهب الى السوق",
      exampleEnglish: "I go to the market",
    });
    expect(result.rows[1].arabic).toBe("يجيء / ياتي");
  });

  it("treats missing example columns/cells as null", () => {
    const csv = ["Arabic,English", "كتاب,Book"].join("\n");
    const result = parseVocabCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows[0]).toEqual({
      arabic: "كتاب",
      english: "Book",
      exampleArabic: null,
      exampleEnglish: null,
    });
  });

  it("is case-insensitive and order-flexible on headers", () => {
    const csv = ["english meaning,arabic verb", "to write,يكتب"].join("\n");
    const result = parseVocabCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows[0]).toEqual({
      arabic: "يكتب",
      english: "to write",
      exampleArabic: null,
      exampleEnglish: null,
    });
  });

  it("trims whitespace and ignores blank rows", () => {
    const csv = ["Arabic,English", "  كتاب  ,  Book  ", "", "   ,   "].join("\n");
    const result = parseVocabCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].arabic).toBe("كتاب");
    expect(result.rows[0].english).toBe("Book");
  });

  it("flags rows missing a required field as invalid instead of aborting", () => {
    const csv = ["Arabic,English", "كتاب,Book", ",Missing arabic", "قلم,"].join("\n");
    const result = parseVocabCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(2);
    expect(result.invalidRows[0].reason).toBe("Missing Arabic word");
    expect(result.invalidRows[1].reason).toBe("Missing English meaning");
  });

  it("returns an error when required columns can't be detected", () => {
    const csv = ["Foo,Bar", "1,2"].join("\n");
    const result = parseVocabCsv(csv);
    expect(result.ok).toBe(false);
  });
});
