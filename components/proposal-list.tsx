"use client";

import { PublicKey } from "@solana/web3.js";
import { Check, Copy, Eye, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MultisigStatsCard } from "@/components/multisig-stats-card";
import { ProposalCardSkeletonList } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProposalActions } from "@/lib/hooks/use-proposal-actions";
import { SquadService } from "@/lib/squad";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { ProposalAccount } from "@/types/multisig";
import { toProposalStatus } from "@/types/multisig";

import { TransactionDetailDialog } from "./transaction-detail-dialog";

interface ProposalListProps {
  onLoadingChange?: (loading: boolean) => void;
  refreshTrigger?: number;
}

export function ProposalList({
  onLoadingChange,
  refreshTrigger,
}: ProposalListProps = {}) {
  const [loading, setLoading] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] =
    useState<ProposalAccount | null>(null);

  const { publicKey } = useWalletStore();
  const { chains } = useChainStore();
  const { proposals, setProposals, getSelectedMultisig, selectedMultisigKey } =
    useMultisigStore();

  const selectedMultisig = getSelectedMultisig();

  // Check if current wallet is a member of the selected multisig
  const isMember =
    publicKey &&
    selectedMultisig?.members.some(
      (member: { key: { toString: () => string } }) =>
        member.key.toString() === publicKey.toString()
    );

  const handleViewDetail = (proposal: ProposalAccount) => {
    setSelectedProposal(proposal);
    setDetailDialogOpen(true);
  };

  const loadProposals = useCallback(async () => {
    const multisig = getSelectedMultisig();
    if (!multisig) return;

    // Use the chain associated with the multisig
    const chain = chains.find((c) => c.id === multisig.chainId);
    if (!chain) {
      toast.error("Chain configuration not found for this multisig");
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);
    try {
      const squadService = new SquadService(
        chain.rpcUrl,
        chain.squadsV4ProgramId
      );

      const proposalAccounts = await squadService.getProposalsByMultisig(
        multisig.publicKey
      );

      const proposalResults = await Promise.all(
        proposalAccounts.map(async (acc) => {
          if (!acc) return null;

          const status = toProposalStatus(acc.account.status.__kind);
          const transactionIndex = BigInt(
            acc.account.transactionIndex.toString()
          );

          // Load transaction to get creator
          let creator: PublicKey | undefined;
          try {
            const txType = await squadService.getTransactionType(
              acc.account.multisig,
              transactionIndex
            );

            if (txType === "vault") {
              const vaultTx = await squadService.getVaultTransaction(
                acc.account.multisig,
                transactionIndex
              );
              creator = vaultTx.creator;
            } else if (txType === "config") {
              const configTx = await squadService.getConfigTransaction(
                acc.account.multisig,
                transactionIndex
              );
              creator = configTx.creator;
            }
          } catch (error) {
            console.warn(
              `Failed to load creator for proposal ${transactionIndex}:`,
              error
            );
          }

          return {
            multisig: acc.account.multisig,
            transactionIndex,
            ...(creator ? { creator } : {}),
            status,
            approvals: acc.account.approved || [],
            rejections: acc.account.rejected || [],
            executed: status === "Executed",
            cancelled: status === "Cancelled",
          };
        })
      );

      const loadedProposals = proposalResults.filter(
        (p): p is ProposalAccount => p !== null
      );

      // Sort proposals by transaction index descending (newest first)
      loadedProposals.sort((a, b) => {
        return Number(b.transactionIndex - a.transactionIndex);
      });

      setProposals(loadedProposals);
    } catch (error) {
      console.error("Failed to load proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMultisigKey, onLoadingChange, chains]);

  const { approve, reject, execute, actionLoading, isActionInProgress } =
    useProposalActions({
      onSuccess: loadProposals,
    });

  useEffect(() => {
    loadProposals();
  }, [loadProposals, refreshTrigger]);

  const activeProposalsCount = useMemo(
    () => proposals.filter((p) => p.status === "Active").length,
    [proposals]
  );

  const executedProposalsCount = useMemo(
    () => proposals.filter((p) => p.executed).length,
    [proposals]
  );

  const handleRefresh = async () => {
    const multisig = getSelectedMultisig();
    if (!multisig) return;

    const chain = chains.find((c) => c.id === multisig.chainId);
    if (!chain) return;

    const squadService = new SquadService(
      chain.rpcUrl,
      chain.squadsV4ProgramId
    );

    // Invalidate cache to force fresh fetch
    squadService.invalidateProposalCache(multisig.publicKey);

    await loadProposals();
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

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content */}
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Proposals</h2>
            {selectedMultisig && (
              <div className="flex flex-col gap-0.5">
                <p className="text-muted-foreground text-sm">
                  {selectedMultisig.label || "Unnamed"} ·{" "}
                  {chains.find((c) => c.id === selectedMultisig.chainId)
                    ?.name || "Unknown Chain"}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-muted-foreground text-sm">
                    {selectedMultisig.publicKey.toString().slice(0, 6)}...
                    {selectedMultisig.publicKey.toString().slice(-4)}
                  </p>
                  <Copy
                    className="text-muted-foreground hover:text-foreground h-3 w-3 cursor-pointer transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        selectedMultisig.publicKey.toString()
                      );
                      toast.success("Address copied");
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || !selectedMultisig}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {!selectedMultisig && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                Select a multisig from the sidebar to view proposals
              </p>
            </CardContent>
          </Card>
        )}

        {selectedMultisig && (
          <>
            {proposals.length === 0 && !loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No proposals found</p>
                </CardContent>
              </Card>
            )}

            {loading && <ProposalCardSkeletonList />}
            {!loading && (
              <div className="space-y-4">
                {proposals.map((proposal: ProposalAccount) => {
                  const approvalCount = proposal.approvals.length;
                  const hasMetThreshold =
                    selectedMultisig &&
                    approvalCount >= selectedMultisig.threshold;

                  // Check if current user has already approved or rejected
                  const currentUserApproved = publicKey
                    ? proposal.approvals.some(
                        (approver) =>
                          approver.toString() === publicKey.toString()
                      )
                    : false;

                  const currentUserRejected = publicKey
                    ? proposal.rejections.some(
                        (rejector) =>
                          rejector.toString() === publicKey.toString()
                      )
                    : false;

                  return (
                    <Card key={proposal.transactionIndex.toString()}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>
                              Proposal #{proposal.transactionIndex.toString()}
                            </span>
                            {currentUserApproved && (
                              <Badge variant="default" className="bg-green-600">
                                Approved
                              </Badge>
                            )}
                            {currentUserRejected && (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </div>
                          <Badge>{proposal.status}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {proposal.creator && (
                            <div className="flex items-center gap-0.5">
                              <span>
                                Creator:{" "}
                                {proposal.creator.toString().slice(0, 8)}
                                ...
                                {proposal.creator.toString().slice(-8)}
                              </span>
                              <Copy
                                className="text-muted-foreground hover:text-foreground h-2.5 w-2.5 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (proposal.creator) {
                                    navigator.clipboard.writeText(
                                      proposal.creator.toString()
                                    );
                                    toast.success("Creator address copied");
                                  }
                                }}
                              />
                            </div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>
                                Approvals: {approvalCount}
                                {selectedMultisig &&
                                  ` / ${selectedMultisig.threshold}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <X className="h-4 w-4 text-red-500" />
                              <span>
                                Rejections: {proposal.rejections.length}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetail(proposal)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Details
                            </Button>

                            {!proposal.executed && !proposal.cancelled && (
                              <>
                                {!isMember ||
                                isActionInProgress ||
                                currentUserApproved ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="hover:bg-green-500 hover:text-white"
                                            onClick={() =>
                                              handleApprove(
                                                proposal.transactionIndex
                                              )
                                            }
                                            disabled={true}
                                          >
                                            {actionLoading ===
                                            `approve-${proposal.transactionIndex}` ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Check className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {currentUserApproved
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
                                    variant="outline"
                                    className="hover:bg-green-500 hover:text-white"
                                    onClick={() =>
                                      handleApprove(proposal.transactionIndex)
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                {!isMember ||
                                isActionInProgress ||
                                currentUserRejected ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="hover:bg-red-500 hover:text-white"
                                            onClick={() =>
                                              handleReject(
                                                proposal.transactionIndex
                                              )
                                            }
                                            disabled={true}
                                          >
                                            {actionLoading ===
                                            `reject-${proposal.transactionIndex}` ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <X className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {currentUserRejected
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
                                    variant="outline"
                                    className="hover:bg-red-500 hover:text-white"
                                    onClick={() =>
                                      handleReject(proposal.transactionIndex)
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasMetThreshold && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      handleExecute(proposal.transactionIndex)
                                    }
                                    disabled={!isMember || isActionInProgress}
                                  >
                                    {actionLoading ===
                                    `execute-${proposal.transactionIndex}` ? (
                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Execute
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar Metrics */}
      <div className="lg:col-span-1">
        {selectedMultisig && !loading && (
          <MultisigStatsCard
            multisig={selectedMultisig}
            activeProposals={activeProposalsCount}
            executedProposals={executedProposalsCount}
          />
        )}
      </div>

      <TransactionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        proposal={selectedProposal}
      />
    </div>
  );
}
