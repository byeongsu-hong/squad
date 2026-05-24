"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { ProposalDetailModal } from "@/components/proposal-detail-modal";
import { RegistryManagementDialog } from "@/components/registry-management-dialog";
import { ProposalCardSkeletonList } from "@/components/skeletons";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useProposalActions } from "@/lib/hooks/use-proposal-actions";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";

import { useWalletStore } from "@/stores/wallet-store";
import type { WorkspaceQueueItem } from "@/types/workspace";

interface OperationsDashboardProps {
  actions?: React.ReactNode;
}

function formatAge(createdAt?: string): string {
  if (!createdAt) return "--";
  const ms = Date.now() - Date.parse(createdAt);
  if (Number.isNaN(ms) || ms < 0) return "--";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function StatusBadge({ item }: { item: WorkspaceQueueItem }) {
  if (item.readyToExecute) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-400">
        Ready to execute
      </span>
    );
  }
  if (item.needsYourSignature) {
    return (
      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
        Waiting on you
      </span>
    );
  }
  if (item.proposal.status === "Executed") {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground/70">
        Executed
      </span>
    );
  }
  if (item.proposal.status === "Rejected") {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
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
    ? "bg-green-600 dark:bg-green-500"
    : item.needsYourSignature
      ? "bg-primary"
      : "bg-muted-foreground/30";

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-muted-foreground/70">
        {item.approvalCount}/{item.multisig.threshold}
      </span>
    </div>
  );
}

