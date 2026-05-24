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
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ManageTagsDialog } from "@/components/manage-tags-dialog";
import { VaultListSkeletonList } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    if (!canLoadFromChain(chain?.id)) {
      return;
    }
    await loadForCreator(chain?.id, publicKey?.toString() ?? null);
  }, [canLoadFromChain, getSelectedChain, loadForCreator, publicKey]);

  useEffect(() => {
    const chain = getSelectedChain();
    if (!publicKey || !canLoadFromChain(chain?.id)) {
      return;
    }

    void loadMultisigs();
  }, [canLoadFromChain, getSelectedChain, loadMultisigs, publicKey]);

  const toggleSelect = (key: string) => {
    setSelectedForDeletion((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForDeletion.size === multisigs.length) {
      setSelectedForDeletion(new Set());
    } else {
      setSelectedForDeletion(
        new Set(multisigs.map((multisig) => getMultisigAccountKey(multisig)))
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
    if (labelInput.trim()) {
      toast.success("Label updated");
    }
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
    multisigs.forEach((m) => {
      m.tags?.forEach((tag) => tagSet.add(tag));
    });
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

  const filteredRegistryRows = useMemo(() => {
    return registryRows.filter((row) => {
      return (
        selectedFilterTags.length === 0 ||
        selectedFilterTags.some((tag) => row.tags.includes(tag))
      );
    });
  }, [registryRows, selectedFilterTags]);

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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search multisigs..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="border-border bg-card text-foreground placeholder:text-muted-foreground/70 w-full sm:w-[280px]"
          aria-label="Search multisigs"
        />
        {publicKey && canSyncSelectedChain ? (
          <Button
            variant="outline"
            size="sm"
            onClick={loadMultisigs}
            disabled={loading}
            className="border-border text-foreground/80 hover:bg-muted bg-transparent"
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
        {hasMultisigs && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="border-border text-foreground/80 hover:bg-muted bg-transparent"
          >
            {selectedForDeletion.size === multisigs.length
              ? "Deselect all"
              : "Select all"}
          </Button>
        )}
        {selectedForDeletion.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove ({selectedForDeletion.size})
          </Button>
        )}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const selected = selectedFilterTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleFilterTag(tag)}
                  className={cn(
                    "cursor-pointer rounded-full px-2.5 py-0.5 text-xs transition-colors",
                    selected
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
        <span className="text-muted-foreground/70 ml-auto text-sm">
          {hasMultisigs
            ? `${filteredRegistryRows.length} / ${multisigs.length}`
            : ""}
        </span>
      </div>

      {/* Empty states */}
      {!hasMultisigs && !loading && (
        <div className="border-border text-muted-foreground flex items-center gap-3 rounded-xl border border-dashed px-5 py-8 text-sm">
          <Users className="text-muted-foreground/50 h-4 w-4 shrink-0" />
          {publicKey
            ? "No multisigs found. Use Add Multisig to create or import one."
            : "Connect a wallet or use Add Multisig to import an existing one."}
        </div>
      )}

      {filteredRegistryRows.length === 0 &&
        multisigs.length > 0 &&
        !loading && (
          <div className="border-border text-muted-foreground rounded-xl border border-dashed px-5 py-8 text-sm">
            No multisigs match the current filters.
          </div>
        )}

      {/* Loading skeleton */}
      {loading && <VaultListSkeletonList />}

      {/* Vault card list */}
      {!loading && hasMultisigs && filteredRegistryRows.length > 0 && (
        <div className="space-y-2">
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
                  "border-border rounded-xl border transition-colors",
                  isSelected
                    ? "bg-muted/60"
                    : isActiveDesk
                      ? "bg-card"
                      : "bg-card hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Checkbox */}
                  <div className="mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(row.key);
                      }}
                      className="h-4 w-4 cursor-pointer accent-amber-600"
                      aria-label={`Select ${row.label || "unnamed multisig"}`}
                    />
                  </div>

                  {/* Main content */}
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Name + badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
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
                            className="border-border bg-muted text-foreground h-7 w-48 text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="text-foreground truncate text-sm font-semibold">
                              {row.label}
                            </span>
                            {isActiveDesk && (
                              <span className="shrink-0 rounded-full bg-lime-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-lime-600 dark:text-lime-300">
                                Selected
                              </span>
                            )}
                            <button
                              type="button"
                              className="text-muted-foreground/50 hover:text-foreground shrink-0 transition-colors"
                              onClick={() =>
                                handleStartEditLabel(
                                  getMultisigAccountKey(multisig),
                                  multisig.label
                                )
                              }
                              aria-label={`Edit label for ${row.label}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Chain + provider badges */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                          {row.chainName}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs",
                            row.multisigProvider === "safe"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {formatProviderLabel(row.multisigProvider)}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Address + copy */}
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-muted-foreground/70 font-mono text-xs">
                        {formatAddress(multisig.publicKey.toString(), 8, 8)}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground/50 hover:text-foreground shrink-0 transition-colors"
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
                      <span className="text-muted-foreground/40 text-xs">
                        ·
                      </span>
                      <span className="text-muted-foreground/70 text-xs">
                        {row.threshold}/{row.memberCount} threshold &middot;{" "}
                        {row.memberCount} signers
                      </span>
                    </div>

                    {/* Row 3: Attention line */}
                    {row.attentionLine && (
                      <div className="mt-1.5 flex items-center gap-1">
                        {row.waiting > 0 ? (
                          <>
                            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500 dark:text-amber-400" />
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              {row.attentionLine}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="text-muted-foreground/40 h-3 w-3 shrink-0" />
                            <span className="text-muted-foreground/60 text-xs">
                              {row.attentionLine}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Row 4: Tags + action buttons */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {/* Tag pills */}
                      <div className="flex flex-wrap items-center gap-1">
                        {row.tags.length > 0 ? (
                          row.tags.map((tag) => {
                            const isFilterActive =
                              selectedFilterTags.includes(tag);
                            return (
                              <span
                                key={tag}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs",
                                  isFilterActive
                                    ? "bg-primary/15 text-primary font-medium"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {tag}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground/40 text-xs italic">
                            no tags
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground/70 hover:text-foreground h-7 px-2 text-xs"
                          onClick={() => handleOpenTagDialog(multisig)}
                        >
                          <Tag className="mr-1 h-3 w-3" />
                          Tags
                        </Button>
                        <Button
                          size="sm"
                          className={cn(
                            "h-7 px-3 text-xs",
                            row.waiting > 0
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "border-border bg-transparent text-foreground/80 hover:bg-muted border"
                          )}
                          onClick={() => handleOpenDesk(multisig)}
                        >
                          Open
                          <ArrowUpRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
