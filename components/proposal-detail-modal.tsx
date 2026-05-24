"use client";

import { Check, ChevronDown, ChevronUp, Copy, Loader2, X, Zap } from "lucide-react";
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
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-inherit/50 transition-opacity hover:opacity-100 opacity-60"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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

  const { loading: payloadLoading, payload, error: payloadError } =
    useWorkspacePayload({
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

  const actionsSupported = supportsProviderCapability(multisig.provider, "proposalActions");
  const approveSupported = supportsProviderAction(multisig.provider, "approve");
  const rejectSupported = supportsProviderAction(multisig.provider, "reject");
  const executeSupported = supportsProviderAction(multisig.provider, "execute");

  const isApproveLoading = isActionLoading("approve", multisig.key, proposal.transactionIndex);
  const isRejectLoading = isActionLoading("reject", multisig.key, proposal.transactionIndex);
  const isExecuteLoading = isActionLoading("execute", multisig.key, proposal.transactionIndex);

  const currentUserAddress = getViewerAddress(multisig.provider);
  const approvalPct = multisig.threshold > 0
    ? Math.min(100, Math.round((approvalCount / multisig.threshold) * 100))
    : 0;

  const visibleMembers = signersExpanded
    ? multisig.members
    : multisig.members.slice(0, 6);

  // ── Status band config ─────────────────────────────────────────────────────
  const band = (() => {
    if (proposal.status === "Executed")
      return {
        bg: "bg-zinc-800 dark:bg-zinc-900",
        text: "text-zinc-300",
        label: "Executed",
        sub: "This transaction has been executed on-chain.",
      };
    if (proposal.status === "Rejected")
      return {
        bg: "bg-red-600 dark:bg-red-700",
        text: "text-white",
        label: "Rejected",
        sub: "This transaction was rejected.",
      };
    if (readyToExecute)
      return {
        bg: "bg-emerald-600 dark:bg-emerald-700",
        text: "text-white",
        label: "Ready to Execute",
        sub: "All required signatures have been collected.",
      };
    if (needsYourSignature)
      return {
        bg: "bg-amber-500 dark:bg-amber-600",
        text: "text-white",
        label: "Needs Your Signature",
        sub: `${multisig.threshold - approvalCount} more signature${multisig.threshold - approvalCount !== 1 ? "s" : ""} required.`,
      };
    return {
      bg: "bg-zinc-700 dark:bg-zinc-800",
      text: "text-zinc-200",
      label: "Pending",
      sub: `Waiting for ${multisig.threshold - approvalCount} more signature${multisig.threshold - approvalCount !== 1 ? "s" : ""}.`,
    };
  })();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent showCloseButton={false} className="flex flex-col gap-0 p-0 overflow-hidden">
        <SheetTitle className="sr-only">
          {multisig.label || "Unnamed"} · #{proposal.transactionIndex.toString()}
        </SheetTitle>

        {/* ── Status band ─────────────────────────────────────────────── */}
        <div className={cn("relative shrink-0 px-6 pt-6 pb-5", band.bg)}>
          {/* Close button */}
          <button
            onClick={onClose}
            className={cn(
              "absolute top-4 right-4 rounded-lg p-1.5 transition-colors",
              "bg-white/10 hover:bg-white/20",
              band.text
            )}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Status label + sub */}
          <div className={cn("flex items-center gap-2 mb-3", band.text)}>
            {readyToExecute && <Zap className="h-4 w-4 fill-current" />}
            <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
              {band.label}
            </span>
          </div>

          {/* Vault name + tx# */}
          <h2 className={cn("text-xl font-bold leading-tight tracking-tight", band.text)}>
            {multisig.label || "Unnamed"}
            <span className="ml-2 font-normal opacity-50">
              #{proposal.transactionIndex.toString()}
            </span>
          </h2>

          {/* Meta row */}
          <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs", band.text, "opacity-70")}>
            <span>{multisig.chainName}</span>
            <span>·</span>
            <span>{multisig.provider === "safe" ? "Safe" : "Squads"}</span>
            {proposal.creator && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  by{" "}
                  <AddressWithLabel
                    address={proposal.creator}
                    showCopy={false}
                    showLabelButton={false}
                    className="font-mono opacity-90"
                  />
                </span>
              </>
            )}
          </div>

          {/* Action buttons inside band */}
          {!isComplete && actionsSupported && (
            <div className="mt-4 flex flex-wrap gap-2">
              {approveSupported && !currentUserApproved && needsYourSignature && (
                <button
                  onClick={() =>
                    approveByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)
                  }
                  disabled={isActionInProgress}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-50"
                >
                  {isApproveLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Check className="h-3.5 w-3.5" />}
                  {multisig.provider === "safe" ? "Confirm" : "Approve"}
                </button>
              )}
              {rejectSupported && needsYourSignature && (
                <button
                  onClick={() =>
                    rejectByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)
                  }
                  disabled={isActionInProgress}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-black/20 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-black/30 disabled:opacity-50"
                >
                  {isRejectLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Reject
                </button>
              )}
              {executeSupported && readyToExecute && (
                <button
                  onClick={() =>
                    executeByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)
                  }
                  disabled={isActionInProgress}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-white/90 disabled:opacity-50"
                >
                  {isExecuteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Execute Transaction
                </button>
              )}
              {currentUserApproved && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/70">
                  <Check className="h-3.5 w-3.5" />
                  You signed
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-background">

          {/* Signatures section */}
          <div className="px-6 pt-5 pb-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Signatures
              </span>
              <div className="flex items-center gap-2">
                {/* Status dots */}
                <div className="flex gap-1">
                  {multisig.members.map((m) => {
                    const approved = proposal.approvals.includes(m.address);
                    const rejected = proposal.rejections.includes(m.address);
                    return (
                      <div
                        key={m.address}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          approved ? "bg-emerald-500"
                            : rejected ? "bg-red-500"
                            : "bg-muted-foreground/20"
                        )}
                      />
                    );
                  })}
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {approvalCount}
                  <span className="text-muted-foreground/50">/{multisig.threshold}</span>
                </span>
                <span className={cn(
                  "text-xs font-semibold tabular-nums",
                  approvalCount >= multisig.threshold ? "text-emerald-600" : "text-muted-foreground/60"
                )}>
                  {approvalPct}%
                </span>
              </div>
            </div>

            {/* Thin progress bar */}
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  proposal.status === "Rejected" ? "bg-red-500"
                    : approvalCount >= multisig.threshold ? "bg-emerald-500"
                    : needsYourSignature ? "bg-amber-500"
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
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        isApproved ? "bg-emerald-500"
                          : isRejected ? "bg-red-500"
                          : "bg-muted-foreground/20"
                      )} />
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
                    <span className={cn(
                      "shrink-0 text-[11px] font-medium",
                      isApproved ? "text-emerald-600 dark:text-emerald-400"
                        : isRejected ? "text-red-500"
                        : "text-muted-foreground/30"
                    )}>
                      {isApproved ? "Signed" : isRejected ? "Rejected" : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {multisig.members.length > 6 && (
              <button
                onClick={() => setSignersExpanded(!signersExpanded)}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium text-muted-foreground/50 transition-colors hover:bg-muted/40 hover:text-muted-foreground"
              >
                {signersExpanded
                  ? <><ChevronUp className="h-3 w-3" /> Collapse</>
                  : <><ChevronDown className="h-3 w-3" /> {multisig.members.length - 6} more</>}
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="mx-6 border-t border-border" />

          {/* Payload — collapsible */}
          <div className="px-6 pb-8 pt-4">
            <button
              onClick={() => setPayloadOpen(!payloadOpen)}
              className="flex w-full items-center justify-between py-1 text-left"
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Payload
              </span>
              {payloadOpen
                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
            </button>

            {payloadOpen && (
              <div className="mt-3 space-y-2">
                {payloadLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
                  </div>
                )}
                {payloadError && !payloadLoading && (
                  <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground/60">
                    {payloadError}
                  </p>
                )}

                {payload && "transactionPda" in payload && (
                  <PayloadRow label="Transaction PDA" value={payload.transactionPda} copyable />
                )}

                {payload?.type === "safe" && (
                  <>
                    {payload.safeTxHash && (
                      <PayloadRow label="Safe Tx Hash" value={payload.safeTxHash} copyable />
                    )}
                    {payload.nonce !== undefined && (
                      <PayloadRow label="Nonce" value={String(payload.nonce)} />
                    )}
                    {payload.toAddress && (
                      <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          Target
                        </p>
                        <AddressWithLabel address={payload.toAddress} showFull />
                      </div>
                    )}
                    {payload.data && (
                      <PayloadRow label="Calldata" value={payload.data} />
                    )}
                    {payload.dataDecoded != null && (
                      <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          Decoded
                        </p>
                        <pre className="overflow-x-auto rounded-md bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          {JSON.stringify(payload.dataDecoded, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {payload?.type === "config" &&
                  payload.actions.map((action, i) => {
                    const formatted = formatConfigAction(action as ConfigAction);
                    return (
                      <div key={i} className="rounded-lg bg-muted/40 px-3 py-2.5">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground/60">
                            Action {i + 1}
                          </span>
                          <span className="text-sm font-semibold">{formatted.type}</span>
                        </div>
                        {formatted.fields.map((field, j) => (
                          <div key={j} className="mt-1.5">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                              {field.label}
                            </p>
                            {typeof field.value === "string"
                              ? <p className="mt-0.5 break-all text-sm text-foreground/80">{field.value}</p>
                              : (field.value as ReactNode)}
                          </div>
                        ))}
                      </div>
                    );
                  })}

                {payload?.type === "vault" &&
                  payload.instructions.map((instruction, i) => (
                    <div key={i} className="rounded-lg bg-muted/40 px-3 py-2.5">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Instruction {i + 1}
                      </p>
                      <AddressWithLabel
                        address={instruction.programAddress}
                        showFull
                        vaultAddress={payload.vaultAddress ?? undefined}
                      />
                      <div className="mt-2 space-y-1.5 text-[11px]">
                        <p className="uppercase tracking-widest text-muted-foreground/60">
                          Accounts ({instruction.accountIndexes.length})
                        </p>
                        {instruction.accountIndexes.map((idx: number) => (
                          <div
                            key={`${i}-${idx}`}
                            className="flex items-center gap-2 rounded bg-card/60 px-2 py-1"
                          >
                            <span className="w-4 font-mono text-muted-foreground/40">{idx}</span>
                            <AddressWithLabel
                              address={instruction.accountAddresses[instruction.accountIndexes.indexOf(idx)]}
                              vaultAddress={payload.vaultAddress ?? undefined}
                            />
                          </div>
                        ))}
                        <p className="mt-2 uppercase tracking-widest text-muted-foreground/60">
                          Data
                        </p>
                        <code className="block break-all rounded-md bg-card px-3 py-2 font-mono text-muted-foreground">
                          {instruction.data}
                        </code>
                      </div>
                    </div>
                  ))}

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

function PayloadRow({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>
        {copyable && <CopyButton text={value} />}
      </div>
      <p className="break-all font-mono text-[11px] text-foreground/70">{value}</p>
    </div>
  );
}
