"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProposalDetailModal } from "@/components/proposal-detail-modal";
import { Button } from "@/components/ui/button";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";

import { useWalletStore } from "@/stores/wallet-store";
import type { WorkspaceQueueItem } from "@/types/workspace";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const ts = Date.parse(dateStr);
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function LandingPage() {
  const { publicKey, connected } = useWalletStore();
  const { isConnected: evmConnected, address: evmAddress } = useAccount();
  const { proposals, workspaceMultisigs } = useProposalsQuery();

  const queueItems = useWorkspaceQueue({
    workspaceProposals: proposals,
    multisigs: workspaceMultisigs,
    viewerAddress: publicKey?.toString() ?? null,
    getViewerAddressForMultisig: (multisig) =>
      multisig.provider === "safe"
        ? (evmAddress ?? null)
        : (publicKey?.toString() ?? null),
  });

  const [selectedItem, setSelectedItem] = useState<WorkspaceQueueItem | null>(
    null
  );

  const pendingCount = queueItems.filter(
    (item) => item.proposal.status === "Active" && !item.readyToExecute
  ).length;
  const executableCount = queueItems.filter((item) => item.readyToExecute).length;
  const totalCount = queueItems.length;

  const attentionItems = useMemo(() => {
    return [...queueItems]
      .sort((a, b) => a.priority - b.priority)
      .filter((item) => item.proposal.status === "Active" || item.readyToExecute);
  }, [queueItems]);

  const chainBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; provider: "squads" | "safe" }>();
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
  const uniqueProviders = useMemo(() => {
    return new Set(workspaceMultisigs.map((m) => m.provider)).size;
  }, [workspaceMultisigs]);

  const activityItems = useMemo(() => {
    return queueItems
      .slice()
      .sort((a, b) => {
        const ta = a.proposal.createdAt ? Date.parse(a.proposal.createdAt) : 0;
        const tb = b.proposal.createdAt ? Date.parse(b.proposal.createdAt) : 0;
        return tb - ta;
      })
      .slice(0, 4)
      .map((item) => {
        let action: string;
        let actionColor: string;
        let barColor: string;
        if (item.proposal.status === "Executed") {
          action = "Executed";
          actionColor = "text-muted-foreground/70";
          barColor = "bg-muted-foreground/40";
        } else if (item.proposal.status === "Rejected" || item.proposal.status === "Cancelled") {
          action = item.proposal.status === "Cancelled" ? "Cancelled" : "Rejected";
          actionColor = "text-red-600 dark:text-red-400";
          barColor = "bg-red-500";
        } else if (item.currentUserApproved) {
          action = "Signed";
          actionColor = "text-green-600 dark:text-green-400";
          barColor = "bg-green-500";
        } else {
          action = "Waiting";
          actionColor = "text-primary";
          barColor = "bg-primary";
        }
        return { item, action, actionColor, barColor };
      });
  }, [queueItems]);

  const handleActionSuccess = async () => {
    // Invalidation handled centrally by useProposalActions via React Query
  };

  if (workspaceMultisigs.length === 0) {
    return (
      <div className="min-h-[calc(100svh-4.5rem)] bg-background">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
              Workspace overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              No multisigs configured
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {connected || evmConnected
                ? "Add multisigs in Settings to see your workspace dashboard."
                : "Connect a wallet and add multisigs to see your workspace dashboard."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/settings">Configure Workspace</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100svh-4.5rem)] bg-background">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
              Workspace overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {workspaceMultisigs.length} multisig
              {workspaceMultisigs.length !== 1 ? "s" : ""} · {uniqueChains} chain
              {uniqueChains !== 1 ? "s" : ""} · {uniqueProviders} provider
              {uniqueProviders !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatPill label="Pending" value={pendingCount} color="text-primary" />
            <StatPill
              label="Executable"
              value={executableCount}
              color="text-green-600 dark:text-green-400"
            />
            <StatPill label="Total" value={totalCount} color="text-foreground" />
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 320px" }}>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-[13px] font-semibold text-foreground">
                  Needs attention
                </h2>
                <Link
                  href="/operations"
                  className="text-[11px] font-medium text-muted-foreground/60 transition-colors hover:text-foreground"
                >
                  All proposals →
                </Link>
              </div>
              {attentionItems.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground/70">
                  Nothing needs attention right now.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {attentionItems.map((item) => (
                    <QueueItemCard
                      key={item.focusKey}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[13px] font-semibold text-foreground">Chains</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5">
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
          </div>

          <div>
            <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[13px] font-semibold text-foreground">Activity</h2>
              </div>
              {activityItems.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground/70">
                  No activity yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activityItems.map(({ item, action, actionColor, barColor }) => (
                    <div
                      key={item.focusKey}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <div
                        className={cn(
                          "h-[22px] w-1 shrink-0 rounded-[2px] opacity-60",
                          barColor
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] text-foreground/80">
                          <span className={cn("font-semibold", actionColor)}>
                            {action}
                          </span>
                          {" · "}
                          {item.multisig.label || "Unnamed"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                          {item.multisig.chainName}
                          {" · "}#{item.proposal.transactionIndex.toString()}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
                        {timeAgo(item.proposal.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProposalDetailModal
        item={selectedItem}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        onActionSuccess={handleActionSuccess}
      />
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: number;
  color: string;
}

function StatPill({ label, value, color }: StatPillProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xl font-bold leading-none tracking-[-0.03em]",
          color
        )}
      >
        {value}
      </span>
    </div>
  );
}

interface QueueItemCardProps {
  item: WorkspaceQueueItem;
  onClick: () => void;
}

function QueueItemCard({ item, onClick }: QueueItemCardProps) {
  const dotColor = item.needsYourSignature
    ? "bg-primary"
    : item.readyToExecute
      ? "bg-green-500"
      : "bg-muted-foreground/40";

  const statusText = item.readyToExecute
    ? "Ready to execute"
    : item.needsYourSignature
      ? `${item.approvalCount}/${item.multisig.threshold} signed · waiting on you`
      : `${item.approvalCount}/${item.multisig.threshold} signed`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted"
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {item.multisig.label || "Unnamed"}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {item.multisig.chainName}
          </span>
          <span className="text-[10px] text-muted-foreground/40">·</span>
          <span className="text-[10px] text-muted-foreground/70">
            {item.multisig.provider === "safe" ? "Safe" : "Squads"}
          </span>
          {item.needsYourSignature && (
            <span className="shrink-0 rounded-[3px] bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:bg-red-950/30 dark:text-red-400">
              Urgent
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">{statusText}</p>
      </div>
      <span className="shrink-0 font-mono text-[12px] text-muted-foreground/70">
        {item.approvalCount}/{item.multisig.threshold}
      </span>
    </button>
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
        <span className="text-[12px] font-medium text-foreground/80">{name}</span>
        <span className="tabular-nums text-[11px] text-muted-foreground/70">
          {count}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-1.5 rounded-full", barColor)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
