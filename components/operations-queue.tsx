"use client";

import { Check, Inbox, Loader2, Zap } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { ProposalDetailView } from "@/components/proposal-detail-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useProposalActions } from "@/lib/hooks/use-proposal-actions";
import { cn } from "@/lib/utils";
import type { WorkspaceQueueItem } from "@/types/workspace";

const PAGE_SIZE = 15;
const GRID_COLS_FULL = "36px 1.4fr 54px 80px 1fr 80px 48px 80px";
const GRID_COLS_COMPACT = "36px 54px 80px 1fr 80px 48px 60px";

interface OperationsQueueProps {
  items: WorkspaceQueueItem[];
  loading?: boolean;
  showFilters?: boolean;
  compact?: boolean;
  emptyStateCta?: ReactNode;
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
      <span className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400 rounded border px-1.5 py-0.5">
        Ready to execute
      </span>
    );
  }
  if (item.needsYourSignature) {
    return (
      <span className="border-primary/30 bg-primary/10 text-primary text-[10px] rounded border px-1.5 py-0.5">
        Waiting on you
      </span>
    );
  }
  if (item.proposal.status === "Rejected") {
    return (
      <span className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive rounded border px-1.5 py-0.5">
        Rejected
      </span>
    );
  }
  if (item.proposal.status === "Executed") {
    return (
      <span className="text-muted-foreground/70 text-[10px] rounded border border-border px-1.5 py-0.5">
        Executed
      </span>
    );
  }
  return (
    <span className="text-muted-foreground text-[10px] rounded border border-border px-1.5 py-0.5">
      {item.approvalCount}/{item.multisig.threshold} signed
    </span>
  );
}

function ProgressBar({ item }: { item: WorkspaceQueueItem }) {
  const pct = Math.min(
    100,
    Math.round((item.approvalCount / item.multisig.threshold) * 100)
  );
  const barColor = item.readyToExecute
    ? "bg-emerald-600 dark:bg-emerald-500"
    : item.needsYourSignature
      ? "bg-primary"
      : "bg-muted-foreground/30";
  return (
    <div className="flex items-center gap-1.5">
      <div className="bg-muted h-1.5 w-10 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground/70 font-mono text-[10px]">
        {item.approvalCount}/{item.multisig.threshold}
      </span>
    </div>
  );
}

function ColumnHeaders({
  selectable,
  allSelected,
  onToggleAll,
  compact = false,
}: {
  selectable: boolean;
  allSelected: boolean;
  onToggleAll: () => void;
  compact?: boolean;
}) {
  const cols = compact
    ? ["TX", "Chain", "Status", "Progress", "Age", ""]
    : ["Multisig", "TX", "Chain", "Status", "Progress", "Age", ""];
  return (
    <div
      className="border-border bg-muted/60 grid items-center border-b px-3 py-2"
      style={{ gridTemplateColumns: compact ? GRID_COLS_COMPACT : GRID_COLS_FULL }}
    >
      <div className="flex items-center justify-center">
        {selectable && (
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleAll}
            className="size-3.5"
            aria-label="Select all"
          />
        )}
      </div>
      {cols.map((h) => (
        <span
          key={h}
          className="text-muted-foreground/60 text-[11px] font-semibold tracking-widest uppercase"
        >
          {h}
        </span>
      ))}
    </div>
  );
}