const STATUS_FILTERS = ["All", "Action needed", "Pending", "Executable", "Executed", "Rejected"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export function OperationsDashboard({ actions }: OperationsDashboardProps = {}) {
  const { publicKey, connected } = useWalletStore();
  const { isConnected: evmConnected, address: evmAddress } = useAccount();
  const { loading, proposals, workspaceMultisigs } = useProposalsQuery();

  const queueItems = useWorkspaceQueue({
    workspaceProposals: proposals,
    multisigs: workspaceMultisigs,
    viewerAddress: publicKey?.toString() ?? null,
    getViewerAddressForMultisig: (multisig) =>
      multisig.provider === "safe"
        ? (evmAddress ?? null)
        : (publicKey?.toString() ?? null),
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [chainFilter, setChainFilter] = useState("All");
  const [multisigFilter, setMultisigFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalItem, setModalItem] = useState<WorkspaceQueueItem | null>(null);

  const chainOptions = useMemo(() => {
    const names = Array.from(new Set(queueItems.map((i) => i.multisig.chainName)));
    return names.sort();
  }, [queueItems]);

  const multisigOptions = useMemo(() => {
    const labels = Array.from(
      new Set(queueItems.map((i) => i.multisig.label ?? "Unnamed"))
    );
    return labels.sort();
  }, [queueItems]);

  const filtered = useMemo(() => {
    return queueItems.filter((item) => {
      if (statusFilter === "Action needed" && !item.needsYourSignature && !item.readyToExecute) return false;
      if (statusFilter === "Pending" && item.proposal.status !== "Active") return false;
      if (statusFilter === "Executable" && !item.readyToExecute) return false;
      if (statusFilter === "Executed" && item.proposal.status !== "Executed") return false;
      if (statusFilter === "Rejected" && item.proposal.status !== "Rejected") return false;
      if (chainFilter !== "All" && item.multisig.chainName !== chainFilter) return false;
      if (multisigFilter !== "All" && (item.multisig.label ?? "Unnamed") !== multisigFilter) return false;
      if (
        search &&
        !item.multisig.label?.toLowerCase().includes(search.toLowerCase()) &&
        !`#${item.proposal.transactionIndex}`.includes(search)
      )
        return false;
      return true;
    });
  }, [queueItems, statusFilter, chainFilter, multisigFilter, search]);

  const pendingCount = queueItems.filter((i) => i.proposal.status === "Active").length;
  const executableCount = queueItems.filter((i) => i.readyToExecute).length;

  const selectedItems = useMemo(
    () => filtered.filter((i) => selected.has(i.focusKey)),
    [filtered, selected]
  );
  const canApproveItems = selectedItems.filter(
    (i) => i.proposal.status === "Active" && !i.currentUserApproved && i.needsYourSignature
  );
  const canExecuteItems = selectedItems.filter((i) => i.readyToExecute);

  const { approveByAddress, executeByAddress, isActionInProgress } = useProposalActions();

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

  const toggleSelect = (focusKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(focusKey)) next.delete(focusKey);
      else next.add(focusKey);
      return next;
    });
  };

  const allSelectableKeys = filtered
    .filter((i) => i.proposal.status === "Active" || i.readyToExecute)
    .map((i) => i.focusKey);

  const allSelected =
    allSelectableKeys.length > 0 &&
    allSelectableKeys.every((k) => selected.has(k));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allSelectableKeys));
    }
  };

  const hasConnectedWallet = connected || evmConnected;

  if (workspaceMultisigs.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Operations</h1>
          </div>
          <RegistryManagementDialog />
        </div>
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground/70">
          Connect a wallet and configure your workspace in Settings.
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex flex-col" style={{ minHeight: "calc(100svh - 6.5rem)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Operations</h1>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            {pendingCount} pending · {executableCount} executable · {queueItems.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <RegistryManagementDialog compact />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                statusFilter === f
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <select
          value={chainFilter}
          onChange={(e) => setChainFilter(e.target.value)}
          className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground focus:outline-none"
        >
          <option value="All">Chain</option>
          {chainOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={multisigFilter}
          onChange={(e) => setMultisigFilter(e.target.value)}
          className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground focus:outline-none"
        >
          <option value="All">Multisig</option>
          {multisigOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-[12px] text-foreground/80 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-border"
          />
        </div>
      </div>

      {loading && queueItems.length === 0 ? (
        <ProposalCardSkeletonList />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground/70">
          {queueItems.length === 0
            ? "No transactions found. Connect a wallet and configure your workspace in Settings."
            : "No transactions match your filters."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid items-center border-b border-border bg-background px-3 py-2" style={{ gridTemplateColumns: "36px 1.4fr 54px 80px 1fr 80px 48px" }}>
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded accent-primary"
                aria-label="Select all"
              />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Multisig</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">TX</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Chain</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Status</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Progress</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Age</span>
          </div>

          <div className="divide-y divide-border/50">
            {filtered.map((item) => {
              const isSelectable = item.proposal.status === "Active" || item.readyToExecute;
              const isSelected = selected.has(item.focusKey);

              return (
                <div
                  key={item.focusKey}
                  className={cn(
                    "grid cursor-pointer items-center px-3 py-2.5 transition-colors",
                    isSelected ? "bg-primary/8" : "hover:bg-muted"
                  )}
                  style={{ gridTemplateColumns: "36px 1.4fr 54px 80px 1fr 80px 48px" }}
                  onClick={() => setModalItem(item)}
                >
                  <div
                    className="flex items-center justify-center"
                    onClick={(e) => {
                      if (!isSelectable) return;
                      e.stopPropagation();
                      toggleSelect(item.focusKey);
                    }}
                  >
                    {isSelectable && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.focusKey)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 rounded accent-primary"
                        aria-label={`Select ${item.multisig.label ?? "proposal"}`}
                      />
                    )}
                  </div>

                  <div className="min-w-0 pr-2">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {item.multisig.label ?? "Unnamed"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {item.multisig.provider === "safe" ? "Safe" : "Squads"}
                    </p>
                  </div>

                  <span className="font-mono text-xs text-muted-foreground">
                    #{item.proposal.transactionIndex.toString()}
                  </span>

                  <span className="font-mono text-[11px] text-muted-foreground">
                    {item.multisig.chainName}
                  </span>

                  <div>
                    <StatusBadge item={item} />
                  </div>

                  <ProgressBar item={item} />

                  <span className="font-mono text-[11px] text-muted-foreground/70">
                    {formatAge(item.proposal.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && queueItems.length > 0 && (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground/70">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Refreshing...
        </div>
      )}

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-200",
          selected.size > 0 ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mx-auto max-w-3xl px-4 pb-6">
          <div className="flex items-center justify-between rounded-2xl bg-foreground px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.24)]">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.size > 0}
                onChange={() => setSelected(new Set())}
                className="h-3.5 w-3.5 rounded accent-primary"
                aria-label="Clear selection"
              />
              <span className="text-[13px] text-background">
                {selected.size} transaction{selected.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canApproveItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchApprove}
                  disabled={isActionInProgress}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
                >
                  {isActionInProgress ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "✓"
                  )}
                  Approve ({canApproveItems.length})
                </button>
              )}
              {canExecuteItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchExecute}
                  disabled={isActionInProgress}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {isActionInProgress ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "→"
                  )}
                  Execute ({canExecuteItems.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-lg border border-background/20 px-3.5 py-1.5 text-[12px] text-background/70 transition-colors hover:border-background/30 hover:text-background"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProposalDetailModal
        item={modalItem}
        open={modalItem !== null}
        onClose={() => setModalItem(null)}
        onActionSuccess={async () => {}}
      />
    </section>
  );
}
