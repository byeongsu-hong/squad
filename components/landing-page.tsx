"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";

import { OperationsQueue } from "@/components/operations-queue";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { useWalletStore } from "@/stores/wallet-store";

export function LandingPage() {
  const { publicKey, connected } = useWalletStore();
  const { isConnected: evmConnected } = useAccount();
  const getViewerAddress = useViewerAddressForMultisig();
  const { proposals, loading, workspaceMultisigs } = useProposalsQuery();

  const queueItems = useWorkspaceQueue({
    workspaceProposals: proposals,
    multisigs: workspaceMultisigs,
    viewerAddress: publicKey?.toString() ?? null,
    getViewerAddressForMultisig: (multisig) =>
      getViewerAddress(multisig.provider),
  });

  const pendingCount = queueItems.filter(
    (item) => item.proposal.status === "Active" && !item.readyToExecute
  ).length;
  const executableCount = queueItems.filter((item) => item.readyToExecute).length;
  const needsSigningCount = queueItems.filter(
    (i) => i.needsYourSignature && !i.currentUserApproved
  ).length;

  if (workspaceMultisigs.length === 0) {
    return (
      <div className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center gap-6 text-center">
        <div className="bg-card border-border flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm">
          <Inbox className="text-muted-foreground/50 h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <p className="text-foreground text-base font-semibold">
            {connected || evmConnected ? "No operations yet" : "Get started"}
          </p>
          <p className="text-muted-foreground max-w-xs text-sm">
            {connected || evmConnected
              ? "Add multisigs in Vaults to see your workspace."
              : "Connect a wallet and add multisigs to get started."}
          </p>
        </div>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20">
          <Link href="/vaults">Go to Vaults</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[calc(100svh-4.5rem)]">
      <div className="mx-auto max-w-[1200px]">
        <div className="border-border mb-5 flex items-baseline gap-3 border-b pb-4">
          <h1 className="text-foreground text-2xl font-bold tracking-[-0.02em]">
            Operations
          </h1>
        </div>

        <div className="bg-card border-border mb-5 flex items-center gap-6 rounded-xl border px-5 py-3">
          <div className="flex flex-col">
            <span className="text-foreground text-2xl font-bold tabular-nums">
              {workspaceMultisigs.length}
            </span>
            <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
              Vaults
            </span>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="flex flex-col">
            <span className="text-foreground text-2xl font-bold tabular-nums">
              {needsSigningCount}
            </span>
            <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
              Needs signing
            </span>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="flex flex-col">
            <span className="text-foreground text-2xl font-bold tabular-nums">
              {executableCount}
            </span>
            <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
              Ready to execute
            </span>
          </div>
        </div>

        <OperationsQueue items={queueItems} loading={loading} showFilters />
      </div>
    </div>
  );
}
