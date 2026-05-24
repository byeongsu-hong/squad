"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AddMultisigActions } from "@/components/add-multisig-actions";
import { ManageTagsDialog } from "@/components/manage-tags-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatorMultisigs } from "@/lib/hooks/use-creator-multisigs";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useMultisigAttention } from "@/lib/hooks/use-multisig-attention";
import {
  type RegistrySummaryRow,
  buildRegistrySummaryRowsFromMultisigs,
} from "@/lib/registry/registry-summary";
import { cn } from "@/lib/utils";
import { formatAddress } from "@/lib/utils/format-address";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import { normalizeChainConfig } from "@/types/chain";
import {
  type MultisigAccount,
  getMultisigAccountKey,
  matchesMultisigSelectionKey,
} from "@/types/multisig";

const GRID_COLS = "36px minmax(0,1.5fr) 148px 96px minmax(0,1fr) 90px";

function formatProviderLabel(provider: RegistrySummaryRow["multisigProvider"]) {
  return provider === "safe" ? "Safe" : "Squads";
}

function VaultColumnHeaders() {
  return (
    <div
      className="border-border bg-background grid items-center border-b px-3 py-2"
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <div />
      {["Vault", "Address", "Chain", "Status", ""].map((h, i) => (
        <span
          key={i}
          className="text-muted-foreground/70 text-[10px] font-semibold uppercase tracking-widest"
        >
          {h}
        </span>
      ))}
    </div>
  );
}

function VaultRowSkeleton() {
  return (
    <div
      className="grid items-center px-3 py-2.5"
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <div />
      <div className="space-y-1 pr-2">
        <Skeleton className="h-3 w-28 rounded-sm" />
        <Skeleton className="h-2.5 w-14 rounded-sm" />
      </div>
      <div className="pr-2">
        <Skeleton className="h-3 w-24 rounded-sm" />
      </div>
      <Skeleton className="h-3 w-14 rounded-sm" />
      <Skeleton className="h-3 w-20 rounded-sm" />
      <div className="flex justify-end gap-1">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
    </div>
  );
}

