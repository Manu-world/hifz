import Link from "next/link";
import { Flame, Trophy } from "lucide-react";
import { listCategories } from "@/lib/repositories/category.repository";
import {
  getGamificationProfile,
  getMasteredOverTime,
} from "@/lib/repositories/gamification.repository";
import { getAccuracyTrend } from "@/lib/repositories/session.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MasteredChart } from "@/components/dashboard/mastered-chart";
import { AccuracyChart } from "@/components/dashboard/accuracy-chart";
import { ExportBackupButton } from "@/components/dashboard/export-backup-button";
import { ACHIEVEMENTS, type AchievementId } from "@/lib/practice/gamification";

// Reads categories/profile/sessions directly via Prisma (not `fetch`), so it
// must be force-dynamic. See repo memory: DB-backed pages always use
// `export const dynamic = "force-dynamic"`.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [categories, profile, masteredOverTime, accuracyTrend] = await Promise.all([
    listCategories(),
    getGamificationProfile(),
    getMasteredOverTime(30),
    getAccuracyTrend(30),
  ]);

  const totalWords = categories.reduce((sum, c) => sum + c.wordCount, 0);
  const totalMastered = categories.reduce((sum, c) => sum + c.masteredCount, 0);
  const unlockedAchievements = Array.isArray(profile.achievements)
    ? (profile.achievements as string[]).filter((id): id is AchievementId => id in ACHIEVEMENTS)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <ExportBackupButton />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-0">
            <Flame className="text-primary size-5" />
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{profile.currentStreak}</p>
            <p className="text-muted-foreground text-xs">
              day{profile.currentStreak === 1 ? "" : "s"} · best {profile.longestStreak}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-0">
            <Trophy className="text-primary size-5" />
            <CardTitle className="text-sm font-medium">Level {profile.level}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{profile.xp} XP</p>
            <p className="text-muted-foreground text-xs">
              {totalMastered}/{totalWords} words mastered
            </p>
          </CardContent>
        </Card>
      </div>

      {unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unlockedAchievements.map((id) => (
              <Badge key={id} variant="secondary">
                {ACHIEVEMENTS[id]}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Category mastery</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No categories yet.{" "}
              <Link href="/import" className="text-primary underline underline-offset-2">
                Import some vocabulary
              </Link>{" "}
              to get started.
            </p>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Link href={`/categories/${category.id}/words`} className="font-medium">
                    {category.name}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {category.masteredCount}/{category.wordCount} ({category.masteryPct}%)
                  </span>
                </div>
                <Progress value={category.masteryPct} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Words mastered — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <MasteredChart data={masteredOverTime} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accuracy trend — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <AccuracyChart data={accuracyTrend} />
        </CardContent>
      </Card>
    </div>
  );
}