function QueueRow({
  item,
  isSelected,
  isSelectable,
  onToggle,
  onClick,
  compact = false,
  onApprove,
  onExecute,
  isActioning = false,
}: {
  item: WorkspaceQueueItem;
  isSelected: boolean;
  isSelectable: boolean;
  onToggle: () => void;
  onClick: () => void;
  compact?: boolean;
  onApprove?: () => void;
  onExecute?: () => void;
  isActioning?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid cursor-pointer items-center px-3 py-2.5 transition-colors",
        isSelected ? "bg-primary/8"
        : item.readyToExecute ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/20 [box-shadow:inset_2px_0_0_rgba(5,150,105,0.4)]"
        : item.needsYourSignature && !item.currentUserApproved ? "hover:bg-primary/5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.4)]"
        : "hover:bg-muted"
      )}
      style={{ gridTemplateColumns: compact ? GRID_COLS_COMPACT : GRID_COLS_FULL }}
      onClick={onClick}
    >
      <div
        className="flex items-center justify-center"
        onClick={(e) => {
          if (!isSelectable) return;
          e.stopPropagation();
          onToggle();
        }}
      >
        {isSelectable && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="size-3.5"
            aria-label={`Select ${item.multisig.label ?? "proposal"}`}
          />
        )}
      </div>
      {!compact && (
        <div className="min-w-0 pr-2">
          <p className="text-foreground truncate text-[13px] font-medium">
            {item.multisig.label ?? "Unnamed"}
          </p>
          <p className="text-muted-foreground truncate text-[10px]">
            {item.multisig.provider === "safe" ? "Safe" : "Squads"}
          </p>
        </div>
      )}
      <span className="text-muted-foreground font-mono text-xs">
        #{item.proposal.transactionIndex.toString()}
      </span>
      <span className="text-muted-foreground font-mono text-[11px]">
        {item.multisig.chainName}
      </span>
      <div>
        <StatusBadge item={item} />
      </div>
      <ProgressBar item={item} />
      <span className="text-muted-foreground/70 font-mono text-[11px]">
        {formatAge(item.proposal.createdAt)}
      </span>
      <div
        className="flex items-center justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        {onExecute && item.readyToExecute ? (
          <Button
            size="xs"
            disabled={isActioning}
            onClick={onExecute}
            className={cn(
              "bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-700/30 font-semibold",
              compact && "h-6 w-6 p-0"
            )}
          >
            {isActioning ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Zap />
            )}
            {!compact && "Execute"}
          </Button>
        ) : onApprove && item.needsYourSignature && !item.currentUserApproved ? (
          <Button
            size="xs"
            disabled={isActioning}
            onClick={onApprove}
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 font-semibold",
              compact && "h-6 w-6 p-0"
            )}
          >
            {isActioning ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check />
            )}
            {!compact && "Approve"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="grid items-center px-3 py-2.5"
      style={{ gridTemplateColumns: compact ? GRID_COLS_COMPACT : GRID_COLS_FULL }}
    >
      <div />
      {!compact && (
        <div className="space-y-1 pr-2">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-2.5 w-10 rounded-sm" />
        </div>
      )}
      <Skeleton className="h-3 w-8 rounded-sm" />
      <Skeleton className="h-3 w-16 rounded-sm" />
      <Skeleton className="h-4 w-20 rounded-full" />
      <Skeleton className="h-1.5 w-10 rounded-full" />
      <Skeleton className="h-3 w-6 rounded-sm" />
      <div />
    </div>
  );
}

