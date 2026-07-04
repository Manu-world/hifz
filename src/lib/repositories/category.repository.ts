import { prisma } from "@/lib/db/client";
import { MAX_BOX } from "@/lib/practice/scheduler";

export type CategorySummary = {
  id: string;
  name: string;
  createdAt: Date;
  wordCount: number;
  dueTodayCount: number;
  masteredCount: number;
  masteryPct: number;
};

/**
 * Word count + due/mastery stats are computed in JS rather than via Prisma
 * aggregation because the "mastered" definition (isDone OR box >= MAX_BOX)
 * spans two conditions Prisma can't express in a single `_count` filter. This
 * is fine at personal-app scale (a handful of categories, at most a few
 * thousand words).
 */
export async function listCategories(): Promise<CategorySummary[]> {
  const now = new Date();
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      words: { select: { progress: { select: { isDone: true, box: true, dueAt: true } } } },
    },
  });

  return categories.map((category) => {
    const wordCount = category.words.length;
    let dueTodayCount = 0;
    let masteredCount = 0;

    for (const { progress } of category.words) {
      if (!progress) continue;
      if (progress.isDone || progress.box >= MAX_BOX) masteredCount += 1;
      if (!progress.isDone && progress.dueAt.getTime() <= now.getTime()) dueTodayCount += 1;
    }

    return {
      id: category.id,
      name: category.name,
      createdAt: category.createdAt,
      wordCount,
      dueTodayCount,
      masteredCount,
      masteryPct: wordCount === 0 ? 0 : Math.round((masteredCount / wordCount) * 100),
    };
  });
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export async function createCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Category name cannot be empty.");
  }
  return prisma.category.create({ data: { name: trimmed } });
}

export async function renameCategory(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Category name cannot be empty.");
  }
  return prisma.category.update({ where: { id }, data: { name: trimmed } });
}

export async function deleteCategory(id: string) {
  return prisma.category.delete({ where: { id } });
}
