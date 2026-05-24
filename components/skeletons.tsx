import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UI_CONFIG } from "@/lib/config";

function ProposalCardSkeleton() {
  return (
    <div className="border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-3 w-5 rounded-sm" />
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="h-4 w-14 rounded-full bg-primary/10" />
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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {Array.from({ length: UI_CONFIG.SKELETON_COUNT }).map((_, i) => (
        <ProposalCardSkeleton key={i} />
      ))}
    </div>
  );
}

function MultisigCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-32" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MultisigCardSkeletonList() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: UI_CONFIG.SKELETON_COUNT }).map((_, i) => (
        <MultisigCardSkeleton key={i} />
      ))}
    </div>
  );
}
