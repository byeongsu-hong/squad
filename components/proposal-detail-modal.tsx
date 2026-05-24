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

  // Status config
  const statusConfig = (() => {
    if (proposal.status === "Executed")
      return { label: "Executed", pill: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/30" };
    if (proposal.status === "Rejected")
      return { label: "Rejected", pill: "bg-red-500/15 text-red-600 dark:text-red-400", bar: "bg-red-500" };
    if (readyToExecute)
      return { label: "Ready to execute", pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" };
    if (needsYourSignature)
      return { label: "Needs your signature", pill: "bg-primary/15 text-primary", bar: "bg-primary" };
    return { label: "Pending", pill: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/30" };
  })();

  return (
    <div className="w-full space-y-5">
      {/* ── Back + title ─────────────────────────────────────────────── */}
      <div>
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Operations
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              {multisig.label || "Unnamed"}
              <span className="text-muted-foreground ml-2 font-mono text-lg font-normal">
                #{proposal.transactionIndex.toString()}
              </span>
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                {multisig.chainName}
              </span>
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                {multisig.provider === "safe" ? "Safe" : "Squads"}
              </span>
              {proposal.creator && (
                <span className="text-muted-foreground/60 flex items-center gap-1 text-xs">
                  by{" "}
                  <AddressWithLabel
                    address={proposal.creator}
                    showCopy={false}
                    showLabelButton={false}
                    className="font-mono text-xs"
                  />
                </span>
              )}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              statusConfig.pill
            )}
          >
            {readyToExecute && <Zap className="h-3 w-3 fill-current" />}
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* ── Two-column body ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

        {/* Left: payload + metadata */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* Transaction details */}
          <div className="border-border bg-card rounded-xl border">
            <div className="border-border border-b px-5 py-3">
              <p className="text-muted-foreground/70 text-[10px] font-semibold uppercase tracking-widest">
                Transaction details
              </p>
            </div>
            <div className="divide-border/60 divide-y px-5">
              {[
                { label: "Status", value: proposal.status },
                { label: "Chain", value: multisig.chainName },
                { label: "Provider", value: multisig.provider === "safe" ? "Safe" : "Squads" },
                ...(proposal.creator
                  ? [{ label: "Created by", value: proposal.creator, mono: true }]
                  : []),
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-muted-foreground text-[11px] uppercase tracking-widest shrink-0">
                    {label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-foreground text-sm text-right", mono && "font-mono text-xs truncate max-w-[180px]")}>
                      {mono ? `${value.slice(0, 8)}…${value.slice(-6)}` : value}
                    </span>
                    {mono && <CopyBtn text={value} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payload */}
          <div className="border-border bg-card overflow-hidden rounded-xl border">
            <button
              onClick={() => setPayloadOpen(!payloadOpen)}
              className="hover:bg-muted/50 flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors"
            >
              <p className="text-muted-foreground/70 text-[10px] font-semibold uppercase tracking-widest">
                Payload
              </p>
              {payloadOpen
                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
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
                    {payload.safeTxHash && <PayloadBlock label="Safe Tx Hash" value={payload.safeTxHash} copyable />}
                    {payload.nonce !== undefined && <PayloadBlock label="Nonce" value={String(payload.nonce)} />}
                    {payload.toAddress && (
                      <div className="bg-muted rounded-lg px-3 py-2.5">
                        <p className="text-muted-foreground/60 mb-1 text-[10px] font-semibold uppercase tracking-widest">Target</p>
                        <AddressWithLabel address={payload.toAddress} showFull />
                      </div>
                    )}
                    {payload.data && <PayloadBlock label="Calldata" value={payload.data} />}
                    {payload.dataDecoded != null && (
                      <div className="bg-muted rounded-lg px-3 py-2.5">
                        <p className="text-muted-foreground/60 mb-1.5 text-[10px] font-semibold uppercase tracking-widest">Decoded</p>
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
                          <span className="text-muted-foreground/60 text-[10px]">Action {i + 1}</span>
                          <span className="text-foreground text-sm font-semibold">{fmt.type}</span>
                        </div>
                        {fmt.fields.map((f, j) => (
                          <div key={j} className="mt-1.5">
                            <p className="text-muted-foreground/60 text-[10px] uppercase tracking-widest">{f.label}</p>
                            {typeof f.value === "string"
                              ? <p className="text-foreground/80 mt-0.5 break-all text-sm">{f.value}</p>
                              : (f.value as ReactNode)}
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
                      <AddressWithLabel address={instr.programAddress} showFull vaultAddress={payload.vaultAddress ?? undefined} />
                      <div className="mt-2 space-y-1.5 text-[11px]">
                        <p className="text-muted-foreground/60 uppercase tracking-widest">
                          Accounts ({instr.accountIndexes.length})
                        </p>
                        {instr.accountIndexes.map((idx: number) => (
                          <div key={`${i}-${idx}`} className="bg-background flex items-center gap-2 rounded px-2 py-1">
                            <span className="text-muted-foreground/40 w-4 font-mono">{idx}</span>
                            <AddressWithLabel
                              address={instr.accountAddresses[instr.accountIndexes.indexOf(idx)]}
                              vaultAddress={payload.vaultAddress ?? undefined}
                            />
                          </div>
                        ))}
                        <p className="text-muted-foreground/60 mt-2 uppercase tracking-widest">Data</p>
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

        {/* Right: actions + signatures */}
        <div className="w-full space-y-4 lg:w-[300px] lg:shrink-0">

          {/* Action buttons */}
          {!isComplete && actionsSupported && (
            <div className="border-border bg-card space-y-2 rounded-xl border p-4">
              {executeSupported && readyToExecute && (
                <button
                  onClick={() => executeByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)}
                  disabled={isActionInProgress}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isExecuteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Execute Transaction
                </button>
              )}
              {approveSupported && !currentUserApproved && needsYourSignature && (
                <button
                  onClick={() => approveByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)}
                  disabled={isActionInProgress}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isApproveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {multisig.provider === "safe" ? "Confirm" : "Approve"}
                </button>
              )}
              {rejectSupported && needsYourSignature && (
                <button
                  onClick={() => rejectByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)}
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

          {/* Signatures */}
          <div className="border-border bg-card rounded-xl border p-4">
            {/* Progress header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {multisig.members.map((m) => {
                  const approved = proposal.approvals.includes(m.address);
                  const rejected = proposal.rejections.includes(m.address);
                  return (
                    <div
                      key={m.address}
                      className={cn(
                        "h-2 w-2 rounded-full",
                        approved ? "bg-emerald-500" : rejected ? "bg-red-500" : "bg-muted-foreground/20"
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
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-500", statusConfig.bar)}
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
                    className="hover:bg-muted/60 flex items-center justify-between rounded-md px-2 py-1.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          isApproved ? "bg-emerald-500" : isRejected ? "bg-red-500" : "bg-muted-foreground/20"
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
                        isApproved ? "text-emerald-600 dark:text-emerald-400"
                          : isRejected ? "text-red-500"
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
                {signersExpanded
                  ? <><ChevronUp className="h-3 w-3" /> Collapse</>
                  : <><ChevronDown className="h-3 w-3" /> {multisig.members.length - 8} more</>}
              </button>
            )}
          </div>
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
        <p className="text-muted-foreground/60 text-[10px] font-semibold uppercase tracking-widest">{label}</p>
        {copyable && (
          <CopyBtn text={value} />
        )}
      </div>
      <p className="break-all font-mono text-[11px] text-foreground/70">{value}</p>
    </div>
  );
}
