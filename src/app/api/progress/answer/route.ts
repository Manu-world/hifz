import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordAnswer } from "@/lib/repositories/progress.repository";

const bodySchema = z.object({
  wordId: z.string().min(1),
  isCorrect: z.boolean(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const progress = await recordAnswer(parsed.data.wordId, parsed.data.isCorrect);
    return NextResponse.json({ progress });
  } catch {
    return NextResponse.json({ error: "Word not found." }, { status: 404 });
  }
}
