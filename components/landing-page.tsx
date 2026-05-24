"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

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

  if (workspaceMultisigs.length === 0) {
    return (
      <div className="bg-background min-h-[calc(100svh-4.5rem)]">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-6">
            <h1 className="text-foreground text-2xl font-bold tracking-[-0.02em]">
              Operations
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              No multisigs configured
            </p>
          </div>
          <div className="border-border rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              {connected || evmConnected
                ? "Add multisigs in Vaults to see your workspace."
                : "Connect a wallet and add multisigs to get started."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link
                href="/vaults"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors"
              >
                Go to Vaults
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[calc(100svh-4.5rem)]">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-foreground text-2xl font-bold tracking-[-0.02em]">
            Operations
          </h1>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="text-primary text-sm font-semibold tabular-nums">
                {pendingCount} pending
              </span>
            )}
            {executableCount > 0 && (
              <span className="text-emerald-600 text-sm font-semibold tabular-nums dark:text-emerald-400">
                {executableCount} executable
              </span>
            )}
            <span className="text-muted-foreground/60 text-sm tabular-nums">
              {queueItems.length} total
            </span>
          </div>
        </div>

        <OperationsQueue items={queueItems} loading={loading} showFilters />
      </div>
    </div>
  );
}
