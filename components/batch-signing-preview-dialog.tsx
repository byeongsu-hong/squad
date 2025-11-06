"use client";

import bs58 from "bs58";
import { AlertCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SquadService } from "@/lib/squad";
import { useChainStore } from "@/stores/chain-store";
import type { MultisigAccount, ProposalAccount } from "@/types/multisig";

interface BatchSigningPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposals: ProposalAccount[];
  multisigs: MultisigAccount[];
  onConfirm: () => void | Promise<void>;
  action: "approve" | "reject";
  onExecuteProposal?: (
    proposal: ProposalAccount,
    multisig: MultisigAccount
  ) => Promise<void>;
  onComplete?: (successCount: number, failCount: number) => void;
}

interface TransactionPreview {
  proposal: ProposalAccount;
  multisig: MultisigAccount;
  chainName: string;
  transactionType: "vault" | "config";
  instructionCount?: number;
  accountCount?: number;
  programIds?: string[];
  configActionCount?: number;
  error?: string;
  loading: boolean;
  expanded: boolean;
  fullData?: {
    instructions?: {
      programIdIndex: number;
      programId: string;
      accountKeyIndexes: number[];
      data: string;
      accounts: string[];
    }[];
    accountKeys?: string[];
    configActions?: unknown[];
  };
}

