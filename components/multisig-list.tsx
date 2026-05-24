"use client";

import {
  ArrowUpRight,
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
                <Badge
                  key={tag}
                  variant={selected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-xs",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground bg-transparent"
                  )}
                  onClick={() => toggleFilterTag(tag)}
                >
                  {tag}
                </Badge>
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

      {loading && <VaultListSkeletonList />}

      {!loading && hasMultisigs && filteredRegistryRows.length > 0 && (
        <div className="border-border bg-muted overflow-x-auto rounded-[1.15rem] border">
          <div className="min-w-[980px]">
            <div className="border-border text-muted-foreground/70 grid grid-cols-[2.1rem_minmax(11rem,1.5fr)_minmax(8rem,0.8fr)_minmax(7rem,0.7fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(8rem,0.75fr)] gap-3 border-b px-4 py-3 text-[0.68rem] font-medium tracking-[0.18em] uppercase">
              <span />
              <span>Multisig</span>
              <span>Chain</span>
              <span>Threshold</span>
              <span>Members</span>
              <span>Tags</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredRegistryRows.map((row) => {
              const multisig = getMultisigForRow(row);
              if (!multisig) return null;

              const isSelected = selectedForDeletion.has(row.key);
              const isActiveDesk = matchesMultisigSelectionKey(
                multisig,
                selectedMultisigKey
              );

              return (
                <div
                  key={row.key}
                  className={cn(
                    "border-border grid grid-cols-[2.1rem_minmax(11rem,1.5fr)_minmax(8rem,0.8fr)_minmax(7rem,0.7fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(8rem,0.75fr)] gap-3 border-b px-4 py-4 last:border-b-0",
                    isSelected || isActiveDesk ? "bg-card" : "bg-transparent"
                  )}
                >
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(row.key);
                      }}
                      className="h-4 w-4 cursor-pointer"
                      aria-label={`Select ${row.label || "unnamed multisig"}`}
                    />
                  </div>

                  <div className="min-w-0">
                    {editingLabel === row.key ? (
                      <Input
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveLabel(multisig);
                          else if (e.key === "Escape") handleCancelEdit();
                        }}
                        onBlur={() => handleSaveLabel(multisig)}
                        placeholder="Enter label"
                        className="border-border bg-card text-foreground h-8"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground truncate text-sm font-medium">
                              {row.label}
                            </span>
                            {isActiveDesk ? (
                              <Badge
                                variant="outline"
                                className="rounded-md border-lime-500/30 bg-lime-500/10 text-[0.65rem] text-lime-200"
                              >
                                Selected
                              </Badge>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground/70 hover:bg-muted hover:text-foreground h-6 w-6"
                              onClick={() =>
                                handleStartEditLabel(
                                  getMultisigAccountKey(multisig),
                                  multisig.label
                                )
                              }
                              aria-label={`Edit label for ${row.label}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-muted-foreground/70 truncate font-mono text-xs">
                              {formatAddress(
                                multisig.publicKey.toString(),
                                8,
                                8
                              )}
                            </span>
                            <button
                              type="button"
                              className="text-muted-foreground/70 hover:text-foreground shrink-0 transition-colors"
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
                          <p className="text-muted-foreground/70 mt-1 text-xs">
                            {row.attentionLine}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge
                        variant="outline"
                        className="border-border text-foreground/80 bg-transparent"
                      >
                        {row.chainName}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          row.multisigProvider === "safe"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                            : "border-border bg-card text-muted-foreground"
                        )}
                      >
                        {formatProviderLabel(row.multisigProvider)}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-foreground pt-1 text-sm font-medium">
                    {row.threshold}
                  </div>

                  <div className="text-muted-foreground pt-1 text-sm">
                    {row.memberCount}
                  </div>

                  <div className="flex flex-wrap items-start gap-1">
                    {row.tags.length ? (
                      row.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-border bg-muted text-foreground/80 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground/70 pt-1 text-sm">
                        —
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-end">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-foreground/80 hover:bg-muted bg-transparent"
                        onClick={() => handleOpenTagDialog(multisig)}
                      >
                        <Tag className="mr-1.5 h-3 w-3" />
                        Tags
                      </Button>
                      <Button
                        size="sm"
                        className={cn(
                          row.waiting > 0
                            ? "bg-lime-300 text-zinc-950 hover:bg-lime-200"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        onClick={() => handleOpenDesk(multisig)}
                      >
                        <ArrowUpRight className="mr-1.5 h-3 w-3" />
                        Open
                      </Button>
                    </div>
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
