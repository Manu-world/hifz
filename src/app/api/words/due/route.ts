import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDueWords } from "@/lib/repositories/progress.repository";

const querySchema = z.object({
  categoryId: z.string().min(1),
  revise: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const words = await getDueWords(parsed.data.categoryId, { revise: parsed.data.revise });
  return NextResponse.json({ words });
}
