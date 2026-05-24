"use client";

import { ChevronLeft, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { AddressWithLabel } from "@/components/address-with-label";
import { OperationsQueue } from "@/components/operations-queue";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceMultisigs } from "@/lib/hooks/use-workspace-multisigs";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { useWalletStore } from "@/stores/wallet-store";

interface VaultDetailProps {
  vaultKey: string;
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
        <Check className="h-3 w-3 text-green-500" />
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

function AvatarPlaceholder({ address }: { address: string }) {
  const initials = address.slice(0, 2).toUpperCase();
  return (
    <div className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
      {initials}
    </div>
  );
}

export function VaultDetail({ vaultKey }: VaultDetailProps) {
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

  if (!multisig) {
    return (
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6">
          <Link
            href="/vaults"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Vaults
          </Link>
        </div>
        <div className="border-border text-muted-foreground/60 rounded-2xl border border-dashed px-6 py-20 text-center">
          <p className="text-sm font-medium">Vault not found</p>
          <p className="mt-1 text-xs">
            It may have been removed from your registry.
          </p>
        </div>
      </div>
    );
  }

  const isSquads = multisig.provider === "squads";

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      {/* Back link */}
      <div>
        <Link
          href="/vaults"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Vaults
        </Link>
      </div>

      {/* Hero card */}
      <div className="bg-card border-border rounded-2xl border p-6 shadow-sm">
        {/* Top row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              {multisig.label ?? "Unnamed Vault"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Address */}
              <span className="font-mono text-muted-foreground text-xs">
                {truncateAddress(multisig.address)}
              </span>
              <CopyButton value={multisig.address} />

              <span className="text-border">·</span>

              {/* Chain badge */}
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                {multisig.chainName}
              </span>

              {/* Provider badge */}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  isSquads
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                )}
              >
                {isSquads ? "Squads" : "Safe"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="bg-background border-border rounded-xl border p-4 text-center">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
              Threshold
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {multisig.threshold}
              <span className="text-muted-foreground text-lg font-medium">
                /{multisig.members.length}
              </span>
            </p>
          </div>
          <div className="bg-background border-border rounded-xl border p-4 text-center">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
              Signers
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {multisig.members.length}
            </p>
          </div>
          <div className="bg-background border-border rounded-xl border p-4 text-center">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
              Pending
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {pendingCount === null ? (
                <span className="bg-muted inline-block h-7 w-8 animate-pulse rounded" />
              ) : (
                pendingCount
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Signers section */}
      {multisig.members.length > 0 && (
        <div className="bg-card border-border overflow-hidden rounded-2xl border">
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-semibold">
                Signers
              </span>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                {multisig.members.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
            {multisig.members.map((member) => (
              <div
                key={member.address}
                className="bg-muted/40 flex items-center gap-3 rounded-lg px-3 py-2.5"
              >
                <AvatarPlaceholder address={member.address} />
                <div className="min-w-0 flex-1">
                  <AddressWithLabel
                    address={member.address}
                    showCopy
                    showLabelButton
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operations section */}
      <div>
        <h2 className="text-foreground mb-3 text-base font-semibold">
          Operations
        </h2>
        <OperationsQueue
          items={vaultItems}
          loading={loading}
          showFilters={false}
        />
      </div>
    </div>
  );
}
