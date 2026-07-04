// Pure helpers for Gamified Mode's sub-game rotation, distractor selection,
// and Sentence Weaver blanking. Kept side-effect free so they're easy to
// unit test; the session UI (gamified-session.tsx) owns timers/state.

import { splitSynonyms } from "./matcher";

export type SubGame = "wordRush" | "typeSprint" | "sentenceWeaver";

const ROTATION: SubGame[] = ["wordRush", "typeSprint", "sentenceWeaver"];

/**
 * Rotates through the three sub-games by question index, falling back to
 * Type Sprint when a word can't support the rotated game: Sentence Weaver
 * needs an example sentence, Word Rush needs at least 3 other words in the
 * category to build 4 distinct multiple-choice options.
 */
export function pickSubGame(
  index: number,
  options: { hasExample: boolean; poolSize: number },
): SubGame {
  const game = ROTATION[index % ROTATION.length];
  if (game === "sentenceWeaver" && !options.hasExample) return "typeSprint";
  if (game === "wordRush" && options.poolSize < 4) return "typeSprint";
  return game;
}

/** First synonym in a "/"-or-","-separated field, for display as a single MCQ option. */
export function firstSynonym(value: string): string {
  return splitSynonyms(value, "english")[0] ?? value.trim();
}

/** Fisher-Yates shuffle; does not mutate the input. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Picks up to `count` distinct English distractors from other pool words, excluding the correct answer. */
export function pickDistractors(
  correctEnglish: string,
  pool: { english: string }[],
  count = 3,
): string[] {
  const correct = firstSynonym(correctEnglish).toLowerCase();
  const candidates = Array.from(
    new Set(
      pool.map((w) => firstSynonym(w.english)).filter((text) => text.toLowerCase() !== correct),
    ),
  );
  return shuffle(candidates).slice(0, count);
}

/** Builds a shuffled Word Rush option list: the correct answer plus up to 3 distractors. */
export function buildWordRushOptions(
  correctEnglish: string,
  pool: { english: string }[],
): string[] {
  const correct = firstSynonym(correctEnglish);
  const distractors = pickDistractors(correctEnglish, pool);
  return shuffle([correct, ...distractors]);
}

/**
 * Blanks the target word out of its Arabic example sentence. Tries each "/"
 * separated synonym as a literal substring match (the example sentence uses
 * one specific inflected form, not necessarily the dictionary form). Falls
 * back to showing the full sentence, unblanked, if no variant is found —
 * still usable as a recognition exercise, just without the blank.
 */
export function blankSentence(
  exampleArabic: string,
  arabicField: string,
): { text: string; found: boolean } {
  const variants = splitSynonyms(arabicField, "arabic");
  for (const variant of variants) {
    if (exampleArabic.includes(variant)) {
      return { text: exampleArabic.replace(variant, "____"), found: true };
    }
  }
  return { text: exampleArabic, found: false };
}

/** Small, capped bonus for consecutive correct answers (Type Sprint's combo mechanic). */
export function comboMultiplier(combo: number): number {
  return 1 + Math.min(Math.max(combo, 0), 5) * 0.1;
}
