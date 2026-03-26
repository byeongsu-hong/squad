"use client";

import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  Eye,
  FolderOpen,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AddressWithLabel } from "@/components/address-with-label";
import { ProposalCardSkeletonList } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useProposalActions } from "@/lib/hooks/use-proposal-actions";
import { useProposalDeskQuerySync } from "@/lib/hooks/use-workspace-query-sync";
import { cn } from "@/lib/utils";
import {
  buildWorkspaceQueueItem,
  fromWorkspaceProposal,
  invalidateSquadsProposalCache,
  loadSquadsWorkspaceProposalsForMultisig,
  toWorkspaceMultisig,
  toWorkspaceProposalFromRaw,
} from "@/lib/workspace/squads-adapter";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ProposalAccount } from "@/types/multisig";
import type { WorkspaceQueueItem } from "@/types/workspace";

import { TransactionDetailDialog } from "./transaction-detail-dialog";

interface ProposalListProps {
  onLoadingChange?: (loading: boolean) => void;
  refreshTrigger?: number;
}

function formatCompactAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getStatusTone(item: WorkspaceQueueItem) {
  if (item.needsYourSignature) {
    return "text-lime-300";
  }
  if (item.readyToExecute) {
    return "text-lime-200";
  }
  if (item.proposal.status === "Rejected") {
    return "text-red-300";
  }
  if (item.proposal.status === "Executed") {
    return "text-zinc-300";
  }
  return "text-zinc-400";
}

