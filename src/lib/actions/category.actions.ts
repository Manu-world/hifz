"use server";

import { revalidatePath } from "next/cache";
import { deleteCategory } from "@/lib/repositories/category.repository";

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
