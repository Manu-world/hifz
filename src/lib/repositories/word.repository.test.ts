import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedVocabRow } from "@/lib/validation/csv-import";

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db/client", () => ({
  prisma: {
    vocabWord: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const { IMPORT_BATCH_SIZE, importWordsIntoCategory } = await import("./word.repository");

function makeRows(count: number): ParsedVocabRow[] {
  return Array.from({ length: count }, (_, i) => ({
    arabic: `word-${i}`,
    english: `meaning-${i}`,
    exampleArabic: null,
    exampleEnglish: null,
  }));
}

describe("importWordsIntoCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCreate.mockImplementation((args: unknown) => Promise.resolve(args));
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  });

  it("splits large imports into multiple transactions", async () => {
    const rows = makeRows(31);

    const result = await importWordsIntoCategory("cat1", rows);

    expect(mockTransaction).toHaveBeenCalledTimes(3);
    expect(mockTransaction.mock.calls[0][1]).toEqual({ timeout: 15_000 });
    expect(mockTransaction.mock.calls[0][0]).toHaveLength(IMPORT_BATCH_SIZE);
    expect(mockTransaction.mock.calls[1][0]).toHaveLength(IMPORT_BATCH_SIZE);
    expect(mockTransaction.mock.calls[2][0]).toHaveLength(1);
    expect(result).toEqual({
      categoryId: "cat1",
      createdCount: 31,
      skippedDuplicates: [],
    });
  });

  it("uses a single transaction for imports smaller than the batch size", async () => {
    await importWordsIntoCategory("cat1", makeRows(5));

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction.mock.calls[0][0]).toHaveLength(5);
  });

  it("skips duplicates already in the category and within the batch", async () => {
    mockFindMany.mockResolvedValue([{ arabic: "word-0" }]);
    const rows = makeRows(3);
    rows.push({ arabic: "word-1", english: "dup", exampleArabic: null, exampleEnglish: null });

    const result = await importWordsIntoCategory("cat1", rows);

    expect(result.createdCount).toBe(2);
    expect(result.skippedDuplicates).toEqual(["word-0", "word-1"]);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction.mock.calls[0][0]).toHaveLength(2);
  });
});
