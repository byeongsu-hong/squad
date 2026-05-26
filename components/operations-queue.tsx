"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Check,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { ProposalDetailView } from "@/components/proposal-detail-modal";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { WorkspaceQueueItem } from "@/types/workspace";

const PAGE_SIZE = 15;

interface OperationsQueueProps {
  items: WorkspaceQueueItem[];
  loading?: boolean;
  showFilters?: boolean;
  compact?: boolean;
  hideChain?: boolean;
  emptyStateCta?: ReactNode;
  statsHeader?: ReactNode;
  defaultStatusFilter?: StatusFilter;
}

function formatAge(createdAt?: string): string {
  if (!createdAt) return "--";
  const ms = Date.now() - Date.parse(createdAt);
  if (Number.isNaN(ms) || ms < 0) return "--";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function StatusBadge({ item }: { item: WorkspaceQueueItem }) {
  if (item.readyToExecute) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-300/70 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400">
        <Zap className="h-2.5 w-2.5 fill-current" />
        Ready
      </span>
    );
  }
  if (item.needsYourSignature && !item.currentUserApproved) {
    return (
      <span className="border-primary/30 bg-primary/10 text-primary rounded border px-1.5 py-0.5 text-[10px] font-medium">
        Sign
      </span>
    );
  }
  if (item.currentUserApproved && item.proposal.status === "Active") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-200/70 bg-emerald-50/80 px-1.5 py-0.5 text-[10px] text-emerald-600/70 dark:border-emerald-800/30 dark:bg-emerald-950/10 dark:text-emerald-500/70">
        <Check className="h-2.5 w-2.5" />
        Signed
      </span>
    );
  }
  if (item.proposal.status === "Rejected") {
    return (
      <span className="border-destructive/30 bg-destructive/10 text-destructive rounded border px-1.5 py-0.5 text-[10px]">
        Rejected
      </span>
    );
  }
  if (item.proposal.status === "Executed") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-200/70 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-500/70">
        Executed
      </span>
    );
  }
  if (item.proposal.status === "Cancelled") {
    return (
      <span className="border-border bg-muted/60 text-muted-foreground/60 rounded border px-1.5 py-0.5 text-[10px]">
        Cancelled
      </span>
    );
  }
  return null;
}

