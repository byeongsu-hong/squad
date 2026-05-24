"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  X,
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

  const { loading: payloadLoading, payload, error: payloadError } =
    useWorkspacePayload({
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

  const actionsSupported = supportsProviderCapability(multisig.provider, "proposalActions");
  const approveSupported = supportsProviderAction(multisig.provider, "approve");
  const rejectSupported = supportsProviderAction(multisig.provider, "reject");
  const executeSupported = supportsProviderAction(multisig.provider, "execute");

  const isApproveLoading = isActionLoading("approve", multisig.key, proposal.transactionIndex);
  const isRejectLoading = isActionLoading("reject", multisig.key, proposal.transactionIndex);
  const isExecuteLoading = isActionLoading("execute", multisig.key, proposal.transactionIndex);

  const currentUserAddress = getViewerAddress(multisig.provider);
  const approvalPct =
    multisig.threshold > 0
      ? Math.min(100, Math.round((approvalCount / multisig.threshold) * 100))
      : 0;

  const visibleMembers = signersExpanded
    ? multisig.members
    : multisig.members.slice(0, 8);

  // Status pill config
  const statusConfig = (() => {
    if (proposal.status === "Executed")
      return {
        label: "Executed",
        pill: "bg-muted text-muted-foreground",
        bar: "bg-muted-foreground/30",
        icon: null,
      };
    if (proposal.status === "Rejected")
      return {
        label: "Rejected",
        pill: "bg-red-500/15 text-red-600 dark:text-red-400",
        bar: "bg-red-500",
        icon: null,
      };
    if (readyToExecute)
      return {
        label: "Ready",
        pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        bar: "bg-emerald-500",
        icon: <Zap className="h-2.5 w-2.5 fill-current" />,
      };
    if (needsYourSignature)
      return {
        label: `${approvalCount}/${multisig.threshold}`,
        pill: "bg-primary/15 text-primary",
        bar: "bg-primary",
        icon: null,
      };
    return {
      label: `${approvalCount}/${multisig.threshold}`,
      pill: "bg-muted text-muted-foreground",
      bar: "bg-muted-foreground/30",
      icon: null,
    };
  })();

  return (
    <div className="flex h-full flex-col">
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="border-border/60 bg-background sticky top-0 z-10 border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Vault label + tx index + status pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground truncate font-semibold leading-snug">
                {multisig.label || "Unnamed"}
              </span>
              <span className="text-muted-foreground shrink-0 font-mono text-sm">
                #{proposal.transactionIndex.toString()}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  statusConfig.pill
                )}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            {/* Chain · Provider */}
            <p className="text-muted-foreground/60 mt-0.5 text-[11px]">
              {multisig.chainName}
              <span className="mx-1 opacity-40">·</span>
              {multisig.provider === "safe" ? "Safe" : "Squads"}
            </p>
          </div>
          {/* X close button */}
          <button
            onClick={onBack}
            className="text-muted-foreground/50 hover:text-foreground hover:bg-muted shrink-0 rounded-md p-1.5 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Actions ──────────────────────────────────────────────────── */}
        {!isComplete && actionsSupported && (
          <div className="border-border/60 space-y-2 border-b px-5 py-4">
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {isExecuteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
                onClick={() =>
                  rejectByAddress(
                    multisig.address,
                    proposal.transactionIndex,
                    multisig.chainId
                  )
                }
                disabled={isActionInProgress}
                className="border-border text-muted-foreground flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                {isRejectLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Reject
              </button>
            )}
            {currentUserApproved && !readyToExecute && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                You signed
              </div>
            )}
          </div>
        )}

        {/* ── Signatures ───────────────────────────────────────────────── */}
        <div className="border-border/60 border-b px-5 py-4">
          {/* Dot row + count */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
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
            <span className="text-foreground font-mono text-sm font-bold tabular-nums">
              {approvalCount}
              <span className="text-muted-foreground/40">/{multisig.threshold}</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                statusConfig.bar
              )}
              style={{ width: `${approvalPct}%` }}
            />
          </div>

          {/* Member rows */}
          <div className="space-y-0.5">
            {visibleMembers.map((member) => {
              const isApproved = proposal.approvals.includes(member.address);
              const isRejected = proposal.rejections.includes(member.address);
              const isCurrentUser = member.address === currentUserAddress;
              const isProposer = member.address === proposal.creator;
              return (
                <div
                  key={member.address}
                  className="hover:bg-muted/60 flex items-center justify-between rounded-md px-2 py-1.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        isApproved
                          ? "bg-emerald-500"
                          : isRejected
                          ? "bg-red-500"
                          : "bg-muted-foreground/20"
                      )}
                    />
                    {isCurrentUser && (
                      <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold uppercase text-primary">
                        you
                      </span>
                    )}
                    {isProposer && !isCurrentUser && (
                      <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                        author
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

          {multisig.members.length > 8 && (
            <button
              onClick={() => setSignersExpanded(!signersExpanded)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] transition-colors"
            >
              {signersExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {multisig.members.length - 8} more
                </>
              )}
            </button>
          )}
        </div>

        {/* ── Payload (collapsible) ─────────────────────────────────────── */}
        <div className="border-border/60 border-b">
          <button
            onClick={() => setPayloadOpen(!payloadOpen)}
            className="hover:bg-muted/40 flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors"
          >
            <span className="text-muted-foreground/70 text-[10px] font-semibold uppercase tracking-widest">
              Payload
            </span>
            {payloadOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
          </button>

          {payloadOpen && (
            <div className="space-y-2 px-5 pb-5">
              {payloadLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="text-muted-foreground/40 h-4 w-4 animate-spin" />
                </div>
              )}
              {payloadError && !payloadLoading && (
                <p className="border-border rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  {payloadError}
                </p>
              )}

              {payload && "transactionPda" in payload && (
                <PayloadBlock label="Transaction PDA" value={payload.transactionPda} copyable />
              )}

              {payload?.type === "safe" && (
                <>
                  {payload.safeTxHash && (
                    <PayloadBlock label="Safe Tx Hash" value={payload.safeTxHash} copyable />
                  )}
                  {payload.nonce !== undefined && (
                    <PayloadBlock label="Nonce" value={String(payload.nonce)} />
                  )}
                  {payload.toAddress && (
                    <div className="bg-muted rounded-lg px-3 py-2.5">
                      <p className="text-muted-foreground/60 mb-1 text-[10px] font-semibold uppercase tracking-widest">
                        Target
                      </p>
                      <AddressWithLabel address={payload.toAddress} showFull />
                    </div>
                  )}
                  {payload.data && <PayloadBlock label="Calldata" value={payload.data} />}
                  {payload.dataDecoded != null && (
                    <div className="bg-muted rounded-lg px-3 py-2.5">
                      <p className="text-muted-foreground/60 mb-1.5 text-[10px] font-semibold uppercase tracking-widest">
                        Decoded
                      </p>
                      <pre className="bg-background overflow-x-auto rounded-md px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {JSON.stringify(payload.dataDecoded, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {payload?.type === "config" &&
                payload.actions.map((action, i) => {
                  const fmt = formatConfigAction(action as ConfigAction);
                  return (
                    <div key={i} className="bg-muted rounded-lg px-3 py-2.5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-muted-foreground/60 text-[10px]">
                          Action {i + 1}
                        </span>
                        <span className="text-foreground text-sm font-semibold">
                          {fmt.type}
                        </span>
                      </div>
                      {fmt.fields.map((f, j) => (
                        <div key={j} className="mt-1.5">
                          <p className="text-muted-foreground/60 text-[10px] uppercase tracking-widest">
                            {f.label}
                          </p>
                          {typeof f.value === "string" ? (
                            <p className="text-foreground/80 mt-0.5 break-all text-sm">
                              {f.value}
                            </p>
                          ) : (
                            (f.value as ReactNode)
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

              {payload?.type === "vault" &&
                payload.instructions.map((instr, i) => (
                  <div key={i} className="bg-muted rounded-lg px-3 py-2.5">
                    <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold uppercase tracking-widest">
                      Instruction {i + 1}
                    </p>
                    <AddressWithLabel
                      address={instr.programAddress}
                      showFull
                      vaultAddress={payload.vaultAddress ?? undefined}
                    />
                    <div className="mt-2 space-y-1.5 text-[11px]">
                      <p className="text-muted-foreground/60 uppercase tracking-widest">
                        Accounts ({instr.accountIndexes.length})
                      </p>
                      {instr.accountIndexes.map((idx: number) => (
                        <div
                          key={`${i}-${idx}`}
                          className="bg-background flex items-center gap-2 rounded px-2 py-1"
                        >
                          <span className="text-muted-foreground/40 w-4 font-mono">{idx}</span>
                          <AddressWithLabel
                            address={instr.accountAddresses[instr.accountIndexes.indexOf(idx)]}
                            vaultAddress={payload.vaultAddress ?? undefined}
                          />
                        </div>
                      ))}
                      <p className="text-muted-foreground/60 mt-2 uppercase tracking-widest">
                        Data
                      </p>
                      <code className="bg-background text-muted-foreground block break-all rounded-md px-3 py-2 font-mono">
                        {instr.data}
                      </code>
                    </div>
                  </div>
                ))}

              {!payloadLoading && !payloadError && !payload && (
                <p className="border-border rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
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

function PayloadBlock({
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
        <p className="text-muted-foreground/60 text-[10px] font-semibold uppercase tracking-widest">
          {label}
        </p>
        {copyable && <CopyBtn text={value} />}
      </div>
      <p className="break-all font-mono text-[11px] text-foreground/70">{value}</p>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted-foreground/40 hover:text-foreground shrink-0 transition-colors"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}