const STATUS_FILTERS = [
  "All",
  "Action needed",
  "Pending",
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
  emptyStateCta,
  defaultStatusFilter = "All",
}: OperationsQueueProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(defaultStatusFilter);
  const [chainFilter, setChainFilter] = useState("All");
  const [multisigFilter, setMultisigFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<WorkspaceQueueItem | null>(null);

  const { approveByAddress, executeByAddress, isActionInProgress } =
    useProposalActions();

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
      if (statusFilter === "Pending" && item.proposal.status !== "Active")
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
  const historyItems = useMemo(
    () => filtered.filter((i) => !i.needsYourSignature && !i.readyToExecute),
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

  const handleBatchApprove = async () => {
    for (const item of canApproveItems) {
      await approveByAddress(
        item.multisig.address,
        item.proposal.transactionIndex,
        item.multisig.chainId
      );
    }
    setSelected(new Set());
  };

  const handleBatchExecute = async () => {
    for (const item of canExecuteItems) {
      await executeByAddress(
        item.multisig.address,
        item.proposal.transactionIndex,
        item.multisig.chainId
      );
    }
    setSelected(new Set());
  };

  const resetPage = () => setHistoryPage(1);

  if (loading && items.length === 0) {
    return (
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <ColumnHeaders
          selectable={false}
          allSelected={false}
          onToggleAll={() => {}}
          compact={compact}
        />
        <div className="divide-border/50 divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} compact={compact} />
          ))}
        </div>
      </div>
    );
  }

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
                onClick={() => {
                  setStatusFilter(f);
                  resetPage();
                }}
                className={cn(
                  "h-7 rounded-full px-3 text-[11px] font-medium",
                  statusFilter === f
                    ? "bg-foreground text-background hover:bg-foreground/90 border-foreground/20"
                    : ""
                )}
                variant={statusFilter === f ? undefined : "outline"}
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
                <SelectItem value="All">All multisigs</SelectItem>
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

      {!showFilters && items.length > 0 && (
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
        <div className={cn("flex flex-col items-center justify-center gap-4 text-center", compact ? "py-10" : "py-16")}>
          <div className="bg-muted border-border flex h-12 w-12 items-center justify-center rounded-2xl border">
            <Inbox className="text-muted-foreground/60 h-5 w-5" />
          </div>
          <p className="text-muted-foreground text-sm">
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
          {emptyStateCta && items.length === 0 && emptyStateCta}
        </div>
      ) : (
        <div className="space-y-4">
          {actionItems.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="bg-primary h-2 w-2 rounded-full" />
                <p className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-widest">
                  Needs attention
                </p>
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
                  {actionItems.length}
                </span>
              </div>
              <div className="border-border bg-card overflow-hidden rounded-xl border">
                <ColumnHeaders
                  selectable
                  allSelected={allSelected}
                  onToggleAll={toggleSelectAll}
                  compact={compact}
                />
                <div className="divide-border/50 divide-y">
                  {actionItems.map((item) => (
                    <QueueRow
                      key={item.focusKey}
                      item={item}
                      isSelected={selected.has(item.focusKey)}
                      isSelectable
                      onToggle={() => toggleSelect(item.focusKey)}
                      onClick={() => setSelectedItem(item)}
                      compact={compact}
                      onApprove={
                        item.needsYourSignature && !item.currentUserApproved
                          ? () =>
                              approveByAddress(
                                item.multisig.address,
                                item.proposal.transactionIndex,
                                item.multisig.chainId
                              )
                          : undefined
                      }
                      onExecute={
                        item.readyToExecute
                          ? () =>
                              executeByAddress(
                                item.multisig.address,
                                item.proposal.transactionIndex,
                                item.multisig.chainId
                              )
                          : undefined
                      }
                      isActioning={isActionInProgress}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {historyItems.length > 0 && (
            <div>
              {actionItems.length > 0 && (
                <p className="text-muted-foreground/60 mb-2 text-[11px] font-semibold uppercase tracking-widest">
                  History
                </p>
              )}
              <div className="border-border bg-card overflow-hidden rounded-xl border">
                <ColumnHeaders
                  selectable={false}
                  allSelected={false}
                  onToggleAll={() => {}}
                  compact={compact}
                />
                <div className="divide-border/50 divide-y">
                  {paginatedHistory.map((item) => (
                    <QueueRow
                      key={item.focusKey}
                      item={item}
                      isSelected={false}
                      isSelectable={false}
                      onToggle={() => {}}
                      onClick={() => setSelectedItem(item)}
                      compact={compact}
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
        <div className="text-muted-foreground/70 mt-2 flex items-center gap-2 py-1 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Refreshing...
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-start gap-0">
        {/* Queue pane - hidden on mobile when detail open, flex-1 on desktop */}
        <div
          className={cn(
            "min-w-0 flex-1",
            selectedItem && "max-lg:hidden"
          )}
        >
          {queueContent}
        </div>

        {/* Detail panel - full-screen on mobile, sticky 42% panel on desktop */}
        {selectedItem && (
          <div className="flex-1 bg-card lg:flex-none lg:w-[42%] lg:min-w-[360px] lg:border-l lg:border-border lg:sticky lg:top-[54px] lg:max-h-[calc(100svh-54px)] lg:overflow-y-auto">
            <ProposalDetailView
              item={selectedItem}
              onBack={() => setSelectedItem(null)}
              onActionSuccess={async () => {
                setSelectedItem(null);
              }}
            />
          </div>
        )}
      </div>

      {/* Batch action bar - fixed, always renders outside flex container */}
      <div
        className={cn(
          "fixed right-0 bottom-0 left-0 z-50 transition-transform duration-200",
          selected.size > 0 ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pb-6">
          <div className="bg-foreground flex items-center justify-between rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.24)]">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selected.size > 0}
                onCheckedChange={() => setSelected(new Set())}
                className="size-3.5"
                aria-label="Clear selection"
              />
              <span className="text-background text-[13px]">
                {selected.size} transaction{selected.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canApproveItems.length > 0 && (
                <Button
                  size="sm"
                  disabled={isActionInProgress}
                  onClick={handleBatchApprove}
                  className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
                >
                  {isActionInProgress ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Approve ({canApproveItems.length})
                </Button>
              )}
              {canExecuteItems.length > 0 && (
                <Button
                  size="sm"
                  disabled={isActionInProgress}
                  onClick={handleBatchExecute}
                  className="bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-700/30"
                >
                  {isActionInProgress ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  Execute ({canExecuteItems.length})
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
                className="text-background/70 hover:text-background hover:bg-background/10 border-background/20"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
