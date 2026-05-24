"use client";

import { Check, ChevronDown, ChevronUp, Copy, Loader2, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { AddressWithLabel } from "@/components/address-with-label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useProposalActions } from "@/lib/hooks/use-proposal-actions";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspacePayload } from "@/lib/hooks/use-workspace-payload";
import { cn } from "@/lib/utils";
import {
  type ConfigAction,
  formatConfigAction,
} from "@/lib/utils/transaction-formatter";
import {
  supportsProviderAction,
  supportsProviderCapability,
} from "@/lib/workspace/provider-adapters";
import { useChainStore } from "@/stores/chain-store";
import type { WorkspaceQueueItem } from "@/types/workspace";

interface ProposalDetailModalProps {
  item: WorkspaceQueueItem | null;
  open: boolean;
  onClose: () => void;
  onActionSuccess?: () => Promise<void>;
}

export function ProposalDetailModal({
  item,
  open,
  onClose,
  onActionSuccess,
}: ProposalDetailModalProps) {
  const [tab, setTab] = useState<"overview" | "payload">("overview");
  const [signersExpanded, setSignersExpanded] = useState(false);

  const { chains } = useChainStore();
  const getViewerAddress = useViewerAddressForMultisig();

  const {
    loading: payloadLoading,
    payload,
    error: payloadError,
  } = useWorkspacePayload({
    chains,
    multisig: item?.multisig ?? null,
    proposal: item?.proposal ?? null,
  });

  const {
    approveByAddress,
    rejectByAddress,
    executeByAddress,
    isActionLoading,
    isActionInProgress,
  } = useProposalActions({ onSuccess: onActionSuccess });

  if (!item) return null;

  const {
    multisig,
    proposal,
    approvalCount,
    currentUserApproved,
    currentUserRejected,
    needsYourSignature,
    readyToExecute,
  } = item;
  const isComplete =
    proposal.status === "Executed" ||
    proposal.status === "Rejected" ||
    proposal.status === "Cancelled";
  const actionsSupported = supportsProviderCapability(
    multisig.provider,
    "proposalActions"
  );
  const approveSupported = supportsProviderAction(multisig.provider, "approve");
  const rejectSupported = supportsProviderAction(multisig.provider, "reject");
  const executeSupported = supportsProviderAction(multisig.provider, "execute");

  const isApproveLoading = isActionLoading(
    "approve",
    multisig.key,
    proposal.transactionIndex
  );
  const isRejectLoading = isActionLoading(
    "reject",
    multisig.key,
    proposal.transactionIndex
  );
  const isExecuteLoading = isActionLoading(
    "execute",
    multisig.key,
    proposal.transactionIndex
  );

  const handleApprove = () =>
    approveByAddress(
      multisig.address,
      proposal.transactionIndex,
      multisig.chainId
    );
  const handleReject = () =>
    rejectByAddress(
      multisig.address,
      proposal.transactionIndex,
      multisig.chainId
    );
  const handleExecute = () =>
    executeByAddress(
      multisig.address,
      proposal.transactionIndex,
      multisig.chainId
    );

  const statusColor =
    proposal.status === "Executed"
      ? "text-muted-foreground/70 bg-muted border-border"
      : proposal.status === "Rejected"
        ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50"
        : readyToExecute
          ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50"
          : needsYourSignature
            ? "text-primary bg-primary/10 border-primary/30"
            : "text-muted-foreground bg-muted border-border";

  const statusLabel =
    proposal.status === "Executed"
      ? "Executed"
      : proposal.status === "Rejected"
        ? "Rejected"
        : readyToExecute
          ? "Executable"
          : proposal.status === "Active"
            ? "Pending"
            : proposal.status;

  const signedCount = proposal.approvals.length;
  const visibleMembers = signersExpanded
    ? multisig.members
    : multisig.members.slice(0, 5);
  const currentUserAddress = getViewerAddress(multisig.provider);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="border-border bg-card max-h-[88vh] w-full max-w-[640px] overflow-hidden rounded-2xl border p-0 shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      >
        <DialogTitle className="sr-only">
          {multisig.label || "Unnamed"} · #
          {proposal.transactionIndex.toString()}
        </DialogTitle>

        {/* Header badges + close */}
        <div className="flex items-start justify-between px-6 pt-5">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                statusColor
              )}
            >
              {statusLabel}
            </span>
            <span className="border-border bg-muted text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px]">
              {multisig.chainName}
            </span>
            <span className="border-border bg-muted text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]">
              {multisig.provider === "safe" ? "Safe" : "Squads"}
            </span>
            {currentUserApproved && (
              <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-600 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-400">
                You signed
              </span>
            )}
            {needsYourSignature && !currentUserApproved && (
              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400">
                Waiting on you
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground/70 hover:bg-muted hover:text-foreground ml-2 shrink-0 rounded-md p-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title + meta */}
        <div className="px-6 pt-3 pb-4">
          <h2 className="text-foreground text-xl font-bold tracking-[-0.02em]">
            {multisig.label || "Unnamed"} · #
            {proposal.transactionIndex.toString()}
          </h2>
          <div className="text-muted-foreground/70 mt-1.5 flex flex-wrap gap-4 text-[11px]">
            <span>
              Address{" "}
              <AddressWithLabel
                address={multisig.address}
                showCopy={false}
                showLabelButton={false}
                className="text-muted-foreground font-mono"
              />
            </span>
            {proposal.creator && (
              <span>
                By{" "}
                <AddressWithLabel
                  address={proposal.creator}
                  showCopy={false}
                  showLabelButton={false}
                  className="text-muted-foreground font-mono"
                />
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-border -mb-px flex border-b px-6">
          {(["overview", "payload"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-[13px] capitalize transition-colors",
                tab === t
                  ? "border-primary text-foreground font-semibold"
                  : "text-muted-foreground/70 hover:text-foreground border-transparent"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          className="overflow-y-auto px-6 py-5"
          style={{ maxHeight: "calc(88vh - 260px)" }}
        >
          {tab === "overview" ? (
            <div className="grid gap-5 sm:grid-cols-[1fr_176px]">
              {/* Signer map */}
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-foreground text-[12px] font-semibold">
                      Signer map
                    </span>
                    <span className="text-muted-foreground/70 ml-2 text-[11px]">
                      {signedCount}/{multisig.members.length}
                    </span>
                  </div>
                  {multisig.members.length > 5 && (
                    <button
                      onClick={() => setSignersExpanded(!signersExpanded)}
                      className="text-primary hover:text-primary/80 flex items-center gap-1 text-[11px] font-medium"
                    >
                      {signersExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Show all {multisig.members.length}
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="divide-border divide-y">
                  {visibleMembers.map((member) => {
                    const isApproved = proposal.approvals.includes(
                      member.address
                    );
                    const isRejected = proposal.rejections.includes(
                      member.address
                    );
                    const isCurrentUser = member.address === currentUserAddress;
                    const isProposer = member.address === proposal.creator;
                    const memberState = isApproved
                      ? "Signed"
                      : isRejected
                        ? "Rejected"
                        : "No action";

                    return (
                      <div
                        key={member.address}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          {isCurrentUser && (
                            <span className="rounded-[3px] bg-green-50 px-1 py-0.5 text-[9px] font-bold text-green-600 uppercase dark:bg-green-950/30 dark:text-green-400">
                              YOU
                            </span>
                          )}
                          {isProposer && !isCurrentUser && (
                            <span className="bg-primary/10 text-primary rounded-[3px] px-1 py-0.5 text-[9px] font-bold uppercase">
                              proposer
                            </span>
                          )}
                          <AddressWithLabel
                            address={member.address}
                            showCopy={false}
                            showLabelButton={false}
                            className="text-muted-foreground font-mono text-[12px]"
                          />
                        </div>
                        <span
                          className={cn(
                            "rounded-[6px] border px-2 py-0.5 text-[10px] font-medium",
                            isApproved
                              ? "border-green-200 bg-green-50 text-green-600 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-400"
                              : isRejected
                                ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400"
                                : "border-border bg-background text-muted-foreground/70"
                          )}
                        >
                          {memberState}
                        </span>
                      </div>
                    );
                  })}
                  {!signersExpanded && multisig.members.length > 5 && (
                    <p className="text-muted-foreground/70 py-1.5 text-center text-[11px]">
                      +{multisig.members.length - 5} more
                    </p>
                  )}
                </div>
              </div>

              {/* Decision panel */}
              <div className="border-border bg-muted self-start rounded-xl border p-4">
                <span className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                  Decision
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-4xl leading-none font-extrabold tracking-[-0.04em]",
                      approvalCount >= multisig.threshold
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground"
                    )}
                  >
                    {approvalCount}
                  </span>
                  <span className="text-muted-foreground/70 text-base">
                    /{multisig.threshold}
                  </span>
                </div>
                <span className="text-muted-foreground/70 mt-1 block text-[10px]">
                  Required to execute
                </span>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <div className="border-border bg-card rounded-lg border px-2 py-1.5 text-center">
                    <p className="text-muted-foreground/70 text-[8px] font-semibold tracking-wider uppercase">
                      Reject
                    </p>
                    <p className="text-foreground mt-0.5 text-base font-bold">
                      {proposal.rejections.length}
                    </p>
                  </div>
                  <div className="border-border bg-card rounded-lg border px-2 py-1.5 text-center">
                    <p className="text-muted-foreground/70 text-[8px] font-semibold tracking-wider uppercase">
                      Members
                    </p>
                    <p className="text-foreground mt-0.5 text-base font-bold">
                      {multisig.members.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Payload tab */
            <div className="space-y-3">
              {payloadLoading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="text-muted-foreground/70 h-5 w-5 animate-spin" />
                </div>
              )}
              {payloadError && !payloadLoading && (
                <p className="border-border text-muted-foreground/70 rounded-lg border border-dashed px-4 py-5 text-sm">
                  {payloadError}
                </p>
              )}
              {payload && "transactionPda" in payload && (
                <div className="border-border bg-muted rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                      Transaction PDA
                    </p>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(payload.transactionPda)
                      }
                      className="text-muted-foreground/70 hover:text-muted-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <code className="text-foreground/80 mt-2 block font-mono text-[11px] break-all">
                    {payload.transactionPda}
                  </code>
                </div>
              )}
              {payload?.type === "safe" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border-border bg-muted rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                        Safe Tx Hash
                      </p>
                      {payload.safeTxHash && (
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(
                              payload.safeTxHash ?? ""
                            )
                          }
                          className="text-muted-foreground/70 hover:text-muted-foreground"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <code className="text-foreground/80 mt-2 block font-mono text-[11px] break-all">
                      {payload.safeTxHash ?? "Unavailable"}
                    </code>
                  </div>
                  {payload.nonce !== undefined && (
                    <div className="border-border bg-muted rounded-xl border p-3">
                      <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                        Nonce
                      </p>
                      <p className="text-foreground/80 mt-2 font-mono text-sm">
                        {payload.nonce}
                      </p>
                    </div>
                  )}
                  {payload.toAddress && (
                    <div className="border-border bg-muted rounded-xl border p-3">
                      <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                        Target
                      </p>
                      <div className="mt-2">
                        <AddressWithLabel
                          address={payload.toAddress}
                          showFull
                        />
                      </div>
                    </div>
                  )}
                  <div className="border-border bg-muted rounded-xl border p-3">
                    <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                      Value / Operation
                    </p>
                    <p className="text-foreground/80 mt-2 font-mono text-sm">
                      {payload.value ?? "0"} wei
                    </p>
                    <p className="text-muted-foreground/70 mt-0.5 text-[11px]">
                      Operation {payload.operation ?? 0}
                    </p>
                  </div>
                  {payload.data && (
                    <div className="border-border bg-muted rounded-xl border p-3 sm:col-span-2">
                      <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                        Calldata
                      </p>
                      <code className="border-border bg-card text-muted-foreground mt-2 block rounded-lg border px-2 py-1.5 font-mono text-[11px] break-all">
                        {payload.data}
                      </code>
                    </div>
                  )}
                  {payload.dataDecoded != null && (
                    <div className="border-border bg-muted rounded-xl border p-3 sm:col-span-2">
                      <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                        Decoded Payload
                      </p>
                      <pre className="border-border bg-card text-muted-foreground mt-2 overflow-x-auto rounded-lg border px-3 py-2 font-mono text-[11px]">
                        {JSON.stringify(payload.dataDecoded, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              {payload?.type === "config" && (
                <div className="space-y-3">
                  {payload.actions.map((action, i) => {
                    const formatted = formatConfigAction(
                      action as ConfigAction
                    );
                    return (
                      <div
                        key={i}
                        className="border-border bg-muted rounded-xl border p-4"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span className="border-border bg-card text-muted-foreground rounded-md border px-2 py-0.5 text-[11px]">
                            Action {i + 1}
                          </span>
                          <span className="text-foreground text-sm font-semibold">
                            {formatted.type}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {formatted.fields.map((field, j) => (
                            <div key={j}>
                              <p className="text-muted-foreground/70 text-[11px] font-medium">
                                {field.label}
                              </p>
                              {typeof field.value === "string" ? (
                                <p className="text-foreground/80 mt-0.5 text-sm break-all">
                                  {field.value}
                                </p>
                              ) : (
                                (field.value as ReactNode)
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {payload?.type === "vault" && (
                <div className="space-y-3">
                  {payload.instructions.map((instruction, i) => (
                    <div
                      key={i}
                      className="border-border bg-muted rounded-xl border p-4"
                    >
                      <p className="text-foreground mb-2 text-sm font-semibold">
                        Instruction {i + 1}
                      </p>
                      <AddressWithLabel
                        address={instruction.programAddress}
                        showFull
                        vaultAddress={payload.vaultAddress ?? undefined}
                      />
                      <div className="text-muted-foreground mt-3 space-y-3 text-[11px]">
                        <div>
                          <p className="mb-1.5">
                            Accounts ({instruction.accountIndexes.length})
                          </p>
                          <div className="space-y-1">
                            {instruction.accountIndexes.map((idx: number) => (
                              <div
                                key={`${i}-${idx}`}
                                className="flex items-center gap-2"
                              >
                                <span className="text-muted-foreground/70 w-5 font-mono">
                                  {idx}
                                </span>
                                <AddressWithLabel
                                  address={
                                    instruction.accountAddresses[
                                      instruction.accountIndexes.indexOf(idx)
                                    ]
                                  }
                                  vaultAddress={
                                    payload.vaultAddress ?? undefined
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1.5">Data (base58)</p>
                          <code className="border-border bg-card text-muted-foreground block rounded-lg border px-2 py-1.5 font-mono break-all">
                            {instruction.data}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!payloadLoading && !payloadError && !payload && (
                <p className="border-border text-muted-foreground/70 rounded-lg border border-dashed px-4 py-5 text-sm">
                  No payload details available for this proposal.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions bar */}
        <div className="border-border flex items-center justify-between border-t px-6 py-4">
          <span
            className={cn(
              "text-[12px]",
              isComplete
                ? "text-muted-foreground/70"
                : readyToExecute
                  ? "text-green-600 dark:text-green-400"
                  : needsYourSignature
                    ? "text-primary"
                    : "text-blue-600 dark:text-blue-400"
            )}
          >
            {isComplete
              ? `This proposal was ${proposal.status.toLowerCase()}.`
              : readyToExecute
                ? "✓ Ready to execute — all signatures collected."
                : needsYourSignature
                  ? "⚠ Waiting on your signature."
                  : "ℹ Waiting for more signatures."}
          </span>

          {actionsSupported && !isComplete && (
            <div className="flex gap-2">
              {approveSupported &&
                !currentUserApproved &&
                needsYourSignature && (
                  <button
                    onClick={handleApprove}
                    disabled={isActionInProgress}
                    className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
                  >
                    {isApproveLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {multisig.provider === "safe" ? "Confirm" : "Approve"}
                  </button>
                )}
              {rejectSupported && needsYourSignature && (
                <button
                  onClick={handleReject}
                  disabled={isActionInProgress}
                  className="border-border bg-muted text-muted-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isRejectLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  Reject
                </button>
              )}
              {executeSupported && readyToExecute && (
                <button
                  onClick={handleExecute}
                  disabled={isActionInProgress}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500"
                >
                  {isExecuteLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "→"
                  )}
                  Execute
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
