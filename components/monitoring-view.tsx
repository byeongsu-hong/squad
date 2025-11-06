"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Check, Eye, Loader2, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { SquadService } from "@/lib/squad";
import { transactionSignerService } from "@/lib/transaction-signer";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { MultisigAccount, ProposalAccount } from "@/types/multisig";
import { parseLedgerError } from "@/types/wallet";

interface ProposalWithMultisig extends ProposalAccount {
  multisigAccount: MultisigAccount;
  timestamp?: number;
}

export function MonitoringView() {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [proposals, setProposals] = useState<ProposalWithMultisig[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] =
    useState<ProposalAccount | null>(null);

  const { publicKey, derivationPath, walletType } = useWalletStore();
  const { chains } = useChainStore();
  const { multisigs } = useMultisigStore();
  const wallet = useWallet();

  const loadAllProposals = useCallback(async () => {
    if (multisigs.length === 0) return;

    setLoading(true);
    setLoadingProgress(0);

    try {
      const totalMultisigs = multisigs.length;
      let completedCount = 0;

      // Use Promise.all for parallel fetching
      const proposalPromises = multisigs.map(async (multisig) => {
        const chain = chains.find((c) => c.id === multisig.chainId);
        if (!chain) {
          completedCount++;
          setLoadingProgress((completedCount / totalMultisigs) * 100);
          return [];
        }

        const squadService = new SquadService(
          chain.rpcUrl,
          chain.squadsV4ProgramId
        );

        try {
          const proposalAccounts = await squadService.getProposalsByMultisig(
            multisig.publicKey
          );

          const proposals: ProposalWithMultisig[] = [];
          for (const acc of proposalAccounts) {
            if (!acc) continue;

            const status = acc.account.status.__kind;
            const proposal: ProposalWithMultisig = {
              multisig: acc.account.multisig,
              transactionIndex: BigInt(acc.account.transactionIndex.toString()),
              creator: multisig.publicKey,
              status: status as ProposalAccount["status"],
              approvals: acc.account.approved || [],
              rejections: acc.account.rejected || [],
              executed: status === "Executed",
              cancelled: status === "Cancelled",
              multisigAccount: multisig,
            };

            proposals.push(proposal);
          }

          completedCount++;
          setLoadingProgress((completedCount / totalMultisigs) * 100);
          return proposals;
        } catch (error) {
          console.error(
            `Failed to load proposals for ${multisig.label}:`,
            error
          );
          completedCount++;
          setLoadingProgress((completedCount / totalMultisigs) * 100);
          return [];
        }
      });

      const results = await Promise.all(proposalPromises);
      const allProposals = results.flat();

      // Sort by transaction index descending (newest first)
      allProposals.sort((a, b) => {
        return Number(b.transactionIndex - a.transactionIndex);
      });

      setProposals(allProposals);
    } catch (error) {
      console.error("Failed to load proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  }, [multisigs, chains]);

  useEffect(() => {
    loadAllProposals();
  }, [loadAllProposals]);

  const handleRefresh = async () => {
    // Invalidate all caches
    multisigs.forEach((multisig) => {
      const chain = chains.find((c) => c.id === multisig.chainId);
      if (chain) {
        const squadService = new SquadService(
          chain.rpcUrl,
          chain.squadsV4ProgramId
        );
        squadService.invalidateProposalCache(multisig.publicKey);
      }
    });

    await loadAllProposals();
  };

  const handleApprove = async (
    proposal: ProposalWithMultisig,
    transactionIndex: bigint
  ) => {
    if (!publicKey) return;

    const chain = chains.find((c) => c.id === proposal.multisigAccount.chainId);
    if (!chain) {
      toast.error("Chain configuration not found");
      return;
    }

    setActionLoading(
      `approve-${proposal.multisig.toString()}-${transactionIndex}`
    );
    try {
      const squadService = new SquadService(
        chain.rpcUrl,
        chain.squadsV4ProgramId
      );

      const instruction = await squadService.approveProposal({
        multisigPda: proposal.multisig,
        transactionIndex,
        member: publicKey,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await squadService
        .getConnection()
        .getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await transactionSignerService.signTransaction(
        transaction,
        {
          walletType,
          derivationPath,
          walletAdapter: wallet.signTransaction
            ? { signTransaction: wallet.signTransaction.bind(wallet) }
            : undefined,
        }
      );

      const txid = await squadService
        .getConnection()
        .sendRawTransaction(signedTransaction.serialize());

      await squadService.getConnection().confirmTransaction(txid);

      toast.success("Proposal approved!");
      squadService.invalidateProposalCache(proposal.multisig);
      await loadAllProposals();
    } catch (error) {
      console.error("Failed to approve proposal:", error);
      const errorMessage = parseLedgerError(error);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (
    proposal: ProposalWithMultisig,
    transactionIndex: bigint
  ) => {
    if (!publicKey) return;

    const chain = chains.find((c) => c.id === proposal.multisigAccount.chainId);
    if (!chain) {
      toast.error("Chain configuration not found");
      return;
    }

    setActionLoading(
      `reject-${proposal.multisig.toString()}-${transactionIndex}`
    );
    try {
      const squadService = new SquadService(
        chain.rpcUrl,
        chain.squadsV4ProgramId
      );

      const instruction = await squadService.rejectProposal({
        multisigPda: proposal.multisig,
        transactionIndex,
        member: publicKey,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await squadService
        .getConnection()
        .getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await transactionSignerService.signTransaction(
        transaction,
        {
          walletType,
          derivationPath,
          walletAdapter: wallet.signTransaction
            ? { signTransaction: wallet.signTransaction.bind(wallet) }
            : undefined,
        }
      );

      const txid = await squadService
        .getConnection()
        .sendRawTransaction(signedTransaction.serialize());

      await squadService.getConnection().confirmTransaction(txid);

      toast.success("Proposal rejected!");
      squadService.invalidateProposalCache(proposal.multisig);
      await loadAllProposals();
    } catch (error) {
      console.error("Failed to reject proposal:", error);
      const errorMessage = parseLedgerError(error);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async (
    proposal: ProposalWithMultisig,
    transactionIndex: bigint
  ) => {
    if (!publicKey) return;

    const chain = chains.find((c) => c.id === proposal.multisigAccount.chainId);
    if (!chain) {
      toast.error("Chain configuration not found");
      return;
    }

    setActionLoading(
      `execute-${proposal.multisig.toString()}-${transactionIndex}`
    );
    try {
      const squadService = new SquadService(
        chain.rpcUrl,
        chain.squadsV4ProgramId
      );

      const result = await squadService.executeProposal({
        multisigPda: proposal.multisig,
        transactionIndex,
        member: publicKey,
      });

      const instruction =
        typeof result === "object" && "instruction" in result
          ? result.instruction
          : result;

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await squadService
        .getConnection()
        .getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await transactionSignerService.signTransaction(
        transaction,
        {
          walletType,
          derivationPath,
          walletAdapter: wallet.signTransaction
            ? { signTransaction: wallet.signTransaction.bind(wallet) }
            : undefined,
        }
      );

      const txid = await squadService
        .getConnection()
        .sendRawTransaction(signedTransaction.serialize());

      await squadService.getConnection().confirmTransaction(txid);

      toast.success("Proposal executed!");
      squadService.invalidateProposalCache(proposal.multisig);
      await loadAllProposals();
    } catch (error) {
      console.error("Failed to execute proposal:", error);
      const errorMessage = parseLedgerError(error);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    multisigs.forEach((m) => {
      m.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [multisigs]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Status filter
      if (statusFilter !== "all") {
        const status = p.status.toLowerCase();
        if (status !== statusFilter.toLowerCase()) return false;
      }

      // Chain filter
      if (chainFilter !== "all") {
        if (p.multisigAccount.chainId !== chainFilter) return false;
      }

      // Tag filter
      if (tagFilter !== "all") {
        const multisigTags = p.multisigAccount.tags || [];
        if (!multisigTags.includes(tagFilter)) return false;
      }

      // Search filter (by multisig name or address)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const name = (p.multisigAccount.label || "").toLowerCase();
        const address = p.multisig.toString().toLowerCase();
        if (!name.includes(query) && !address.includes(query)) return false;
      }

      return true;
    });
  }, [proposals, statusFilter, chainFilter, tagFilter, searchQuery]);

  const isMemberOf = (proposal: ProposalWithMultisig) => {
    return (
      publicKey &&
      proposal.multisigAccount.members.some(
        (member) => member.key.toString() === publicKey.toString()
      )
    );
  };

  const hasUserApproved = (proposal: ProposalWithMultisig) => {
    return (
      publicKey &&
      proposal.approvals.some(
        (approver) => approver.toString() === publicKey.toString()
      )
    );
  };

  const hasUserRejected = (proposal: ProposalWithMultisig) => {
    return (
      publicKey &&
      proposal.rejections.some(
        (rejector) => rejector.toString() === publicKey.toString()
      )
    );
  };

  const hasMetThreshold = (proposal: ProposalWithMultisig) => {
    return proposal.approvals.length >= proposal.multisigAccount.threshold;
  };

  const handleViewDetail = (proposal: ProposalWithMultisig) => {
    setSelectedProposal(proposal);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            View and manage proposals across all multisigs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Proposals</CardTitle>
          <CardDescription>
            {filteredProposals.length} proposal
            {filteredProposals.length !== 1 ? "s" : ""} found
          </CardDescription>

          {loading && (
            <div className="space-y-2 pt-2">
              <Progress value={loadingProgress} className="h-2" />
              <p className="text-muted-foreground text-center text-xs">
                Loading proposals... {Math.round(loadingProgress)}%
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
              <Input
                placeholder="Search by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={chainFilter} onValueChange={setChainFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Chains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {chains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="executed">Executed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {multisigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No multisigs found. Please add multisigs to start monitoring.
              </p>
            </div>
          ) : filteredProposals.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No proposals found matching the filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Multisig</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Proposal #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((proposal) => {
                    const isMember = isMemberOf(proposal);
                    const userApproved = hasUserApproved(proposal);
                    const userRejected = hasUserRejected(proposal);
                    const thresholdMet = hasMetThreshold(proposal);
                    const chain = chains.find(
                      (c) => c.id === proposal.multisigAccount.chainId
                    );
                    const actionKey = `${proposal.multisig.toString()}-${proposal.transactionIndex}`;

                    return (
                      <TableRow key={actionKey}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>
                              {proposal.multisigAccount.label || "Unnamed"}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {proposal.multisig.toString().slice(0, 8)}...
                              {proposal.multisig.toString().slice(-8)}
                            </span>
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
                          <Badge
                            variant={
                              proposal.status === "Executed"
                                ? "default"
                                : proposal.status === "Active"
                                  ? "secondary"
                                  : "destructive"
                            }
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
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewDetail(proposal)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {!proposal.executed && !proposal.cancelled && (
                              <>
                                {!isMember ||
                                actionLoading !== null ||
                                userApproved ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 hover:bg-green-500 hover:text-white"
                                            disabled
                                          >
                                            {actionLoading ===
                                            `approve-${actionKey}` ? (
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
                                    className="h-8 w-8 p-0 hover:bg-green-500 hover:text-white"
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
                                actionLoading !== null ||
                                userRejected ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 hover:bg-red-500 hover:text-white"
                                            disabled
                                          >
                                            {actionLoading ===
                                            `reject-${actionKey}` ? (
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
                                    className="h-8 w-8 p-0 hover:bg-red-500 hover:text-white"
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
                                    className="ml-1"
                                    onClick={() =>
                                      handleExecute(
                                        proposal,
                                        proposal.transactionIndex
                                      )
                                    }
                                    disabled={
                                      !isMember || actionLoading !== null
                                    }
                                  >
                                    {actionLoading ===
                                    `execute-${actionKey}` ? (
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
        </CardContent>
      </Card>

      <TransactionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        proposal={selectedProposal}
      />
    </div>
  );
}
