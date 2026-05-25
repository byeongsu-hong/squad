"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";

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
        pill: "bg-destructive/15 text-destructive",
        bar: "bg-destructive",
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
      <div className="border-border/60 bg-card sticky top-0 z-10 border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Vault label + tx index + status pill */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/vaults/${encodeURIComponent(multisig.key)}`}
                className="text-foreground truncate font-semibold leading-snug hover:underline"
                onClick={onBack}
              >
                {multisig.label || "Unnamed"}
              </Link>
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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="text-muted-foreground/50 hover:text-foreground shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Completion banner ────────────────────────────────────────── */}
        {isComplete && (
          <div className={cn(
            "border-b px-5 py-3 flex items-center gap-2",
            proposal.status === "Executed"
              ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/30 dark:bg-emerald-950/20"
              : "border-destructive/15 bg-destructive/5"
          )}>
            {proposal.status === "Executed" ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-destructive/70 shrink-0" />
            )}
            <span className={cn(
              "text-sm font-medium",
              proposal.status === "Executed"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-destructive/80"
            )}>
              {proposal.status === "Executed"
                ? "Transaction executed"
                : proposal.status === "Rejected"
                  ? "Transaction rejected"
                  : "Transaction cancelled"}
            </span>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        {!isComplete && actionsSupported && (
          <div className="border-border/60 space-y-2 border-b px-5 py-4">
            {executeSupported && readyToExecute && (
              <Button
                onClick={() =>
                  executeByAddress(
                    multisig.address,
                    proposal.transactionIndex,
                    multisig.chainId
                  )
                }
                disabled={isActionInProgress}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-700/30 font-bold"
              >
                {isExecuteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Execute Transaction
              </Button>
            )}
            {approveSupported && !currentUserApproved && needsYourSignature && (
              <Button
                onClick={() =>
                  approveByAddress(
                    multisig.address,
                    proposal.transactionIndex,
                    multisig.chainId
                  )
                }
                disabled={isActionInProgress}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 font-bold"
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
                variant="outline"
                onClick={() =>
                  rejectByAddress(
                    multisig.address,
                    proposal.transactionIndex,
                    multisig.chainId
                  )
                }
                disabled={isActionInProgress}
                className="w-full"
              >
                {isRejectLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Reject
              </Button>
            )}
            {currentUserApproved && !readyToExecute && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                You signed · waiting for others
              </div>
            )}
          </div>
        )}

        {/* ── Signatures ───────────────────────────────────────────────── */}
        <div className="border-border/60 border-b px-5 py-4">
          {/* Section label */}
          <div className="mb-3 flex items-center gap-2">
            <Users className="text-muted-foreground/60 h-3.5 w-3.5" />
            <span className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-widest">
              Signers
            </span>
          </div>
          {/* Progress bar + count */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  statusConfig.bar
                )}
                style={{ width: `${approvalPct}%` }}
              />
            </div>
            <span className="text-foreground shrink-0 font-mono text-sm font-bold tabular-nums">
              {approvalCount}
              <span className="text-muted-foreground/40">/{multisig.threshold}</span>
            </span>
          </div>

          {/* Dot row */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {multisig.members.map((m) => {
              const approved = proposal.approvals.includes(m.address);
              const rejected = proposal.rejections.includes(m.address);
              return (
                <div
                  key={m.address}
                  title={approved ? "Signed" : rejected ? "Rejected" : "Pending"}
                  className={cn(
                    "h-3 w-3 rounded-full",
                    approved
                      ? "bg-emerald-500"
                      : rejected
                      ? "bg-destructive"
                      : "bg-muted-foreground/20"
                  )}
                />
              );
            })}
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
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5",
                    isCurrentUser
                      ? "bg-primary/5 hover:bg-primary/8"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        isApproved
                          ? "bg-emerald-500"
                          : isRejected
                          ? "bg-destructive"
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
                        ? "text-destructive"
                        : "text-muted-foreground/30"
                    )}
                  >
                    {isApproved ? "Signed" : isRejected ? "Rejected" : null}
                  </span>
                </div>
              );
            })}
          </div>

          {multisig.members.length > 8 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSignersExpanded(!signersExpanded)}
              className="mt-1 h-7 w-full gap-1 text-[11px]"
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
            </Button>
          )}
        </div>

        {/* ── Payload (collapsible) ─────────────────────────────────────── */}
        <div className="border-border/60 border-b">
          <Button
            variant="ghost"
            onClick={() => setPayloadOpen(!payloadOpen)}
            className="h-auto w-full justify-between rounded-none px-5 py-3.5 text-left"
          >
            <span className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-widest">
              Transaction data
            </span>
            {payloadOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
          </Button>

          {payloadOpen && (
            <div className="space-y-2 px-5 pb-5">
              {payloadLoading && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="text-muted-foreground/50 h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground/50 text-xs">Loading transaction data…</span>
                </div>
              )}
              {payloadError && !payloadLoading && (
                <p className="bg-destructive/5 border-destructive/20 rounded-lg border px-4 py-3 text-sm text-destructive/80">
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
                      <p className="text-muted-foreground/60 mb-1 text-[11px] font-semibold uppercase tracking-widest">
                        Target
                      </p>
                      <AddressWithLabel address={payload.toAddress} showFull />
                    </div>
                  )}
                  {payload.data && <PayloadBlock label="Calldata" value={payload.data} />}
                  {payload.dataDecoded != null && (
                    <div className="bg-muted rounded-lg px-3 py-2.5">
                      <p className="text-muted-foreground/60 mb-1.5 text-[11px] font-semibold uppercase tracking-widest">
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
                          <p className="text-muted-foreground/60 text-[11px] uppercase tracking-widest">
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
                    <p className="text-muted-foreground/60 mb-2 text-[11px] font-semibold uppercase tracking-widest">
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
                <p className="text-muted-foreground px-1 py-2 text-sm">
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
        <p className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-widest">
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
    <Button
      type="button"
      variant="ghost"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted-foreground/40 hover:text-foreground h-5 w-5 shrink-0 p-0"
    >
      {copied ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}
