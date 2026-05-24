"use client";

import { Clock, Inbox, PenLine, Shield, Zap } from "lucide-react";
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

  const executableCount = queueItems.filter((item) => item.readyToExecute).length;
  const needsSigningCount = queueItems.filter(
    (i) => i.needsYourSignature && !i.currentUserApproved
  ).length;
  const watchingCount = queueItems.filter(
    (i) => i.proposal.status === "Active" && !i.readyToExecute && !i.needsYourSignature
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
        <div className="mb-4">
          <h1 className="text-foreground mb-3 text-2xl font-bold tracking-[-0.02em]">
            Operations
          </h1>
        </div>

        <div className="bg-card border-border mb-5 flex items-center gap-6 overflow-x-auto rounded-xl border px-5 py-3">
          <div className="flex items-center gap-2">
            <Shield className="text-muted-foreground/40 h-4 w-4 shrink-0" />
            <div className="flex flex-col">
              <span className="text-foreground text-2xl font-bold tabular-nums leading-tight">
                {workspaceMultisigs.length}
              </span>
              <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
                Vaults
              </span>
            </div>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="flex items-center gap-2">
            <PenLine className={needsSigningCount > 0 ? "text-primary/60 h-4 w-4 shrink-0" : "text-muted-foreground/30 h-4 w-4 shrink-0"} />
            <div className="flex flex-col">
              <span className={needsSigningCount > 0 ? "text-primary text-2xl font-bold tabular-nums leading-tight" : "text-foreground text-2xl font-bold tabular-nums leading-tight"}>
                {needsSigningCount}
              </span>
              <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
                Needs signing
              </span>
            </div>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="flex items-center gap-2">
            <Zap className={executableCount > 0 ? "text-emerald-600/60 dark:text-emerald-400/60 h-4 w-4 shrink-0" : "text-muted-foreground/30 h-4 w-4 shrink-0"} />
            <div className="flex flex-col">
              <span className={executableCount > 0 ? "text-emerald-600 dark:text-emerald-400 text-2xl font-bold tabular-nums leading-tight" : "text-foreground text-2xl font-bold tabular-nums leading-tight"}>
                {executableCount}
              </span>
              <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
                Ready to execute
              </span>
            </div>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="flex items-center gap-2">
            <Clock className={watchingCount > 0 ? "text-muted-foreground/60 h-4 w-4 shrink-0" : "text-muted-foreground/30 h-4 w-4 shrink-0"} />
            <div className="flex flex-col">
              <span className={watchingCount > 0 ? "text-foreground text-2xl font-bold tabular-nums leading-tight" : "text-muted-foreground text-2xl font-bold tabular-nums leading-tight"}>
                {watchingCount}
              </span>
              <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
                Watching
              </span>
            </div>
          </div>
        </div>

        <OperationsQueue
          items={queueItems}
          loading={loading}
          showFilters
          emptyStateCta={
            <Button variant="outline" asChild size="sm">
              <Link href="/vaults">Browse Vaults</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
