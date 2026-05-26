"use client";

import { CheckCircle2, ChevronRight, Shield } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useAccount } from "wagmi";

import { AddMultisigActions } from "@/components/add-multisig-actions";
import { OperationsQueue } from "@/components/operations-queue";
import { PageStage } from "@/components/page-stage";
import { WalletButton } from "@/components/wallet-button";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { cn } from "@/lib/utils";
import { useProposalsStore } from "@/stores/proposals-store";
import { useWalletStore } from "@/stores/wallet-store";

type StatFilter = "All" | "Action needed" | "Executable" | "Watching";

export function LandingPage() {
  const { publicKey, connected } = useWalletStore();
  const { isConnected: evmConnected } = useAccount();
  const getViewerAddress = useViewerAddressForMultisig();
  const proposals = useProposalsStore((state) => state.proposals);
  const loading = useProposalsStore((state) => state.loading);
  const workspaceMultisigs = useProposalsStore(
    (state) => state.workspaceMultisigs
  );
  const [activeFilter, setActiveFilter] = useState<StatFilter>("All");

  const queueItems = useWorkspaceQueue({
    workspaceProposals: proposals,
    multisigs: workspaceMultisigs,
    viewerAddress: publicKey?.toString() ?? null,
    getViewerAddressForMultisig: (multisig) =>
      getViewerAddress(multisig.provider),
  });

  const executableCount = queueItems.filter(
    (item) => item.readyToExecute
  ).length;
  const needsSigningCount = queueItems.filter(
    (i) => i.needsYourSignature && !i.currentUserApproved
  ).length;
  const watchingCount = queueItems.filter(
    (i) =>
      i.proposal.status === "Active" &&
      !i.readyToExecute &&
      !i.needsYourSignature
  ).length;

  // All action counts are confirmed zero (not just loading-zero)
  const allClear =
    !loading &&
    needsSigningCount === 0 &&
    executableCount === 0 &&
    watchingCount === 0;

  const toggleFilter = (filter: StatFilter) => {
    setActiveFilter((prev) => (prev === filter ? "All" : filter));
  };

  const isConnected = connected || evmConnected;

  if (workspaceMultisigs.length === 0) {
    return (
      <PageStage className="items-center gap-4 text-center">
        <div className="bg-card border-border flex h-10 w-10 items-center justify-center rounded-xl border">
          <Shield className="text-muted-foreground/50 h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <p className="text-foreground text-[15px] font-semibold">
            {isConnected ? "No vaults yet" : "Get started"}
          </p>
          <p className="text-muted-foreground/60 max-w-xs text-[13px]">
            {isConnected
              ? "Import a vault to start signing."
              : "Connect a wallet to get started."}
          </p>
        </div>
        {isConnected ? <AddMultisigActions /> : <WalletButton />}
      </PageStage>
    );
  }

  const statsHeader = (
    <div className="bg-card border-border mb-5 flex items-stretch overflow-x-auto rounded-xl border">
      {/* Vaults count — links to vault list */}
        <Link
          href="/vaults"
          className="hover:bg-muted/40 flex shrink-0 items-center gap-1.5 px-4 py-3 transition-colors"
        >
          <Shield className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground text-[13px] font-semibold tabular-nums">
            {workspaceMultisigs.length}
          </span>
          <span className="text-muted-foreground/50 text-[11px]">
            vault{workspaceMultisigs.length !== 1 ? "s" : ""}
          </span>
        </Link>

        {/* Action stats — only shown during loading or when any count is non-zero */}
        {!allClear && (
          <>
            <div className="bg-border w-px shrink-0 self-stretch" />

            {/* Need signing */}
            <button
              type="button"
              onClick={() =>
                !loading &&
                needsSigningCount > 0 &&
                toggleFilter("Action needed")
              }
              className={cn(
                "flex shrink-0 items-center gap-2 px-4 py-3 transition-colors",
                !loading && needsSigningCount > 0
                  ? "cursor-pointer"
                  : "cursor-default",
                activeFilter === "Action needed"
                  ? "bg-primary/10 [box-shadow:inset_0_-2px_0_rgba(217,119,6,0.6)]"
                  : !loading && needsSigningCount > 0
                    ? "hover:bg-primary/5"
                    : ""
              )}
            >
              <span
                className={cn(
                  "text-[18px] leading-none font-bold tabular-nums",
                  loading
                    ? "text-muted-foreground/20 animate-pulse"
                    : needsSigningCount > 0
                      ? "text-primary"
                      : "text-muted-foreground/30"
                )}
              >
                {needsSigningCount}
              </span>
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  loading
                    ? "text-muted-foreground/20"
                    : needsSigningCount > 0
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground/30"
                )}
              >
                to sign
              </span>
            </button>

            <div className="bg-border w-px shrink-0 self-stretch" />

            {/* Executable */}
            <button
              type="button"
              onClick={() =>
                !loading && executableCount > 0 && toggleFilter("Executable")
              }
              className={cn(
                "flex shrink-0 items-center gap-2 px-4 py-3 transition-colors",
                !loading && executableCount > 0
                  ? "cursor-pointer"
                  : "cursor-default",
                activeFilter === "Executable"
                  ? "bg-emerald-50 [box-shadow:inset_0_-2px_0_rgba(5,150,105,0.6)] dark:bg-emerald-950/20"
                  : !loading && executableCount > 0
                    ? "hover:bg-emerald-50/70 dark:hover:bg-emerald-950/10"
                    : ""
              )}
            >
              <span
                className={cn(
                  "text-[18px] leading-none font-bold tabular-nums",
                  loading
                    ? "text-muted-foreground/20 animate-pulse"
                    : executableCount > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/30"
                )}
              >
                {executableCount}
              </span>
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  loading
                    ? "text-muted-foreground/20"
                    : executableCount > 0
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground/30"
                )}
              >
                ready
              </span>
            </button>

            <div className="bg-border w-px shrink-0 self-stretch" />

            {/* Watching */}
            <button
              type="button"
              onClick={() =>
                !loading && watchingCount > 0 && toggleFilter("Watching")
              }
              className={cn(
                "flex shrink-0 items-center gap-2 px-4 py-3 transition-colors",
                !loading && watchingCount > 0
                  ? "cursor-pointer"
                  : "cursor-default",
                activeFilter === "Watching"
                  ? "bg-muted/60 [box-shadow:inset_0_-2px_0_rgba(161,161,170,0.4)]"
                  : !loading && watchingCount > 0
                    ? "hover:bg-muted/50"
                    : ""
              )}
            >
              <span
                className={cn(
                  "text-[18px] leading-none font-bold tabular-nums",
                  loading
                    ? "text-muted-foreground/20 animate-pulse"
                    : watchingCount > 0
                      ? "text-foreground"
                      : "text-muted-foreground/30"
                )}
              >
                {watchingCount}
              </span>
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap",
                  loading
                    ? "text-muted-foreground/20"
                    : watchingCount > 0
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground/30"
                )}
              >
                watching
              </span>
            </button>
          </>
        )}

        {/* All clear — shown when loaded and all counts are zero */}
        {allClear && (
          <div className="ml-auto flex items-center gap-1.5 px-4">
            <CheckCircle2 className="h-3 w-3 text-emerald-500/70 dark:text-emerald-400/70" />
            <span className="text-[11px] font-medium text-emerald-700/60 dark:text-emerald-400/60">
              All clear
            </span>
          </div>
        )}
      </div>
  );

  return (
    <PageStage width="wide">
      <Suspense fallback={null}>
      <OperationsQueue
        key={activeFilter}
        items={queueItems}
        loading={loading}
        showFilters
        statsHeader={statsHeader}
        defaultStatusFilter={activeFilter}
        emptyStateCta={
          <div className="mt-1 w-full max-w-sm">
            {workspaceMultisigs.length === 1 ? (
              <Link
                href={`/vaults/${encodeURIComponent(workspaceMultisigs[0].key)}`}
                className="group block"
              >
                <div className="border-border bg-card hover:bg-primary/[0.03] w-full rounded-xl border px-4 py-3.5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.3)] transition-colors group-hover:[box-shadow:inset_2px_0_0_rgba(217,119,6,0.6)]">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                        workspaceMultisigs[0].provider === "squads"
                          ? "bg-primary/10 border-primary/20"
                          : "border-blue-200/60 bg-blue-50 dark:border-blue-700/40 dark:bg-blue-950/20"
                      )}
                    >
                      {workspaceMultisigs[0].label ? (
                        <span
                          className={cn(
                            "text-[14px] leading-none font-bold",
                            workspaceMultisigs[0].provider === "squads"
                              ? "text-primary/70"
                              : "text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {workspaceMultisigs[0].label
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                      ) : (
                        <Shield
                          className={cn(
                            "h-4 w-4",
                            workspaceMultisigs[0].provider === "squads"
                              ? "text-primary/60"
                              : "text-blue-600/60 dark:text-blue-400/60"
                          )}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p
                        className={cn(
                          "truncate text-[13px] font-semibold",
                          workspaceMultisigs[0].label
                            ? "text-foreground"
                            : "text-muted-foreground/50 italic"
                        )}
                      >
                        {workspaceMultisigs[0].label ?? "Unnamed Vault"}
                      </p>
                      <p className="text-muted-foreground/50 mt-px text-[11px]">
                        {workspaceMultisigs[0].chainName} ·{" "}
                        {workspaceMultisigs[0].threshold}/
                        {workspaceMultisigs[0].members.length}
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground/40 group-hover:text-primary/60 h-4 w-4 shrink-0 transition-[color,transform] group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                href="/vaults"
                className="group border-border bg-card hover:bg-muted/40 flex w-full items-center justify-between rounded-xl border px-4 py-3.5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.3)] transition-colors hover:[box-shadow:inset_2px_0_0_rgba(217,119,6,0.6)]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="border-border bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border">
                    <Shield className="text-muted-foreground/50 h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-semibold">
                      {workspaceMultisigs.length} vaults
                    </p>
                    <p className="text-muted-foreground/50 mt-px text-[11px]">
                      View and manage
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground/40 group-hover:text-primary/60 h-4 w-4 shrink-0 transition-[color,transform] group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        }
      />
      </Suspense>
    </PageStage>
  );
}
