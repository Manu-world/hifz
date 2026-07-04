import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordAnswer } from "@/lib/repositories/progress.repository";
import { awardXp } from "@/lib/practice/gamification";

const bodySchema = z.object({
  wordId: z.string().min(1),
  isCorrect: z.boolean(),
  // Only Gamified mode awards XP (see README "Known Assumptions"); Recall/
  // Reverse omit this and get xpEarned: 0.
  awardXp: z.boolean().optional(),
  speedFraction: z.number().min(0).max(1).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { wordId, isCorrect, awardXp: shouldAwardXp, speedFraction } = parsed.data;

  try {
    const { progress, previousBox } = await recordAnswer(wordId, isCorrect);
    const xpEarned = shouldAwardXp ? awardXp(previousBox, isCorrect, speedFraction) : 0;
    return NextResponse.json({ progress, xpEarned });
  } catch {
    return NextResponse.json({ error: "Word not found." }, { status: 404 });
  }
}
