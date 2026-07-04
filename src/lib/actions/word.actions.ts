"use server";

import { revalidatePath } from "next/cache";
import { deleteWord, updateWord } from "@/lib/repositories/word.repository";
import { setWordDone } from "@/lib/repositories/progress.repository";

function wordListPath(categoryId: string) {
  return `/categories/${categoryId}/words`;
}

export async function toggleWordDoneAction(wordId: string, categoryId: string, isDone: boolean) {
  await setWordDone(wordId, isDone);
  revalidatePath(wordListPath(categoryId));
  revalidatePath("/");
}

export async function updateWordAction(formData: FormData) {
  const wordId = String(formData.get("wordId") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const arabic = String(formData.get("arabic") ?? "").trim();
  const english = String(formData.get("english") ?? "").trim();
  const exampleArabic = String(formData.get("exampleArabic") ?? "").trim();
  const exampleEnglish = String(formData.get("exampleEnglish") ?? "").trim();

  if (!wordId || !categoryId) {
    throw new Error("Missing word or category id.");
  }
  if (!arabic || !english) {
    throw new Error("Arabic and English fields are required.");
  }

  await updateWord(wordId, {
    arabic,
    english,
    exampleArabic: exampleArabic || null,
    exampleEnglish: exampleEnglish || null,
  });
  revalidatePath(wordListPath(categoryId));
}

export async function deleteWordAction(formData: FormData) {
  const wordId = String(formData.get("wordId") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!wordId || !categoryId) {
    throw new Error("Missing word or category id.");
  }

  await deleteWord(wordId);
  revalidatePath(wordListPath(categoryId));
  revalidatePath("/");
}
