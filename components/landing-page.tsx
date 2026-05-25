"use client";

import { Clock, Inbox, PenLine, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";

import { OperationsQueue } from "@/components/operations-queue";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { useWalletStore } from "@/stores/wallet-store";
import { cn } from "@/lib/utils";

type StatFilter = "All" | "Action needed" | "Executable" | "Pending";

export function LandingPage() {
  const { publicKey, connected } = useWalletStore();
  const { isConnected: evmConnected } = useAccount();
  const getViewerAddress = useViewerAddressForMultisig();
  const { proposals, loading, workspaceMultisigs } = useProposalsQuery();
  const [activeFilter, setActiveFilter] = useState<StatFilter>("All");

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

  const toggleFilter = (filter: StatFilter) => {
    setActiveFilter((prev) => (prev === filter ? "All" : filter));
  };

  if (workspaceMultisigs.length === 0) {
    return (
      <div className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center gap-6 text-center">
        <div className="bg-card border-border flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm">
          <Inbox className="text-muted-foreground/60 h-8 w-8" />
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
    <div className="mx-auto max-w-[1200px] pt-1">
        <div className="bg-card border-border mb-5 flex items-center gap-6 overflow-x-auto rounded-xl border px-5 py-3">
          <Link
            href="/vaults"
            className="flex items-center gap-2 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-70"
          >
            <Shield className={workspaceMultisigs.length > 0 ? "text-muted-foreground/60 h-4 w-4 shrink-0" : "text-muted-foreground/30 h-4 w-4 shrink-0"} />
            <div className="flex flex-col">
              <span className="text-foreground text-2xl font-bold tabular-nums leading-tight">
                {workspaceMultisigs.length}
              </span>
              <span className="text-muted-foreground/50 text-[11px]">
                Vaults
              </span>
            </div>
          </Link>
          <div className="bg-border h-8 w-px" />
          <button
            type="button"
            onClick={() => needsSigningCount > 0 && toggleFilter("Action needed")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-1 py-0.5 transition-opacity",
              needsSigningCount > 0 ? "hover:opacity-70 cursor-pointer" : "cursor-default",
              activeFilter === "Action needed" && "bg-primary/10"
            )}
          >
            <PenLine className={needsSigningCount > 0 ? "text-primary/60 h-4 w-4 shrink-0" : "text-muted-foreground/30 h-4 w-4 shrink-0"} />
            <div className="flex flex-col">
              <span className={needsSigningCount > 0 ? "text-primary text-2xl font-bold tabular-nums leading-tight" : "text-muted-foreground/30 text-2xl font-bold tabular-nums leading-tight"}>
                {needsSigningCount}
              </span>
              <span className={cn("text-[11px]", needsSigningCount > 0 ? "text-muted-foreground/50" : "text-muted-foreground/30")}>
                Needs signing
              </span>
            </div>
          </button>
          <div className="bg-border h-8 w-px" />
          <button
            type="button"
            onClick={() => executableCount > 0 && toggleFilter("Executable")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-1 py-0.5 transition-opacity",
              executableCount > 0 ? "hover:opacity-70 cursor-pointer" : "cursor-default",
              activeFilter === "Executable" && "bg-emerald-50 dark:bg-emerald-950/20"
            )}
          >
            <Zap className={executableCount > 0 ? "text-emerald-600/60 dark:text-emerald-400/60 h-4 w-4 shrink-0" : "text-muted-foreground/30 h-4 w-4 shrink-0"} />
            <div className="flex flex-col">
              <span className={executableCount > 0 ? "text-emerald-600 dark:text-emerald-400 text-2xl font-bold tabular-nums leading-tight" : "text-muted-foreground/30 text-2xl font-bold tabular-nums leading-tight"}>
                {executableCount}
              </span>
              <span className={cn("text-[11px]", executableCount > 0 ? "text-muted-foreground/50" : "text-muted-foreground/30")}>
                Ready to execute
              </span>
            </div>
          </button>
          <div className="bg-border h-8 w-px" />
          <button
            type="button"
            onClick={() => watchingCount > 0 && toggleFilter("Pending")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-1 py-0.5 transition-opacity",
              watchingCount > 0 ? "hover:opacity-70 cursor-pointer" : "cursor-default",
              activeFilter === "Pending" && "bg-muted"
            )}
          >
            <Clock className={watchingCount > 0 ? "text-muted-foreground/60 h-4 w-4 shrink-0" : "text-muted-foreground/30 h-4 w-4 shrink-0"} />
            <div className="flex flex-col">
              <span className={watchingCount > 0 ? "text-foreground text-2xl font-bold tabular-nums leading-tight" : "text-muted-foreground/30 text-2xl font-bold tabular-nums leading-tight"}>
                {watchingCount}
              </span>
              <span className={cn("text-[11px]", watchingCount > 0 ? "text-muted-foreground/50" : "text-muted-foreground/30")}>
                Pending
              </span>
            </div>
          </button>
        </div>

        <OperationsQueue
          key={activeFilter}
          items={queueItems}
          loading={loading}
          showFilters
          defaultStatusFilter={activeFilter}
          emptyStateCta={
            <Button variant="outline" asChild size="sm">
              <Link href="/vaults">View Vaults</Link>
            </Button>
          }
        />
    </div>
  );
}
