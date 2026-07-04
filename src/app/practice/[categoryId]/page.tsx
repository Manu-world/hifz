import { notFound } from "next/navigation";
import { getCategoryById } from "@/lib/repositories/category.repository";
import { PracticeSession } from "@/components/practice/practice-session";
import { GamifiedSession } from "@/components/practice/gamified-session";

// This page only validates the category server-side; the actual due-word
// queue and all mutations happen via the REST routes under /api (fetched
// client-side), so the same code path can later be intercepted/queued by a
// service worker for offline support (Phase 6).
export const dynamic = "force-dynamic";

type PracticeMode = "recall" | "reverse" | "gamified";

function parseMode(value: string | string[] | undefined): PracticeMode | null {
  if (value === "recall" || value === "reverse" || value === "gamified") return value;
  return null;
}

function parseRevise(value: string | string[] | undefined): boolean {
  return value === "1" || value === "true";
}

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ mode?: string; revise?: string }>;
}) {
  const { categoryId } = await params;
  const { mode: rawMode, revise: rawRevise } = await searchParams;
  const category = await getCategoryById(categoryId);

  if (!category) {
    notFound();
  }

  const mode = parseMode(rawMode);
  const revise = parseRevise(rawRevise);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      {mode === "gamified" ? (
        <GamifiedSession categoryId={category.id} categoryName={category.name} />
      ) : (
        <PracticeSession
          categoryId={category.id}
          categoryName={category.name}
          initialMode={mode}
          initialRevise={revise}
        />
      )}
    </div>
  );
}
