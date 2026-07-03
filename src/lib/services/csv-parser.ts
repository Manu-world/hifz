import Papa from "papaparse";
import {
  hasRequiredColumns,
  mapHeaders,
  parsedVocabRowSchema,
  type CsvParseResult,
  type InvalidVocabRow,
  type ParsedVocabRow,
} from "@/lib/validation/csv-import";

function emptyToNull(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses pasted CSV vocab text into rows, leniently:
 *  - header is case-insensitive and order-flexible (matched by keyword, see
 *    lib/validation/csv-import.ts)
 *  - missing example columns/cells become null
 *  - blank rows are ignored
 *  - values are trimmed
 *
 * Row-level failures (missing required arabic/english) are collected as
 * `invalidRows` rather than aborting the whole parse.
 */
export function parseVocabCsv(rawText: string): CsvParseResult {
  const parsed = Papa.parse<string[]>(rawText.trim(), {
    skipEmptyLines: "greedy",
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { ok: false, error: "Could not parse the pasted text as CSV." };
  }

  const [headerRow, ...dataRows] = parsed.data;
  if (!headerRow || headerRow.length === 0) {
    return { ok: false, error: "No header row found." };
  }

  const columnMapping = mapHeaders(headerRow);
  if (!hasRequiredColumns(columnMapping)) {
    return {
      ok: false,
      error:
        "Could not detect Arabic/English columns in the header row. Expected something like: Arabic Verb, English Meaning, Arabic Example, English Example.",
    };
  }

  const rows: ParsedVocabRow[] = [];
  const invalidRows: InvalidVocabRow[] = [];

  dataRows.forEach((cells, index) => {
    if (cells.every((cell) => cell.trim().length === 0)) return; // blank row

    const raw: Record<string, string> = {};
    let arabic = "";
    let english = "";
    let exampleArabic: string | null = null;
    let exampleEnglish: string | null = null;

    cells.forEach((cell, colIndex) => {
      const field = columnMapping[colIndex];
      if (!field) return;
      raw[field] = cell;
      if (field === "arabic") arabic = cell.trim();
      else if (field === "english") english = cell.trim();
      else if (field === "exampleArabic") exampleArabic = emptyToNull(cell);
      else if (field === "exampleEnglish") exampleEnglish = emptyToNull(cell);
    });

    const candidate = { arabic, english, exampleArabic, exampleEnglish };
    const result = parsedVocabRowSchema.safeParse(candidate);
    if (result.success) {
      rows.push(result.data);
    } else {
      invalidRows.push({
        rowNumber: index + 1,
        reason: !arabic
          ? "Missing Arabic word"
          : !english
            ? "Missing English meaning"
            : "Invalid row",
        raw,
      });
    }
  });

  return { ok: true, rows, invalidRows };
}
