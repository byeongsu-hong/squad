"use client";

import { PublicKey } from "@solana/web3.js";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AddressWithLabel } from "@/components/address-with-label";
import { RegistryManagementDialog } from "@/components/registry-management-dialog";
import { ProposalCardSkeletonList } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useProposalActions } from "@/lib/hooks/use-proposal-actions";
import { useSquadsProposalLoader } from "@/lib/hooks/use-squads-proposal-loader";
import { useOperationsWorkspaceQuerySync } from "@/lib/hooks/use-workspace-query-sync";
import { cn } from "@/lib/utils";
import {
  type ConfigAction,
  formatConfigAction,
} from "@/lib/utils/transaction-formatter";
import {
  buildWorkspaceExplorerViews,
  buildWorkspaceQueueItem,
  buildWorkspaceRegistryItems,
  loadSquadsWorkspacePayload,
  toWorkspaceMultisigs,
  toWorkspaceProposalFromRaw,
} from "@/lib/workspace/squads-adapter";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type {
  WorkspaceExplorerMode,
  WorkspacePayload,
  WorkspaceQueueItem,
} from "@/types/workspace";

interface OperationsDashboardProps {
  actions?: React.ReactNode;
}

function formatCompactAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getStatusTone(item: WorkspaceQueueItem) {
  if (item.needsYourSignature) {
    return "text-lime-300";
  }
  if (item.readyToExecute) {
    return "text-lime-200";
  }
  if (item.proposal.status === "Rejected") {
    return "text-red-300";
  }
  if (item.proposal.status === "Executed") {
    return "text-zinc-300";
  }
  return "text-zinc-400";
}

