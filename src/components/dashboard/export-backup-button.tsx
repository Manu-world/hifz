"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportBackupButton() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hifz-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export backup.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={isExporting}>
      <Download />
      {isExporting ? "Exporting…" : "Export backup"}
    </Button>
  );
}
