"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategorySummary } from "@/lib/repositories/category.repository";
import {
  commitCsvImportAction,
  getCategoriesAction,
  getCategoryArabicListAction,
  previewCsvAction,
} from "@/lib/actions/import.actions";
import type { CsvParseResult } from "@/lib/validation/csv-import";

const SAMPLE_CSV = `Arabic Verb,English Meaning,Arabic Example,English Example
يذهب,To go,انا اذهب الى السوق,I go to the market
يجيء / ياتي,To come,هو يجيء كل يوم,He comes every day`;

type TargetMode = "new" | "existing";

export function CsvImportForm({ initialCategories }: { initialCategories: CategorySummary[] }) {
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<CsvParseResult | null>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [targetMode, setTargetMode] = useState<TargetMode>(
    initialCategories.length > 0 ? "existing" : "new",
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    initialCategories[0]?.id,
  );
  const [duplicateArabics, setDuplicateArabics] = useState<Set<string>>(new Set());
  const [isPreviewing, startPreviewTransition] = useTransition();
  const [isCommitting, startCommitTransition] = useTransition();

  const validRows = useMemo(() => (preview?.ok ? preview.rows : []), [preview]);
  const invalidRows = useMemo(() => (preview?.ok ? preview.invalidRows : []), [preview]);

  const duplicateCount = useMemo(() => {
    if (targetMode !== "existing") return 0;
    return validRows.filter((row) => duplicateArabics.has(row.arabic)).length;
  }, [validRows, duplicateArabics, targetMode]);

  const importCount = validRows.length - duplicateCount;

  function handlePreview() {
    if (!rawText.trim()) {
      toast.error("Paste some CSV text first.");
      return;
    }
    startPreviewTransition(async () => {
      const result = await previewCsvAction(rawText);
      setPreview(result);
      setDuplicateArabics(new Set());
      if (!result.ok) {
        toast.error(result.error);
      } else if (result.rows.length === 0) {
        toast.warning("No valid rows found in the pasted text.");
      } else {
        await refreshDuplicatesFor(selectedCategoryId, targetMode);
      }
    });
  }

  async function refreshDuplicatesFor(categoryId: string | undefined, mode: TargetMode) {
    if (mode !== "existing" || !categoryId) {
      setDuplicateArabics(new Set());
      return;
    }
    const arabicList = await getCategoryArabicListAction(categoryId);
    setDuplicateArabics(new Set(arabicList));
  }

  function handleTargetModeChange(mode: TargetMode) {
    setTargetMode(mode);
    if (mode === "existing") {
      void refreshDuplicatesFor(selectedCategoryId, mode);
    } else {
      setDuplicateArabics(new Set());
    }
  }

  function handleCategorySelect(categoryId: string) {
    setSelectedCategoryId(categoryId);
    void refreshDuplicatesFor(categoryId, targetMode);
  }

  function handleCommit() {
    if (!preview?.ok || validRows.length === 0) {
      toast.error("Nothing to import yet — preview the CSV first.");
      return;
    }
    if (importCount === 0) {
      toast.error("All rows are duplicates of words already in this category.");
      return;
    }
    if (targetMode === "new" && !newCategoryName.trim()) {
      toast.error("Enter a name for the new category.");
      return;
    }
    if (targetMode === "existing" && !selectedCategoryId) {
      toast.error("Select a category to add these words to.");
      return;
    }

    startCommitTransition(async () => {
      const target =
        targetMode === "new"
          ? ({ mode: "new", name: newCategoryName.trim() } as const)
          : ({ mode: "existing", categoryId: selectedCategoryId! } as const);

      const result = await commitCsvImportAction(rawText, target);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Added ${result.createdCount} word${result.createdCount === 1 ? "" : "s"} to "${result.categoryName}"` +
          (result.skippedDuplicates.length > 0
            ? ` (skipped ${result.skippedDuplicates.length} duplicate${result.skippedDuplicates.length === 1 ? "" : "s"})`
            : ""),
      );

      const refreshedCategories = await getCategoriesAction();
      setCategories(refreshedCategories);
      setSelectedCategoryId(result.categoryId);
      setTargetMode("existing");
      setNewCategoryName("");
      setRawText("");
      setPreview(null);
      setDuplicateArabics(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Paste CSV</CardTitle>
          <CardDescription>
            Header row required (case-insensitive, any order): Arabic / English / Arabic Example /
            English Example.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={SAMPLE_CSV}
            dir="auto"
            rows={8}
            className="font-mono text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? "Parsing…" : "Preview"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRawText(SAMPLE_CSV)}
              disabled={isPreviewing}
            >
              Fill sample
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview?.ok && (
        <Card>
          <CardHeader>
            <CardTitle>2. Preview</CardTitle>
            <CardDescription>
              {validRows.length} valid row{validRows.length === 1 ? "" : "s"}
              {invalidRows.length > 0 &&
                ` · ${invalidRows.length} invalid row${invalidRows.length === 1 ? "" : "s"} will be skipped`}
              {duplicateCount > 0 &&
                ` · ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} will be skipped`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {validRows.length > 0 && (
              <div className="max-h-80 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arabic</TableHead>
                      <TableHead>English</TableHead>
                      <TableHead>Example (AR)</TableHead>
                      <TableHead>Example (EN)</TableHead>
                      {targetMode === "existing" && (
                        <TableHead className="text-right">Status</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validRows.map((row, index) => {
                      const isDuplicate = duplicateArabics.has(row.arabic);
                      return (
                        <TableRow key={`${row.arabic}-${index}`}>
                          <TableCell dir="rtl" className="font-arabic text-right">
                            {row.arabic}
                          </TableCell>
                          <TableCell>{row.english}</TableCell>
                          <TableCell
                            dir="rtl"
                            className="font-arabic text-muted-foreground text-right"
                          >
                            {row.exampleArabic ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.exampleEnglish ?? "—"}
                          </TableCell>
                          {targetMode === "existing" && (
                            <TableCell className="text-right">
                              {isDuplicate ? (
                                <Badge variant="destructive">Duplicate</Badge>
                              ) : (
                                <Badge variant="secondary">New</Badge>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {invalidRows.length > 0 && (
              <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-1 rounded-md border p-3 text-sm">
                <span className="text-destructive font-medium">Skipped invalid rows:</span>
                {invalidRows.map((row) => (
                  <span key={row.rowNumber} className="text-muted-foreground">
                    Row {row.rowNumber}: {row.reason}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {preview?.ok && validRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Choose a category</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs
              value={targetMode}
              onValueChange={(value) => handleTargetModeChange(value as TargetMode)}
            >
              <TabsList>
                <TabsTrigger value="existing" disabled={categories.length === 0}>
                  Existing category
                </TabsTrigger>
                <TabsTrigger value="new">New category</TabsTrigger>
              </TabsList>
            </Tabs>

            {targetMode === "existing" ? (
              categories.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category-select">Category</Label>
                  <Select value={selectedCategoryId} onValueChange={handleCategorySelect}>
                    <SelectTrigger id="category-select" className="w-full sm:w-72">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} ({category.wordCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No categories yet — create a new one instead.
                </p>
              )
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-category-name">Category name</Label>
                <Input
                  id="new-category-name"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="e.g. Common Verbs"
                  className="w-full sm:w-72"
                />
              </div>
            )}

            <Separator />

            <Button
              onClick={handleCommit}
              disabled={isCommitting || importCount === 0}
              className="w-fit"
            >
              {isCommitting
                ? "Importing…"
                : `Import ${importCount} word${importCount === 1 ? "" : "s"}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