export function ProposalList({
  onLoadingChange,
  refreshTrigger,
}: ProposalListProps = {}) {
  const [loading, setLoading] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] =
    useState<ProposalAccount | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { publicKey, connected } = useWalletStore();
  const { chains } = useChainStore();
  const {
    multisigs,
    proposals,
    setProposals,
    getSelectedMultisig,
    selectedMultisigKey,
    selectMultisig,
  } = useMultisigStore();
  const {
    proposalDeskFocusedProposalKey: focusedProposalKey,
    proposalDeskQueueFilter: queueFilter,
    setProposalDeskFocusedProposalKey: setFocusedProposalKey,
    setProposalDeskQueueFilter: setQueueFilter,
  } = useWorkspaceStore();

  const selectedMultisig = getSelectedMultisig();
  const workspaceSelectedMultisig = useMemo(
    () =>
      selectedMultisig ? toWorkspaceMultisig(selectedMultisig, chains) : null,
    [chains, selectedMultisig]
  );
  const availableMultisigKeys = useMemo(
    () => multisigs.map((multisig) => multisig.publicKey.toString()),
    [multisigs]
  );

  const isMember = Boolean(
    publicKey &&
    selectedMultisig?.members.some(
      (member: { key: { toString: () => string } }) =>
        member.key.toString() === publicKey.toString()
    )
  );

  const loadProposals = useCallback(async () => {
    const multisig = getSelectedMultisig();
    if (!multisig) return;

    setLoading(true);
    onLoadingChange?.(true);

    try {
      const loadedProposals = await loadSquadsWorkspaceProposalsForMultisig(
        multisig,
        chains
      );
      setProposals(loadedProposals.map(fromWorkspaceProposal));
    } catch (error) {
      console.error("Failed to load proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [chains, getSelectedMultisig, onLoadingChange, setProposals]);

  const { approve, reject, execute, actionLoading, isActionInProgress } =
    useProposalActions({
      onSuccess: loadProposals,
    });

  useEffect(() => {
    loadProposals();
  }, [loadProposals, refreshTrigger]);

  useProposalDeskQuerySync({
    searchParams,
    pathname,
    replace: (href) => router.replace(href, { scroll: false }),
    availableMultisigKeys,
    selectedMultisigKey,
    queueFilter,
    focusedProposalKey,
    selectMultisig,
    setQueueFilter,
    setFocusedProposalKey,
  });

  const handleRefresh = async () => {
    const multisig = getSelectedMultisig();
    if (!multisig) return;
    invalidateSquadsProposalCache(
      multisig.chainId,
      multisig.publicKey.toString(),
      chains
    );
    await loadProposals();
  };

  const queueItems = useMemo(
    () =>
      proposals
        .map((proposal) => {
          if (!workspaceSelectedMultisig) {
            return null;
          }

          return buildWorkspaceQueueItem(
            toWorkspaceProposalFromRaw(
              proposal,
              workspaceSelectedMultisig.chainId
            ),
            workspaceSelectedMultisig,
            publicKey?.toString() ?? null
          );
        })
        .filter((item): item is WorkspaceQueueItem => item !== null)
        .sort((left, right) => {
          if (left.priority !== right.priority) {
            return left.priority - right.priority;
          }
          return Number(
            right.proposal.transactionIndex - left.proposal.transactionIndex
          );
        }),
    [proposals, publicKey, workspaceSelectedMultisig]
  );

  const filteredQueueItems = useMemo(() => {
    if (queueFilter === "waiting") {
      return queueItems.filter((item) => item.needsYourSignature);
    }

    if (queueFilter === "executable") {
      return queueItems.filter((item) => item.readyToExecute);
    }

    return queueItems;
  }, [queueFilter, queueItems]);

  const pagination = usePagination(filteredQueueItems, {
    totalItems: filteredQueueItems.length,
    itemsPerPage: 12,
  });
  const { goToPage } = pagination;

  useEffect(() => {
    const availableKeys = new Set(
      queueItems.map((item) => item.proposal.transactionIndex.toString())
    );
    if (focusedProposalKey && availableKeys.has(focusedProposalKey)) {
      return;
    }

    const nextFocus = filteredQueueItems[0] ?? queueItems[0];
    setFocusedProposalKey(
      nextFocus?.proposal.transactionIndex.toString() ?? null
    );
  }, [
    filteredQueueItems,
    focusedProposalKey,
    queueItems,
    setFocusedProposalKey,
  ]);

  useEffect(() => {
    if (!focusedProposalKey) {
      return;
    }

    const focusedIndex = filteredQueueItems.findIndex(
      (item) => item.proposal.transactionIndex.toString() === focusedProposalKey
    );

    if (focusedIndex === -1) {
      return;
    }

    goToPage(Math.floor(focusedIndex / 12) + 1);
  }, [filteredQueueItems, focusedProposalKey, goToPage]);

  const focusedItem =
    queueItems.find(
      (item) => item.proposal.transactionIndex.toString() === focusedProposalKey
    ) ?? queueItems[0];

  const waitingOnYouCount = queueItems.filter(
    (item) => item.needsYourSignature
  ).length;
  const executableCount = queueItems.filter(
    (item) => item.readyToExecute
  ).length;
  const currentChainName = selectedMultisig
    ? (chains.find((item) => item.id === selectedMultisig.chainId)?.name ??
      selectedMultisig.chainId)
    : null;

  const focusedActionPrefix = selectedMultisig
    ? selectedMultisig.publicKey.toString()
    : null;

  const isApproveLoading = Boolean(
    focusedItem &&
    focusedActionPrefix &&
    actionLoading ===
      `approve-${focusedActionPrefix}-${focusedItem.proposal.transactionIndex}`
  );
  const isRejectLoading = Boolean(
    focusedItem &&
    focusedActionPrefix &&
    actionLoading ===
      `reject-${focusedActionPrefix}-${focusedItem.proposal.transactionIndex}`
  );
  const isExecuteLoading = Boolean(
    focusedItem &&
    focusedActionPrefix &&
    actionLoading ===
      `execute-${focusedActionPrefix}-${focusedItem.proposal.transactionIndex}`
  );

  const handleViewDetail = (proposal: ProposalAccount) => {
    setSelectedProposal(proposal);
    setDetailDialogOpen(true);
  };

  const handleApprove = async (transactionIndex: bigint) => {
    if (!selectedMultisig) return;
    await approve(
      selectedMultisig.publicKey,
      transactionIndex,
      selectedMultisig.chainId
    );
  };

  const handleReject = async (transactionIndex: bigint) => {
    if (!selectedMultisig) return;
    await reject(
      selectedMultisig.publicKey,
      transactionIndex,
      selectedMultisig.chainId
    );
  };

  const handleExecute = async (transactionIndex: bigint) => {
    if (!selectedMultisig) return;
    await execute(
      selectedMultisig.publicKey,
      transactionIndex,
      selectedMultisig.chainId
    );
  };

  if (!selectedMultisig) {
    return (
      <section className="space-y-4">
        {multisigs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-800 pb-4 text-sm text-zinc-400">
            <p className="text-[0.72rem] font-medium tracking-[0.24em] text-zinc-500 uppercase">
              Signing Desk / Select Multisig
            </p>
            <span className="text-zinc-100">
              Choose a multisig to open the work queue.
            </span>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
            <span>
              {connected ? "Wallet connected" : "Wallet disconnected"}
            </span>
            <Button
              asChild
              className="ml-auto rounded-md bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
            >
              <Link href="/">
                <FolderOpen className="h-4 w-4" />
                Open dashboard
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
            <p className="text-[0.72rem] font-medium tracking-[0.24em] text-zinc-500 uppercase">
              Signing Desk / Cold Start
            </p>
            <span className="text-zinc-100">No multisigs loaded.</span>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
            <span>
              {connected ? "Wallet connected" : "Wallet disconnected"}
            </span>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
            <span>Connect wallet from the top bar.</span>
            <span>Create or import a multisig from the registry.</span>
            <Button
              asChild
              className="rounded-md bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
            >
              <Link href="/">
                <FolderOpen className="h-4 w-4" />
                Open dashboard
              </Link>
            </Button>
          </div>
        )}

        {multisigs.length > 0 && (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
              {multisigs.map((multisig) => {
                const chainName =
                  chains.find((item) => item.id === multisig.chainId)?.name ??
                  multisig.chainId;

                return (
                  <button
                    key={multisig.publicKey.toString()}
                    type="button"
                    onClick={() =>
                      selectMultisig(multisig.publicKey.toString())
                    }
                    className="min-w-[17rem] rounded-[1.15rem] border border-zinc-800 bg-zinc-950/80 px-4 py-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <p className="text-[0.68rem] tracking-[0.2em] text-zinc-500 uppercase">
                      {chainName}
                    </p>
                    <p className="mt-3 text-lg font-medium text-zinc-100">
                      {multisig.label || "Unnamed multisig"}
                    </p>
                    <div className="mt-5 flex items-center gap-4 text-sm text-zinc-400">
                      <span>{multisig.threshold} required</span>
                      <span>{multisig.members.length} members</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">
            <span>Signing Desk</span>
            {currentChainName && <span>{currentChainName}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-[clamp(1.45rem,2.4vw,2.4rem)] font-semibold tracking-[-0.045em] text-zinc-50">
              {selectedMultisig.label || "Unnamed multisig"}
            </h1>
            <span className="text-sm text-zinc-500">
              {formatCompactAddress(selectedMultisig.publicKey.toString())}
            </span>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
            <span className="text-sm text-zinc-400">
              {waitingOnYouCount} waiting on you
            </span>
            <span className="text-sm text-zinc-400">
              {executableCount} executable
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={queueFilter === "all" ? "default" : "outline"}
            className={cn(
              "h-9 rounded-md px-3 text-[0.68rem] tracking-[0.12em] uppercase",
              queueFilter === "all"
                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                : "border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900"
            )}
            onClick={() => setQueueFilter("all")}
          >
            All
          </Button>
          <Button
            variant={queueFilter === "waiting" ? "default" : "outline"}
            className={cn(
              "h-9 rounded-md px-3 text-[0.68rem] tracking-[0.12em] uppercase",
              queueFilter === "waiting"
                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                : "border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900"
            )}
            onClick={() => setQueueFilter("waiting")}
          >
            Waiting on me
          </Button>
          <Button
            variant={queueFilter === "executable" ? "default" : "outline"}
            className={cn(
              "h-9 rounded-md px-3 text-[0.68rem] tracking-[0.12em] uppercase",
              queueFilter === "executable"
                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                : "border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900"
            )}
            onClick={() => setQueueFilter("executable")}
          >
            Executable
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
            aria-label="Refresh proposals"
            title="Refresh proposals"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-3 text-sm">
          {multisigs.map((multisig) => {
            const selected =
              multisig.publicKey.toString() === selectedMultisigKey;
            const chainName =
              chains.find((item) => item.id === multisig.chainId)?.name ??
              multisig.chainId;

            return (
              <button
                key={multisig.publicKey.toString()}
                type="button"
                onClick={() => selectMultisig(multisig.publicKey.toString())}
                className={cn(
                  "text-left transition-colors",
                  selected
                    ? "text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                <span className="text-[0.64rem] tracking-[0.18em] text-zinc-500 uppercase">
                  {chainName}
                </span>
                <span className="mt-1 block text-sm font-medium">
                  {multisig.label || "Unnamed multisig"}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {multisig.threshold}/{multisig.members.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="space-y-3">
          <div className="border-b border-zinc-800 pb-2.5">
            <p className="text-[0.7rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">
              Work Queue
            </p>
          </div>

          {loading ? (
            <ProposalCardSkeletonList />
          ) : filteredQueueItems.length === 0 ? (
            <div className="border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-400">
              No proposals match this queue filter.
            </div>
          ) : (
            <div className="overflow-hidden border border-zinc-800 bg-zinc-950/55">
              {pagination.pageItems.map((item, index) => {
                const proposalKey = item.proposal.transactionIndex.toString();
                const isFocused = proposalKey === focusedProposalKey;

                return (
                  <button
                    key={proposalKey}
                    type="button"
                    onClick={() => setFocusedProposalKey(proposalKey)}
                    className={cn(
                      "flex w-full flex-col gap-1.5 border-b border-zinc-800 px-3 py-2.5 text-left transition-colors last:border-b-0",
                      isFocused ? "bg-lime-400/8" : "hover:bg-zinc-900/80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                            {String(pagination.startIndex + index + 1).padStart(
                              2,
                              "0"
                            )}
                          </span>
                          <span className="font-mono text-[0.72rem] font-semibold tracking-[0.22em] text-cyan-300">
                            {currentChainName}
                          </span>
                          <span className="text-sm font-medium text-zinc-100">
                            Proposal #{proposalKey}
                          </span>
                        </div>
                        <p
                          className={cn("text-[0.82rem]", getStatusTone(item))}
                        >
                          {item.lineLabel}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-3">
                        <div className="space-y-0.5 pt-1.5 text-right text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                          <p>
                            {item.approvalCount}/{selectedMultisig.threshold}{" "}
                            signed
                          </p>
                          <p>{item.proposal.rejections.length} rejected</p>
                        </div>
                        <ArrowRight
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 transition-transform",
                            isFocused
                              ? "translate-x-0 text-lime-300"
                              : "text-zinc-600"
                          )}
                        />
                      </div>
                    </div>

                    {item.proposal.creator && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] tracking-[0.14em] text-zinc-500 uppercase">
                        <AddressWithLabel
                          address={item.proposal.creator.toString()}
                          showCopy={false}
                          showLabelButton={false}
                          className="text-[0.72rem] tracking-normal normal-case"
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.goToPage}
            canGoNext={pagination.canGoNext}
            canGoPrevious={pagination.canGoPrevious}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            totalItems={filteredQueueItems.length}
          />
        </div>

        <div className="overflow-hidden border border-zinc-800 bg-zinc-950/75">
          {!focusedItem ? (
            <div className="px-5 py-10 text-sm text-zinc-400 sm:px-6">
              No proposal available for the selected multisig.
            </div>
          ) : (
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-950">
                      {focusedItem.proposal.status}
                    </Badge>
                    {focusedItem.currentUserApproved && (
                      <Badge
                        variant="outline"
                        className="rounded-md border-lime-500/30 bg-lime-500/10 px-2.5 py-1 text-lime-200"
                      >
                        You signed
                      </Badge>
                    )}
                    {focusedItem.currentUserRejected && (
                      <Badge
                        variant="outline"
                        className="rounded-md border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-200"
                      >
                        You rejected
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="font-mono text-[0.72rem] font-semibold tracking-[0.22em] text-cyan-300 uppercase">
                      {currentChainName}
                    </p>
                    <h2 className="mt-0.5 text-xl font-semibold tracking-[-0.03em] text-zinc-50">
                      Proposal #
                      {focusedItem.proposal.transactionIndex.toString()}
                    </h2>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
                  onClick={() =>
                    handleViewDetail(
                      fromWorkspaceProposal(focusedItem.proposal)
                    )
                  }
                >
                  <Eye className="h-4 w-4" />
                  View detail
                </Button>
              </div>

              <div className="grid gap-3 border-b border-zinc-800 pb-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div>
                  <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                    Approval state
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-end gap-x-4 gap-y-2">
                    <p className="text-5xl font-semibold tracking-[-0.06em] text-zinc-50">
                      {focusedItem.approvalCount}
                      <span className="text-zinc-600">
                        /{selectedMultisig.threshold}
                      </span>
                    </p>
                    <div className="space-y-1 text-[0.82rem] text-zinc-400">
                      <p>
                        {focusedItem.readyToExecute
                          ? "Ready now"
                          : focusedItem.needsYourSignature
                            ? "Waiting on you"
                            : "Collecting signatures"}
                      </p>
                      <p>
                        {focusedItem.proposal.rejections.length} rejection
                        {focusedItem.proposal.rejections.length === 1
                          ? ""
                          : "s"}{" "}
                        / {selectedMultisig.members.length} members
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 text-sm leading-6 text-zinc-400">
                  <p>
                    {focusedItem.readyToExecute
                      ? "Threshold is complete. Execution can happen immediately from this workspace."
                      : focusedItem.needsYourSignature
                        ? "This item is specifically blocked on your decision. Approval or rejection will change its state now."
                        : focusedItem.proposal.status === "Active"
                          ? `${focusedItem.missingApprovals} more signature${focusedItem.missingApprovals === 1 ? "" : "s"} are still required before execution.`
                          : "This proposal is no longer awaiting action."}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[0.68rem] tracking-[0.16em] text-zinc-500 uppercase">
                    <span>
                      Multisig{" "}
                      {formatCompactAddress(
                        selectedMultisig.publicKey.toString()
                      )}
                    </span>
                    {focusedItem.proposal.creator && (
                      <div className="flex items-center gap-2">
                        <span>Creator</span>
                        <AddressWithLabel
                          address={focusedItem.proposal.creator.toString()}
                          showCopy={false}
                          showLabelButton={false}
                          className="tracking-normal normal-case"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div>
                      <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                        Signer map
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Every member is visible at a glance.
                      </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-zinc-500" />
                  </div>

                  <div className="divide-y divide-zinc-800 border border-zinc-800">
                    {selectedMultisig.members.map((member) => {
                      const memberKey = member.key.toString();
                      const approved = focusedItem.proposal.approvals.some(
                        (approver) => approver.toString() === memberKey
                      );
                      const rejected = focusedItem.proposal.rejections.some(
                        (rejector) => rejector.toString() === memberKey
                      );
                      const isCurrentUser = publicKey?.toString() === memberKey;
                      const memberState = approved
                        ? "Signed"
                        : rejected
                          ? "Rejected"
                          : focusedItem.proposal.status === "Active"
                            ? "Awaiting"
                            : "No action";

                      return (
                        <div
                          key={memberKey}
                          className="flex items-start justify-between gap-3 px-3 py-3"
                        >
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              {isCurrentUser ? (
                                <Badge
                                  variant="secondary"
                                  className="h-5 rounded-full px-2 text-[0.62rem] tracking-[0.12em] uppercase"
                                >
                                  You
                                </Badge>
                              ) : null}
                              <AddressWithLabel
                                address={memberKey}
                                className="tracking-normal normal-case"
                              />
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md px-2.5 py-1",
                              approved &&
                                "border-lime-500/30 bg-lime-500/10 text-lime-200",
                              rejected &&
                                "border-red-500/30 bg-red-500/10 text-red-200",
                              !approved &&
                                !rejected &&
                                "border-zinc-700 bg-zinc-900 text-zinc-400"
                            )}
                          >
                            {memberState}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 border-t border-zinc-800 pt-4">
                  <div className="space-y-3">
                    <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                      Decision context
                    </p>
                    <div className="space-y-3 text-sm text-zinc-400">
                      <div className="flex items-start gap-3">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                        <p>
                          {focusedItem.readyToExecute
                            ? "Execution path is clear and threshold is fully met."
                            : focusedItem.needsYourSignature
                              ? "This proposal is waiting directly on your approval or rejection."
                              : "Execution remains blocked until the remaining members sign."}
                        </p>
                      </div>
                      {focusedItem.proposal.creator && (
                        <div className="flex items-start gap-3">
                          <Copy className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                          <button
                            type="button"
                            className="text-left tabular-nums transition-colors hover:text-zinc-100"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                focusedItem.proposal.creator!.toString()
                              );
                              toast.success("Creator address copied");
                            }}
                          >
                            <span className="mr-2">Creator</span>
                            <AddressWithLabel
                              address={focusedItem.proposal.creator.toString()}
                              showCopy={false}
                              showLabelButton={false}
                              className="tracking-normal normal-case"
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                      Actions
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="rounded-md bg-lime-300 text-zinc-950 hover:bg-lime-200"
                        onClick={() =>
                          handleApprove(focusedItem.proposal.transactionIndex)
                        }
                        disabled={
                          !focusedItem.needsYourSignature || isActionInProgress
                        }
                      >
                        {isApproveLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
                        onClick={() =>
                          handleReject(focusedItem.proposal.transactionIndex)
                        }
                        disabled={
                          !focusedItem.needsYourSignature || isActionInProgress
                        }
                      >
                        {isRejectLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-md border-zinc-800 bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                        onClick={() =>
                          handleExecute(focusedItem.proposal.transactionIndex)
                        }
                        disabled={
                          !focusedItem.readyToExecute ||
                          !isMember ||
                          isActionInProgress
                        }
                      >
                        {isExecuteLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        Execute
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TransactionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        proposal={selectedProposal}
      />
    </section>
  );
}