export function OperationsDashboard({
  actions,
}: OperationsDashboardProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState("");
  const [payloadLoading, setPayloadLoading] = useState(false);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [focusedPayload, setFocusedPayload] = useState<WorkspacePayload | null>(
    null
  );

  const { publicKey, connected } = useWalletStore();
  const { chains } = useChainStore();
  const { multisigs, setProposals, proposals } = useMultisigStore();
  const {
    operationsFocusedProposalKey: focusedProposalKey,
    operationsQueueFilter: queueFilter,
    operationsDetailTab: detailTab,
    operationsExplorerMode: explorerMode,
    operationsSelectedRegistryKeys: selectedRegistryKeys,
    operationsActiveViewKey: activeViewKey,
    operationsExpandedViewKeys: expandedViewKeys,
    setOperationsFocusedProposalKey: setFocusedProposalKey,
    setOperationsQueueFilter: setQueueFilter,
    setOperationsDetailTab: setDetailTab,
    setOperationsExplorerMode: setExplorerMode,
    setOperationsSelectedRegistryKeys: setSelectedRegistryKeys,
    setOperationsActiveViewKey: setActiveViewKey,
    setOperationsExpandedViewKeys: setExpandedViewKeys,
  } = useWorkspaceStore();
  const workspaceMultisigs = useMemo(
    () => toWorkspaceMultisigs(multisigs, chains),
    [chains, multisigs]
  );
  const availableMultisigKeys = useMemo(
    () => workspaceMultisigs.map((multisig) => multisig.key),
    [workspaceMultisigs]
  );
  const { loading, loadForAllMultisigs } = useSquadsProposalLoader({
    chains,
    setProposals,
    errorMessage: "Failed to load dashboard",
  });

  useEffect(() => {
    void loadForAllMultisigs(multisigs);
  }, [loadForAllMultisigs, multisigs]);

  useOperationsWorkspaceQuerySync({
    searchParams,
    pathname,
    replace: (href) => router.replace(href, { scroll: false }),
    availableMultisigKeys,
    queueFilter,
    focusedProposalKey,
    selectedRegistryKeys,
    activeViewKey,
    setQueueFilter,
    setFocusedProposalKey,
    setSelectedRegistryKeys,
    setActiveViewKey,
  });

  const primarySelectedRegistryKey = selectedRegistryKeys[0] ?? null;
  const selectedRegistryKeySet = useMemo(
    () => new Set(selectedRegistryKeys),
    [selectedRegistryKeys]
  );

  const multisigMap = useMemo(
    () =>
      new Map(workspaceMultisigs.map((multisig) => [multisig.key, multisig])),
    [workspaceMultisigs]
  );

  const queueItems = useMemo(
    () =>
      proposals
        .map((proposal) => {
          const multisigKey = proposal.multisig.toString();
          const multisig = multisigMap.get(multisigKey);
          if (!multisig) return null;
          return buildWorkspaceQueueItem(
            toWorkspaceProposalFromRaw(proposal, multisig.chainId),
            multisig,
            publicKey?.toString() ?? null
          );
        })
        .filter((item): item is WorkspaceQueueItem => item !== null)
        .sort((left, right) => {
          if (left.priority !== right.priority) {
            return left.priority - right.priority;
          }
          return Number(
            right.proposal.transactionIndex - left.proposal.transactionIndex
          );
        }),
    [multisigMap, proposals, publicKey]
  );

  const searchNeedle = searchText.trim().toLowerCase();

  const registryItems = useMemo(
    () =>
      buildWorkspaceRegistryItems(workspaceMultisigs, queueItems, searchNeedle),
    [queueItems, searchNeedle, workspaceMultisigs]
  );

  const explorerViews = useMemo(
    () => buildWorkspaceExplorerViews(registryItems),
    [registryItems]
  );

  const activeView =
    explorerViews.find((view) => view.id === activeViewKey) ?? explorerViews[0];

  useEffect(() => {
    if (!activeViewKey) {
      return;
    }

    setExpandedViewKeys((current) =>
      current.includes(activeViewKey) ? current : [...current, activeViewKey]
    );
  }, [activeViewKey, setExpandedViewKeys]);

  useEffect(() => {
    if (activeViewKey.startsWith("chain:")) {
      setExplorerMode("chains");
      return;
    }
    if (activeViewKey.startsWith("tag:")) {
      setExplorerMode("tags");
      return;
    }
    setExplorerMode("views");
  }, [activeViewKey, setExplorerMode]);

  const explorerSections = useMemo(
    () =>
      [
        {
          id: "views",
          label: "Views",
          views: explorerViews.filter(
            (view) => view.id === "all" || view.id === "attention"
          ),
        },
        {
          id: "chains",
          label: "Chains",
          views: explorerViews.filter((view) => view.id.startsWith("chain:")),
        },
        {
          id: "tags",
          label: "Tags",
          views: explorerViews.filter((view) => view.id.startsWith("tag:")),
        },
      ].filter((section) => section.views.length > 0),
    [explorerViews]
  );

  const visibleExplorerSection = useMemo(
    () =>
      explorerSections.find((section) => section.id === explorerMode) ??
      explorerSections[0] ??
      null,
    [explorerMode, explorerSections]
  );

  const scopedMultisigKeys = useMemo(
    () => new Set(activeView?.multisigKeys ?? []),
    [activeView]
  );

  const filteredQueueItems = useMemo(() => {
    let nextItems = queueItems;

    if (selectedRegistryKeys.length > 0) {
      nextItems = nextItems.filter((item) =>
        selectedRegistryKeySet.has(item.multisig.key)
      );
    } else if (activeViewKey !== "all") {
      nextItems = nextItems.filter((item) =>
        scopedMultisigKeys.has(item.multisig.key)
      );
    }

    if (queueFilter === "waiting") {
      nextItems = nextItems.filter((item) => item.needsYourSignature);
    } else if (queueFilter === "executable") {
      nextItems = nextItems.filter((item) => item.readyToExecute);
    }

    return nextItems;
  }, [
    activeViewKey,
    queueFilter,
    queueItems,
    scopedMultisigKeys,
    selectedRegistryKeySet,
    selectedRegistryKeys,
  ]);

  const pagination = usePagination(filteredQueueItems, {
    totalItems: filteredQueueItems.length,
    itemsPerPage: 10,
  });
  const { goToPage } = pagination;

  useEffect(() => {
    const availableKeys = new Set(
      filteredQueueItems.map((item) => item.focusKey)
    );

    if (focusedProposalKey && availableKeys.has(focusedProposalKey)) {
      return;
    }

    setFocusedProposalKey(filteredQueueItems[0]?.focusKey ?? null);
  }, [filteredQueueItems, focusedProposalKey, setFocusedProposalKey]);

  useEffect(() => {
    if (!focusedProposalKey) {
      return;
    }

    const focusedIndex = filteredQueueItems.findIndex(
      (item) => item.focusKey === focusedProposalKey
    );

    if (focusedIndex === -1) {
      return;
    }

    goToPage(Math.floor(focusedIndex / 10) + 1);
  }, [filteredQueueItems, focusedProposalKey, goToPage]);

  const focusedItem =
    filteredQueueItems.find((item) => item.focusKey === focusedProposalKey) ??
    filteredQueueItems[0] ??
    null;

  useEffect(() => {
    setDetailTab("overview");
  }, [focusedProposalKey, setDetailTab]);

  const waitingOnYouCount = queueItems.filter(
    (item) => item.needsYourSignature
  ).length;
  const executableCount = queueItems.filter(
    (item) => item.readyToExecute
  ).length;
  const { approve, reject, execute, actionLoading, isActionInProgress } =
    useProposalActions({
      onSuccess: () => loadForAllMultisigs(multisigs),
    });

  const isApproveLoading = Boolean(
    focusedItem &&
    actionLoading ===
      `approve-${focusedItem.multisig.key}-${focusedItem.proposal.transactionIndex}`
  );
  const isRejectLoading = Boolean(
    focusedItem &&
    actionLoading ===
      `reject-${focusedItem.multisig.key}-${focusedItem.proposal.transactionIndex}`
  );
  const isExecuteLoading = Boolean(
    focusedItem &&
    actionLoading ===
      `execute-${focusedItem.multisig.key}-${focusedItem.proposal.transactionIndex}`
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFocusedPayload() {
      if (!focusedItem) {
        setFocusedPayload(null);
        setPayloadError(null);
        return;
      }

      setPayloadLoading(true);
      setPayloadError(null);
      setFocusedPayload(null);

      try {
        const payload = await loadSquadsWorkspacePayload(
          focusedItem.multisig,
          focusedItem.proposal,
          chains
        );

        if (!cancelled) {
          setFocusedPayload(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setPayloadError(
            error instanceof Error
              ? error.message
              : "Transaction data not available."
          );
        }
      } finally {
        if (!cancelled) {
          setPayloadLoading(false);
        }
      }
    }

    void loadFocusedPayload();

    return () => {
      cancelled = true;
    };
  }, [chains, focusedItem]);

  const handleApprove = async () => {
    if (!focusedItem) return;
    await approve(
      new PublicKey(focusedItem.multisig.key),
      focusedItem.proposal.transactionIndex,
      focusedItem.multisig.chainId
    );
  };

  const handleReject = async () => {
    if (!focusedItem) return;
    await reject(
      new PublicKey(focusedItem.multisig.key),
      focusedItem.proposal.transactionIndex,
      focusedItem.multisig.chainId
    );
  };

  const handleExecute = async () => {
    if (!focusedItem) return;
    await execute(
      new PublicKey(focusedItem.multisig.key),
      focusedItem.proposal.transactionIndex,
      focusedItem.multisig.chainId
    );
  };

  const handleViewSelect = (viewId: string) => {
    setActiveViewKey(viewId);
    setSelectedRegistryKeys([]);
  };

  const handleRegistrySelect = (
    multisigKey: string,
    event?: Pick<MouseEvent, "metaKey" | "ctrlKey">
  ) => {
    const multiselect = Boolean(event?.metaKey || event?.ctrlKey);

    setSelectedRegistryKeys((current) => {
      if (!multiselect) {
        return [multisigKey];
      }

      if (current.includes(multisigKey)) {
        return current.filter((key) => key !== multisigKey);
      }

      return [...current, multisigKey];
    });
  };

  const toggleViewExpansion = (viewId: string) => {
    setExpandedViewKeys((current) =>
      current.includes(viewId)
        ? current.filter((id) => id !== viewId)
        : [...current, viewId]
    );
  };

  if (multisigs.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 pb-4">
          <p className="text-[0.7rem] font-medium tracking-[0.24em] text-zinc-500 uppercase">
            Operations Dashboard
          </p>
          <span className="text-sm text-zinc-100">No multisigs loaded.</span>
          <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
          <span className="text-sm text-zinc-500">
            {connected ? "Wallet connected" : "Wallet disconnected"}
          </span>
          <div className="ml-auto">
            <RegistryManagementDialog />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-400">
          <CircleAlert className="h-4 w-4 shrink-0 text-zinc-500" />
          Connect a wallet, then create or import a multisig to start the
          dashboard.
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-[calc(100svh-6.5rem)] min-h-[calc(100svh-6.5rem)] flex-col gap-4">
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-[0.72rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">
              Operations
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(1.5rem,2.4vw,2.35rem)] font-semibold tracking-[-0.05em] text-zinc-50">
                Signature queue
              </h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-medium tracking-[0.16em] uppercase",
                  connected
                    ? "border-lime-500/30 bg-lime-500/10 text-lime-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300"
                )}
              >
                {connected ? "Signer ready" : "Wallet offline"}
              </span>
            </div>
            <p className="max-w-[54rem] text-sm leading-6 text-zinc-400">
              Review signer readiness, execution eligibility, and proposal state
              across the active multisig scope in one work surface.
            </p>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>

      <div className="flex-1">
        <div className="grid h-full gap-4 xl:grid-cols-[minmax(13.5rem,0.68fr)_minmax(16rem,0.9fr)_minmax(0,1.5fr)]">
          <aside className="h-full space-y-4 border-r border-zinc-800 pr-4">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <p className="text-[0.68rem] tracking-[0.2em] text-zinc-500 uppercase">
                  Registry
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Explorer-style scope control for queue work.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RegistryManagementDialog compact />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void loadForAllMultisigs(multisigs)}
                  disabled={loading}
                  className="rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                  aria-label="Refresh dashboard proposals"
                  title="Refresh dashboard proposals"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Input
              placeholder="Search multisigs"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="h-9 border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600"
              aria-label="Search multisigs"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                  Explorer
                </p>
                <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950/70 p-1">
                  {explorerSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() =>
                        setExplorerMode(section.id as WorkspaceExplorerMode)
                      }
                      className={cn(
                        "rounded-sm px-2 py-1 text-[0.62rem] tracking-[0.16em] uppercase transition-colors",
                        explorerMode === section.id
                          ? "bg-zinc-100 text-zinc-950"
                          : "text-zinc-500 hover:text-zinc-200"
                      )}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {visibleExplorerSection ? (
                  <div className="space-y-1.5">
                    <div className="space-y-0.5">
                      {visibleExplorerSection.views.map((view) => {
                        const selected =
                          view.id === activeViewKey &&
                          selectedRegistryKeys.length === 0;
                        const expanded = expandedViewKeys.includes(view.id);
                        const viewItems = registryItems.filter((item) =>
                          view.multisigKeys.includes(item.multisig.key)
                        );

                        return (
                          <div key={view.id} className="space-y-0.5">
                            <div
                              className={cn(
                                "group flex items-center gap-1 rounded-md border border-transparent pr-2 pl-0.5 transition-colors",
                                selected && "border-lime-500/20 bg-lime-500/8"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => toggleViewExpansion(view.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                                aria-label={
                                  expanded
                                    ? `Collapse ${view.label}`
                                    : `Expand ${view.label}`
                                }
                                title={
                                  expanded
                                    ? `Collapse ${view.label}`
                                    : `Expand ${view.label}`
                                }
                              >
                                {expanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleViewExpansion(view.id)}
                                className={cn(
                                  "min-w-0 flex-1 rounded-sm py-1 text-left transition-colors hover:text-zinc-50",
                                  selected ? "text-zinc-50" : "text-zinc-300"
                                )}
                                aria-label={
                                  expanded
                                    ? `Collapse ${view.label}`
                                    : `Expand ${view.label}`
                                }
                                title={
                                  expanded
                                    ? `Collapse ${view.label}`
                                    : `Expand ${view.label}`
                                }
                              >
                                <span className="truncate text-sm">
                                  {view.label}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewSelect(view.id)}
                                className={cn(
                                  "shrink-0 rounded-sm px-1.5 py-1 font-mono text-[0.66rem] tabular-nums transition-colors",
                                  selected
                                    ? "bg-lime-500/12 text-lime-200"
                                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                                )}
                                aria-label={`Select ${view.label} scope`}
                                title={`Select ${view.label} scope`}
                              >
                                {view.multisigKeys.length}
                              </button>
                            </div>

                            {expanded ? (
                              <div className="ml-3 space-y-0.5 border-l border-zinc-800 pl-2.5">
                                {viewItems.map((item) => {
                                  const multisigKey = item.multisig.key;
                                  const itemSelected =
                                    selectedRegistryKeySet.has(multisigKey);

                                  return (
                                    <button
                                      key={multisigKey}
                                      type="button"
                                      onClick={(event) =>
                                        handleRegistrySelect(multisigKey, event)
                                      }
                                      className={cn(
                                        "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left transition-colors",
                                        itemSelected
                                          ? "bg-lime-500/10 text-zinc-50"
                                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                                      )}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="truncate text-[0.83rem] font-medium">
                                            {item.multisig.label ||
                                              "Unnamed multisig"}
                                          </p>
                                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[0.58rem] tracking-[0.16em] text-cyan-300 uppercase">
                                            {item.multisig.chainName}
                                          </span>
                                          <span className="font-mono text-[0.62rem] text-zinc-600 tabular-nums">
                                            {item.multisig.threshold}/
                                            {item.multisig.members.length}
                                          </span>
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-2 text-[0.62rem] text-zinc-500">
                                          <span className="font-mono tabular-nums">
                                            {formatCompactAddress(multisigKey)}
                                          </span>
                                          <span>{item.active} active</span>
                                        </div>
                                      </div>
                                      <div className="shrink-0 text-right">
                                        <p className="font-mono text-[0.62rem] text-zinc-600 tabular-nums">
                                          {item.waiting} wait
                                        </p>
                                        <p className="font-mono text-[0.62rem] text-zinc-600 tabular-nums">
                                          {item.executable} exec
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <div className="h-full space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <p className="text-[0.68rem] tracking-[0.2em] text-zinc-500 uppercase">
                  Priority Queue
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {waitingOnYouCount} waiting on you · {executableCount}{" "}
                  executable ·{" "}
                  {selectedRegistryKeys.length > 1
                    ? `${selectedRegistryKeys.length} selected multisigs`
                    : primarySelectedRegistryKey
                      ? registryItems.find(
                          (item) =>
                            item.multisig.key === primarySelectedRegistryKey
                        )?.multisig.label || "Selected multisig"
                      : activeView?.label || "All multisigs"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "waiting", "executable"] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={queueFilter === filter ? "default" : "outline"}
                    className={cn(
                      "h-9 rounded-md px-3 text-[0.68rem] tracking-[0.12em] uppercase",
                      queueFilter === filter
                        ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                        : "border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900"
                    )}
                    onClick={() => setQueueFilter(filter)}
                  >
                    {filter === "all"
                      ? "All"
                      : filter === "waiting"
                        ? "Waiting"
                        : "Executable"}
                  </Button>
                ))}
              </div>
            </div>

            {loading ? (
              <ProposalCardSkeletonList />
            ) : filteredQueueItems.length === 0 ? (
              <div className="border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-400">
                No proposals match the current scope.
              </div>
            ) : (
              <div className="overflow-hidden border border-zinc-800 bg-zinc-950/55">
                {pagination.pageItems.map((item, index) => {
                  const isFocused = item.focusKey === focusedProposalKey;

                  return (
                    <button
                      key={item.focusKey}
                      type="button"
                      onClick={() => setFocusedProposalKey(item.focusKey)}
                      className={cn(
                        "flex w-full flex-col gap-1.5 border-b border-zinc-800 px-3 py-2.5 text-left transition-colors last:border-b-0",
                        isFocused ? "bg-lime-400/8" : "hover:bg-zinc-900/80"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[0.66rem] tracking-[0.16em] text-zinc-500 uppercase">
                              {String(
                                pagination.startIndex + index + 1
                              ).padStart(2, "0")}
                            </span>
                            <span className="text-sm font-medium text-zinc-100">
                              {item.multisig.label || "Unnamed multisig"}
                            </span>
                            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[0.58rem] tracking-[0.16em] text-cyan-300 uppercase">
                              {item.multisig.chainName}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem]">
                            <span className="text-zinc-400">
                              Proposal #
                              {item.proposal.transactionIndex.toString()}
                            </span>
                            <span
                              className={cn("font-medium", getStatusTone(item))}
                            >
                              {item.lineLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-start gap-3">
                          <div className="space-y-0.5 pt-1.5 text-right text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                            <p>
                              {item.approvalCount}/{item.multisig.threshold}{" "}
                              signed
                            </p>
                            <p>{item.proposal.rejections.length} rejected</p>
                          </div>
                          <ArrowRight
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              isFocused ? "text-lime-300" : "text-zinc-600"
                            )}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.goToPage}
              canGoNext={pagination.canGoNext}
              canGoPrevious={pagination.canGoPrevious}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              totalItems={filteredQueueItems.length}
            />
          </div>

          <div className="h-full overflow-hidden border border-zinc-800 bg-zinc-950/82 xl:ml-1">
            {!focusedItem ? (
              <div className="flex h-full min-h-full items-start px-4 py-10 text-sm text-zinc-400">
                No proposal available for the current scope.
              </div>
            ) : (
              <div className="space-y-5 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-950">
                        {focusedItem.proposal.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-md border-zinc-700 bg-transparent px-2.5 py-1 text-zinc-300"
                      >
                        {focusedItem.multisig.chainName}
                      </Badge>
                      {focusedItem.currentUserApproved ? (
                        <Badge
                          variant="outline"
                          className="rounded-md border-lime-500/30 bg-lime-500/10 px-2.5 py-1 text-lime-200"
                        >
                          You signed
                        </Badge>
                      ) : null}
                      {focusedItem.currentUserRejected ? (
                        <Badge
                          variant="outline"
                          className="rounded-md border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-200"
                        >
                          You rejected
                        </Badge>
                      ) : null}
                    </div>
                    <div>
                      <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-zinc-50">
                        {focusedItem.multisig.label || "Unnamed multisig"} · #
                        {focusedItem.proposal.transactionIndex.toString()}
                      </h2>
                      <div className="mt-2 space-y-2 text-[0.68rem] tracking-[0.14em] text-zinc-500 uppercase">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>Multisig address</span>
                          <AddressWithLabel
                            address={focusedItem.multisig.key}
                            showCopy={false}
                            showLabelButton={false}
                            copyOnClick
                            className="tracking-normal normal-case"
                          />
                        </div>
                        {focusedItem.proposal.creator ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span>Created by</span>
                            <AddressWithLabel
                              address={focusedItem.proposal.creator}
                              showCopy={false}
                              showLabelButton={false}
                              copyOnClick
                              className="tracking-normal normal-case"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(["overview", "payload"] as const).map((tab) => (
                      <Button
                        key={tab}
                        variant="outline"
                        className={cn(
                          "rounded-md border-zinc-800",
                          detailTab === tab
                            ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                            : "bg-transparent text-zinc-300 hover:bg-zinc-900"
                        )}
                        onClick={() => setDetailTab(tab)}
                      >
                        {tab === "overview" ? "Overview" : "Payload"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div
                  className={cn(
                    "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.78fr)]",
                    detailTab === "payload" && "hidden"
                  )}
                >
                  <div
                    className={cn(
                      "space-y-3",
                      detailTab !== "overview" && "hidden"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                      <div>
                        <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                          Signer map
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          Member state at a glance.
                        </p>
                      </div>
                      <ShieldCheck className="h-5 w-5 text-zinc-500" />
                    </div>

                    <div className="divide-y divide-zinc-800 border border-zinc-800">
                      {focusedItem.multisig.members.map((member) => {
                        const memberKey = member.address;
                        const approved =
                          focusedItem.proposal.approvals.includes(memberKey);
                        const rejected =
                          focusedItem.proposal.rejections.includes(memberKey);
                        const isCurrentUser =
                          publicKey?.toString() === memberKey;
                        const memberState = approved
                          ? "Signed"
                          : rejected
                            ? "Rejected"
                            : focusedItem.proposal.status === "Active"
                              ? "Awaiting"
                              : "No action";

                        return (
                          <div
                            key={memberKey}
                            className="flex items-start justify-between gap-3 px-3 py-3"
                          >
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                {isCurrentUser ? (
                                  <Badge
                                    variant="secondary"
                                    className="h-5 rounded-full px-2 text-[0.62rem] tracking-[0.12em] uppercase"
                                  >
                                    You
                                  </Badge>
                                ) : null}
                                <AddressWithLabel
                                  address={memberKey}
                                  className="tracking-normal normal-case"
                                />
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-md px-2.5 py-1",
                                approved &&
                                  "border-lime-500/30 bg-lime-500/10 text-lime-200",
                                rejected &&
                                  "border-red-500/30 bg-red-500/10 text-red-200",
                                !approved &&
                                  !rejected &&
                                  "border-zinc-700 bg-zinc-900 text-zinc-400"
                              )}
                            >
                              {memberState}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "space-y-4 border-t border-zinc-800 pt-4 lg:border-t-0 lg:border-l lg:pl-4",
                      detailTab !== "overview" && "hidden"
                    )}
                  >
                    <div className="space-y-3">
                      <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                        Decision context
                      </p>
                      <div className="space-y-4 text-sm text-zinc-400">
                        <div className="border border-zinc-800 bg-zinc-950/45 p-4">
                          <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="space-y-3">
                              <div className="flex items-end gap-3">
                                <p className="text-5xl font-semibold tracking-[-0.06em] text-zinc-50">
                                  {focusedItem.approvalCount}
                                  <span className="text-zinc-600">
                                    /{focusedItem.multisig.threshold}
                                  </span>
                                </p>
                                <p className="pb-1 text-[0.72rem] tracking-[0.16em] text-zinc-500 uppercase">
                                  Required to execute
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-md px-2.5 py-1",
                                    focusedItem.readyToExecute &&
                                      "border-lime-500/30 bg-lime-500/10 text-lime-200",
                                    !focusedItem.readyToExecute &&
                                      focusedItem.needsYourSignature &&
                                      "border-amber-500/30 bg-amber-500/10 text-amber-200",
                                    !focusedItem.readyToExecute &&
                                      !focusedItem.needsYourSignature &&
                                      focusedItem.proposal.status ===
                                        "Active" &&
                                      "border-zinc-700 bg-zinc-900 text-zinc-300",
                                    focusedItem.proposal.status !== "Active" &&
                                      "border-zinc-700 bg-zinc-900 text-zinc-400"
                                  )}
                                >
                                  {focusedItem.readyToExecute
                                    ? "Ready now"
                                    : focusedItem.needsYourSignature
                                      ? "Waiting on you"
                                      : focusedItem.proposal.status === "Active"
                                        ? "Collecting signatures"
                                        : "Closed"}
                                </Badge>
                              </div>
                            </div>
                            <div className="grid min-w-[11rem] gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                              <div className="border border-zinc-800 bg-zinc-950 px-3 py-2">
                                <p className="text-[0.64rem] tracking-[0.16em] text-zinc-500 uppercase">
                                  Rejections
                                </p>
                                <p className="mt-1 text-lg font-medium text-zinc-100">
                                  {focusedItem.proposal.rejections.length}
                                </p>
                              </div>
                              <div className="border border-zinc-800 bg-zinc-950 px-3 py-2">
                                <p className="text-[0.64rem] tracking-[0.16em] text-zinc-500 uppercase">
                                  Members
                                </p>
                                <p className="mt-1 text-lg font-medium text-zinc-100">
                                  {focusedItem.multisig.members.length}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                          <p>
                            {focusedItem.readyToExecute
                              ? "Threshold is complete. Execution can happen immediately from this workspace."
                              : focusedItem.needsYourSignature
                                ? "This item is blocked on your decision and will change state as soon as you act."
                                : focusedItem.proposal.status === "Active"
                                  ? `${focusedItem.missingApprovals} more signature${focusedItem.missingApprovals === 1 ? "" : "s"} are still required before execution.`
                                  : "This proposal is complete. No further signatures are needed."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4">
                      <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                        Actions
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          className="rounded-md bg-lime-300 text-zinc-950 hover:bg-lime-200"
                          onClick={handleApprove}
                          disabled={
                            !focusedItem.needsYourSignature ||
                            isActionInProgress
                          }
                        >
                          {isApproveLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
                          onClick={handleReject}
                          disabled={
                            !focusedItem.needsYourSignature ||
                            isActionInProgress
                          }
                        >
                          {isRejectLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-md border-zinc-800 bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                          onClick={handleExecute}
                          disabled={
                            !focusedItem.readyToExecute || isActionInProgress
                          }
                        >
                          {isExecuteLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          Execute
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "space-y-4",
                    detailTab !== "payload" && "hidden"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                        Payload
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Transaction PDA, config actions, and decoded instruction
                        data.
                      </p>
                    </div>
                    {focusedPayload?.transactionPda ? (
                      <Button
                        variant="outline"
                        className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            focusedPayload.transactionPda
                          );
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Copy PDA
                      </Button>
                    ) : null}
                  </div>

                  {focusedPayload?.transactionPda ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-3">
                      <p className="text-[0.68rem] tracking-[0.16em] text-zinc-500 uppercase">
                        Transaction PDA
                      </p>
                      <code className="mt-2 block font-mono text-xs break-all text-zinc-300">
                        {focusedPayload.transactionPda}
                      </code>
                    </div>
                  ) : null}

                  {payloadLoading ? (
                    <div className="flex min-h-[14rem] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/55">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                  ) : payloadError ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-400">
                      {payloadError}
                    </div>
                  ) : focusedPayload?.type === "config" ? (
                    <div className="space-y-3">
                      {focusedPayload.actions.map((action, index: number) => {
                        const formatted = formatConfigAction(
                          action as ConfigAction
                        );
                        return (
                          <div
                            key={index}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4"
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-zinc-700 bg-zinc-900 text-zinc-300"
                              >
                                Action {index + 1}
                              </Badge>
                              <span className="text-sm font-semibold text-zinc-100">
                                {formatted.type}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {formatted.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="space-y-1">
                                  <p className="text-xs font-medium text-zinc-500">
                                    {field.label}
                                  </p>
                                  {typeof field.value === "string" ? (
                                    <p className="text-sm break-all text-zinc-200">
                                      {field.value}
                                    </p>
                                  ) : (
                                    field.value
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : focusedPayload?.type === "vault" ? (
                    <div className="space-y-3">
                      {focusedPayload.instructions.map(
                        (instruction, index: number) => {
                          return (
                            <div
                              key={index}
                              className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-4"
                            >
                              <div className="mb-3 space-y-2">
                                <p className="text-sm font-semibold text-zinc-100">
                                  Instruction {index + 1}
                                </p>
                                <AddressWithLabel
                                  address={instruction.programAddress}
                                  showFull
                                  vaultAddress={
                                    focusedPayload.vaultAddress ?? undefined
                                  }
                                />
                              </div>
                              <div className="space-y-3 text-xs text-zinc-400">
                                <div>
                                  <p className="mb-2 text-zinc-500">
                                    Accounts (
                                    {instruction.accountIndexes.length})
                                  </p>
                                  <div className="space-y-1.5">
                                    {instruction.accountIndexes.map(
                                      (accountIndex: number) => (
                                        <div
                                          key={`${index}-${accountIndex}`}
                                          className="flex items-center gap-2"
                                        >
                                          <span className="w-6 shrink-0 font-mono text-zinc-500">
                                            {accountIndex}
                                          </span>
                                          <AddressWithLabel
                                            address={
                                              instruction.accountAddresses[
                                                instruction.accountIndexes.indexOf(
                                                  accountIndex
                                                )
                                              ]
                                            }
                                            vaultAddress={
                                              focusedPayload.vaultAddress ??
                                              undefined
                                            }
                                          />
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="mb-2 text-zinc-500">
                                    Data (base58)
                                  </p>
                                  <code className="block rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono break-all text-zinc-300">
                                    {instruction.data}
                                  </code>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-400">
                      No payload details available for this proposal.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
