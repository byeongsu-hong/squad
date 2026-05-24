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
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500 text-[11px] uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className="text-zinc-300 text-[12px] text-right">{children}</span>
    </div>
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
      return "bg-zinc-700/60 text-zinc-400 border border-zinc-600/50";
    if (proposal.status === "Rejected")
      return "bg-red-500/20 text-red-400 border border-red-500/30";
    if (readyToExecute)
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    if (needsYourSignature)
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    return "bg-zinc-700/60 text-zinc-400 border border-zinc-600/50";
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
    if (needsYourSignature) return "bg-amber-500";
    return "bg-zinc-600";
  })();

  const showActions =
    !isComplete &&
    actionsSupported &&
    (readyToExecute ||
      needsYourSignature ||
      currentUserApproved);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100"
      >
        <SheetTitle className="sr-only">
          {multisig.label || "Unnamed"} · #
          {proposal.transactionIndex.toString()}
        </SheetTitle>

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800/80 px-5 py-3.5">
          <span className="font-mono text-xl font-bold text-zinc-100 tabular-nums">
            #{proposal.transactionIndex.toString()}
          </span>
          <span className="min-w-0 truncate text-sm text-zinc-500">
            {multisig.label || "Unnamed"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                statusPill
              )}
            >
              {readyToExecute && <Zap className="h-3 w-3 fill-current" />}
              {statusLabel}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Actions */}
          {showActions && (
            <div className="space-y-2 border-b border-zinc-800/80 px-5 py-4">
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                >
                  {isRejectLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Reject
                </button>
              )}
              {currentUserApproved && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800/60 py-2.5 text-sm text-zinc-400">
                  <Check className="h-4 w-4 text-emerald-500" />
                  You already signed
                </div>
              )}
            </div>
          )}

          {/* Signature progress */}
          <div className="border-b border-zinc-800/80 px-5 py-4">
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
                            : "bg-zinc-700"
                      )}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tabular-nums text-zinc-200">
                  {approvalCount}
                  <span className="text-zinc-600">/{multisig.threshold}</span>
                </span>
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    approvalCount >= multisig.threshold
                      ? "text-emerald-500"
                      : "text-zinc-600"
                  )}
                >
                  {approvalPct}%
                </span>
              </div>
            </div>
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-zinc-800">
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
                const isRejected = proposal.rejections.includes(
                  member.address
                );
                const isCurrentUser = member.address === currentUserAddress;
                const isProposer = member.address === proposal.creator;
                return (
                  <div
                    key={member.address}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-zinc-900"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          isApproved
                            ? "bg-emerald-500"
                            : isRejected
                              ? "bg-red-500"
                              : "bg-zinc-700"
                        )}
                      />
                      {isCurrentUser && (
                        <span className="shrink-0 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                          you
                        </span>
                      )}
                      {isProposer && !isCurrentUser && (
                        <span className="shrink-0 rounded bg-zinc-800 px-1 py-0.5 text-[9px] font-bold uppercase text-zinc-500">
                          proposer
                        </span>
                      )}
                      <AddressWithLabel
                        address={member.address}
                        showCopy={false}
                        showLabelButton={false}
                        className="min-w-0 font-mono text-xs text-zinc-500"
                      />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-medium",
                        isApproved
                          ? "text-emerald-500"
                          : isRejected
                            ? "text-red-500"
                            : "text-zinc-700"
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
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[11px] text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-400"
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
          <div className="space-y-2.5 border-b border-zinc-800/80 px-5 py-4">
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
                  className="font-mono text-xs text-zinc-300"
                />
              </MetaRow>
            )}
            <MetaRow label="Status">{proposal.status}</MetaRow>
          </div>

          {/* Payload — collapsible */}
          <div className="pb-8">
            <button
              onClick={() => setPayloadOpen(!payloadOpen)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Payload
              </span>
              {payloadOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-zinc-600" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
              )}
            </button>

            {payloadOpen && (
              <div className="space-y-2 px-5">
                {payloadLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
                  </div>
                )}
                {payloadError && !payloadLoading && (
                  <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-4 text-sm text-zinc-600">
                    {payloadError}
                  </p>
                )}

                {payload && "transactionPda" in payload && (
                  <DarkPayloadRow
                    label="Transaction PDA"
                    value={payload.transactionPda}
                    copyable
                  />
                )}

                {payload?.type === "safe" && (
                  <>
                    {payload.safeTxHash && (
                      <DarkPayloadRow
                        label="Safe Tx Hash"
                        value={payload.safeTxHash}
                        copyable
                      />
                    )}
                    {payload.nonce !== undefined && (
                      <DarkPayloadRow
                        label="Nonce"
                        value={String(payload.nonce)}
                      />
                    )}
                    {payload.toAddress && (
                      <div className="rounded-lg bg-zinc-900 px-3 py-2.5">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                          Target
                        </p>
                        <AddressWithLabel
                          address={payload.toAddress}
                          showFull
                        />
                      </div>
                    )}
                    {payload.data && (
                      <DarkPayloadRow label="Calldata" value={payload.data} />
                    )}
                    {payload.dataDecoded != null && (
                      <div className="rounded-lg bg-zinc-900 px-3 py-2.5">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                          Decoded
                        </p>
                        <pre className="overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-[11px] text-zinc-400">
                          {JSON.stringify(payload.dataDecoded, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {payload?.type === "config" &&
                  payload.actions.map((action, i) => {
                    const formatted = formatConfigAction(
                      action as ConfigAction
                    );
                    return (
                      <div
                        key={i}
                        className="rounded-lg bg-zinc-900 px-3 py-2.5"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[10px] text-zinc-600">
                            Action {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-zinc-200">
                            {formatted.type}
                          </span>
                        </div>
                        {formatted.fields.map((field, j) => (
                          <div key={j} className="mt-1.5">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                              {field.label}
                            </p>
                            {typeof field.value === "string" ? (
                              <p className="mt-0.5 break-all text-sm text-zinc-300">
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
                      className="rounded-lg bg-zinc-900 px-3 py-2.5"
                    >
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                        Instruction {i + 1}
                      </p>
                      <AddressWithLabel
                        address={instruction.programAddress}
                        showFull
                        vaultAddress={payload.vaultAddress ?? undefined}
                      />
                      <div className="mt-2 space-y-1.5 text-[11px]">
                        <p className="uppercase tracking-widest text-zinc-600">
                          Accounts ({instruction.accountIndexes.length})
                        </p>
                        {instruction.accountIndexes.map((idx: number) => (
                          <div
                            key={`${i}-${idx}`}
                            className="flex items-center gap-2 rounded bg-zinc-950 px-2 py-1"
                          >
                            <span className="w-4 font-mono text-zinc-600">
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
                        <p className="mt-2 uppercase tracking-widest text-zinc-600">
                          Data
                        </p>
                        <code className="block break-all rounded-md bg-zinc-950 px-3 py-2 font-mono text-zinc-500">
                          {instruction.data}
                        </code>
                      </div>
                    </div>
                  ))}

                {!payloadLoading && !payloadError && !payload && (
                  <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-4 text-sm text-zinc-600">
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

function DarkPayloadRow({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="rounded-lg bg-zinc-900 px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          {label}
        </p>
        {copyable && <CopyButton text={value} />}
      </div>
      <p className="break-all font-mono text-[11px] text-zinc-400">{value}</p>
    </div>
  );
}
