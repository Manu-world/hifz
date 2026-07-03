import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionLog } from "@/lib/repositories/session.repository";
import { recordPracticeActivity } from "@/lib/repositories/gamification.repository";

const bodySchema = z.object({
  mode: z.enum(["recall", "reverse", "gamified"]),
  categoryId: z.string().min(1).nullable(),
  isRevision: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { mode, categoryId, isRevision } = parsed.data;
  const session = await createSessionLog(mode, categoryId, isRevision ?? false);

  // Daily streak counts any practice mode, per spec — recorded at session
  // start rather than on each answer, since a session always has >=1 word.
  await recordPracticeActivity();

  return NextResponse.json({ session });
}