export function BatchSigningPreviewDialog({
  open,
  onOpenChange,
  proposals,
  multisigs,
  onConfirm,
  action,
  onExecuteProposal,
  onComplete,
}: BatchSigningPreviewDialogProps) {
  const { chains } = useChainStore();
  const [previews, setPreviews] = useState<TransactionPreview[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to processing item
  useEffect(() => {
    if (processingIndex !== null && previewRefs.current[processingIndex]) {
      previewRefs.current[processingIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [processingIndex]);

  useEffect(() => {
    if (!open || proposals.length === 0) {
      setPreviews([]);
      setProcessingIndex(null);
      return;
    }

    // Initialize previews
    const initialPreviews: TransactionPreview[] = proposals.map((proposal) => {
      const multisig = multisigs.find(
        (m) => m.publicKey.toString() === proposal.multisig.toString()
      );
      const chain = chains.find((c) => c.id === multisig?.chainId);

      return {
        proposal,
        multisig: multisig!,
        chainName: chain?.name || "Unknown",
        transactionType: "vault",
        loading: true,
        expanded: false,
      };
    });

    setPreviews(initialPreviews);

    // Load transaction data for each proposal
    const loadPreviewData = async () => {
      for (let i = 0; i < initialPreviews.length; i++) {
        const preview = initialPreviews[i];
        const { proposal, multisig } = preview;

        const chain = chains.find((c) => c.id === multisig.chainId);
        if (!chain) {
          setPreviews((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, loading: false, error: "Chain not found" } : p
            )
          );
          continue;
        }

        try {
          const squadService = new SquadService(
            chain.rpcUrl,
            chain.squadsV4ProgramId
          );

          const txType = await squadService.getTransactionType(
            proposal.multisig,
            proposal.transactionIndex
          );

          if (txType === "config") {
            const configTx = await squadService.getConfigTransaction(
              proposal.multisig,
              proposal.transactionIndex
            );

            setPreviews((prev) =>
              prev.map((p, idx) =>
                idx === i
                  ? {
                      ...p,
                      transactionType: "config",
                      configActionCount: configTx.actions.length,
                      loading: false,
                      fullData: {
                        configActions: configTx.actions,
                      },
                    }
                  : p
              )
            );
          } else {
            const vaultTx = await squadService.getVaultTransaction(
              proposal.multisig,
              proposal.transactionIndex
            );

            const accountKeys = vaultTx.message.accountKeys.map((key) =>
              key.toString()
            );

            const instructions = vaultTx.message.instructions.map((ix) => {
              const accountIndexes = Array.isArray(ix.accountIndexes)
                ? ix.accountIndexes
                : Array.from(ix.accountIndexes);

              const programId = accountKeys[ix.programIdIndex];

              return {
                programIdIndex: ix.programIdIndex,
                programId,
                accountKeyIndexes: accountIndexes,
                data: bs58.encode(ix.data),
                accounts: accountIndexes.map((idx) => accountKeys[idx]),
              };
            });

            const uniqueProgramIds = [
              ...new Set(instructions.map((ix) => ix.programId)),
            ];

            setPreviews((prev) =>
              prev.map((p, idx) =>
                idx === i
                  ? {
                      ...p,
                      transactionType: "vault",
                      instructionCount: instructions.length,
                      accountCount: accountKeys.length,
                      programIds: uniqueProgramIds,
                      loading: false,
                      fullData: {
                        instructions,
                        accountKeys,
                      },
                    }
                  : p
              )
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load transaction data";

          setPreviews((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, loading: false, error: errorMessage } : p
            )
          );
        }
      }
    };

    loadPreviewData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only reload when modal opens/closes

  const toggleExpanded = (index: number) => {
    setPreviews((prev) =>
      prev.map((p, idx) =>
        idx === index ? { ...p, expanded: !p.expanded } : p
      )
    );
  };

  const handleConfirm = async () => {
    setConfirming(true);

    // If onExecuteProposal is provided, handle execution here with visual feedback
    if (onExecuteProposal) {
      // Collapse all items first
      setPreviews((prev) => prev.map((p) => ({ ...p, expanded: false })));

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < previews.length; i++) {
        const preview = previews[i];

        // Skip if there was an error loading this preview
        if (preview.error || preview.loading) {
          continue;
        }

        // Expand current item being processed
        setProcessingIndex(i);
        setPreviews((prev) =>
          prev.map((p, idx) => ({
            ...p,
            expanded: idx === i,
          }))
        );

        try {
          await onExecuteProposal(preview.proposal, preview.multisig);
          successCount++;
        } catch (error) {
          console.error(`Failed to ${action} proposal:`, error);
          failCount++;
        }

        // Small delay for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setProcessingIndex(null);
      setConfirming(false);

      if (onComplete) {
        onComplete(successCount, failCount);
      }

      onOpenChange(false);
    } else {
      // Fallback to original behavior
      try {
        await onConfirm();
        onOpenChange(false);
      } finally {
        setConfirming(false);
      }
    }
  };

  const totalProposals = previews.length;
  const loadingCount = previews.filter((p) => p.loading).length;
  const errorCount = previews.filter((p) => p.error).length;
  const readyCount = previews.filter((p) => !p.loading && !p.error).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            Batch {action === "approve" ? "Approval" : "Rejection"} Preview
          </DialogTitle>
          <DialogDescription>
            Review the transactions you are about to{" "}
            {action === "approve" ? "approve" : "reject"}. Expand each item to
            see details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {totalProposals} Proposal{totalProposals !== 1 ? "s" : ""}{" "}
                  Selected
                </p>
                <p className="text-muted-foreground text-xs">
                  {loadingCount > 0 && `Loading ${loadingCount}... `}
                  {readyCount > 0 && `${readyCount} ready `}
                  {errorCount > 0 && `${errorCount} failed`}
                </p>
              </div>
              <Badge
                variant={action === "approve" ? "default" : "destructive"}
                className="text-xs"
              >
                {action === "approve" ? "✓ Approve" : "✗ Reject"}
              </Badge>
            </div>
          </div>

          <div className="max-h-[40vh] overflow-y-auto">
            <div className="space-y-3 pr-4">
              {previews.map((preview, index) => (
                <div
                  key={`${preview.proposal.multisig.toString()}-${preview.proposal.transactionIndex}`}
                  ref={(el) => {
                    previewRefs.current[index] = el;
                  }}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div
                    className="flex cursor-pointer items-start gap-3"
                    onClick={() =>
                      !preview.loading && !confirming && toggleExpanded(index)
                    }
                  >
                    <div className="mt-0.5 shrink-0">
                      {!preview.loading &&
                        !preview.error &&
                        (preview.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        ))}
                      {preview.loading && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {preview.error && (
                        <AlertCircle className="text-destructive h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold">
                          TX #{preview.proposal.transactionIndex.toString()}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {preview.chainName}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {preview.transactionType}
                        </Badge>
                        {processingIndex === index && (
                          <Badge className="text-xs">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Processing...
                          </Badge>
                        )}
                      </div>

                      {!preview.loading && !preview.error && (
                        <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                          {preview.transactionType === "vault" && (
                            <>
                              <span>
                                {preview.instructionCount} instruction
                                {preview.instructionCount !== 1 ? "s" : ""}
                              </span>
                              <span>•</span>
                              <span>
                                {preview.accountCount} account
                                {preview.accountCount !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                          {preview.transactionType === "config" && (
                            <span>
                              {preview.configActionCount} action
                              {preview.configActionCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      )}

                      {preview.error && (
                        <p className="text-destructive mt-1 text-xs">
                          {preview.error}
                        </p>
                      )}

                      {!preview.loading &&
                        !preview.error &&
                        preview.multisig && (
                          <code className="text-muted-foreground mt-2 block truncate text-[10px]">
                            {preview.proposal.multisig.toString()}
                          </code>
                        )}
                    </div>
                  </div>

                  {preview.expanded && !preview.loading && !preview.error && (
                    <>
                      <Separator />

                      {preview.transactionType === "vault" &&
                        preview.fullData?.instructions && (
                          <div className="space-y-3">
                            {preview.programIds &&
                              preview.programIds.length > 0 && (
                                <div>
                                  <p className="text-muted-foreground mb-2 text-xs font-medium">
                                    Programs
                                  </p>
                                  <div className="space-y-1">
                                    {preview.programIds.map(
                                      (programId, idx) => (
                                        <code
                                          key={idx}
                                          className="bg-muted block rounded px-2 py-1 text-[10px] break-all"
                                        >
                                          {programId}
                                        </code>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            <div>
                              <p className="text-muted-foreground mb-2 text-xs font-medium">
                                Instructions (
                                {preview.fullData.instructions.length})
                              </p>
                              <div className="space-y-2">
                                {preview.fullData.instructions.map(
                                  (ix, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-muted space-y-1 rounded p-2"
                                    >
                                      <p className="text-xs font-semibold">
                                        #{idx + 1}
                                      </p>
                                      <div className="space-y-1 text-[10px]">
                                        <div>
                                          <span className="text-muted-foreground">
                                            Program:{" "}
                                          </span>
                                          <code className="break-all">
                                            {ix.programId}
                                          </code>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Accounts: {ix.accounts.length}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Data: {ix.data.substring(0, 32)}...
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {preview.transactionType === "config" &&
                        preview.fullData?.configActions && (
                          <div>
                            <p className="text-muted-foreground mb-2 text-xs font-medium">
                              Config Actions (
                              {preview.fullData.configActions.length})
                            </p>
                            <div className="space-y-2">
                              {preview.fullData.configActions.map(
                                (action, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-muted rounded p-2"
                                  >
                                    <p className="mb-1 text-xs font-semibold">
                                      Action #{idx + 1}
                                    </p>
                                    <pre className="overflow-x-auto text-[10px]">
                                      {JSON.stringify(action, null, 2)}
                                    </pre>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            variant={action === "approve" ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={confirming || loadingCount > 0 || readyCount === 0}
          >
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {action === "approve" ? "Approving" : "Rejecting"}...
              </>
            ) : (
              <>
                {action === "approve" ? "Approve" : "Reject"} {readyCount}{" "}
                Proposal{readyCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
