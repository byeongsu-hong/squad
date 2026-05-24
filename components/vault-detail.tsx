"use client";

import { ChevronLeft, Copy, Check, X, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { OperationsQueue } from "@/components/operations-queue";
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
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground ml-1 inline-flex items-center transition-colors"
      aria-label="Copy address"
    >
      {copied ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
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

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          isViewer ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {(labelText ?? member.address).slice(0, 1).toUpperCase()}
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
      <button
        type="button"
        onClick={handleCopy}
        className="text-muted-foreground/30 hover:text-muted-foreground shrink-0 transition-colors"
        aria-label="Copy address"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}

export function VaultDetail({ vaultKey, onBack }: VaultDetailProps) {
  const { publicKey, connected } = useWalletStore();
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

  const BackLink = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </button>
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

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      {!onBack && BackLink}

      {/* Vault header card */}
      <div className="bg-card border-border rounded-2xl border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground text-xl font-bold tracking-[-0.02em]">
              {multisig.label ?? "Unnamed Vault"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                {multisig.chainName}
              </span>
              <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                {isSquads ? "Squads" : "Safe"}
              </span>
              <span className="text-muted-foreground/70 text-xs">
                {multisig.threshold}/{multisig.members.length} required
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pendingCount !== null && pendingCount > 0 && (
              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
                {pendingCount} pending
              </span>
            )}
            {onBack && BackLink}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1">
          <span className="font-mono text-muted-foreground/60 text-xs">
            {truncateAddress(multisig.address)}
          </span>
          <CopyButton value={multisig.address} />
        </div>
        {multisig.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {multisig.tags.map((tag) => (
              <span
                key={tag}
                className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Members */}
      {multisig.members.length > 0 && (
        <div className="bg-card border-border rounded-2xl border px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Users className="text-muted-foreground/50 h-3.5 w-3.5" />
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

      {/* Operations */}
      <OperationsQueue
        items={vaultItems}
        loading={loading}
        showFilters={false}
        compact
      />
    </div>
  );
}
