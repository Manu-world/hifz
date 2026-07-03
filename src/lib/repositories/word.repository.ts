import { prisma } from "@/lib/db/client";
import type { ParsedVocabRow } from "@/lib/validation/csv-import";

export async function getExistingArabicSet(categoryId: string): Promise<Set<string>> {
  const words = await prisma.vocabWord.findMany({
    where: { categoryId },
    select: { arabic: true },
  });
  return new Set(words.map((w) => w.arabic));
}

export type ImportSummary = {
  categoryId: string;
  createdCount: number;
  skippedDuplicates: string[];
};

/**
 * Creates VocabWord + WordProgress (box 0, due now) rows for each row not
 * already present in the category (exact `arabic` match) and not a duplicate
 * within the pasted batch itself.
 */
export async function importWordsIntoCategory(
  categoryId: string,
  rows: ParsedVocabRow[],
): Promise<ImportSummary> {
  const existing = await getExistingArabicSet(categoryId);
  const seenInBatch = new Set<string>();
  const skippedDuplicates: string[] = [];
  const toCreate: ParsedVocabRow[] = [];

  for (const row of rows) {
    if (existing.has(row.arabic) || seenInBatch.has(row.arabic)) {
      skippedDuplicates.push(row.arabic);
      continue;
    }
    seenInBatch.add(row.arabic);
    toCreate.push(row);
  }

  await prisma.$transaction(
    toCreate.map((row) =>
      prisma.vocabWord.create({
        data: {
          categoryId,
          arabic: row.arabic,
          english: row.english,
          exampleArabic: row.exampleArabic,
          exampleEnglish: row.exampleEnglish,
          progress: { create: {} }, // box 0, dueAt now (schema defaults)
        },
      }),
    ),
  );

  return { categoryId, createdCount: toCreate.length, skippedDuplicates };
}

export async function listWordsByCategory(categoryId: string) {
  return prisma.vocabWord.findMany({
    where: { categoryId },
    include: { progress: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateWord(
  id: string,
  data: Partial<Pick<ParsedVocabRow, "arabic" | "english" | "exampleArabic" | "exampleEnglish">>,
) {
  return prisma.vocabWord.update({ where: { id }, data });
}

export async function deleteWord(id: string) {
  return prisma.vocabWord.delete({ where: { id } });
}
