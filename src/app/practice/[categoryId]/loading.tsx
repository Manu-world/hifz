import { Skeleton } from "@/components/ui/skeleton";

export default function PracticeLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
