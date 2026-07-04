import Link from "next/link";
import { listCategories } from "@/lib/repositories/category.repository";
import { CategoryCardActions } from "@/components/category/category-card-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Reads categories directly via Prisma (not `fetch`), so it must be
// force-dynamic. See repo memory: DB-backed pages always use
// `export const dynamic = "force-dynamic"`.
export const dynamic = "force-dynamic";

// Category list with mastery/due stats + entry points into every practice
// mode. A fuller cross-category dashboard (streak, XP, charts) lives at
// /dashboard (Phase 2).
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
                <div className="flex items-center gap-1.5">
                  {category.dueTodayCount > 0 && <Badge>{category.dueTodayCount} due</Badge>}
                  <Badge variant="secondary">{category.wordCount} words</Badge>
                  <CategoryCardActions categoryId={category.id} categoryName={category.name} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Mastered</span>
                  <span className="font-medium">
                    {category.masteredCount}/{category.wordCount} ({category.masteryPct}%)
                  </span>
                </div>
                <Progress value={category.masteryPct} />
              </CardContent>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/practice/${category.id}?mode=recall`}>Recall</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={`/practice/${category.id}?mode=reverse`}>Reverse</Link>
                </Button>
                <Button asChild size="sm" variant="secondary" className="flex-1">
                  <Link href={`/practice/${category.id}?mode=recall&revise=1`}>Revise all</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={`/practice/${category.id}?mode=gamified`}>Play</Link>
                </Button>
              </CardContent>
              <CardContent className="pt-0">
                <Button asChild size="sm" variant="ghost" className="w-full">
                  <Link href={`/categories/${category.id}/words`}>Word list</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