export function MultisigList() {
  const router = useRouter();
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(
    new Set()
  );
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedMultisigForTags, setSelectedMultisigForTags] =
    useState<MultisigAccount | null>(null);
  const [filterText, setFilterText] = useState("");
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

  const { publicKey } = useWalletStore();
  const { getSelectedChain, chains } = useChainStore();
  const {
    multisigs,
    setMultisigs,
    deleteMultisig,
    updateMultisigLabel,
    selectMultisig,
    selectedMultisigKey,
  } = useMultisigStore();

  const { loading, loadForCreator, canLoadFromChain } = useCreatorMultisigs({
    chains,
    existingMultisigs: multisigs,
    onLoaded: setMultisigs,
  });

  const attentionByMultisig = useMultisigAttention({
    chains,
    multisigs,
    viewerAddress: publicKey?.toString() ?? null,
  });

  const multisigByKey = useMemo(
    () =>
      new Map(
        multisigs.map((multisig) => [getMultisigAccountKey(multisig), multisig])
      ),
    [multisigs]
  );

  const loadMultisigs = useCallback(async () => {
    const chain = getSelectedChain();
    if (!canLoadFromChain(chain?.id)) return;
    await loadForCreator(chain?.id, publicKey?.toString() ?? null);
  }, [canLoadFromChain, getSelectedChain, loadForCreator, publicKey]);

  useEffect(() => {
    const chain = getSelectedChain();
    if (!publicKey || !canLoadFromChain(chain?.id)) return;
    void loadMultisigs();
  }, [canLoadFromChain, getSelectedChain, loadMultisigs, publicKey]);

  const toggleSelect = (key: string) => {
    setSelectedForDeletion((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForDeletion.size === multisigs.length) {
      setSelectedForDeletion(new Set());
    } else {
      setSelectedForDeletion(
        new Set(multisigs.map((m) => getMultisigAccountKey(m)))
      );
    }
  };

  const handleDeleteSelected = () => {
    if (selectedForDeletion.size === 0) return;
    if (
      confirm(
        `Are you sure you want to remove ${selectedForDeletion.size} multisig(s) from your list?`
      )
    ) {
      selectedForDeletion.forEach((key) => {
        const multisig = multisigByKey.get(key);
        if (!multisig) return;
        deleteMultisig(multisig.publicKey.toString(), multisig.chainId);
      });
      setSelectedForDeletion(new Set());
      toast.success(`${selectedForDeletion.size} multisig(s) removed`);
    }
  };

  const handleStartEditLabel = (key: string, currentLabel?: string) => {
    setEditingLabel(key);
    setLabelInput(currentLabel || "");
  };

  const handleSaveLabel = (multisig: MultisigAccount) => {
    updateMultisigLabel(
      multisig.publicKey.toString(),
      labelInput.trim(),
      multisig.chainId
    );
    setEditingLabel(null);
    setLabelInput("");
    if (labelInput.trim()) toast.success("Label updated");
  };

  const handleCancelEdit = () => {
    setEditingLabel(null);
    setLabelInput("");
  };

  const handleOpenTagDialog = (multisig: MultisigAccount) => {
    setSelectedMultisigForTags(multisig);
    setTagDialogOpen(true);
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    multisigs.forEach((m) => m.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [multisigs]);

  const debouncedFilterText = useDebounce(filterText, 300);

  const registryRows = useMemo<RegistrySummaryRow[]>(
    () =>
      buildRegistrySummaryRowsFromMultisigs({
        multisigs,
        chains,
        attentionByMultisig,
        searchNeedle: debouncedFilterText,
      }),
    [attentionByMultisig, chains, debouncedFilterText, multisigs]
  );

  const filteredRegistryRows = useMemo(
    () =>
      registryRows.filter(
        (row) =>
          selectedFilterTags.length === 0 ||
          selectedFilterTags.some((tag) => row.tags.includes(tag))
      ),
    [registryRows, selectedFilterTags]
  );

  const toggleFilterTag = (tag: string) => {
    setSelectedFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const hasMultisigs = multisigs.length > 0;
  const selectedChain = getSelectedChain();
  const normalizedSelectedChain = selectedChain
    ? normalizeChainConfig(selectedChain)
    : null;
  const canSyncSelectedChain = canLoadFromChain(selectedChain?.id);

  const handleOpenDesk = (multisig: MultisigAccount) => {
    const multisigKey = getMultisigAccountKey(multisig);
    selectMultisig(multisigKey);
    router.push(`/vaults/${encodeURIComponent(multisigKey)}`);
  };

  const getMultisigForRow = (row: RegistrySummaryRow) =>
    multisigByKey.get(row.key);

  return (
    <div className="space-y-3">
      {/* Primary header: title + search + add */}
      <div className="border-border flex items-center gap-2 border-b pb-4">
        <h1 className="text-foreground mr-2 text-2xl font-bold tracking-[-0.02em]">
          Vaults
        </h1>
        <input
          placeholder="Search multisigs..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 h-9 flex-1 rounded-md border px-3 text-sm focus:outline-none sm:flex-none sm:w-[220px]"
          aria-label="Search multisigs"
        />
        {publicKey && canSyncSelectedChain ? (
          <button
            type="button"
            onClick={loadMultisigs}
            disabled={loading}
            className="border-border text-foreground/80 hover:bg-muted inline-flex h-9 items-center rounded-md border bg-transparent px-3 transition-colors disabled:opacity-50"
            aria-label="Refresh multisigs"
            title={`Creator sync on ${normalizedSelectedChain?.name ?? "selected chain"}`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        ) : null}
        <div className="ml-auto">
          <AddMultisigActions />
        </div>
      </div>

      {/* Secondary toolbar: bulk actions + tag filters (only when data exists) */}
      {(hasMultisigs || allTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {hasMultisigs && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="border-border text-foreground/80 hover:bg-muted inline-flex h-8 items-center rounded-md border bg-transparent px-3 text-sm transition-colors"
            >
              {selectedForDeletion.size === multisigs.length
                ? "Deselect all"
                : "Select all"}
            </button>
          )}
          {selectedForDeletion.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm text-white transition-colors hover:bg-destructive/90"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove ({selectedForDeletion.size})
            </button>
          )}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const isActive = selectedFilterTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFilterTag(tag)}
                    className={cn(
                      "cursor-pointer rounded-full px-2.5 py-0.5 text-xs transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
          {hasMultisigs && filteredRegistryRows.length < multisigs.length && (
            <span className="text-muted-foreground/70 ml-auto text-sm">
              {filteredRegistryRows.length} / {multisigs.length}
            </span>
          )}
        </div>
      )}

      {!hasMultisigs && !loading && (
        <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
          <div className="bg-card border-border flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm">
            <Shield className="text-muted-foreground/50 h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-foreground text-base font-semibold">
              No vaults yet
            </p>
            <p className="text-muted-foreground text-sm">
              {publicKey
                ? "No multisigs found. Use Add Multisig to create or import one."
                : "Connect a wallet or use Add Multisig to import an existing one."}
            </p>
          </div>
        </div>
      )}

      {filteredRegistryRows.length === 0 &&
        multisigs.length > 0 &&
        !loading && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground/60 text-sm">
              No vaults match the current filters.
            </p>
          </div>
        )}

      {/* Loading skeleton — table-shaped */}
      {loading && (
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          <VaultColumnHeaders />
          <div className="divide-border/50 divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <VaultRowSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Vault table */}
      {!loading && hasMultisigs && filteredRegistryRows.length > 0 && (
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          <VaultColumnHeaders />
          <div className="divide-border/50 divide-y">
            {filteredRegistryRows.map((row) => {
              const multisig = getMultisigForRow(row);
              if (!multisig) return null;

              const isSelected = selectedForDeletion.has(row.key);
              const isActiveDesk = matchesMultisigSelectionKey(
                multisig,
                selectedMultisigKey
              );
              const isEditing = editingLabel === row.key;

              return (
                <div
                  key={row.key}
                  className={cn(
                    "grid cursor-pointer items-center px-3 py-2.5 transition-colors",
                    isSelected ? "bg-primary/8" : "hover:bg-muted"
                  )}
                  style={{ gridTemplateColumns: GRID_COLS }}
                  onClick={() => handleOpenDesk(multisig)}
                >
                  {/* Checkbox */}
                  <div
                    className="flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(row.key);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(row.key)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 cursor-pointer accent-amber-600"
                      aria-label={`Select ${row.label || "unnamed multisig"}`}
                    />
                  </div>

                  {/* Name + provider */}
                  <div
                    className="min-w-0 pr-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEditing ? (
                      <input
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveLabel(multisig);
                          else if (e.key === "Escape") handleCancelEdit();
                        }}
                        onBlur={() => handleSaveLabel(multisig)}
                        placeholder="Enter label"
                        className="border-border bg-muted text-foreground h-6 w-40 rounded border px-2 text-sm focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="text-foreground truncate text-[13px] font-medium">
                          {row.label}
                        </p>
                        {isActiveDesk && (
                          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium">
                            Active
                          </span>
                        )}
                        <button
                          type="button"
                          className="text-muted-foreground/30 hover:text-foreground shrink-0 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditLabel(
                              getMultisigAccountKey(multisig),
                              multisig.label
                            );
                          }}
                          aria-label={`Edit label for ${row.label}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-muted-foreground/60 truncate text-[10px]">
                      {formatProviderLabel(row.multisigProvider)} ·{" "}
                      {row.threshold}/{row.memberCount}
                    </p>
                  </div>

                  {/* Address */}
                  <div
                    className="flex min-w-0 items-center gap-1 pr-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-muted-foreground/70 truncate font-mono text-[11px]">
                      {formatAddress(multisig.publicKey.toString(), 6, 6)}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground/30 hover:text-foreground shrink-0 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(
                          multisig.publicKey.toString()
                        );
                        toast.success("Address copied");
                      }}
                      aria-label={`Copy address for ${row.label}`}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Chain */}
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {row.chainName}
                  </span>

                  {/* Status / attention */}
                  <div className="min-w-0 pr-2">
                    {row.attentionLine ? (
                      row.waiting > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                          <span className="truncate text-xs text-amber-600 dark:text-amber-400">
                            {row.attentionLine}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="text-muted-foreground/30 h-3 w-3 shrink-0" />
                          <span className="text-muted-foreground/50 truncate text-xs">
                            {row.attentionLine}
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">
                        —
                      </span>
                    )}
                    {row.tags.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {row.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "rounded-full px-1.5 py-0 text-[9px]",
                              selectedFilterTags.includes(tag)
                                ? "bg-primary/15 text-primary font-medium"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                        {row.tags.length > 2 && (
                          <span className="text-muted-foreground/40 text-[9px]">
                            +{row.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="text-muted-foreground/50 hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                      onClick={() => handleOpenTagDialog(multisig)}
                      title="Manage tags"
                    >
                      <Tag className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-7 items-center rounded-md px-2.5 text-xs transition-colors",
                        row.waiting > 0
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border-border bg-transparent text-foreground/80 hover:bg-muted border"
                      )}
                      onClick={() => handleOpenDesk(multisig)}
                    >
                      Open
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ManageTagsDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        multisig={selectedMultisigForTags}
      />
    </div>
  );
}
