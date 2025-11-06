import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { UI_CONFIG } from "@/lib/config";

export function ProposalCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProposalCardSkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: UI_CONFIG.SKELETON_COUNT }).map((_, i) => (
        <ProposalCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProposalTableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-12" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-8" />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ProposalTableSkeletonList() {
  return (
    <>
      {Array.from({ length: UI_CONFIG.SKELETON_COUNT }).map((_, i) => (
        <ProposalTableRowSkeleton key={i} />
      ))}
    </>
  );
}

export function MultisigCardSkeleton() {
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
