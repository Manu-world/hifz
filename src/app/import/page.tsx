import { listCategories } from "@/lib/repositories/category.repository";
import { CsvImportForm } from "@/components/import/csv-import-form";

// This page reads live DB state (categories) directly (no `fetch`), so it
// must be force-dynamic — otherwise Next would prerender it once at build
// time and bake in whatever categories existed then. See repo memory:
// DB-backed pages always use `export const dynamic = "force-dynamic"`.
export const dynamic = "force-dynamic";
// Large CSV imports run multiple Turso batches sequentially; allow headroom on Vercel.
export const maxDuration = 60;

export default async function ImportPage() {
  const categories = await listCategories();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Import vocabulary</h1>
        <p className="text-muted-foreground text-sm">
          Paste CSV text with Arabic/English columns (and optional example columns), preview it,
          then add it to a new or existing category.
        </p>
      </div>
      <CsvImportForm initialCategories={categories} />
    </div>
  );
}
