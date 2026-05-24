"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Zap,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { AddressWithLabel } from "@/components/address-with-label";
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

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "shrink-0 transition-opacity hover:opacity-100",
        copied ? "opacity-100" : "opacity-40",
        className
      )}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-muted-foreground text-[11px] uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className="text-foreground text-[12px] text-right">{children}</span>
    </div>
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
    <div className="bg-muted rounded-lg px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
          {label}
        </p>
        {copyable && <CopyButton text={value} />}
      </div>
      <p className="break-all font-mono text-[11px] text-foreground/80">{value}</p>
    </div>
  );
}

export function ProposalDetailView({
  item,
  onBack,
  onActionSuccess,
}: {
  item: WorkspaceQueueItem;
  onBack: () => void;
  onActionSuccess?: () => Promise<void>;
}) {
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
    multisig: item.multisig,
    proposal: item.proposal,
  });

  const {
    approveByAddress,
    rejectByAddress,
    executeByAddress,
    isActionLoading,
    isActionInProgress,
  } = useProposalActions({ onSuccess: onActionSuccess });

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

  const currentUserAddress = getViewerAddress(multisig.provider);
  const approvalPct =
    multisig.threshold > 0
      ? Math.min(100, Math.round((approvalCount / multisig.threshold) * 100))
      : 0;

  const visibleMembers = signersExpanded
    ? multisig.members
    : multisig.members.slice(0, 6);

  const statusPill = (() => {
    if (proposal.status === "Executed")
      return "bg-muted text-muted-foreground border border-border";
    if (proposal.status === "Rejected")
      return "bg-red-500/20 text-red-500 border border-red-500/30 dark:text-red-400";
    if (readyToExecute)
      return "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400";
    if (needsYourSignature)
      return "bg-amber-500/20 text-amber-600 border border-amber-500/30 dark:text-amber-400";
    return "bg-muted text-muted-foreground border border-border";
  })();

  const statusLabel = (() => {
    if (proposal.status === "Executed") return "Executed";
    if (proposal.status === "Rejected") return "Rejected";
    if (readyToExecute) return "Ready";
    if (needsYourSignature) return "Needs you";
    return "Pending";
  })();

  const barColor = (() => {
    if (proposal.status === "Rejected") return "bg-red-500";
    if (approvalCount >= multisig.threshold) return "bg-emerald-500";
    if (needsYourSignature) return "bg-primary";
    return "bg-muted-foreground/30";
  })();

  const showActions =
    !isComplete &&
    actionsSupported &&
    (readyToExecute || needsYourSignature || currentUserApproved);

  return (
    <div className="bg-background min-h-full w-full">
      {/* Back link */}
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header card */}
      <div className="bg-card border-border mb-4 rounded-xl border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-foreground text-xl font-bold truncate">
              {multisig.label || "Unnamed"}
            </h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-mono text-sm">
                #{proposal.transactionIndex.toString()}
              </span>
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px]">
                {multisig.chainName}
              </span>
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px]">
                {multisig.provider === "safe" ? "Safe" : "Squads"}
              </span>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              statusPill
            )}
          >
            {readyToExecute && <Zap className="h-3 w-3 fill-current" />}
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Action buttons */}
        {showActions && (
          <div className="bg-card border-border rounded-xl border px-5 py-4 space-y-2">
            {executeSupported && readyToExecute && (
              <button
                onClick={() =>
                  executeByAddress(
                    multisig.address,
                    proposal.transactionIndex,
                    multisig.chainId
                  )
                }
                disabled={isActionInProgress}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {isExecuteLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Execute Transaction
              </button>
            )}
            {approveSupported && !currentUserApproved && needsYourSignature && (
              <button
                onClick={() =>
                  approveByAddress(
                    multisig.address,
                    proposal.transactionIndex,
                    multisig.chainId
                  )
                }
                disabled={isActionInProgress}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isApproveLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {multisig.provider === "safe" ? "Confirm" : "Approve"}
              </button>
            )}
            {rejectSupported && needsYourSignature && (
              <button
                onClick={() =>
                  rejectByAddress(
                    multisig.address,
                    proposal.transactionIndex,
                    multisig.chainId
                  )
                }
                disabled={isActionInProgress}
                className="border-border text-foreground/70 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                {isRejectLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Reject
              </button>
            )}
            {currentUserApproved && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-emerald-500" />
                You already signed
              </div>
            )}
          </div>
        )}

        {/* Signatures */}
        <div className="bg-card border-border rounded-xl border px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {multisig.members.map((m) => {
                const approved = proposal.approvals.includes(m.address);
                const rejected = proposal.rejections.includes(m.address);
                return (
                  <div
                    key={m.address}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      approved
                        ? "bg-emerald-500"
                        : rejected
                          ? "bg-red-500"
                          : "bg-muted-foreground/30"
                    )}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {approvalCount}
                <span className="text-muted-foreground/50">/{multisig.threshold}</span>
              </span>
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  approvalCount >= multisig.threshold
                    ? "text-emerald-500"
                    : "text-muted-foreground/50"
                )}
              >
                {approvalPct}%
              </span>
            </div>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                barColor
              )}
              style={{ width: `${approvalPct}%` }}
            />
          </div>

          <div className="space-y-0.5">
            {visibleMembers.map((member) => {
              const isApproved = proposal.approvals.includes(member.address);
              const isRejected = proposal.rejections.includes(member.address);
              const isCurrentUser = member.address === currentUserAddress;
              const isProposer = member.address === proposal.creator;
              return (
                <div
                  key={member.address}
                  className="hover:bg-muted flex items-center justify-between rounded-lg px-2 py-1.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        isApproved
                          ? "bg-emerald-500"
                          : isRejected
                            ? "bg-red-500"
                            : "bg-muted-foreground/30"
                      )}
                    />
                    {isCurrentUser && (
                      <span className="shrink-0 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-500 dark:text-amber-400">
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
                        ? "text-emerald-500"
                        : isRejected
                          ? "text-red-500"
                          : "text-muted-foreground/30"
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
              className="text-muted-foreground hover:text-foreground hover:bg-muted mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[11px] transition-colors"
            >
              {signersExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />{" "}
                  {multisig.members.length - 6} more
                </>
              )}
            </button>
          )}
        </div>

        {/* Transaction metadata */}
        <div className="bg-card border-border rounded-xl border px-5 py-3">
          <MetaRow label="Chain">{multisig.chainName}</MetaRow>
          <MetaRow label="Provider">
            {multisig.provider === "safe" ? "Safe" : "Squads"}
          </MetaRow>
          {proposal.creator && (
            <MetaRow label="Created by">
              <AddressWithLabel
                address={proposal.creator}
                showCopy={false}
                showLabelButton={false}
                className="font-mono text-xs text-foreground/80"
              />
            </MetaRow>
          )}
          <MetaRow label="Status">{proposal.status}</MetaRow>
        </div>

        {/* Payload — collapsible */}
        <div className="bg-card border-border rounded-xl border overflow-hidden">
          <button
            onClick={() => setPayloadOpen(!payloadOpen)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-widest">
              Payload
            </span>
            {payloadOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {payloadOpen && (
            <div className="space-y-2 px-5 pb-5">
              {payloadLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                </div>
              )}
              {payloadError && !payloadLoading && (
                <p className="border-border rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                  {payloadError}
                </p>
              )}

              {payload && "transactionPda" in payload && (
                <PayloadRow
                  label="Transaction PDA"
                  value={payload.transactionPda}
                  copyable
                />
              )}

              {payload?.type === "safe" && (
                <>
                  {payload.safeTxHash && (
                    <PayloadRow
                      label="Safe Tx Hash"
                      value={payload.safeTxHash}
                      copyable
                    />
                  )}
                  {payload.nonce !== undefined && (
                    <PayloadRow
                      label="Nonce"
                      value={String(payload.nonce)}
                    />
                  )}
                  {payload.toAddress && (
                    <div className="bg-muted rounded-lg px-3 py-2.5">
                      <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-widest">
                        Target
                      </p>
                      <AddressWithLabel
                        address={payload.toAddress}
                        showFull
                      />
                    </div>
                  )}
                  {payload.data && (
                    <PayloadRow label="Calldata" value={payload.data} />
                  )}
                  {payload.dataDecoded != null && (
                    <div className="bg-muted rounded-lg px-3 py-2.5">
                      <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-widest">
                        Decoded
                      </p>
                      <pre className="bg-background overflow-x-auto rounded-md px-3 py-2 font-mono text-[11px] text-foreground/80">
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
                    <div
                      key={i}
                      className="bg-muted rounded-lg px-3 py-2.5"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-muted-foreground text-[10px]">
                          Action {i + 1}
                        </span>
                        <span className="text-foreground text-sm font-semibold">
                          {formatted.type}
                        </span>
                      </div>
                      {formatted.fields.map((field, j) => (
                        <div key={j} className="mt-1.5">
                          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
                            {field.label}
                          </p>
                          {typeof field.value === "string" ? (
                            <p className="text-foreground/80 mt-0.5 break-all text-sm">
                              {field.value}
                            </p>
                          ) : (
                            (field.value as ReactNode)
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

              {payload?.type === "vault" &&
                payload.instructions.map((instruction, i) => (
                  <div
                    key={i}
                    className="bg-muted rounded-lg px-3 py-2.5"
                  >
                    <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-widest">
                      Instruction {i + 1}
                    </p>
                    <AddressWithLabel
                      address={instruction.programAddress}
                      showFull
                      vaultAddress={payload.vaultAddress ?? undefined}
                    />
                    <div className="mt-2 space-y-1.5 text-[11px]">
                      <p className="text-muted-foreground uppercase tracking-widest">
                        Accounts ({instruction.accountIndexes.length})
                      </p>
                      {instruction.accountIndexes.map((idx: number) => (
                        <div
                          key={`${i}-${idx}`}
                          className="bg-background flex items-center gap-2 rounded px-2 py-1"
                        >
                          <span className="text-muted-foreground w-4 font-mono">
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
                      <p className="text-muted-foreground mt-2 uppercase tracking-widest">
                        Data
                      </p>
                      <code className="bg-background text-foreground/70 block break-all rounded-md px-3 py-2 font-mono">
                        {instruction.data}
                      </code>
                    </div>
                  </div>
                ))}

              {!payloadLoading && !payloadError && !payload && (
                <p className="border-border rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                  No payload details available.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
