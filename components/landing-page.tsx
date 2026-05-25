"use client";

import { CheckCircle2, ChevronRight, Shield } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";

import { AddMultisigActions } from "@/components/add-multisig-actions";
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

  const isConnected = connected || evmConnected;

  if (workspaceMultisigs.length === 0) {
    return (
      <div className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center gap-6 text-center">
        <div className="bg-card border-border flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm">
          <Shield className="text-muted-foreground/40 h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <p className="text-foreground text-base font-semibold">
            {isConnected ? "No vaults yet" : "Get started"}
          </p>
          <p className="text-muted-foreground/60 max-w-xs text-sm">
            {isConnected
              ? "Import or create a vault to start signing."
              : "Connect a wallet to get started."}
          </p>
        </div>
        {isConnected && <AddMultisigActions />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] pt-1">
        <div className="bg-card border-border mb-5 flex items-center overflow-x-auto rounded-xl border">
          {/* Vaults — secondary nav item, not an action stat */}
          <Link
            href="/vaults"
            className="flex shrink-0 items-center gap-1.5 px-4 py-3.5 transition-opacity hover:opacity-70"
          >
            <Shield className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
            <span className="text-muted-foreground/70 text-sm font-medium tabular-nums">
              {workspaceMultisigs.length}
            </span>
            <span className="text-muted-foreground/50 text-[11px]">vault{workspaceMultisigs.length !== 1 ? "s" : ""}</span>
          </Link>

          <div className="bg-border h-8 w-px shrink-0" />

          {/* Action stats */}
          <button
            type="button"
            onClick={() => needsSigningCount > 0 && toggleFilter("Action needed")}
            className={cn(
              "flex shrink-0 items-center gap-2.5 px-5 py-3.5 transition-colors",
              needsSigningCount > 0 ? "cursor-pointer" : "cursor-default",
              activeFilter === "Action needed" ? "bg-primary/10 [box-shadow:inset_0_-2px_0_rgba(217,119,6,0.6)]" : needsSigningCount > 0 ? "hover:bg-primary/5" : ""
            )}
          >
            <div className="flex flex-col items-start">
              <span className={cn(
                "text-2xl font-bold tabular-nums leading-tight",
                needsSigningCount > 0 ? "text-primary" : "text-muted-foreground/25"
              )}>
                {needsSigningCount}
              </span>
              <span className={cn("text-[11px] whitespace-nowrap", needsSigningCount > 0 ? "text-muted-foreground/50" : "text-muted-foreground/25")}>
                Need signing
              </span>
            </div>
          </button>

          <div className="bg-border h-8 w-px shrink-0" />

          <button
            type="button"
            onClick={() => executableCount > 0 && toggleFilter("Executable")}
            className={cn(
              "flex shrink-0 items-center gap-2.5 px-5 py-3.5 transition-colors",
              executableCount > 0 ? "cursor-pointer" : "cursor-default",
              activeFilter === "Executable" ? "bg-emerald-950/20 [box-shadow:inset_0_-2px_0_rgba(5,150,105,0.6)]" : executableCount > 0 ? "hover:bg-emerald-950/10" : ""
            )}
          >
            <div className="flex flex-col items-start">
              <span className={cn(
                "text-2xl font-bold tabular-nums leading-tight",
                executableCount > 0 ? "text-emerald-400" : "text-muted-foreground/25"
              )}>
                {executableCount}
              </span>
              <span className={cn("text-[11px] whitespace-nowrap", executableCount > 0 ? "text-muted-foreground/50" : "text-muted-foreground/25")}>
                Executable
              </span>
            </div>
          </button>

          <div className="bg-border h-8 w-px shrink-0" />

          <button
            type="button"
            onClick={() => watchingCount > 0 && toggleFilter("Pending")}
            className={cn(
              "flex shrink-0 items-center gap-2.5 px-5 py-3.5 transition-colors",
              watchingCount > 0 ? "cursor-pointer" : "cursor-default",
              activeFilter === "Pending" ? "bg-muted/60 [box-shadow:inset_0_-2px_0_rgba(161,161,170,0.4)]" : watchingCount > 0 ? "hover:bg-muted/40" : ""
            )}
          >
            <div className="flex flex-col items-start">
              <span className={cn(
                "text-2xl font-bold tabular-nums leading-tight",
                watchingCount > 0 ? "text-foreground" : "text-muted-foreground/25"
              )}>
                {watchingCount}
              </span>
              <span className={cn("text-[11px]", watchingCount > 0 ? "text-muted-foreground/50" : "text-muted-foreground/25")}>
                Pending
              </span>
            </div>
          </button>

          {needsSigningCount === 0 && executableCount === 0 && watchingCount === 0 && !loading && (
            <div className="ml-auto flex items-center gap-1.5 px-5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/40" />
              <span className="text-muted-foreground/25 text-[11px]">All clear</span>
            </div>
          )}
        </div>

        <OperationsQueue
          key={activeFilter}
          items={queueItems}
          loading={loading}
          showFilters
          defaultStatusFilter={activeFilter}
          emptyStateCta={
            <div className="flex flex-col items-center gap-3 mt-1">
              <p className="text-muted-foreground/40 text-[11px]">
                Monitoring {workspaceMultisigs.length} vault{workspaceMultisigs.length !== 1 ? "s" : ""}
              </p>
              {workspaceMultisigs.length === 1 ? (
                <Link
                  href={`/vaults/${encodeURIComponent(workspaceMultisigs[0].key)}`}
                  className="group"
                >
                  <div className="border-border bg-card hover:bg-muted w-60 rounded-xl border px-4 py-3 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-primary/10 border-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
                        <Shield className="h-3.5 w-3.5 text-primary/60" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-foreground truncate text-sm font-medium">
                          {workspaceMultisigs[0].label ?? "Unnamed Vault"}
                        </p>
                        <p className="text-muted-foreground/50 text-[11px]">
                          {workspaceMultisigs[0].chainName} · {workspaceMultisigs[0].threshold}/{workspaceMultisigs[0].members.length}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60" />
                    </div>
                  </div>
                </Link>
              ) : (
                <Button variant="outline" asChild size="sm">
                  <Link href="/vaults">View {workspaceMultisigs.length} Vaults</Link>
                </Button>
              )}
            </div>
          }
        />
    </div>
  );
}
