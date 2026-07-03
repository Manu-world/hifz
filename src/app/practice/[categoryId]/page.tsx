import { notFound } from "next/navigation";
import { getCategoryById } from "@/lib/repositories/category.repository";
import { PracticeSession } from "@/components/practice/practice-session";

// This page only validates the category server-side; the actual due-word
// queue and all mutations happen via the REST routes under /api (fetched
// client-side), so the same code path can later be intercepted/queued by a
// service worker for offline support (Phase 6).
export const dynamic = "force-dynamic";

type PracticeMode = "recall" | "reverse";

function parseMode(value: string | string[] | undefined): PracticeMode | null {
  if (value === "recall" || value === "reverse") return value;
  return null;
}

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { categoryId } = await params;
  const { mode: rawMode } = await searchParams;
  const category = await getCategoryById(categoryId);

  if (!category) {
    notFound();
  }

  const mode = parseMode(rawMode);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6">
      <PracticeSession categoryId={category.id} categoryName={category.name} initialMode={mode} />
    </div>
  );
}
