"use server";

import { revalidatePath } from "next/cache";
import { deleteCategory, renameCategory } from "@/lib/repositories/category.repository";

export async function deleteCategoryAction(formData: FormData) {
  const rawId = formData.get("categoryId");
  const categoryId = typeof rawId === "string" ? rawId.trim() : "";

  if (!categoryId) {
    throw new Error("Missing category id.");
  }

  await deleteCategory(categoryId);
  revalidatePath("/");
  revalidatePath("/import");
}

export async function renameCategoryAction(formData: FormData) {
  const rawId = formData.get("categoryId");
  const rawName = formData.get("name");
  const categoryId = typeof rawId === "string" ? rawId.trim() : "";
  const name = typeof rawName === "string" ? rawName : "";

  if (!categoryId) {
    throw new Error("Missing category id.");
  }

  await renameCategory(categoryId, name);
  revalidatePath("/");
  revalidatePath("/import");
}
