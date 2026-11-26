import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Memuat data">
      <Skeleton className="h-8 w-56" />
      <div className="rounded-xl border bg-card p-6 space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton key={idx} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
