"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  Shield,
  Zap,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AddMultisigActions } from "@/components/add-multisig-actions";
import { ManageTagsDialog } from "@/components/manage-tags-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

function formatProviderLabel(provider: RegistrySummaryRow["multisigProvider"]) {
  return provider === "safe" ? "Safe" : "Squads";
}

function VaultRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-28 rounded-sm" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-14 rounded" />
          <Skeleton className="h-2.5 w-24 rounded-sm" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Skeleton className="h-3 w-20 rounded-sm" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

export function MultisigList({ selectedKey }: { selectedKey?: string }) {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [singleDeleteKey, setSingleDeleteKey] = useState<string | null>(null);

  const { publicKey } = useWalletStore();
  const { getSelectedChain, chains } = useChainStore();
  const {
    multisigs,
    setMultisigs,
    deleteMultisig,
    updateMultisigLabel,
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
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    const count = selectedForDeletion.size;
    selectedForDeletion.forEach((key) => {
      const multisig = multisigByKey.get(key);
      if (!multisig) return;
      deleteMultisig(multisig.publicKey.toString(), multisig.chainId);
    });
    setSelectedForDeletion(new Set());
    setDeleteDialogOpen(false);
    toast.success(`${count} vault${count !== 1 ? "s" : ""} removed`);
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

  const handleSingleDelete = (key: string) => {
    const multisig = multisigByKey.get(key);
    if (!multisig) return;
    deleteMultisig(multisig.publicKey.toString(), multisig.chainId);
    setSingleDeleteKey(null);
    toast.success("Vault removed");
  };

  const handleOpenDesk = (multisig: MultisigAccount) => {
    const multisigKey = getMultisigAccountKey(multisig);
    router.push(`/vaults/${encodeURIComponent(multisigKey)}`);
  };

  const getMultisigForRow = (row: RegistrySummaryRow) =>
    multisigByKey.get(row.key);

  return (
    <div>
      {/* Single unified card: toolbar header + vault rows */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">

        {/* Toolbar — card header */}
        <div className="border-border border-b">
          {/* Row 1: search + actions */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Input
              placeholder="Search vaults..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-8 min-w-0 flex-1"
              aria-label="Search vaults"
            />
            {selectedForDeletion.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove ({selectedForDeletion.size})
              </Button>
            )}
            {hasMultisigs && filteredRegistryRows.length < multisigs.length && (
              <span className="text-muted-foreground/50 shrink-0 font-mono text-[11px] tabular-nums">
                {filteredRegistryRows.length} / {multisigs.length}
              </span>
            )}
            {publicKey && canSyncSelectedChain ? (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={loadMultisigs}
                disabled={loading}
                aria-label="Refresh vaults"
                title={`Creator sync on ${normalizedSelectedChain?.name ?? "selected chain"}`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            ) : null}
            <AddMultisigActions />
          </div>

          {/* Row 2: tag filters (only when tags exist) */}
          {allTags.length > 0 && (
            <div className="border-border bg-muted dark:bg-muted/40 flex items-center gap-1.5 overflow-x-auto border-t px-3 py-2 scrollbar-none">
              {allTags.map((tag) => {
                const isActive = selectedFilterTags.includes(tag);
                return (
                  <Button
                    key={tag}
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleFilterTag(tag)}
                    className={cn(
                      "h-6 shrink-0 rounded-full border px-2.5 text-[11px] transition-colors",
                      isActive
                        ? "border-primary/20 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary font-medium"
                        : "border-border text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {tag}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Body */}
        {!hasMultisigs && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="bg-muted border-border flex h-10 w-10 items-center justify-center rounded-xl border">
              <Shield className="text-muted-foreground/50 h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-foreground text-[14px] font-semibold">No vaults yet</p>
              <p className="text-muted-foreground/60 text-[12px]">
                Add a vault to start monitoring.
              </p>
            </div>
          </div>
        )}

        {filteredRegistryRows.length === 0 && multisigs.length > 0 && !loading && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground/50 text-[12px]">
              No vaults match the current filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedFilterTags([]); setFilterText(""); }}
            >
              Clear filters
            </Button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-border divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <VaultRowSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Vault rows */}
        {!loading && hasMultisigs && filteredRegistryRows.length > 0 && (
          <div className="divide-border divide-y">
            {filteredRegistryRows.map((row) => {
              const multisig = getMultisigForRow(row);
              if (!multisig) return null;

              const isSelected = selectedForDeletion.has(row.key);
              const isActiveDesk = selectedKey != null && matchesMultisigSelectionKey(multisig, selectedKey);
              const isEditing = editingLabel === row.key;

              return (
                <div
                  key={row.key}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors",
                    isSelected
                      ? "bg-primary/8"
                      : isActiveDesk
                      ? "bg-primary/5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.5)]"
                      : row.waiting > 0
                      ? "hover:bg-primary/5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.25)]"
                      : row.executable > 0
                      ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/15 [box-shadow:inset_2px_0_0_rgba(5,150,105,0.25)]"
                      : row.active > 0
                      ? "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 [box-shadow:inset_2px_0_0_rgba(5,150,105,0.15)]"
                      : "hover:bg-muted"
                  )}
                  onClick={() => handleOpenDesk(multisig)}
                >
                  {/* Checkbox — hidden until hover or selection active */}
                  <div
                    className={cn(
                      "shrink-0 transition-opacity",
                      selectedForDeletion.size > 0 || isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(row.key); }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(row.key)}
                      onClick={(e) => e.stopPropagation()}
                      className="size-3.5"
                      aria-label={`Select ${row.label || "unnamed vault"}`}
                    />
                  </div>

                  {/* Vault avatar */}
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                    row.multisigProvider === "squads"
                      ? "bg-primary/10 border-primary/20"
                      : "bg-blue-50 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-700/40"
                  )}>
                    {row.label ? (
                      <span className={cn(
                        "text-[11px] font-semibold leading-none",
                        row.multisigProvider === "squads" ? "text-primary/70" : "text-blue-600 dark:text-blue-400"
                      )}>
                        {row.label.slice(0, 1).toUpperCase()}
                      </span>
                    ) : (
                      <Shield className={cn(
                        "h-3 w-3",
                        row.multisigProvider === "squads" ? "text-primary/70" : "text-blue-600 dark:text-blue-400"
                      )} />
                    )}
                  </div>

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <Input
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveLabel(multisig);
                          else if (e.key === "Escape") handleCancelEdit();
                        }}
                        onBlur={() => handleSaveLabel(multisig)}
                        placeholder="Enter label"
                        className="mb-0.5 h-6 w-40 text-[13px]"
                        autoFocus
                      />
                    ) : (
                      <div className="mb-0.5 flex min-w-0 items-center gap-1.5">
                        <p className={cn(
                          "truncate text-[13px] font-medium leading-tight",
                          multisig.label ? "text-foreground" : "text-muted-foreground/50 italic"
                        )}>
                          {row.label}
                        </p>
                        <Button
                          variant="ghost"
                          className="h-5 w-5 shrink-0 p-0 opacity-0 transition-[opacity,color] group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditLabel(getMultisigAccountKey(multisig), multisig.label);
                          }}
                          aria-label={`Edit label for ${row.label}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="border-border bg-muted/60 text-muted-foreground/60 rounded px-1 py-px text-[10px]">
                        {row.chainName}
                      </span>
                      <span className="text-muted-foreground/50 text-[10px]">
                        {formatProviderLabel(row.multisigProvider)} · {row.threshold}/{row.memberCount}
                      </span>
                      <button
                        type="button"
                        className="group/addr flex items-center gap-0.5 transition-colors text-muted-foreground/50 hover:text-muted-foreground/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(multisig.publicKey.toString());
                          toast.success("Address copied");
                        }}
                        title={multisig.publicKey.toString()}
                      >
                        <span className="font-mono text-[10px]">
                          {formatAddress(multisig.publicKey.toString(), 5, 4)}
                        </span>
                        <Copy className="h-2.5 w-2.5 opacity-0 group-hover/addr:opacity-100 transition-opacity shrink-0" />
                      </button>
                      {row.tags.slice(0, 2).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFilterTag(tag); }}
                          className={cn(
                            "shrink-0 cursor-pointer rounded-full border px-1.5 py-px text-[10px] transition-colors",
                            selectedFilterTags.includes(tag)
                              ? "border-primary/30 bg-primary/10 text-primary font-medium hover:bg-primary/20"
                              : "border-border bg-muted/60 text-muted-foreground/50 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                      {row.tags.length > 2 && (
                        <span className="text-muted-foreground/50 shrink-0 text-[10px]">+{row.tags.length - 2}</span>
                      )}
                    </div>
                  </div>

                  {/* Status / attention */}
                  {row.attentionLine && (
                    <div className="shrink-0">
                      {row.waiting > 0 ? (
                        <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {row.attentionLine}
                        </span>
                      ) : row.executable > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-300/70 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                          <Zap className="h-2.5 w-2.5 fill-current" />
                          {row.attentionLine}
                        </span>
                      ) : row.active > 0 ? (
                        <span className="rounded border border-emerald-200/60 bg-emerald-50/60 px-1.5 py-0.5 text-[10px] text-emerald-600/70 dark:border-emerald-800/30 dark:bg-emerald-950/10 dark:text-emerald-500/60">
                          {row.attentionLine}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Row actions */}
                  <div
                    className="flex shrink-0 items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 opacity-0 transition-[opacity,color] group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8"
                      onClick={() => setSingleDeleteKey(row.key)}
                      title="Remove vault"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 opacity-0 transition-[opacity,color] group-hover:opacity-100 text-muted-foreground/50 hover:text-foreground"
                      onClick={() => handleOpenTagDialog(multisig)}
                      title="Manage tags"
                    >
                      <Tag className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        "h-6 w-6 transition-all",
                        isActiveDesk
                          ? "text-primary"
                          : row.waiting > 0
                          ? "text-primary/80"
                          : row.executable > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : row.active > 0
                          ? "text-emerald-600/50 dark:text-emerald-500/50"
                          : "text-muted-foreground/30 group-hover:text-muted-foreground/50"
                      )}
                      onClick={() => handleOpenDesk(multisig)}
                      aria-label="Open vault"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <ManageTagsDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        multisig={selectedMultisigForTags}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedForDeletion.size} vault{selectedForDeletion.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {selectedForDeletion.size === 1 ? "this vault" : "these vaults"} from your local registry. No on-chain data is affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={singleDeleteKey !== null} onOpenChange={(open) => { if (!open) setSingleDeleteKey(null); }}>
        <AlertDialogContent className="max-w-[28rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove vault?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground/80">
                {singleDeleteKey ? (multisigByKey.get(singleDeleteKey)?.label ?? "This vault") : "This vault"}
              </span>{" "}
              will be removed from your registry. On-chain data is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={() => singleDeleteKey && handleSingleDelete(singleDeleteKey)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
