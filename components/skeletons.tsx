import { Skeleton } from "@/components/ui/skeleton";
import { UI_CONFIG } from "@/lib/config";

function ProposalCardSkeleton() {
  return (
    <div className="border-border border-b px-3 py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-3 w-5 rounded-sm" />
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="bg-primary/10 h-4 w-14 rounded-full" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          <div className="space-y-1.5 pt-1">
            <Skeleton className="ml-auto h-3 w-16 rounded-sm" />
            <Skeleton className="ml-auto h-3 w-14 rounded-sm" />
          </div>
          <Skeleton className="mt-0.5 h-4 w-4 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export function ProposalCardSkeletonList() {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      {Array.from({ length: UI_CONFIG.SKELETON_COUNT }).map((_, i) => (
        <ProposalCardSkeleton key={i} />
      ))}
    </div>
  );
}

const VAULT_GRID =
  "2.1rem minmax(11rem,1.5fr) minmax(8rem,0.8fr) minmax(7rem,0.7fr) minmax(8rem,0.7fr) minmax(10rem,1fr) minmax(8rem,0.75fr)";

function VaultRowSkeleton() {
  return (
    <div
      className="border-border grid gap-3 border-b px-4 py-4 last:border-b-0"
      style={{ gridTemplateColumns: VAULT_GRID }}
    >
      <Skeleton className="h-4 w-4 rounded-sm" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-28 rounded-sm" />
        <Skeleton className="h-2.5 w-40 rounded-sm" />
        <Skeleton className="h-2.5 w-20 rounded-sm" />
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-10 rounded-md" />
      </div>
      <Skeleton className="h-3.5 w-8 rounded-sm" />
      <Skeleton className="h-3.5 w-6 rounded-sm" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-7 w-12 rounded-md" />
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
    </div>
  );
}

export function VaultListSkeletonList() {
  return (
    <div className="border-border bg-muted overflow-x-auto rounded-[1.15rem] border">
      <div className="min-w-[980px]">
        {Array.from({ length: UI_CONFIG.SKELETON_COUNT }).map((_, i) => (
          <VaultRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
