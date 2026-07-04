import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDueWords } from "@/lib/repositories/progress.repository";
import { getWordPool } from "@/lib/repositories/word.repository";

const querySchema = z.object({
  categoryId: z.string().min(1),
  revise: z.coerce.boolean().optional(),
  mode: z.enum(["recall", "reverse", "gamified"]).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const words = await getDueWords(parsed.data.categoryId, { revise: parsed.data.revise });

  // Gamified mode needs a wider pool of English answers to build Word Rush
  // multiple-choice distractors from — the due queue alone is often too
  // small (e.g. only 1-2 words due).
  if (parsed.data.mode === "gamified") {
    const pool = await getWordPool(parsed.data.categoryId);
    return NextResponse.json({ words, pool });
  }

  return NextResponse.json({ words });
}
