"use client";
import {
  Check,
  Copy,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BatchSigningPreviewDialog } from "@/components/batch-signing-preview-dialog";
import { ProposalTableSkeletonList } from "@/components/skeletons";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SUCCESS_MESSAGES } from "@/lib/config";
import { exportProposalsToCSV } from "@/lib/export-csv";
import { useMonitoringProposals } from "@/lib/hooks/use-monitoring-proposals";
import type { MonitoringProposal } from "@/lib/hooks/use-monitoring-proposals";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useProposalActions } from "@/lib/hooks/use-proposal-actions";
import { cn } from "@/lib/utils";
import { formatTransactionSummary } from "@/lib/utils/transaction-formatter";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { ProposalAccount } from "@/types/multisig";

export function MonitoringView() {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] =
    useState<ProposalAccount | null>(null);
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(
    new Set()
  );
  const [batchOperationInProgress, setBatchOperationInProgress] =
    useState(false);
  const [batchPreviewOpen, setBatchPreviewOpen] = useState(false);
  const [batchPreviewAction, setBatchPreviewAction] = useState<
    "approve" | "reject"
  >("approve");

  const { publicKey } = useWalletStore();
  const { chains } = useChainStore();
  const { multisigs } = useMultisigStore();
  const {
    loading,
    loadingProgress,
    searchQuery,
    setSearchQuery,
    chainFilter,
    setChainFilter,
    tagFilter,
    setTagFilter,
    statusFilters,
    setStatusFilters,
    proposals,
    filteredProposals,
    availableTags,
    loadAllProposals,
    handleRefresh,
  } = useMonitoringProposals({
    multisigs,
    chains,
  });

  const {
    approveByAddress,
    rejectByAddress,
    executeByAddress,
    isActionLoading,
    isActionInProgress,
  } = useProposalActions({
    onSuccess: loadAllProposals,
  });

  // Batch operations hook - skip auto-reload after each action
  const { approve: batchApprove, reject: batchReject } = useProposalActions({
    onSuccess: loadAllProposals,
    skipSuccessCallback: true,
  });

  useEffect(() => {
    loadAllProposals();
  }, [loadAllProposals]);

  const handleApprove = async (
    proposal: MonitoringProposal,
    transactionIndex: bigint
  ) => {
    await approveByAddress(
      proposal.multisig.toString(),
      transactionIndex,
      proposal.multisigAccount.chainId
    );
  };

  const handleReject = async (
    proposal: MonitoringProposal,
    transactionIndex: bigint
  ) => {
    await rejectByAddress(
      proposal.multisig.toString(),
      transactionIndex,
      proposal.multisigAccount.chainId
    );
  };

  const handleExecute = async (
    proposal: MonitoringProposal,
    transactionIndex: bigint
  ) => {
    await executeByAddress(
      proposal.multisig.toString(),
      transactionIndex,
      proposal.multisigAccount.chainId
    );
  };

  const pagination = usePagination(filteredProposals, {
    totalItems: filteredProposals.length,
    itemsPerPage: 20,
  });

  const isMemberOf = (proposal: MonitoringProposal) => {
    return (
      publicKey &&
      proposal.multisigAccount.members.some(
        (member) => member.key.toString() === publicKey.toString()
      )
    );
  };

  const hasUserApproved = (proposal: MonitoringProposal) => {
    return (
      publicKey &&
      proposal.approvals.some(
        (approver) => approver.toString() === publicKey.toString()
      )
    );
  };

  const hasUserRejected = (proposal: MonitoringProposal) => {
    return (
      publicKey &&
      proposal.rejections.some(
        (rejector) => rejector.toString() === publicKey.toString()
      )
    );
  };

  const hasMetThreshold = (proposal: MonitoringProposal) => {
    return proposal.approvals.length >= proposal.multisigAccount.threshold;
  };

  const handleViewDetail = (proposal: MonitoringProposal) => {
    setSelectedProposal(proposal);
    setDetailDialogOpen(true);
  };

  const handleExportCSV = () => {
    const multisigMap = new Map(
      multisigs.map((m) => [m.publicKey.toString(), m])
    );
    exportProposalsToCSV(filteredProposals, multisigMap);
    toast.success(SUCCESS_MESSAGES.DATA_EXPORTED);
  };

  const toggleProposalSelection = (proposalKey: string) => {
    setSelectedProposals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(proposalKey)) {
        newSet.delete(proposalKey);
      } else {
        newSet.add(proposalKey);
      }
      return newSet;
    });
  };

  const selectAllProposals = () => {
    const activeProposals = pagination.pageItems.filter(
      (p) => !p.executed && !p.cancelled
    );
    setSelectedProposals(
      new Set(
        activeProposals.map(
          (p) => `${p.multisig.toString()}-${p.transactionIndex}`
        )
      )
    );
  };

  const clearSelection = () => {
    setSelectedProposals(new Set());
  };

  const handleBatchApprove = () => {
    if (selectedProposals.size === 0) return;

    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Filter out already-processed proposals
    const eligibleProposals: string[] = [];
    let alreadyProcessedCount = 0;

    Array.from(selectedProposals).forEach((key) => {
      const proposal = proposals.find(
        (p) => `${p.multisig.toString()}-${p.transactionIndex}` === key
      );

      if (!proposal) return;

      if (isMemberOf(proposal) && !hasUserApproved(proposal)) {
        eligibleProposals.push(key);
      } else if (hasUserApproved(proposal)) {
        alreadyProcessedCount++;
      }
    });

    if (alreadyProcessedCount > 0) {
      toast.info(
        `${alreadyProcessedCount} transaction${alreadyProcessedCount > 1 ? "s have" : " has"} already been approved`
      );
      // Remove already-processed proposals from selection
      setSelectedProposals(new Set(eligibleProposals));
    }

    if (eligibleProposals.length === 0) {
      toast.error(
        "No eligible proposals to approve. You may not be a member or have already approved all selected proposals."
      );
      return;
    }

    setBatchPreviewAction("approve");
    setBatchPreviewOpen(true);
  };

  const handleBatchReject = () => {
    if (selectedProposals.size === 0) return;

    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Filter out already-processed proposals
    const eligibleProposals: string[] = [];
    let alreadyProcessedCount = 0;

    Array.from(selectedProposals).forEach((key) => {
      const proposal = proposals.find(
        (p) => `${p.multisig.toString()}-${p.transactionIndex}` === key
      );

      if (!proposal) return;

      if (isMemberOf(proposal) && !hasUserRejected(proposal)) {
        eligibleProposals.push(key);
      } else if (hasUserRejected(proposal)) {
        alreadyProcessedCount++;
      }
    });

    if (alreadyProcessedCount > 0) {
      toast.info(
        `${alreadyProcessedCount} transaction${alreadyProcessedCount > 1 ? "s have" : " has"} already been rejected`
      );
      // Remove already-processed proposals from selection
      setSelectedProposals(new Set(eligibleProposals));
    }

    if (eligibleProposals.length === 0) {
      toast.error(
        "No eligible proposals to reject. You may not be a member or have already rejected all selected proposals."
      );
      return;
    }

    setBatchPreviewAction("reject");
    setBatchPreviewOpen(true);
  };

  const executeBatchOperation = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    setBatchOperationInProgress(true);
    let successCount = 0;
    let failCount = 0;

    for (const proposalKey of selectedProposals) {
      const proposal = proposals.find(
        (p) => `${p.multisig.toString()}-${p.transactionIndex}` === proposalKey
      );

      if (!proposal) {
        continue;
      }

      // Skip if trying to approve but already approved
      if (
        batchPreviewAction === "approve" &&
        (!isMemberOf(proposal) || hasUserApproved(proposal))
      ) {
        continue;
      }

      // Skip if trying to reject but already rejected
      if (
        batchPreviewAction === "reject" &&
        (!isMemberOf(proposal) || hasUserRejected(proposal))
      ) {
        continue;
      }

      try {
        if (batchPreviewAction === "approve") {
          await approveByAddress(
            proposal.multisig.toString(),
            proposal.transactionIndex,
            proposal.multisigAccount.chainId
          );
        } else {
          await rejectByAddress(
            proposal.multisig.toString(),
            proposal.transactionIndex,
            proposal.multisigAccount.chainId
          );
        }
        successCount++;
      } catch (error) {
        console.error(
          `Failed to ${batchPreviewAction} proposal ${proposalKey}:`,
          error
        );
        failCount++;
      }
    }

    setBatchOperationInProgress(false);
    clearSelection();

    const actionName =
      batchPreviewAction === "approve" ? "Approved" : "Rejected";
    if (successCount > 0) {
      toast.success(`${actionName} ${successCount} proposal(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to ${batchPreviewAction} ${failCount} proposal(s)`);
    }
  };

  const activeCount = filteredProposals.filter(
    (p) => p.status === "Active"
  ).length;
  const executableCount = filteredProposals.filter(
    (p) =>
      p.approvals.length >= p.multisigAccount.threshold &&
      !p.executed &&
      !p.cancelled
  ).length;

  return (
    <div className="space-y-4">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[0.68rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">
              Monitoring / Surveillance
            </p>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
            <h1 className="text-[clamp(1.7rem,3vw,2.8rem)] font-semibold tracking-[-0.045em] text-zinc-50">
              Cross-multisig proposal table
            </h1>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
            <span className="text-xs tracking-[0.18em] text-zinc-500 uppercase">
              {activeCount} active
            </span>
            <span className="text-xs tracking-[0.18em] text-zinc-500 uppercase">
              {executableCount} executable
            </span>
            <span className="text-xs tracking-[0.18em] text-zinc-500 uppercase">
              {selectedProposals.size} selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute top-2.5 left-2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-zinc-800 bg-zinc-950 pl-8 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            <Select value={chainFilter} onValueChange={setChainFilter}>
              <SelectTrigger className="w-[160px] border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectValue placeholder="All Chains" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectItem value="all">All Chains</SelectItem>
                {chains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[160px] border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectItem value="all">All Tags</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[160px] rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
                >
                  Status Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 border-zinc-800 bg-zinc-950 text-zinc-100"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has("all")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setStatusFilters(new Set(["all"]));
                    } else {
                      setStatusFilters(new Set(["active"]));
                    }
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has("active")}
                  onCheckedChange={(checked) => {
                    const newFilters = new Set(statusFilters);
                    newFilters.delete("all");
                    if (checked) {
                      newFilters.add("active");
                    } else {
                      newFilters.delete("active");
                    }
                    setStatusFilters(
                      newFilters.size > 0 ? newFilters : new Set(["active"])
                    );
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  🟢 Active
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has("approved")}
                  onCheckedChange={(checked) => {
                    const newFilters = new Set(statusFilters);
                    newFilters.delete("all");
                    if (checked) {
                      newFilters.add("approved");
                    } else {
                      newFilters.delete("approved");
                    }
                    setStatusFilters(
                      newFilters.size > 0 ? newFilters : new Set(["active"])
                    );
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  ✔️ Approved
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has("executed")}
                  onCheckedChange={(checked) => {
                    const newFilters = new Set(statusFilters);
                    newFilters.delete("all");
                    if (checked) {
                      newFilters.add("executed");
                    } else {
                      newFilters.delete("executed");
                    }
                    setStatusFilters(
                      newFilters.size > 0 ? newFilters : new Set(["active"])
                    );
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  ✅ Executed
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has("rejected")}
                  onCheckedChange={(checked) => {
                    const newFilters = new Set(statusFilters);
                    newFilters.delete("all");
                    if (checked) {
                      newFilters.add("rejected");
                    } else {
                      newFilters.delete("rejected");
                    }
                    setStatusFilters(
                      newFilters.size > 0 ? newFilters : new Set(["active"])
                    );
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  ❌ Rejected
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has("cancelled")}
                  onCheckedChange={(checked) => {
                    const newFilters = new Set(statusFilters);
                    newFilters.delete("all");
                    if (checked) {
                      newFilters.add("cancelled");
                    } else {
                      newFilters.delete("cancelled");
                    }
                    setStatusFilters(
                      newFilters.size > 0 ? newFilters : new Set(["active"])
                    );
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  🚫 Cancelled
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedProposals.size > 0 ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBatchApprove}
                  disabled={
                    !publicKey || batchOperationInProgress || isActionInProgress
                  }
                  className="rounded-md bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                >
                  <Check className="mr-1 h-4 w-4" />
                  Approve ({selectedProposals.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchReject}
                  disabled={
                    !publicKey || batchOperationInProgress || isActionInProgress
                  }
                  className="rounded-md"
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject ({selectedProposals.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={batchOperationInProgress || isActionInProgress}
                  className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
                >
                  Clear
                </Button>
              </>
            ) : filteredProposals.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={loading}
                className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
              >
                <Download className="h-4 w-4" />
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            <Progress value={loadingProgress} className="h-1.5" />
            <p className="text-center text-xs text-zinc-500">
              Loading proposals... {Math.round(loadingProgress)}%
            </p>
          </div>
        )}

        {multisigs.length === 0 ? (
          <div className="border border-dashed border-zinc-800 px-6 py-10 text-center text-zinc-400">
            No multisigs found. Add multisigs first to start monitoring.
          </div>
        ) : filteredProposals.length === 0 && !loading ? (
          <div className="border border-dashed border-zinc-800 px-6 py-10 text-center text-zinc-400">
            No proposals found matching the current filter state.
          </div>
        ) : (
          <div className="overflow-hidden border border-zinc-800 bg-zinc-950/70">
            <Table className="text-zinc-200">
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="w-12 text-zinc-500">
                    <input
                      type="checkbox"
                      checked={
                        selectedProposals.size > 0 &&
                        selectedProposals.size ===
                          pagination.pageItems.filter(
                            (p) => !p.executed && !p.cancelled
                          ).length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllProposals();
                        } else {
                          clearSelection();
                        }
                      }}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="text-zinc-500">Multisig</TableHead>
                  <TableHead className="text-zinc-500">Chain</TableHead>
                  <TableHead className="text-zinc-500">Proposal #</TableHead>
                  <TableHead className="text-zinc-500">Transaction</TableHead>
                  <TableHead className="text-zinc-500">Status</TableHead>
                  <TableHead className="text-zinc-500">Threshold</TableHead>
                  <TableHead className="text-right text-zinc-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <ProposalTableSkeletonList />}
                {!loading &&
                  pagination.pageItems.map((proposal) => {
                    const isMember = isMemberOf(proposal);
                    const userApproved = hasUserApproved(proposal);
                    const userRejected = hasUserRejected(proposal);
                    const thresholdMet = hasMetThreshold(proposal);
                    const chain = chains.find(
                      (c) => c.id === proposal.multisigAccount.chainId
                    );
                    const actionKey = `${proposal.multisig.toString()}-${proposal.transactionIndex}`;
                    const isSelected = selectedProposals.has(actionKey);
                    const canSelect = !proposal.executed && !proposal.cancelled;

                    return (
                      <TableRow
                        key={actionKey}
                        className={cn(
                          "border-zinc-800 hover:bg-zinc-900/70",
                          isSelected && "bg-zinc-900/80"
                        )}
                      >
                        <TableCell>
                          {canSelect && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleProposalSelection(actionKey)
                              }
                              className="h-4 w-4 cursor-pointer"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span className="text-zinc-100">
                              {proposal.multisigAccount.label || "Unnamed"}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-zinc-500">
                                {proposal.multisig.toString().slice(0, 8)}...
                                {proposal.multisig.toString().slice(-8)}
                              </span>
                              <Copy
                                className="h-3 w-3 cursor-pointer text-zinc-500 transition-colors hover:text-zinc-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(
                                    proposal.multisig.toString()
                                  );
                                  toast.success("Multisig address copied");
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {chain?.name || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          #{proposal.transactionIndex.toString()}
                        </TableCell>
                        <TableCell>
                          {proposal.transactionSummary ? (
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={
                                  proposal.transactionSummary.type === "config"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="w-fit rounded-md text-xs"
                              >
                                {proposal.transactionSummary.type}
                              </Badge>
                              <span className="text-xs text-zinc-500">
                                {formatTransactionSummary(
                                  proposal.transactionSummary
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span className="text-xs text-zinc-500">
                                Loading...
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md border-zinc-800",
                              proposal.status === "Executed" &&
                                "bg-zinc-100 text-zinc-950",
                              proposal.status === "Active" &&
                                "border-lime-500/30 bg-lime-500/10 text-lime-200",
                              proposal.status === "Rejected" &&
                                "border-red-500/30 bg-red-500/10 text-red-200",
                              proposal.status === "Cancelled" &&
                                "bg-zinc-900 text-zinc-400"
                            )}
                          >
                            {proposal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              <span
                                className={
                                  thresholdMet
                                    ? "font-semibold text-green-600"
                                    : ""
                                }
                              >
                                {proposal.approvals.length}/
                                {proposal.multisigAccount.threshold}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <X className="h-3 w-3 text-red-500" />
                              <span>{proposal.rejections.length}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 rounded-md p-0 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                              onClick={() => handleViewDetail(proposal)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {!proposal.executed && !proposal.cancelled && (
                              <>
                                {!isMember ||
                                isActionInProgress ||
                                userApproved ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 rounded-md p-0 hover:bg-green-500 hover:text-white"
                                            disabled
                                          >
                                            {isActionLoading(
                                              "approve",
                                              proposal.multisig.toString(),
                                              proposal.transactionIndex
                                            ) ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Check className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {userApproved
                                          ? "Already Approved"
                                          : !isMember
                                            ? "Not a member"
                                            : "Action in progress"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-md p-0 hover:bg-green-500 hover:text-white"
                                    onClick={() =>
                                      handleApprove(
                                        proposal,
                                        proposal.transactionIndex
                                      )
                                    }
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}

                                {!isMember ||
                                isActionInProgress ||
                                userRejected ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 rounded-md p-0 hover:bg-red-500 hover:text-white"
                                            disabled
                                          >
                                            {isActionLoading(
                                              "reject",
                                              proposal.multisig.toString(),
                                              proposal.transactionIndex
                                            ) ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <X className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {userRejected
                                          ? "Already Rejected"
                                          : !isMember
                                            ? "Not a member"
                                            : "Action in progress"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-md p-0 hover:bg-red-500 hover:text-white"
                                    onClick={() =>
                                      handleReject(
                                        proposal,
                                        proposal.transactionIndex
                                      )
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}

                                {thresholdMet && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="ml-1 rounded-md bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                                    onClick={() =>
                                      handleExecute(
                                        proposal,
                                        proposal.transactionIndex
                                      )
                                    }
                                    disabled={!isMember || isActionInProgress}
                                  >
                                    {isActionLoading(
                                      "execute",
                                      proposal.multisig.toString(),
                                      proposal.transactionIndex
                                    ) ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : null}
                                    Execute
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredProposals.length > 0 && (
          <div className="border-t border-zinc-800 px-1 py-3">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.goToPage}
              canGoNext={pagination.canGoNext}
              canGoPrevious={pagination.canGoPrevious}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              totalItems={filteredProposals.length}
            />
          </div>
        )}
      </section>

      <TransactionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        proposal={selectedProposal}
      />

      <BatchSigningPreviewDialog
        open={batchPreviewOpen}
        onOpenChange={setBatchPreviewOpen}
        proposals={proposals.filter((p) =>
          selectedProposals.has(
            `${p.multisig.toString()}-${p.transactionIndex}`
          )
        )}
        multisigs={multisigs}
        onConfirm={executeBatchOperation}
        action={batchPreviewAction}
        onExecuteProposal={async (proposal, multisig) => {
          if (batchPreviewAction === "approve") {
            await batchApprove(
              proposal.multisig,
              proposal.transactionIndex,
              multisig.chainId
            );
          } else {
            await batchReject(
              proposal.multisig,
              proposal.transactionIndex,
              multisig.chainId
            );
          }
        }}
        onComplete={(successCount, failCount) => {
          clearSelection();
          const actionName =
            batchPreviewAction === "approve" ? "Approved" : "Rejected";
          if (successCount > 0) {
            toast.success(`${actionName} ${successCount} proposal(s)`);
          }
          if (failCount > 0) {
            toast.error(
              `Failed to ${batchPreviewAction} ${failCount} proposal(s)`
            );
          }
          // Reload proposals after batch operation completes
          loadAllProposals();
        }}
      />
    </div>
  );
}
