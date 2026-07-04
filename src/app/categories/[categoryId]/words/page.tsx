import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryById } from "@/lib/repositories/category.repository";
import { listWordsByCategory } from "@/lib/repositories/word.repository";
import { WordListTable } from "@/components/words/word-list-table";
import { Button } from "@/components/ui/button";

// Reads categories/words directly via Prisma (not `fetch`), so it must be
// force-dynamic. See repo memory: DB-backed pages always use
// `export const dynamic = "force-dynamic"`.
export const dynamic = "force-dynamic";

export default async function WordListPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const category = await getCategoryById(categoryId);
  if (!category) {
    notFound();
  }

  const words = await listWordsByCategory(categoryId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/">← Back to categories</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        <p className="text-muted-foreground text-sm">
          {words.length} word{words.length === 1 ? "" : "s"} — toggle &quot;done&quot; to pull a
          word out of normal rotation, or edit/delete a word directly.
        </p>
      </div>

      <WordListTable categoryId={categoryId} words={words} />
    </div>
  );
}
