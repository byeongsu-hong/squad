"use client";

import { Check, ChevronDown, ChevronUp, Copy, Loader2, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { AddressWithLabel } from "@/components/address-with-label";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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

  // ── Status stripe color ──────────────────────────────────────────────────
  const stripeColor =
    proposal.status === "Executed"
      ? "bg-muted-foreground/30"
      : proposal.status === "Rejected"
        ? "bg-red-500"
        : readyToExecute
          ? "bg-green-500"
          : needsYourSignature
            ? "bg-primary"
            : "bg-muted-foreground/20";

  // ── Status label & badge styling ─────────────────────────────────────────
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

  const statusBadgeClass =
    proposal.status === "Executed"
      ? "bg-muted text-muted-foreground"
      : proposal.status === "Rejected"
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        : readyToExecute
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          : needsYourSignature
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            : "bg-muted text-muted-foreground";

  // ── Approval progress ────────────────────────────────────────────────────
  const approvalPct = multisig.threshold > 0
    ? Math.min(100, Math.round((approvalCount / multisig.threshold) * 100))
    : 0;
  const progressBarColor =
    proposal.status === "Rejected"
      ? "bg-red-500"
      : approvalCount >= multisig.threshold
        ? "bg-green-500"
        : needsYourSignature
          ? "bg-primary"
          : "bg-muted-foreground/40";

  // ── Signers ──────────────────────────────────────────────────────────────
  const visibleMembers = signersExpanded
    ? multisig.members
    : multisig.members.slice(0, 5);
  const currentUserAddress = getViewerAddress(multisig.provider);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent showCloseButton={false} className="flex flex-col p-0 gap-0">
        {/* Accessibility title (visually hidden) */}
        <SheetTitle className="sr-only">
          {multisig.label || "Unnamed"} · #{proposal.transactionIndex.toString()}
        </SheetTitle>

        {/* Status stripe */}
        <div className={cn("h-1.5 w-full shrink-0", stripeColor)} />

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          {/* Row 1: badges + close */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {/* Status badge */}
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  statusBadgeClass
                )}
              >
                {statusLabel}
              </span>

              {/* Chain */}
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {multisig.chainName}
              </span>

              {/* Provider */}
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                {multisig.provider === "safe" ? "Safe" : "Squads"}
              </span>

              {/* You signed */}
              {currentUserApproved && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  You signed
                </span>
              )}

              {/* Waiting on you */}
              {needsYourSignature && !currentUserApproved && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Waiting on you
                </span>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="ml-1 shrink-0 rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Row 2: big title */}
          <h2 className="mt-3 text-xl font-bold tracking-[-0.02em] text-foreground">
            {multisig.label || "Unnamed"}{" "}
            <span className="text-muted-foreground font-normal">
              #{proposal.transactionIndex.toString()}
            </span>
          </h2>

          {/* Row 3: meta */}
          <div className="mt-1.5 flex flex-wrap gap-4 text-[11px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              Address{" "}
              <AddressWithLabel
                address={multisig.address}
                showCopy={false}
                showLabelButton={false}
                className="font-mono text-muted-foreground"
              />
            </span>
            {proposal.creator && (
              <span className="flex items-center gap-1">
                By{" "}
                <AddressWithLabel
                  address={proposal.creator}
                  showCopy={false}
                  showLabelButton={false}
                  className="font-mono text-muted-foreground"
                />
              </span>
            )}
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="border-border flex shrink-0 border-b px-6">
          {(["overview", "payload"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-[13px] capitalize transition-colors",
                tab === t
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground/70 hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "overview" ? (
            <div className="space-y-6">
              {/* Approval Progress */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Approval Progress
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", progressBarColor)}
                    style={{ width: `${approvalPct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{approvalCount}</span>
                    {" of "}
                    <span className="font-semibold text-foreground">{multisig.threshold}</span>
                    {" signatures"}
                    {proposal.rejections.length > 0 && (
                      <span className="ml-2 text-red-500">
                        · {proposal.rejections.length} rejection{proposal.rejections.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      approvalCount >= multisig.threshold
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {approvalPct}%
                  </span>
                </div>
              </div>

              {/* Signers */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Signers
                    <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/60">
                      {multisig.members.length} member{multisig.members.length !== 1 ? "s" : ""}
                    </span>
                  </p>
                  {multisig.members.length > 5 && (
                    <button
                      onClick={() => setSignersExpanded(!signersExpanded)}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80"
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

                <div className="rounded-xl border border-border overflow-hidden">
                  {visibleMembers.map((member, idx) => {
                    const isApproved = proposal.approvals.includes(member.address);
                    const isRejected = proposal.rejections.includes(member.address);
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
                        className={cn(
                          "flex items-center justify-between px-4 py-3",
                          idx !== 0 && "border-t border-border"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {isCurrentUser && (
                            <span className="shrink-0 rounded-[3px] bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              YOU
                            </span>
                          )}
                          {isProposer && !isCurrentUser && (
                            <span className="shrink-0 rounded-[3px] bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                              PROPOSER
                            </span>
                          )}
                          <AddressWithLabel
                            address={member.address}
                            showCopy={false}
                            showLabelButton={false}
                            className="min-w-0 truncate font-mono text-[12px] text-muted-foreground"
                          />
                        </div>
                        <span
                          className={cn(
                            "ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                            isApproved
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                              : isRejected
                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                : "border border-border bg-transparent text-muted-foreground/70"
                          )}
                        >
                          {memberState}
                        </span>
                      </div>
                    );
                  })}
                  {!signersExpanded && multisig.members.length > 5 && (
                    <div className="border-t border-border bg-muted/40 px-4 py-2.5 text-center text-[11px] text-muted-foreground/60">
                      +{multisig.members.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Payload tab ────────────────────────────────────────────── */
            <div className="space-y-3">
              {payloadLoading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
                </div>
              )}
              {payloadError && !payloadLoading && (
                <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground/70">
                  {payloadError}
                </p>
              )}

              {/* Squads transaction PDA */}
              {payload && "transactionPda" in payload && (
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Transaction PDA
                    </p>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(payload.transactionPda)
                      }
                      className="text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <code className="block break-all rounded-lg bg-card px-3 py-2 font-mono text-[11px] text-foreground/80">
                    {payload.transactionPda}
                  </code>
                </div>
              )}

              {/* Safe payload */}
              {payload?.type === "safe" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Safe Tx Hash
                      </p>
                      {payload.safeTxHash && (
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(payload.safeTxHash ?? "")
                          }
                          className="text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <code className="block break-all rounded-lg bg-card px-3 py-2 font-mono text-[11px] text-foreground/80">
                      {payload.safeTxHash ?? "Unavailable"}
                    </code>
                  </div>

                  {payload.nonce !== undefined && (
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Nonce
                      </p>
                      <code className="block rounded-lg bg-card px-3 py-2 font-mono text-sm text-foreground/80">
                        {payload.nonce}
                      </code>
                    </div>
                  )}

                  {payload.toAddress && (
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Target
                      </p>
                      <div className="rounded-lg bg-card px-3 py-2">
                        <AddressWithLabel
                          address={payload.toAddress}
                          showFull
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Value / Operation
                    </p>
                    <div className="rounded-lg bg-card px-3 py-2">
                      <p className="font-mono text-sm text-foreground/80">
                        {payload.value ?? "0"} wei
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        Operation {payload.operation ?? 0}
                      </p>
                    </div>
                  </div>

                  {payload.data && (
                    <div className="rounded-xl border border-border bg-muted/50 p-4 sm:col-span-2">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Calldata
                      </p>
                      <code className="block break-all rounded-lg bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {payload.data}
                      </code>
                    </div>
                  )}

                  {payload.dataDecoded != null && (
                    <div className="rounded-xl border border-border bg-muted/50 p-4 sm:col-span-2">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Decoded Payload
                      </p>
                      <pre className="overflow-x-auto rounded-lg bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {JSON.stringify(payload.dataDecoded, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Config actions */}
              {payload?.type === "config" && (
                <div className="space-y-3">
                  {payload.actions.map((action, i) => {
                    const formatted = formatConfigAction(action as ConfigAction);
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-border bg-muted/50 p-4"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-md bg-card px-2 py-0.5 text-[11px] text-muted-foreground border border-border">
                            Action {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatted.type}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {formatted.fields.map((field, j) => (
                            <div key={j}>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {field.label}
                              </p>
                              {typeof field.value === "string" ? (
                                <p className="break-all rounded-lg bg-card px-3 py-2 text-sm text-foreground/80">
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

              {/* Vault instructions */}
              {payload?.type === "vault" && (
                <div className="space-y-3">
                  {payload.instructions.map((instruction, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-muted/50 p-4"
                    >
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Instruction {i + 1}
                      </p>
                      <div className="rounded-lg bg-card px-3 py-2 mb-3">
                        <AddressWithLabel
                          address={instruction.programAddress}
                          showFull
                          vaultAddress={payload.vaultAddress ?? undefined}
                        />
                      </div>
                      <div className="space-y-3 text-[11px] text-muted-foreground">
                        <div>
                          <p className="mb-2 font-semibold uppercase tracking-wider">
                            Accounts ({instruction.accountIndexes.length})
                          </p>
                          <div className="space-y-1">
                            {instruction.accountIndexes.map((idx: number) => (
                              <div
                                key={`${i}-${idx}`}
                                className="flex items-center gap-2 rounded-md bg-card/60 px-2 py-1"
                              >
                                <span className="w-5 font-mono text-muted-foreground/70">
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
                          <p className="mb-2 font-semibold uppercase tracking-wider">
                            Data (base58)
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
                <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground/70">
                  No payload details available for this proposal.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Status message */}
            <span
              className={cn(
                "text-[12px]",
                isComplete
                  ? "text-muted-foreground/70"
                  : readyToExecute
                    ? "text-green-600 dark:text-green-400"
                    : needsYourSignature
                      ? "text-primary"
                      : "text-muted-foreground/70"
              )}
            >
              {isComplete
                ? `This proposal was ${proposal.status.toLowerCase()}.`
                : readyToExecute
                  ? "Ready to execute — all signatures collected."
                  : needsYourSignature
                    ? "Your signature is needed."
                    : "Waiting for more signatures."}
            </span>

            {/* Action buttons */}
            {actionsSupported && !isComplete && (
              <div className="flex shrink-0 gap-2">
                {approveSupported &&
                  !currentUserApproved &&
                  needsYourSignature && (
                    <Button
                      onClick={handleApprove}
                      disabled={isActionInProgress}
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 border-primary/20"
                    >
                      {isApproveLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {multisig.provider === "safe" ? "Confirm" : "Approve"}
                    </Button>
                  )}
                {rejectSupported && needsYourSignature && (
                  <Button
                    onClick={handleReject}
                    disabled={isActionInProgress}
                    variant="outline"
                    size="sm"
                  >
                    {isRejectLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Reject
                  </Button>
                )}
                {executeSupported && readyToExecute && (
                  <Button
                    onClick={handleExecute}
                    disabled={isActionInProgress}
                    size="sm"
                    className="border-green-600/20 bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                  >
                    {isExecuteLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Execute
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
