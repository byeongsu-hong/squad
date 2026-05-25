"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  Shield,
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

const GRID_COLS = "36px minmax(0,2fr) 96px minmax(0,1fr) 56px";

function formatProviderLabel(provider: RegistrySummaryRow["multisigProvider"]) {
  return provider === "safe" ? "Safe" : "Squads";
}

function VaultColumnHeaders({
  selectable = false,
  allSelected = false,
  onToggleAll,
}: {
  selectable?: boolean;
  allSelected?: boolean;
  onToggleAll?: () => void;
}) {
  return (
    <div
      className="border-border bg-muted grid items-center border-b px-3 py-2"
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <div className="flex items-center justify-center">
        {selectable && (
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleAll}
            className="size-3.5"
            aria-label="Select all"
          />
        )}
      </div>
      {["Vault", "Chain", "Status", ""].map((h, i) => (
        <span
          key={i}
          className="text-muted-foreground/40 text-[11px] font-medium"
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
        <Skeleton className="h-2.5 w-36 rounded-sm" />
      </div>
      <Skeleton className="h-3 w-14 rounded-sm" />
      <Skeleton className="h-3 w-20 rounded-sm" />
      <div className="flex justify-end">
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

export function MultisigList({ splitPane = false }: { splitPane?: boolean }) {
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
    toast.success(`${count} multisig${count !== 1 ? "s" : ""} removed`);
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
    if (!splitPane) {
      router.push(`/vaults/${encodeURIComponent(multisigKey)}`);
    }
  };

  const getMultisigForRow = (row: RegistrySummaryRow) =>
    multisigByKey.get(row.key);

  return (
    <div className="space-y-3">
      <div className="border-border flex items-center gap-2 border-b pb-4">
        <Input
          placeholder="Search vaults..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="h-9 flex-1"
          aria-label="Search vaults"
        />
        {publicKey && canSyncSelectedChain ? (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={loadMultisigs}
            disabled={loading}
            aria-label="Refresh multisigs"
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

      {/* Secondary toolbar: bulk actions + tag filters (only when data exists) */}
      {(selectedForDeletion.size > 0 || allTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
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
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const isActive = selectedFilterTags.includes(tag);
                return (
                  <Button
                    key={tag}
                    size="sm"
                    variant={isActive ? undefined : "outline"}
                    onClick={() => toggleFilterTag(tag)}
                    className={cn(
                      "h-6 rounded-full px-2.5 text-xs",
                      isActive && "bg-primary/15 text-primary hover:bg-primary/20 border-primary/20 font-medium"
                    )}
                  >
                    {tag}
                  </Button>
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
            <Shield className="text-muted-foreground/60 h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-foreground text-base font-semibold">No vaults yet</p>
            <p className="text-muted-foreground/60 text-sm">
              {publicKey ? "Import or create a vault to get started." : "Connect a wallet to get started."}
            </p>
          </div>
          <AddMultisigActions />
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
          <VaultColumnHeaders
            selectable
            allSelected={selectedForDeletion.size === multisigs.length && multisigs.length > 0}
            onToggleAll={toggleSelectAll}
          />
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
                    "group grid cursor-pointer items-center px-3 py-2.5 transition-colors",
                    isSelected
                      ? "bg-primary/8"
                      : isActiveDesk
                        ? "bg-primary/5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.5)]"
                        : row.waiting > 0
                          ? "hover:bg-primary/5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.25)]"
                          : row.executable > 0
                            ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/20 [box-shadow:inset_2px_0_0_rgba(5,150,105,0.25)]"
                            : "hover:bg-muted"
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
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(row.key)}
                      onClick={(e) => e.stopPropagation()}
                      className="size-3.5"
                      aria-label={`Select ${row.label || "unnamed multisig"}`}
                    />
                  </div>

                  {/* Name + provider + address */}
                  <div
                    className="min-w-0 pr-3"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                        className="h-6 w-40 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="text-foreground truncate text-[13px] font-medium">
                          {row.label}
                        </p>
                        <Button
                          variant="ghost"
                          className="h-6 w-6 shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-transparent"
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
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-muted-foreground/60 shrink-0 text-[10px]">
                        {formatProviderLabel(row.multisigProvider)} · {row.threshold}/{row.memberCount}
                      </p>
                      <span className="text-muted-foreground/25 text-[10px]">·</span>
                      <span className="text-muted-foreground/45 truncate font-mono text-[10px]">
                        {formatAddress(multisig.publicKey.toString(), 5, 4)}
                      </span>
                      <Button
                        variant="ghost"
                        className="h-4 w-4 shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-muted-foreground hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(multisig.publicKey.toString());
                          toast.success("Address copied");
                        }}
                        aria-label={`Copy address for ${row.label}`}
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                      {row.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0 text-[9px]",
                            selectedFilterTags.includes(tag)
                              ? "bg-primary/15 text-primary font-medium"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                      {row.tags.length > 2 && (
                        <span className="text-muted-foreground/40 shrink-0 text-[9px]">+{row.tags.length - 2}</span>
                      )}
                    </div>
                  </div>

                  {/* Chain */}
                  <span className="text-muted-foreground/60 font-mono text-[11px]">
                    {row.chainName}
                  </span>

                  {/* Status / attention */}
                  <div className="min-w-0 pr-2">
                    {row.attentionLine ? (
                      row.waiting > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="text-primary/80 h-3 w-3 shrink-0" />
                          <span className="text-primary truncate text-xs">
                            {row.attentionLine}
                          </span>
                        </div>
                      ) : row.executable > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                          <span className="truncate text-xs text-emerald-700 dark:text-emerald-400">
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
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/30" />
                        <span className="text-muted-foreground/30 text-xs">Watching</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center justify-end gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50"
                      onClick={() => handleOpenTagDialog(multisig)}
                      title="Manage tags"
                    >
                      <Tag className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        "h-7 w-7 transition-all",
                        isActiveDesk
                          ? "text-primary"
                          : row.waiting > 0
                            ? "text-primary/70"
                            : row.executable > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground/30 opacity-0 group-hover:opacity-100"
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
        </div>
      )}

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
    </div>
  );
}
