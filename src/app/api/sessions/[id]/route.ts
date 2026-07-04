import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { endSessionLog } from "@/lib/repositories/session.repository";
import { applySessionRewards } from "@/lib/repositories/gamification.repository";

const bodySchema = z.object({
  wordsShown: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  xpEarned: z.number().int().min(0).default(0),
  wordRushPerfectRound: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { wordRushPerfectRound, ...sessionData } = parsed.data;

  try {
    const session = await endSessionLog(id, sessionData);
    // Runs for every mode: streak/mastery achievements aren't gamified-only.
    const rewards = await applySessionRewards(sessionData.xpEarned, { wordRushPerfectRound });
    return NextResponse.json({ session, rewards });
  } catch {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
}
