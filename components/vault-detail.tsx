"use client";

import { ArrowLeftRight, ChevronLeft, Copy, Check, X, Users, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { OperationsQueue } from "@/components/operations-queue";
import { Button } from "@/components/ui/button";
import { useAddressLabel } from "@/lib/hooks/use-address-label";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceMultisigs } from "@/lib/hooks/use-workspace-multisigs";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { useWalletStore } from "@/stores/wallet-store";
import type { WorkspaceMultisig } from "@/types/workspace";

interface VaultDetailProps {
  vaultKey: string;
  onBack?: () => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      variant="ghost"
      onClick={handleCopy}
      className="text-muted-foreground/50 hover:text-foreground ml-0.5 h-5 w-5 shrink-0 p-0"
      aria-label="Copy address"
    >
      {copied ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

function truncateAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

type MemberEntry = WorkspaceMultisig["members"][number];

function MemberRow({ member, isViewer }: { member: MemberEntry; isViewer: boolean }) {
  const addressLabel = useAddressLabel(member.address);
  const labelText = addressLabel?.label ?? null;

  const handleCopy = () => {
    navigator.clipboard.writeText(member.address).then(
      () => toast.success("Address copied"),
      () => toast.error("Failed to copy")
    );
  };

  const avatarInitial = labelText
    ? labelText.slice(0, 1).toUpperCase()
    : /[a-zA-Z]/.test(member.address[0])
      ? member.address[0].toUpperCase()
      : null;

  return (
    <div className="group flex items-center gap-2 py-1.5">
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isViewer ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {avatarInitial ? (
          <span className="text-[10px] font-bold">{avatarInitial}</span>
        ) : (
          <User className="h-3 w-3 opacity-60" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {labelText && (
          <p className="truncate text-[12px] font-medium leading-tight">
            {labelText}
          </p>
        )}
        <p className={cn("font-mono text-[11px] text-muted-foreground/70", labelText && "leading-tight")}>
          {truncateAddress(member.address)}
        </p>
      </div>
      {isViewer && (
        <span className="shrink-0 text-[9px] font-medium text-primary/70 uppercase tracking-wide">
          you
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-foreground h-5 w-5 shrink-0 p-0"
        aria-label="Copy address"
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function VaultDetail({ vaultKey, onBack }: VaultDetailProps) {
  const { publicKey } = useWalletStore();
  const getViewerAddress = useViewerAddressForMultisig();
  const { workspaceMultisigMap } = useWorkspaceMultisigs();
  const { proposals, loading, workspaceMultisigs } = useProposalsQuery();

  const multisig = workspaceMultisigMap.get(vaultKey) ?? null;

  const allQueueItems = useWorkspaceQueue({
    workspaceProposals: proposals,
    multisigs: workspaceMultisigs,
    viewerAddress: publicKey?.toString() ?? null,
    getViewerAddressForMultisig: (m) => getViewerAddress(m.provider),
  });

  const vaultItems = allQueueItems.filter((i) => i.multisig.key === vaultKey);

  const pendingCount = loading
    ? null
    : vaultItems.filter(
        (i) => !i.proposal.executed && !i.proposal.cancelled
      ).length;
  const needsSigningCount = loading
    ? null
    : vaultItems.filter((i) => i.needsYourSignature && !i.currentUserApproved).length;
  const executableCount = loading
    ? null
    : vaultItems.filter((i) => i.readyToExecute).length;

  const BackLink = onBack ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onBack}
      className="text-muted-foreground/50 hover:text-foreground"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </Button>
  ) : (
    <Link
      href="/vaults"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      Back to Vaults
    </Link>
  );

  if (!multisig) {
    return (
      <div className="mx-auto max-w-[1200px]">
        {!onBack && <div className="mb-6">{BackLink}</div>}
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          {onBack && (
            <div className="flex w-full justify-end px-2">{BackLink}</div>
          )}
          <p className="text-foreground text-sm font-semibold">Vault not found</p>
          <p className="text-muted-foreground text-xs">
            It may have been removed from your registry.
          </p>
        </div>
      </div>
    );
  }

  const isSquads = multisig.provider === "squads";
  const viewerAddress = getViewerAddress(multisig.provider);

  const isPanel = !!onBack;

  return (
    <div className={cn("max-w-[1200px]", isPanel ? "" : "mx-auto space-y-4")}>
      {!onBack && BackLink}

      {/* Vault header */}
      <div className={cn(isPanel ? "pb-4 border-b border-border/50" : "bg-card border-border rounded-2xl border p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground text-xl font-bold tracking-[-0.02em]">
              {multisig.label ?? "Unnamed Vault"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                {multisig.chainName}
              </span>
              <span className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                isSquads
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-blue-300/50 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-950/30 dark:text-blue-400"
              )}>
                {isSquads ? "Squads" : "Safe"}
              </span>
              <span className="text-muted-foreground/70 text-xs">
                {multisig.threshold}/{multisig.members.length} required
              </span>
              {multisig.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {needsSigningCount !== null && needsSigningCount > 0 && (
              <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-2.5 py-1 text-xs font-semibold">
                {needsSigningCount} need signing
              </span>
            )}
            {executableCount !== null && executableCount > 0 && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                {executableCount} executable
              </span>
            )}
            {pendingCount !== null && pendingCount > 0 && !needsSigningCount && !executableCount && (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-semibold">
                {pendingCount} pending
              </span>
            )}
            {onBack && BackLink}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <span className="font-mono text-muted-foreground/50 text-[11px]">
            {truncateAddress(multisig.address)}
          </span>
          <CopyButton value={multisig.address} />
        </div>
      </div>

      {/* Members */}
      {multisig.members.length > 0 && (
        <div className={cn(isPanel ? "py-4 border-b border-border/50" : "bg-card border-border rounded-2xl border px-4 py-3")}>
          <div className="mb-2 flex items-center gap-2">
            <Users className="text-muted-foreground/60 h-3.5 w-3.5" />
            <span className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-widest">
              Signers
            </span>
            <span className="text-muted-foreground/40 font-mono text-[11px]">
              {multisig.threshold}/{multisig.members.length}
            </span>
          </div>
          <div className="divide-border/60 divide-y">
            {multisig.members.map((member) => (
              <MemberRow
                key={member.address}
                member={member}
                isViewer={viewerAddress === member.address}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className={cn(isPanel ? "pt-4" : "")}>
        <div className="mb-2 flex items-center gap-2">
          <ArrowLeftRight className="text-muted-foreground/60 h-3.5 w-3.5" />
          <span className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-widest">
            Transactions
          </span>
          {!loading && vaultItems.length > 0 && (
            <span className="text-muted-foreground/40 font-mono text-[11px] tabular-nums">
              {vaultItems.length}
            </span>
          )}
        </div>
        <OperationsQueue
          items={vaultItems}
          loading={loading}
          showFilters={false}
          compact
        />
      </div>
    </div>
  );
}
