"use server";

import { revalidatePath } from "next/cache";
import { parseVocabCsv } from "@/lib/services/csv-parser";
import {
  createCategory,
  getCategoryById,
  listCategories,
} from "@/lib/repositories/category.repository";
import { getExistingArabicSet, importWordsIntoCategory } from "@/lib/repositories/word.repository";
import type { CsvParseResult } from "@/lib/validation/csv-import";

export async function getCategoriesAction() {
  return listCategories();
}

export async function previewCsvAction(rawText: string): Promise<CsvParseResult> {
  return parseVocabCsv(rawText);
}

/** Returns the existing Arabic words in a category, for client-side duplicate flagging in the preview. */
export async function getCategoryArabicListAction(categoryId: string): Promise<string[]> {
  const set = await getExistingArabicSet(categoryId);
  return Array.from(set);
}

export type ImportTarget = { mode: "new"; name: string } | { mode: "existing"; categoryId: string };

export type CommitImportResult =
  | { ok: false; error: string }
  | {
      ok: true;
      categoryId: string;
      categoryName: string;
      createdCount: number;
      skippedDuplicates: string[];
      invalidRowCount: number;
    };

/**
 * Re-parses the raw CSV text server-side (never trusts client-computed rows
 * for the actual write) and persists the result under the chosen category.
 */
export async function commitCsvImportAction(
  rawText: string,
  target: ImportTarget,
): Promise<CommitImportResult> {
  const parsed = parseVocabCsv(rawText);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  if (parsed.rows.length === 0) {
    return { ok: false, error: "No valid rows to import." };
  }

  try {
    const category =
      target.mode === "new"
        ? await createCategory(target.name)
        : await getCategoryOrThrow(target.categoryId);

    const summary = await importWordsIntoCategory(category.id, parsed.rows);

    revalidatePath("/import");
    revalidatePath("/");

    return {
      ok: true,
      categoryId: category.id,
      categoryName: category.name,
      createdCount: summary.createdCount,
      skippedDuplicates: summary.skippedDuplicates,
      invalidRowCount: parsed.invalidRows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import words.";
    return { ok: false, error: message };
  }
}

async function getCategoryOrThrow(categoryId: string) {
  const category = await getCategoryById(categoryId);
  if (!category) throw new Error("Selected category no longer exists.");
  return category;
}
