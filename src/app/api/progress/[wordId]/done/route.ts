import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setWordDone } from "@/lib/repositories/progress.repository";

const bodySchema = z.object({
  isDone: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> },
) {
  const { wordId } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const progress = await setWordDone(wordId, parsed.data.isDone);
    return NextResponse.json({ progress });
  } catch {
    return NextResponse.json({ error: "Word not found." }, { status: 404 });
  }
}
