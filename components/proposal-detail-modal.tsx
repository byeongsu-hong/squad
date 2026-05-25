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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AddressWithLabel, WELL_KNOWN_ADDRESSES } from "@/components/address-with-label";
import { useAddressLabel } from "@/lib/hooks/use-address-label";
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

function SignerDot({
  address,
  approved,
  rejected,
  isCurrentUser,
}: {
  address: string;
  approved: boolean;
  rejected: boolean;
  isCurrentUser: boolean;
}) {
  const label = useAddressLabel(address);
  const displayName = label?.label ?? `${address.slice(0, 6)}…${address.slice(-4)}`;
  const status = approved ? "Signed" : rejected ? "Rejected" : "Pending";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "h-3 w-3 cursor-default rounded-full transition-transform hover:scale-125",
            approved
              ? "bg-emerald-500"
              : rejected
              ? "bg-destructive"
              : "bg-muted-foreground/20",
            isCurrentUser && "ring-1 ring-offset-1 ring-offset-background ring-primary/60"
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="flex flex-col gap-0.5 px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground text-[12px] font-medium">{displayName}</span>
          {isCurrentUser && (
            <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-medium text-primary">
              you
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/60">{address.slice(0, 8)}…{address.slice(-6)}</span>
        <span
          className={cn(
            "text-[10px] font-medium",
            approved ? "text-emerald-400" : rejected ? "text-destructive" : "text-muted-foreground/40"
          )}
        >
          {status}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function formatAge(createdAt?: string): string {
  if (!createdAt) return "";
  const ms = Date.now() - Date.parse(createdAt);
  if (Number.isNaN(ms) || ms < 0) return "";
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  const [payloadOpen, setPayloadOpen] = useState(true);
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

  const visibleMembers = multisig.members;

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
      <div className="border-border/60 bg-card shrink-0 border-b px-5 py-4">
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
              <span className="text-muted-foreground/50 shrink-0 font-mono text-[11px]">
                #{proposal.transactionIndex.toString()}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  statusConfig.pill
                )}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            {/* Chain · Provider · Age */}
            <p className="text-muted-foreground/60 mt-0.5 text-[11px]">
              {multisig.chainName}
              <span className="mx-1 opacity-40">·</span>
              {multisig.provider === "safe" ? "Safe" : "Squads"}
              {proposal.createdAt && (
                <>
                  <span className="mx-1 opacity-40">·</span>
                  <span title={new Date(proposal.createdAt).toLocaleString()}>
                    {formatAge(proposal.createdAt)}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Quick-action: always visible regardless of scroll position */}
            {!isComplete && actionsSupported && (
              <>
                {executeSupported && readyToExecute && (
                  <Button
                    size="sm"
                    disabled={isActionInProgress}
                    onClick={() => executeByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)}
                    className="bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-700/30 font-semibold"
                  >
                    {isExecuteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Execute
                  </Button>
                )}
                {approveSupported && needsYourSignature && !currentUserApproved && !readyToExecute && (
                  <Button
                    size="sm"
                    disabled={isActionInProgress}
                    onClick={() => approveByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)}
                    className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 font-semibold"
                  >
                    {isApproveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Sign
                  </Button>
                )}
              </>
            )}
            {/* X close button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              className="text-muted-foreground/50 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">

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
              "text-[12px] font-medium",
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

        {/* ── Secondary actions (Reject + waiting banner) ──────────────── */}
        {!isComplete && actionsSupported && (rejectSupported && needsYourSignature && !readyToExecute || currentUserApproved && !readyToExecute) && (
          <div className="border-border/60 border-b px-5 py-3">
            {rejectSupported && needsYourSignature && !readyToExecute && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => rejectByAddress(multisig.address, proposal.transactionIndex, multisig.chainId)}
                disabled={isActionInProgress}
                className="w-full border-destructive/30 text-destructive/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
              >
                {isRejectLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Reject
              </Button>
            )}
            {currentUserApproved && !readyToExecute && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-[12px] text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                {multisig.threshold - approvalCount > 0
                  ? `Signed — ${multisig.threshold - approvalCount} more needed`
                  : "Signed — waiting on others"}
              </div>
            )}
          </div>
        )}

        {/* ── Signatures ───────────────────────────────────────────────── */}
        <div className="border-border/60 border-b px-5 py-4">
          {/* Section label */}
          <div className="mb-3 flex items-center gap-2">
            <Users className="text-muted-foreground/60 h-3.5 w-3.5" />
            <span className="text-muted-foreground/50 text-[11px] font-medium">
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

          {/* Dot row + view signers toggle */}
          <TooltipProvider>
            <div className="flex flex-wrap items-center gap-1.5">
              {multisig.members.map((m) => {
                const approved = proposal.approvals.includes(m.address);
                const rejected = proposal.rejections.includes(m.address);
                return (
                  <SignerDot
                    key={m.address}
                    address={m.address}
                    approved={approved}
                    rejected={rejected}
                    isCurrentUser={m.address === currentUserAddress}
                  />
                );
              })}
              <button
                type="button"
                onClick={() => setSignersExpanded(!signersExpanded)}
                className="text-muted-foreground/40 hover:text-muted-foreground/70 ml-1 text-[11px] transition-colors"
              >
                {signersExpanded ? "hide" : "view signers"}
              </button>
            </div>
          </TooltipProvider>

          {/* Member rows — revealed on toggle */}
          {signersExpanded && (
            <div className="mt-3 space-y-0.5">
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
                      isCurrentUser && "bg-primary/5"
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
                        <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                          you
                        </span>
                      )}
                      {isProposer && !isCurrentUser && (
                        <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground/60">
                          author
                        </span>
                      )}
                      <AddressWithLabel
                        address={member.address}
                        showCopy={false}
                        showLabelButton={false}
                        plain
                        className="min-w-0"
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
          )}
        </div>

        {/* ── Transaction data ─────────────────────────────────────────── */}
        <div className="border-border/60 border-b">
          <button
            type="button"
            onClick={() => setPayloadOpen(!payloadOpen)}
            className="flex w-full items-center justify-between px-5 py-3.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/50 text-[11px] font-medium">
                Transaction data
              </span>
              {payload && !payloadLoading && (
                <span className="text-muted-foreground/30 font-mono text-[10px]">
                  {payload.type === "vault"
                    ? `${payload.instructions.length} instruction${payload.instructions.length !== 1 ? "s" : ""}`
                    : payload.type === "config"
                    ? `${payload.actions.length} action${payload.actions.length !== 1 ? "s" : ""}`
                    : "safe"}
                </span>
              )}
            </div>
            {payloadOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
          </button>

          {payloadOpen && (
            <div className="space-y-2 px-4 pb-5">
              {payloadLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" />
                </div>
              )}

              {payloadError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                  <p className="text-[11px] text-destructive/80">{payloadError}</p>
                </div>
              )}

              {!payload && !payloadLoading && !payloadError && (
                <p className="text-muted-foreground/40 py-2 text-[11px]">No data available.</p>
              )}

              {(payload && "transactionPda" in payload && payload.transactionPda) || (payload?.type === "vault" && payload.vaultAddress) ? (
                <div className="border-border divide-border/50 divide-y rounded-xl border overflow-hidden px-3">
                  {payload && "transactionPda" in payload && payload.transactionPda && (
                    <PayloadField label="Transaction PDA" value={payload.transactionPda} copyable />
                  )}
                  {payload?.type === "vault" && payload.vaultAddress && (
                    <PayloadAddressField label="Vault" address={payload.vaultAddress} />
                  )}
                </div>
              ) : null}

              {payload?.type === "safe" && (
                <div className="border-border divide-border/50 divide-y rounded-xl border overflow-hidden px-3">
                  {payload.safeTxHash && (
                    <PayloadField label="Safe tx hash" value={payload.safeTxHash} copyable />
                  )}
                  {payload.nonce !== undefined && (
                    <PayloadField label="Nonce" value={String(payload.nonce)} />
                  )}
                  {payload.toAddress && (
                    <PayloadAddressField label="Target" address={payload.toAddress} />
                  )}
                  {payload.value && payload.value !== "0" && (
                    <PayloadField label="Value" value={payload.value} />
                  )}
                  {payload.data && payload.data !== "0x" && (
                    <PayloadField label="Calldata" value={payload.data} mono />
                  )}
                  {payload.dataDecoded != null && (
                    <div className="border-t border-border/50 py-2">
                      <p className="text-muted-foreground/40 mb-1.5 text-[11px] font-medium">Decoded</p>
                      <pre className="overflow-x-auto font-mono text-[11px] text-muted-foreground/70 leading-relaxed">
                        {JSON.stringify(payload.dataDecoded, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {payload?.type === "config" &&
                payload.actions.map((action, i) => {
                  const fmt = formatConfigAction(action as ConfigAction);
                  return (
                    <div key={i} className="border-border rounded-xl border overflow-hidden">
                      <div className="border-border/50 bg-muted/50 flex items-center gap-2 border-b px-3 py-2.5">
                        <span className="text-muted-foreground/40 font-mono text-[10px]">#{i + 1}</span>
                        <span className="text-foreground text-[13px] font-semibold">{fmt.type}</span>
                      </div>
                      <div className="divide-border/50 divide-y">
                        {fmt.fields.map((f, j) => (
                          <div key={j} className="px-3 py-2.5">
                            <p className="text-muted-foreground/40 mb-1 text-[11px] font-medium">{f.label}</p>
                            {typeof f.value !== "string" ? (
                              (f.value as ReactNode)
                            ) : /^[1-9A-HJ-NP-Za-km-z]{32,44}$|^0x[0-9a-fA-F]{40}$/.test(f.value) ? (
                              <AddressWithLabel address={f.value} showFull copyOnClick showCopy={false} />
                            ) : (
                              <p className="break-all text-[12px] text-foreground/80">{f.value}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

              {payload?.type === "vault" &&
                payload.instructions.map((instr, i) => {
                  const wellKnown = WELL_KNOWN_ADDRESSES[instr.programAddress];
                  return (
                  <div key={i} className="border-border rounded-xl border overflow-hidden">
                    {/* Instruction header */}
                    <div className="border-border/50 bg-muted/50 flex items-center gap-2 border-b px-3 py-2.5">
                      <span className="text-muted-foreground/40 font-mono text-[10px]">#{i + 1}</span>
                      {wellKnown ? (
                        <span className="text-[13px] font-semibold text-foreground/80">{wellKnown.label}</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-[11px] font-medium">Program</span>
                      )}
                    </div>
                    {/* Program address */}
                    <div className="border-border/50 border-b px-3 py-2.5">
                      <AddressWithLabel
                        address={instr.programAddress}
                        showFull
                        copyOnClick
                        showCopy={false}
                        vaultAddress={payload.vaultAddress ?? undefined}
                      />
                    </div>
                    {/* Accounts */}
                    {instr.accountAddresses.length > 0 && (
                      <div className="border-border/50 border-b">
                        <div className="border-border/30 border-b px-3 py-2">
                          <p className="text-muted-foreground/40 text-[11px] font-medium">
                            Accounts ({instr.accountAddresses.length})
                          </p>
                        </div>
                        <div className="divide-border/30 divide-y">
                          {instr.accountAddresses.map((address, j) => (
                            <div key={j} className="flex items-center gap-3 px-3 py-2">
                              <span className="text-muted-foreground/30 w-5 shrink-0 text-right font-mono text-[10px]">
                                {instr.accountIndexes[j]}
                              </span>
                              <AddressWithLabel
                                address={address}
                                copyOnClick
                                showCopy={false}
                                vaultAddress={payload.vaultAddress ?? undefined}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Data */}
                    {instr.data && instr.data !== "1" && (
                      <div>
                        <div className="border-border/30 border-b px-3 py-2">
                          <p className="text-muted-foreground/40 text-[11px] font-medium">Data</p>
                        </div>
                        <code className="block overflow-x-auto px-3 py-2.5 font-mono text-[11px] text-muted-foreground/70 break-all">
                          {instr.data}
                        </code>
                      </div>
                    )}
                  </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PayloadField({
  label,
  value,
  copyable = false,
  mono = true,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-muted-foreground/40 mt-0.5 shrink-0 text-[11px] font-medium">{label}</span>
      <div className="flex min-w-0 items-start gap-1">
        <p className={cn("break-all text-right text-[11px] text-foreground/70 leading-relaxed", mono && "font-mono")}>{value}</p>
        {copyable && <CopyBtn text={value} />}
      </div>
    </div>
  );
}

function PayloadAddressField({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-muted-foreground/40 mt-0.5 shrink-0 text-[11px] font-medium">{label}</span>
      <AddressWithLabel address={address} showFull copyOnClick showCopy={false} className="min-w-0" />
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