function QueueRow({
  item,
  isSelected,
  isSelectable,
  isAnySelected = false,
  onToggle,
  onClick,
  compact = false,
  hideChain = false,
  onApprove,
  onExecute,
  isActioning = false,
}: {
  item: WorkspaceQueueItem;
  isSelected: boolean;
  isSelectable: boolean;
  isAnySelected?: boolean;
  onToggle: () => void;
  onClick: () => void;
  compact?: boolean;
  hideChain?: boolean;
  onApprove?: () => void;
  onExecute?: () => void;
  isActioning?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors",
        isSelected
          ? "bg-primary/8"
          : item.readyToExecute
            ? "[box-shadow:inset_2px_0_0_rgba(5,150,105,0.4)] hover:bg-emerald-50 dark:hover:bg-emerald-950/15"
            : item.needsYourSignature && !item.currentUserApproved
              ? "hover:bg-primary/5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.4)]"
              : item.currentUserApproved && item.proposal.status === "Active"
                ? "hover:bg-muted [box-shadow:inset_2px_0_0_rgba(5,150,105,0.2)]"
                : "hover:bg-muted"
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      {isSelectable && (
        <div
          className={cn(
            "shrink-0 transition-opacity",
            isAnySelected || isSelected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="size-3.5"
            aria-label={`Select ${item.multisig.label ?? "proposal"}`}
          />
        </div>
      )}

      {/* Left: vault/tx label + metadata */}
      <div className="min-w-0 flex-1">
        {!compact ? (
          <p
            className={cn(
              "mb-0.5 truncate text-[13px] leading-tight font-medium",
              item.multisig.label
                ? "text-foreground"
                : "text-muted-foreground/50 italic"
            )}
          >
            {item.multisig.label ?? "Unnamed"}
          </p>
        ) : (
          <p className="text-foreground mb-0.5 truncate text-[12px] leading-tight font-medium">
            {item.lineLabel}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          {!compact && item.lineLabel && (
            <span
              className={cn(
                "text-[11px]",
                item.readyToExecute
                  ? "text-emerald-600/70 dark:text-emerald-500/70"
                  : item.needsYourSignature && !item.currentUserApproved
                    ? "text-primary/60"
                    : "text-muted-foreground/50"
              )}
            >
              {item.lineLabel}
            </span>
          )}
          <span className="text-muted-foreground/50 font-mono text-[11px] tabular-nums">
            #{item.proposal.transactionIndex.toString()}
          </span>
          {!hideChain && (
            <span className="border-border bg-muted/60 text-muted-foreground/60 rounded px-1 py-px text-[10px]">
              {item.multisig.chainName}
            </span>
          )}
          <span className="text-muted-foreground/50 font-mono text-[10px] tabular-nums">
            {formatAge(item.proposal.createdAt)}
          </span>
        </div>
      </div>

      {/* Right: progress count + status + action */}
      <div
        className="flex shrink-0 items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-muted-foreground/60 font-mono text-[10px] tabular-nums">
          {item.approvalCount}/{item.multisig.threshold}
        </span>
        {/* Skip badge when an action button is already shown — it's redundant */}
        {!(onExecute && item.readyToExecute) &&
          !(
            onApprove &&
            item.needsYourSignature &&
            !item.currentUserApproved
          ) && <StatusBadge item={item} />}
        {onExecute && item.readyToExecute ? (
          <Button
            size="xs"
            disabled={isActioning}
            onClick={onExecute}
            className="border-emerald-700/30 bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
          >
            {isActioning ? <Loader2 className="animate-spin" /> : <Zap />}
            Execute
          </Button>
        ) : onApprove &&
          item.needsYourSignature &&
          !item.currentUserApproved ? (
          <Button
            size="xs"
            disabled={isActioning}
            onClick={onApprove}
            className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 font-semibold"
          >
            {isActioning ? <Loader2 className="animate-spin" /> : <Check />}
            Sign
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1.5">
        {!compact && <Skeleton className="h-3 w-28 rounded-sm" />}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-2.5 w-8 rounded-sm" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-2.5 w-5 rounded-sm" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-2.5 w-6 rounded-sm" />
        <Skeleton className="h-5 w-14 rounded" />
      </div>
    </div>
  );
}

const STATUS_FILTERS = [
  "All",
  "Action needed",
  "Watching",
  "Executable",
  "Executed",
  "Rejected",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export function OperationsQueue({
  items,
  loading = false,
  showFilters = false,
  compact = false,
  hideChain = false,
  emptyStateCta,
  statsHeader,
  defaultStatusFilter = "All",
}: OperationsQueueProps) {
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(defaultStatusFilter);
  const [chainFilter, setChainFilter] = useState("All");
  const [multisigFilter, setMultisigFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [historyPage, setHistoryPage] = useState(1);
  const [batchQueue, setBatchQueue] = useState<WorkspaceQueueItem[] | null>(
    null
  );
  const [batchIndex, setBatchIndex] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const proposalKey = searchParams.get("proposal");
  const isWide = useMediaQuery("(min-width: 1280px)");

  const selectedItem = useMemo(
    () =>
      proposalKey
        ? (items.find((i) => i.focusKey === proposalKey) ?? null)
        : null,
    [items, proposalKey]
  );

  useEffect(() => {
    if (proposalKey && !selectedItem && !batchQueue && !loading) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("proposal");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }
  }, [proposalKey, selectedItem, batchQueue, loading, searchParams, router]);

  const selectProposal = useCallback(
    (item: WorkspaceQueueItem | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (item) params.set("proposal", item.focusKey);
      else params.delete("proposal");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [searchParams, router]
  );

  const chainOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.multisig.chainName))).sort(),
    [items]
  );
  const multisigOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((i) => i.multisig.label ?? "Unnamed"))
      ).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (
        statusFilter === "Action needed" &&
        !item.needsYourSignature &&
        !item.readyToExecute
      )
        return false;
      if (
        statusFilter === "Watching" &&
        (item.needsYourSignature ||
          item.readyToExecute ||
          item.proposal.status !== "Active")
      )
        return false;
      if (statusFilter === "Executable" && !item.readyToExecute) return false;
      if (statusFilter === "Executed" && item.proposal.status !== "Executed")
        return false;
      if (statusFilter === "Rejected" && item.proposal.status !== "Rejected")
        return false;
      if (chainFilter !== "All" && item.multisig.chainName !== chainFilter)
        return false;
      if (
        multisigFilter !== "All" &&
        (item.multisig.label ?? "Unnamed") !== multisigFilter
      )
        return false;
      if (
        search &&
        !item.multisig.label?.toLowerCase().includes(search.toLowerCase()) &&
        !`#${item.proposal.transactionIndex}`.includes(search)
      )
        return false;
      return true;
    });
  }, [items, statusFilter, chainFilter, multisigFilter, search]);

  const actionItems = useMemo(
    () => filtered.filter((i) => i.needsYourSignature || i.readyToExecute),
    [filtered]
  );
  const watchingItems = useMemo(
    () =>
      filtered.filter(
        (i) =>
          !i.needsYourSignature &&
          !i.readyToExecute &&
          i.proposal.status === "Active"
      ),
    [filtered]
  );
  const historyItems = useMemo(
    () =>
      filtered.filter(
        (i) =>
          !i.needsYourSignature &&
          !i.readyToExecute &&
          i.proposal.status !== "Active"
      ),
    [filtered]
  );

  const totalHistoryPages = Math.ceil(historyItems.length / PAGE_SIZE);
  const historyStart = (historyPage - 1) * PAGE_SIZE;
  const paginatedHistory = historyItems.slice(
    historyStart,
    historyStart + PAGE_SIZE
  );

  const selectableKeys = useMemo(
    () => actionItems.map((i) => i.focusKey),
    [actionItems]
  );
  const allSelected =
    selectableKeys.length > 0 && selectableKeys.every((k) => selected.has(k));

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectableKeys));
  };

  const toggleSelect = (focusKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(focusKey)) next.delete(focusKey);
      else next.add(focusKey);
      return next;
    });
  };

  const selectedActionItems = useMemo(
    () => actionItems.filter((i) => selected.has(i.focusKey)),
    [actionItems, selected]
  );
  const canApproveItems = selectedActionItems.filter(
    (i) => i.needsYourSignature && !i.currentUserApproved
  );
  const canExecuteItems = selectedActionItems.filter((i) => i.readyToExecute);

  // All approveables/executeables regardless of selection (for header quick-actions)
  const approveAllItems = useMemo(
    () =>
      actionItems.filter((i) => i.needsYourSignature && !i.currentUserApproved),
    [actionItems]
  );
  const executeAllItems = useMemo(
    () => actionItems.filter((i) => i.readyToExecute),
    [actionItems]
  );

  const openBatch = (items: WorkspaceQueueItem[]) => {
    if (items.length === 0) return;
    if (items.length === 1) {
      selectProposal(items[0]);
      return;
    }
    setBatchQueue(items);
    setBatchIndex(0);
    selectProposal(items[0]);
  };

  const closeBatch = () => {
    setBatchQueue(null);
    setBatchIndex(0);
  };

  const advanceBatch = (queue: WorkspaceQueueItem[], index: number) => {
    const next = index + 1;
    if (next >= queue.length) {
      closeBatch();
      selectProposal(null);
    } else {
      setBatchIndex(next);
      selectProposal(queue[next]);
    }
  };

  const handleBatchApprove = () => {
    openBatch(canApproveItems);
    setSelected(new Set());
  };

  const handleBatchExecute = () => {
    openBatch(canExecuteItems);
    setSelected(new Set());
  };

  const handleApproveAll = () => openBatch(approveAllItems);
  const handleExecuteAll = () => openBatch(executeAllItems);

  const resetPage = () => setHistoryPage(1);

  if (loading && items.length === 0) {
    return (
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-center gap-2 border-b px-3 py-2">
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-2.5 w-20 rounded-sm" />
          <Skeleton className="h-4 w-6 rounded-full" />
        </div>
        <div className="divide-border divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <RowSkeleton key={i} compact={compact} />
          ))}
        </div>
      </div>
    );
  }

  const activeItem = batchQueue ? (batchQueue[batchIndex] ?? null) : selectedItem;
  const isBatch = batchQueue !== null;
  const handleClose = () => {
    selectProposal(null);
    closeBatch();
  };
  const handleSkip = () => advanceBatch(batchQueue!, batchIndex);
  const handleActionSuccess = async () => {
    if (isBatch) {
      advanceBatch(batchQueue!, batchIndex);
    } else {
      selectProposal(null);
    }
  };

  const queueContent = (
    <div>
      {showFilters && items.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusFilter(f);
                  resetPage();
                }}
                className={cn(
                  "h-7 rounded-full border px-3 text-[11px] transition-colors",
                  statusFilter === f
                    ? "bg-foreground/[0.07] border-foreground/[0.11] text-foreground font-semibold"
                    : "text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/40 hover:border-border/50 border-transparent font-normal"
                )}
              >
                {f}
              </Button>
            ))}
          </div>
          {chainOptions.length > 1 && (
            <Select
              value={chainFilter}
              onValueChange={(v) => {
                setChainFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger size="sm" className="h-7 gap-1 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All chains</SelectItem>
                {chainOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {multisigOptions.length > 1 && (
            <Select
              value={multisigFilter}
              onValueChange={(v) => {
                setMultisigFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger size="sm" className="h-7 gap-1 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All vaults</SelectItem>
                {multisigOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            className="h-7 text-[11px] sm:w-44"
          />
        </div>
      )}

      {!showFilters && items.length > 5 && (
        <div className="mb-3">
          <Input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            className="h-8 text-[12px] sm:w-64"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        // When a dedicated CTA is provided for empty state, skip the generic icon/text —
        // the stats bar already communicates "All clear"
        emptyStateCta && items.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center",
              compact ? "py-5" : "py-4"
            )}
          >
            {emptyStateCta}
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 text-center",
              compact ? "py-5" : "py-7"
            )}
          >
            {items.length === 0 ? (
              <div
                className={cn(
                  "flex items-center justify-center border",
                  compact
                    ? "h-8 w-8 rounded-xl border-emerald-200/60 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                    : "h-10 w-10 rounded-xl border-emerald-200/60 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                )}
              >
                <CheckCircle2
                  className={cn(
                    "text-emerald-600/60 dark:text-emerald-500/60",
                    compact ? "h-3.5 w-3.5" : "h-5 w-5"
                  )}
                />
              </div>
            ) : (
              <div
                className={cn(
                  "bg-card border-border flex items-center justify-center border",
                  compact ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-xl"
                )}
              >
                <SlidersHorizontal
                  className={cn(
                    "text-muted-foreground/50",
                    compact ? "h-3.5 w-3.5" : "h-5 w-5"
                  )}
                />
              </div>
            )}
            <p
              className={cn(
                "text-muted-foreground/60",
                compact ? "text-[11px]" : "text-[13px]"
              )}
            >
              {items.length === 0
                ? "No proposals yet."
                : "No transactions match your filters."}
            </p>
            {items.length > 0 && filtered.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("All");
                  setChainFilter("All");
                  setMultisigFilter("All");
                  setSearch("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {actionItems.length > 0 && (
            <div className="border-border bg-card overflow-hidden rounded-xl border">
              <div className="border-primary/15 dark:border-primary/10 bg-primary/[0.04] dark:bg-primary/[0.06] flex items-center gap-2 border-b px-3 py-2">
                <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <p className="text-primary/70 text-[11px] font-semibold">
                  Action needed
                </p>
                <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
                  {actionItems.length}
                </span>
                {selectableKeys.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-muted-foreground/60 hover:text-muted-foreground text-[11px] transition-colors"
                  >
                    {allSelected ? "deselect all" : "select all"}
                  </button>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  {approveAllItems.length > 1 && (
                    <Button
                      size="xs"
                      onClick={handleApproveAll}
                      className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 font-semibold"
                    >
                      <Check />
                      Sign all ({approveAllItems.length})
                    </Button>
                  )}
                  {executeAllItems.length > 1 && (
                    <Button
                      size="xs"
                      onClick={handleExecuteAll}
                      className="border-emerald-700/30 bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                    >
                      <Zap />
                      Execute all ({executeAllItems.length})
                    </Button>
                  )}
                </div>
              </div>
              <div className="divide-border divide-y">
                {actionItems.map((item) => (
                  <QueueRow
                    key={item.focusKey}
                    item={item}
                    isSelected={selected.has(item.focusKey)}
                    isSelectable
                    isAnySelected={selected.size > 0}
                    onToggle={() => toggleSelect(item.focusKey)}
                    onClick={() => selectProposal(item)}
                    compact={compact}
                    hideChain={hideChain}
                    onApprove={
                      item.needsYourSignature && !item.currentUserApproved
                        ? () => selectProposal(item)
                        : undefined
                    }
                    onExecute={
                      item.readyToExecute
                        ? () => selectProposal(item)
                        : undefined
                    }
                    isActioning={false}
                  />
                ))}
              </div>
            </div>
          )}

          {watchingItems.length > 0 && (
            <div className="border-border bg-card overflow-hidden rounded-xl border">
              <div className="border-border flex items-center gap-2 border-b px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400/60 dark:bg-blue-500/50" />
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Watching
                </p>
                <span className="text-muted-foreground/50 font-mono text-[11px] tabular-nums">
                  {watchingItems.length}
                </span>
              </div>
              <div className="divide-border divide-y">
                {watchingItems.map((item) => (
                  <QueueRow
                    key={item.focusKey}
                    item={item}
                    isSelected={false}
                    isSelectable={false}
                    onToggle={() => {}}
                    onClick={() => selectProposal(item)}
                    compact={compact}
                    hideChain={hideChain}
                  />
                ))}
              </div>
            </div>
          )}

          {historyItems.length > 0 && (
            <div>
              <div className="border-border bg-card overflow-hidden rounded-xl border">
                <div className="border-border flex items-center gap-2 border-b px-3 py-2">
                  <span className="bg-muted-foreground/50 h-1.5 w-1.5 rounded-full" />
                  <p className="text-muted-foreground/50 text-[11px] font-medium">
                    History
                  </p>
                  <span className="text-muted-foreground/50 font-mono text-[11px] tabular-nums">
                    {historyItems.length}
                  </span>
                </div>
                <div className="divide-border divide-y">
                  {paginatedHistory.map((item) => (
                    <QueueRow
                      key={item.focusKey}
                      item={item}
                      isSelected={false}
                      isSelectable={false}
                      onToggle={() => {}}
                      onClick={() => selectProposal(item)}
                      compact={compact}
                      hideChain={hideChain}
                    />
                  ))}
                </div>
              </div>
              {totalHistoryPages > 1 && (
                <div className="mt-3">
                  <Pagination
                    currentPage={historyPage}
                    totalPages={totalHistoryPages}
                    onPageChange={setHistoryPage}
                    canGoNext={historyPage < totalHistoryPages}
                    canGoPrevious={historyPage > 1}
                    startIndex={historyStart}
                    endIndex={Math.min(
                      historyStart + PAGE_SIZE,
                      historyItems.length
                    )}
                    totalItems={historyItems.length}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && items.length > 0 && (
        <div className="text-muted-foreground/60 mt-2 flex items-center gap-2 py-1 text-[11px]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Refreshing...
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex w-full gap-0 xl:gap-5">
        <div className={cn("min-w-0 w-full", activeItem ? "flex-1" : "mx-auto max-w-3xl")}>
          {statsHeader}
          {queueContent}
        </div>

        {activeItem && (
          <aside className="hidden animate-in fade-in-0 slide-in-from-right-4 duration-300 ease-out motion-reduce:animate-none xl:sticky xl:top-[54px] xl:block xl:max-h-[calc(100svh-54px)] xl:w-[480px] xl:shrink-0 xl:overflow-y-auto xl:rounded-2xl xl:border xl:border-border xl:bg-card 2xl:w-[600px]">
            <ProposalDetailView
              item={activeItem}
              onBack={handleClose}
              batchTotal={isBatch ? batchQueue!.length : undefined}
              batchIndex={isBatch ? batchIndex : undefined}
              onSkip={isBatch ? handleSkip : undefined}
              onActionSuccess={handleActionSuccess}
            />
          </aside>
        )}
      </div>

      {/* Proposal detail modal — only on narrow screens (<xl) */}
      <Dialog
        open={!isWide && !!activeItem}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <VisuallyHidden>
            <DialogTitle>Proposal Detail</DialogTitle>
            <DialogDescription>
              Review the selected proposal details and available actions.
            </DialogDescription>
          </VisuallyHidden>
          {activeItem && (
            <ProposalDetailView
              item={activeItem}
              onBack={handleClose}
              batchTotal={isBatch ? batchQueue!.length : undefined}
              batchIndex={isBatch ? batchIndex : undefined}
              onSkip={isBatch ? handleSkip : undefined}
              onActionSuccess={handleActionSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk action bar — appears when items selected via checkboxes */}
      <div
        className={cn(
          "fixed right-0 bottom-0 left-0 z-50 transition-transform duration-200",
          selected.size > 0 ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pb-6">
          <div className="bg-card border-border flex items-center justify-between rounded-2xl border px-5 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(245,158,11,0.12)]">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selected.size > 0}
                onCheckedChange={() => setSelected(new Set())}
                className="size-3.5"
                aria-label="Clear selection"
              />
              <span className="text-foreground text-[13px]">
                {selected.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canApproveItems.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBatchApprove}
                  className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
                >
                  <Check className="h-3.5 w-3.5" />
                  Sign ({canApproveItems.length})
                </Button>
              )}
              {canExecuteItems.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBatchExecute}
                  className="border-emerald-700/30 bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Execute ({canExecuteItems.length})
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
