import { NextResponse } from "next/server";
import { buildBackup } from "@/lib/services/export";

export async function GET() {
  const backup = await buildBackup();
  return NextResponse.json(backup, {
    headers: {
      "Content-Disposition": `attachment; filename="hifz-backup-${backup.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
