import { Skeleton } from "@/components/ui/skeleton";
import { UI_CONFIG } from "@/lib/config";

function VaultCardSkeleton() {
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-36 rounded-sm" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-28 rounded-sm" />
            <Skeleton className="h-3 w-20 rounded-sm" />
          </div>
          <Skeleton className="h-3 w-24 rounded-sm" />
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VaultListSkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: UI_CONFIG.SKELETON_COUNT }).map((_, i) => (
        <VaultCardSkeleton key={i} />
      ))}
    </div>
  );
}
