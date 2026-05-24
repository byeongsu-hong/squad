"use client";

import { ChevronLeft, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { OperationsQueue } from "@/components/operations-queue";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceMultisigs } from "@/lib/hooks/use-workspace-multisigs";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { useWalletStore } from "@/stores/wallet-store";

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

  const BackLink = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      Back to Vaults
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
        <div className="mb-6">{BackLink}</div>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-foreground text-sm font-semibold">Vault not found</p>
          <p className="text-muted-foreground text-xs">
            It may have been removed from your registry.
          </p>
        </div>
      </div>
    );
  }

  const isSquads = multisig.provider === "squads";

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      {BackLink}

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
          {pendingCount !== null && pendingCount > 0 && (
            <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
              {pendingCount} pending
            </span>
          )}
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
