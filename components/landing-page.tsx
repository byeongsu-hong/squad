"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";

import { OperationsQueue } from "@/components/operations-queue";
import { Button } from "@/components/ui/button";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { cn } from "@/lib/utils";
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
  const executableCount = queueItems.filter(
    (item) => item.readyToExecute
  ).length;

  const chainBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { count: number; provider: "squads" | "safe" }
    >();
    for (const m of workspaceMultisigs) {
      const existing = map.get(m.chainName);
      if (existing) {
        existing.count++;
      } else {
        map.set(m.chainName, { count: 1, provider: m.provider });
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [workspaceMultisigs]);

  const uniqueChains = chainBreakdown.length;
  const uniqueProviders = useMemo(
    () => new Set(workspaceMultisigs.map((m) => m.provider)).size,
    [workspaceMultisigs]
  );

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
              <Button asChild size="sm">
                <Link href="/vaults">Go to Vaults</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[calc(100svh-4.5rem)]">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-5">
          <h1 className="text-foreground text-2xl font-bold tracking-[-0.02em]">
            Operations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {workspaceMultisigs.length} multisig
            {workspaceMultisigs.length !== 1 ? "s" : ""} · {uniqueChains} chain
            {uniqueChains !== 1 ? "s" : ""} · {uniqueProviders} provider
            {uniqueProviders !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex gap-6">
          <div className="min-w-0 flex-1">
            <OperationsQueue items={queueItems} loading={loading} showFilters />
          </div>

          <div className="hidden w-[240px] shrink-0 space-y-4 lg:block">
            <div className="border-border bg-card rounded-xl border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
              <p className="text-muted-foreground/70 mb-3 text-[10px] font-semibold tracking-widest uppercase">
                Summary
              </p>
              <div className="space-y-2">
                <StatRow
                  label="Pending"
                  value={pendingCount}
                  color="text-primary"
                />
                <StatRow
                  label="Executable"
                  value={executableCount}
                  color="text-green-600 dark:text-green-400"
                />
                <StatRow
                  label="Total"
                  value={queueItems.length}
                  color="text-foreground"
                />
              </div>
            </div>

            {chainBreakdown.length > 0 && (
              <div className="border-border bg-card rounded-xl border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
                <p className="text-muted-foreground/70 mb-3 text-[10px] font-semibold tracking-widest uppercase">
                  Chains
                </p>
                <div className="space-y-3">
                  {chainBreakdown.map(([chainName, { count, provider }]) => (
                    <ChainBar
                      key={chainName}
                      name={chainName}
                      count={count}
                      total={workspaceMultisigs.length}
                      provider={provider}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: number;
  color: string;
}

function StatRow({ label, value, color }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-[12px]">{label}</span>
      <span className={cn("text-[13px] font-bold tabular-nums", color)}>
        {value}
      </span>
    </div>
  );
}

interface ChainBarProps {
  name: string;
  count: number;
  total: number;
  provider: "squads" | "safe";
}

function ChainBar({ name, count, total, provider }: ChainBarProps) {
  const width = total > 0 ? (count / total) * 100 : 0;
  const barColor =
    provider === "squads" ? "bg-blue-600 dark:bg-blue-400" : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-foreground/80 text-[12px] font-medium">
          {name}
        </span>
        <span className="text-muted-foreground/70 text-[11px] tabular-nums">
          {count}
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full rounded-full">
        <div
          className={cn("h-1.5 rounded-full", barColor)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
