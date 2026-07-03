import { z } from "zod";

// Header aliases are matched leniently: case-insensitive, order-flexible.
// A header cell is classified by which of these keywords it contains.
function classifyHeader(
  rawHeader: string,
): "arabic" | "english" | "exampleArabic" | "exampleEnglish" | null {
  const header = rawHeader.trim().toLowerCase();
  const hasArabic = header.includes("arabic");
  const hasEnglish = header.includes("english");
  const hasExample = header.includes("example");

  if (hasArabic && hasExample) return "exampleArabic";
  if (hasEnglish && hasExample) return "exampleEnglish";
  if (hasArabic) return "arabic";
  if (hasEnglish) return "english";
  return null;
}

export const parsedVocabRowSchema = z.object({
  arabic: z.string().trim().min(1),
  english: z.string().trim().min(1),
  exampleArabic: z.string().trim().nullable(),
  exampleEnglish: z.string().trim().nullable(),
});

export type ParsedVocabRow = z.infer<typeof parsedVocabRowSchema>;

export type InvalidVocabRow = {
  rowNumber: number; // 1-based, counting only data rows (header excluded)
  reason: string;
  raw: Record<string, string>;
};

export type CsvParseResult =
  | { ok: false; error: string }
  | { ok: true; rows: ParsedVocabRow[]; invalidRows: InvalidVocabRow[] };

/**
 * Maps raw CSV column headers to our canonical field names. Returns null if
 * the required `arabic`/`english` columns can't be identified.
 */
export function mapHeaders(headers: string[]): Record<number, ReturnType<typeof classifyHeader>> {
  const mapping: Record<number, ReturnType<typeof classifyHeader>> = {};
  headers.forEach((header, index) => {
    mapping[index] = classifyHeader(header);
  });
  return mapping;
}

export function hasRequiredColumns(
  mapping: Record<number, ReturnType<typeof classifyHeader>>,
): boolean {
  const values = Object.values(mapping);
  return values.includes("arabic") && values.includes("english");
}
