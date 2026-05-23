"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProposalDetailModal } from "@/components/proposal-detail-modal";
import { Button } from "@/components/ui/button";
import { useAllProposalsLoader } from "@/lib/hooks/use-all-proposals-loader";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { cn } from "@/lib/utils";
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
  const { publicKey, getWalletAddressForProvider } = useWalletStore();
  const { proposals, safeProposals, workspaceMultisigs, loadAll } =
    useAllProposalsLoader();

  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    void loadAll();
  }, [loadAll]);

  const queueItems = useWorkspaceQueue({
    proposals,
    multisigs: workspaceMultisigs,
    viewerAddress: publicKey?.toString() ?? null,
    workspaceProposals: safeProposals,
    getViewerAddressForMultisig: (multisig) =>
      getWalletAddressForProvider(multisig.provider),
  });

  const [selectedItem, setSelectedItem] = useState<WorkspaceQueueItem | null>(null);

  const pendingCount = queueItems.filter(
    (item) => item.proposal.status === "Active" && !item.readyToExecute
  ).length;
  const executableCount = queueItems.filter((item) => item.readyToExecute).length;
  const totalCount = queueItems.length;

  const attentionItems = useMemo(() => {
    return [...queueItems]
      .sort((a, b) => a.priority - b.priority)
      .filter((item) => item.proposal.status === "Active" || item.readyToExecute)
      .slice(0, 5);
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
        if (item.proposal.status === "Executed") {
          action = "Executed";
          actionColor = "text-muted-foreground/70";
        } else if (item.currentUserApproved) {
          action = "Signed";
          actionColor = "text-green-600 dark:text-green-400";
        } else {
          action = "Waiting";
          actionColor = "text-primary";
        }
        return { item, action, actionColor };
      });
  }, [queueItems]);

  const handleActionSuccess = async () => {
    void loadAll({ force: true });
  };

  if (workspaceMultisigs.length === 0) {
    return (
      <div className="flex min-h-[calc(100svh-4.5rem)] items-center justify-center bg-background px-6">
        <div className="max-w-lg text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[0.68rem] font-medium tracking-[0.18em] text-muted-foreground uppercase shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Multisig Aggregator
          </div>
          <h1 className="mt-8 text-[clamp(2.2rem,6vw,3.5rem)] font-bold tracking-[-0.04em] text-foreground">
            All your multisigs,<br />in one place.
          </h1>
          <p className="mt-4 text-[1rem] leading-7 text-muted-foreground">
            Squad<sup>2</sup> brings Safe and Squads activity into a single
            queue so your team can review, sign, and execute without bouncing
            between dashboards.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="group rounded-full px-6"
            >
              <Link href="/operations">
                Open Operations
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-6"
            >
              <Link href="/settings">Configure Workspace</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100svh-4.5rem)] bg-background">
      <div className="mx-auto max-w-[1200px] space-y-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
              Workspace overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {workspaceMultisigs.length} multisig{workspaceMultisigs.length !== 1 ? "s" : ""}{" "}
              · {uniqueChains} chain{uniqueChains !== 1 ? "s" : ""}{" "}
              · {uniqueProviders} provider{uniqueProviders !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatPill label="Pending" value={pendingCount} color="text-primary" />
            <StatPill label="Executable" value={executableCount} color="text-green-600 dark:text-green-400" />
            <StatPill label="Total" value={totalCount} color="text-foreground" />
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 320px" }}>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[13px] font-semibold text-foreground">Needs attention</h2>
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
                  {activityItems.map(({ item, action, actionColor }) => (
                    <div key={item.focusKey} className="flex items-start gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-foreground/80 truncate">
                          <span className={cn("font-semibold", actionColor)}>{action}</span>
                          {" · "}
                          {item.multisig.label || "Unnamed"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                          {item.multisig.chainName}
                          {" · "}
                          #{item.proposal.transactionIndex.toString()}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground/70">
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
      <span className={cn("text-xl font-bold leading-none tracking-[-0.03em]", color)}>
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
    ? "bg-amber-500"
    : item.readyToExecute
    ? "bg-green-500"
    : "bg-muted dark:bg-[#2e2b28]";

  const statusText = item.readyToExecute
    ? "Ready to execute"
    : `${item.approvalCount}/${item.multisig.threshold} signed · waiting on you`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted"
    >
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotColor)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-foreground">
            {item.multisig.label || "Unnamed"}
          </p>
          {item.needsYourSignature && (
            <span className="shrink-0 rounded-full bg-amber-50 dark:bg-[#2e2b28] px-2 py-0.5 text-[10px] font-semibold text-primary">
              Urgent
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground/70">
            {item.multisig.chainName}
          </span>
          <span className="text-[11px] text-muted-foreground/70">
            {item.multisig.provider === "safe" ? "Safe" : "Squads"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{statusText}</p>
      </div>
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
  const barColor = provider === "squads" ? "bg-blue-600 dark:bg-blue-400" : "bg-amber-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-foreground/80">{name}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{count}</span>
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
