"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

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

  if (!multisig) {
    return (
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/vaults"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Vaults
          </Link>
        </div>
        <div className="border-border text-muted-foreground/70 rounded-xl border border-dashed px-6 py-16 text-center text-sm">
          Vault not found. It may have been removed from your registry.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/vaults"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Vaults
        </Link>
      </div>

      <div className="border-border bg-card rounded-xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-foreground text-xl font-bold tracking-[-0.02em]">
              {multisig.label ?? "Unnamed Vault"}
            </h1>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-[12px]">
              <span>{multisig.chainName}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{multisig.provider === "safe" ? "Safe" : "Squads"}</span>
              <span className="text-muted-foreground/40">·</span>
              <AddressWithLabel address={multisig.address} showCopy />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="border-border bg-background rounded-lg border px-3 py-2 text-center">
              <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                Threshold
              </p>
              <p className="text-foreground text-sm font-bold">
                {multisig.threshold}/{multisig.members.length}
              </p>
            </div>
            <div className="border-border bg-background rounded-lg border px-3 py-2 text-center">
              <p className="text-muted-foreground/70 text-[9px] font-semibold tracking-widest uppercase">
                Signers
              </p>
              <p className="text-foreground text-sm font-bold">
                {multisig.members.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {multisig.members.length > 0 && (
        <div className="border-border bg-card rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
          <div className="border-border border-b px-5 py-3">
            <p className="text-muted-foreground/70 text-[11px] font-semibold tracking-widest uppercase">
              Signers
            </p>
          </div>
          <div className="divide-border/50 divide-y">
            {multisig.members.map((member) => (
              <div
                key={member.address}
                className="flex items-center gap-3 px-5 py-2.5"
              >
                <AddressWithLabel
                  address={member.address}
                  showCopy
                  showLabelButton
                />
              </div>
            ))}
          </div>
        </div>
      )}

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
