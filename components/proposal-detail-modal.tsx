"use client";

import { Check, ChevronDown, ChevronUp, Copy, Loader2, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { AddressWithLabel } from "@/components/address-with-label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handle}
      className="shrink-0 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

export function ProposalDetailModal({
  item,
  open,
  onClose,
  onActionSuccess,
}: ProposalDetailModalProps) {
  const [payloadOpen, setPayloadOpen] = useState(false);
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

  const isApproveLoading = isActionLoading("approve", multisig.key, proposal.transactionIndex);
  const isRejectLoading = isActionLoading("reject", multisig.key, proposal.transactionIndex);
  const isExecuteLoading = isActionLoading("execute", multisig.key, proposal.transactionIndex);

  const handleApprove = () =>
    approveByAddress(multisig.address, proposal.transactionIndex, multisig.chainId);
  const handleReject = () =>
    rejectByAddress(multisig.address, proposal.transactionIndex, multisig.chainId);
  const handleExecute = () =>
    executeByAddress(multisig.address, proposal.transactionIndex, multisig.chainId);

  const currentUserAddress = getViewerAddress(multisig.provider);

  const approvalPct =
    multisig.threshold > 0
      ? Math.min(100, Math.round((approvalCount / multisig.threshold) * 100))
      : 0;

  // Status stripe
  const stripeColor =
    proposal.status === "Executed"
      ? "bg-muted-foreground/20"
      : proposal.status === "Rejected"
        ? "bg-red-500"
        : readyToExecute
          ? "bg-emerald-500"
          : needsYourSignature
            ? "bg-primary"
            : "bg-muted-foreground/20";

  // Action card
  const actionCardBg = readyToExecute
    ? "bg-emerald-50 dark:bg-emerald-950/30"
    : needsYourSignature
      ? "bg-primary/8 dark:bg-primary/10"
      : "bg-muted/50";

  const visibleMembers = signersExpanded
    ? multisig.members
    : multisig.members.slice(0, 6);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent showCloseButton={false} className="flex flex-col gap-0 p-0">
        <SheetTitle className="sr-only">
          {multisig.label || "Unnamed"} · #{proposal.transactionIndex.toString()}
        </SheetTitle>

        {/* ── Top stripe ──────────────────────────────────────────────── */}
        <div className={cn("h-[3px] w-full shrink-0", stripeColor)} />

        {/* ── Identity header ─────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono">
                  {multisig.chainName}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {multisig.provider === "safe" ? "Safe" : "Squads"}
                </span>
                <span className="font-mono text-muted-foreground/60">
                  #{proposal.transactionIndex.toString()}
                </span>
              </div>
              <h2 className="mt-2 truncate text-lg font-bold tracking-tight text-foreground">
                {multisig.label || "Unnamed"}
              </h2>
              {proposal.creator && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <span>by</span>
                  <AddressWithLabel
                    address={proposal.creator}
                    showCopy={false}
                    showLabelButton={false}
                    className="font-mono text-muted-foreground/70"
                  />
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Action card — primary CTA, shown first */}
          {!isComplete && actionsSupported && (
            <div className={cn("mx-6 rounded-2xl p-4", actionCardBg)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {readyToExecute
                      ? "Ready to execute"
                      : needsYourSignature
                        ? "Your signature needed"
                        : `${multisig.threshold - approvalCount} more signature${multisig.threshold - approvalCount !== 1 ? "s" : ""} needed`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {currentUserApproved
                      ? "You have already signed this proposal"
                      : readyToExecute
                        ? "All required signatures collected"
                        : needsYourSignature
                          ? "Approve or reject below"
                          : "Waiting for other signers"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {approveSupported && !currentUserApproved && needsYourSignature && (
                    <Button
                      size="sm"
                      onClick={handleApprove}
                      disabled={isActionInProgress}
                    >
                      {isApproveLoading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Check className="h-3.5 w-3.5" />}
                      {multisig.provider === "safe" ? "Confirm" : "Approve"}
                    </Button>
                  )}
                  {rejectSupported && needsYourSignature && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReject}
                      disabled={isActionInProgress}
                    >
                      {isRejectLoading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <X className="h-3.5 w-3.5" />}
                      Reject
                    </Button>
                  )}
                  {executeSupported && readyToExecute && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600"
                      onClick={handleExecute}
                      disabled={isActionInProgress}
                    >
                      {isExecuteLoading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : null}
                      Execute
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Completed notice */}
          {isComplete && (
            <div className="mx-6 rounded-2xl bg-muted/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                This proposal was{" "}
                <span className="font-medium text-foreground">
                  {proposal.status.toLowerCase()}
                </span>
                .
              </p>
            </div>
          )}

          {/* ── Signatures ──────────────────────────────────────────── */}
          <div className="px-6 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Signatures
              </span>
              <div className="flex items-center gap-2">
                {/* Dot indicators */}
                <div className="flex gap-1">
                  {multisig.members.map((m) => {
                    const approved = proposal.approvals.includes(m.address);
                    const rejected = proposal.rejections.includes(m.address);
                    return (
                      <div
                        key={m.address}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          approved
                            ? "bg-emerald-500"
                            : rejected
                              ? "bg-red-500"
                              : "bg-muted-foreground/20"
                        )}
                      />
                    );
                  })}
                </div>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {approvalCount}
                  <span className="text-muted-foreground/50">/{multisig.threshold}</span>
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  proposal.status === "Rejected"
                    ? "bg-red-500"
                    : approvalCount >= multisig.threshold
                      ? "bg-emerald-500"
                      : needsYourSignature
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                )}
                style={{ width: `${approvalPct}%` }}
              />
            </div>

            {/* Signer rows */}
            <div className="space-y-0.5">
              {visibleMembers.map((member) => {
                const isApproved = proposal.approvals.includes(member.address);
                const isRejected = proposal.rejections.includes(member.address);
                const isCurrentUser = member.address === currentUserAddress;
                const isProposer = member.address === proposal.creator;

                return (
                  <div
                    key={member.address}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          isApproved
                            ? "bg-emerald-500"
                            : isRejected
                              ? "bg-red-500"
                              : "bg-muted-foreground/25"
                        )}
                      />
                      {isCurrentUser && (
                        <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold uppercase text-primary">
                          you
                        </span>
                      )}
                      {isProposer && !isCurrentUser && (
                        <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                          proposer
                        </span>
                      )}
                      <AddressWithLabel
                        address={member.address}
                        showCopy={false}
                        showLabelButton={false}
                        className="min-w-0 font-mono text-xs text-muted-foreground"
                      />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-medium",
                        isApproved
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isRejected
                            ? "text-red-500 dark:text-red-400"
                            : "text-muted-foreground/40"
                      )}
                    >
                      {isApproved ? "Signed" : isRejected ? "Rejected" : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {multisig.members.length > 6 && (
              <button
                onClick={() => setSignersExpanded(!signersExpanded)}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-muted-foreground"
              >
                {signersExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    {multisig.members.length - 6} more
                  </>
                )}
              </button>
            )}
          </div>

          {/* ── Payload (collapsible) ────────────────────────────────── */}
          <div className="px-6 pb-8 pt-5">
            <button
              onClick={() => setPayloadOpen(!payloadOpen)}
              className="flex w-full items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/60"
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Payload
              </span>
              {payloadOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
            </button>

            {payloadOpen && (
              <div className="mt-3 space-y-3">
                {payloadLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                  </div>
                )}
                {payloadError && !payloadLoading && (
                  <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground/60">
                    {payloadError}
                  </p>
                )}

                {payload && "transactionPda" in payload && (
                  <PayloadField
                    label="Transaction PDA"
                    value={payload.transactionPda}
                    mono
                    copyable
                  />
                )}

                {payload?.type === "safe" && (
                  <>
                    {payload.safeTxHash && (
                      <PayloadField
                        label="Safe Tx Hash"
                        value={payload.safeTxHash}
                        mono
                        copyable
                      />
                    )}
                    {payload.nonce !== undefined && (
                      <PayloadField label="Nonce" value={String(payload.nonce)} mono />
                    )}
                    {payload.toAddress && (
                      <div className="rounded-xl bg-muted/40 px-4 py-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                          Target
                        </p>
                        <AddressWithLabel address={payload.toAddress} showFull />
                      </div>
                    )}
                    {(payload.value || payload.operation !== undefined) && (
                      <div className="rounded-xl bg-muted/40 px-4 py-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                          Value / Operation
                        </p>
                        <p className="font-mono text-sm text-foreground/80">
                          {payload.value ?? "0"} wei
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">
                          Operation {payload.operation ?? 0}
                        </p>
                      </div>
                    )}
                    {payload.data && (
                      <PayloadField label="Calldata" value={payload.data} mono />
                    )}
                    {payload.dataDecoded != null && (
                      <div className="rounded-xl bg-muted/40 px-4 py-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                          Decoded
                        </p>
                        <pre className="overflow-x-auto rounded-lg bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          {JSON.stringify(payload.dataDecoded, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {payload?.type === "config" && (
                  <div className="space-y-3">
                    {payload.actions.map((action, i) => {
                      const formatted = formatConfigAction(action as ConfigAction);
                      return (
                        <div key={i} className="rounded-xl bg-muted/40 px-4 py-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground/70">
                              Action {i + 1}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {formatted.type}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {formatted.fields.map((field, j) => (
                              <div key={j}>
                                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
                                  {field.label}
                                </p>
                                {typeof field.value === "string" ? (
                                  <p className="mt-0.5 break-all text-sm text-foreground/80">
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
                      <div key={i} className="rounded-xl bg-muted/40 px-4 py-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                          Instruction {i + 1}
                        </p>
                        <AddressWithLabel
                          address={instruction.programAddress}
                          showFull
                          vaultAddress={payload.vaultAddress ?? undefined}
                        />
                        <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
                          <div>
                            <p className="mb-1 uppercase tracking-widest text-muted-foreground/70">
                              Accounts ({instruction.accountIndexes.length})
                            </p>
                            <div className="space-y-0.5">
                              {instruction.accountIndexes.map((idx: number) => (
                                <div
                                  key={`${i}-${idx}`}
                                  className="flex items-center gap-2 rounded-md bg-card/60 px-2 py-1"
                                >
                                  <span className="w-4 font-mono text-muted-foreground/50">
                                    {idx}
                                  </span>
                                  <AddressWithLabel
                                    address={
                                      instruction.accountAddresses[
                                        instruction.accountIndexes.indexOf(idx)
                                      ]
                                    }
                                    vaultAddress={payload.vaultAddress ?? undefined}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 uppercase tracking-widest text-muted-foreground/70">
                              Data
                            </p>
                            <code className="block break-all rounded-lg bg-card px-3 py-2 font-mono text-muted-foreground">
                              {instruction.data}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!payloadLoading && !payloadError && !payload && (
                  <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground/60">
                    No payload details available.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PayloadField({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </p>
        {copyable && <CopyButton text={value} />}
      </div>
      <p
        className={cn(
          "break-all text-sm text-foreground/80",
          mono && "font-mono text-[11px]"
        )}
      >
        {value}
      </p>
    </div>
  );
}
