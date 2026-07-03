// Shared answer-matching utility used by Recall and Reverse practice modes.
// See /memories/repo/original-prd.md section 4 for the exact spec this implements.

export type MatchSide = "arabic" | "english";

const TASHKEEL_PATTERN = /[\u064B-\u0652]/g;
const ALEF_VARIANTS_PATTERN = /[أإآ]/g;
const LEADING_TO_PATTERN = /^to\s+/;

/**
 * Normalizes an English string for comparison: lowercase, trim, and strip a
 * leading "to " (so "go" and "to go" both count as the same answer).
 */
export function normalizeEnglish(value: string): string {
  return value.trim().toLowerCase().replace(LEADING_TO_PATTERN, "").trim();
}

/**
 * Normalizes an Arabic string for comparison:
 *  - strips diacritics/tashkeel (\u064B-\u0652)
 *  - normalizes alef forms (أ, إ, آ → ا)
 *  - normalizes ta marbuta/ha (ة ↔ ه) as equivalent
 */
export function normalizeArabic(value: string): string {
  return value
    .trim()
    .replace(TASHKEEL_PATTERN, "")
    .replace(ALEF_VARIANTS_PATTERN, "ا")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

function normalizeFor(side: MatchSide, value: string): string {
  return side === "english" ? normalizeEnglish(value) : normalizeArabic(value);
}

/**
 * Splits a stored field (which may contain "/" or "," separated synonyms)
 * into individual candidate answers.
 */
export function splitSynonyms(storedAnswer: string, side: MatchSide): string[] {
  const delimiter = side === "english" ? /[/,]/ : /\//;
  return storedAnswer
    .split(delimiter)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Checks whether `input` matches any synonym of `storedAnswer`, after
 * side-appropriate normalization. Comparison is always case-insensitive
 * (English) and diacritic-insensitive (Arabic).
 */
export function normalizeAndMatch(input: string, storedAnswer: string, side: MatchSide): boolean {
  const normalizedInput = normalizeFor(side, input);
  if (!normalizedInput) return false;

  return splitSynonyms(storedAnswer, side)
    .map((option) => normalizeFor(side, option))
    .includes(normalizedInput);
}
