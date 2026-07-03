import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

// Lightweight liveness/DB-connectivity check. Also doubles as a good target
// for the PWA sync engine to probe connectivity before flushing the offline
// mutation outbox (Phase 6).
export async function GET() {
  try {
    const categoryCount = await prisma.category.count();
    return NextResponse.json({ ok: true, categoryCount });
  } catch (error) {
    console.error("Health check DB error:", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
