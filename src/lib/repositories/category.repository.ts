import { prisma } from "@/lib/db/client";

export type CategorySummary = {
  id: string;
  name: string;
  createdAt: Date;
  wordCount: number;
};

export async function listCategories(): Promise<CategorySummary[]> {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { words: true } } },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    createdAt: category.createdAt,
    wordCount: category._count.words,
  }));
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
