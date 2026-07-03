import Link from "next/link";
import { listCategories } from "@/lib/repositories/category.repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Reads categories directly via Prisma (not `fetch`), so it must be
// force-dynamic. See repo memory: DB-backed pages always use
// `export const dynamic = "force-dynamic"`.
export const dynamic = "force-dynamic";

// Minimal category list + entry points into Recall/Reverse practice.
// A fuller dashboard (mastery %, due-today counts, category CRUD) is Phase 3
// scope — this is intentionally just enough navigation to use Phase 2.
export default async function Home() {
  const categories = await listCategories();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-arabic text-primary text-5xl" dir="rtl">
          حفظ
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Hifz</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Pick a category to practice, or import more vocabulary.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link href="/import">Import vocabulary</Link>
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-center text-sm">
          No categories yet. Head to Import to add your first words.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-medium">{category.name}</CardTitle>
                <Badge variant="secondary">{category.wordCount} words</Badge>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/practice/${category.id}?mode=recall`}>Recall</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={`/practice/${category.id}?mode=reverse`}>Reverse</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
