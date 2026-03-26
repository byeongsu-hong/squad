"use client";

import { PublicKey } from "@solana/web3.js";
import {
  ArrowUpRight,
  Copy,
  Filter,
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
import { MultisigCardSkeletonList } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useMultisigAttention } from "@/lib/hooks/use-multisig-attention";
import { SquadService } from "@/lib/squad";
import { cn } from "@/lib/utils";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { MultisigAccount } from "@/types/multisig";
import type { SquadMember } from "@/types/squad";

interface MultisigListProps {
  actions?: React.ReactNode;
  statusText?: string;
  embedded?: boolean;
}

export function MultisigList({
  actions,
  statusText,
  embedded = false,
}: MultisigListProps = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  const attentionByMultisig = useMultisigAttention({
    chains,
    multisigs,
    viewerAddress: publicKey?.toString() ?? null,
  });

  const loadMultisigs = useCallback(async () => {
    if (!publicKey) return;

    const chain = getSelectedChain();
    if (!chain) return;

    setLoading(true);
    try {
      const squadService = new SquadService(
        chain.rpcUrl,
        chain.squadsV4ProgramId
      );

      const accounts = await squadService.getMultisigsByCreator(publicKey);

      setMultisigs((currentMultisigs) => {
        const currentMap = new Map(
          currentMultisigs.map((multisig) => [
            multisig.publicKey.toString(),
            multisig,
          ])
        );

        const loadedMultisigs = accounts.map((acc) => {
          const existing = currentMap.get(acc.publicKey.toString());

          return {
            publicKey: acc.publicKey,
            threshold: acc.account.threshold,
            members: acc.account.members.map((m: SquadMember) => ({
              key: m.key,
              permissions: { mask: m.permissions.mask },
            })),
            transactionIndex: BigInt(acc.account.transactionIndex.toString()),
            msChangeIndex: 0,
            programId: new PublicKey(chain.squadsV4ProgramId),
            chainId: chain.id,
            label: existing?.label,
            tags: existing?.tags,
            vaultPda: existing?.vaultPda,
          };
        });

        const loadedKeys = new Set(
          loadedMultisigs.map((multisig) => multisig.publicKey.toString())
        );

        const storedOnly = currentMultisigs.filter(
          (multisig) => !loadedKeys.has(multisig.publicKey.toString())
        );

        return [...storedOnly, ...loadedMultisigs];
      });
    } catch (error) {
      console.error("Failed to load multisigs:", error);
      toast.error("Failed to load multisigs");
    } finally {
      setLoading(false);
    }
  }, [getSelectedChain, publicKey, setMultisigs]);

  useEffect(() => {
    loadMultisigs();
  }, [loadMultisigs]);

  const toggleSelect = (publicKey: string) => {
    setSelectedForDeletion((prev) => {
      const next = new Set(prev);
      if (next.has(publicKey)) {
        next.delete(publicKey);
      } else {
        next.add(publicKey);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForDeletion.size === multisigs.length) {
      setSelectedForDeletion(new Set());
    } else {
      setSelectedForDeletion(
        new Set(multisigs.map((m) => m.publicKey.toString()))
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
      selectedForDeletion.forEach((key) => deleteMultisig(key));
      setSelectedForDeletion(new Set());
      toast.success(
        `${selectedForDeletion.size} multisig(s) removed from list`
      );
    }
  };

  const handleStartEditLabel = (publicKey: string, currentLabel?: string) => {
    setEditingLabel(publicKey);
    setLabelInput(currentLabel || "");
  };

  const handleSaveLabel = (publicKey: string) => {
    updateMultisigLabel(publicKey, labelInput.trim());
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

  const filteredMultisigs = useMemo(() => {
    return multisigs.filter((multisig) => {
      const matchesText =
        !debouncedFilterText ||
        multisig.label
          ?.toLowerCase()
          .includes(debouncedFilterText.toLowerCase()) ||
        multisig.publicKey
          .toString()
          .toLowerCase()
          .includes(debouncedFilterText.toLowerCase());

      const matchesTags =
        selectedFilterTags.length === 0 ||
        selectedFilterTags.some((tag) => multisig.tags?.includes(tag));

      return matchesText && matchesTags;
    });
  }, [multisigs, debouncedFilterText, selectedFilterTags]);

  const toggleFilterTag = (tag: string) => {
    setSelectedFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const hasMultisigs = multisigs.length > 0;

  const handleOpenDesk = (multisig: MultisigAccount) => {
    const multisigKey = multisig.publicKey.toString();
    const attention = attentionByMultisig[multisig.publicKey.toString()];
    const filter = attention?.waiting
      ? "waiting"
      : attention?.executable
        ? "executable"
        : "all";

    selectMultisig(multisigKey);
    router.push(`/?multisig=${multisigKey}&filter=${filter}`);
  };

  return (
    <div className={cn("space-y-4", embedded && "space-y-3")}>
      <div
        className={cn(
          "flex flex-col gap-3 border-b border-zinc-800 pb-4",
          embedded && "pb-3"
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          {!embedded ? (
            <>
              <p className="text-[0.68rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">
                Multisig Registry
              </p>
              <h1 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">
                All multisigs
              </h1>
            </>
          ) : (
            <p className="text-[0.68rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">
              Registry controls
            </p>
          )}
          {statusText ? (
            <>
              <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
              <span className="text-sm text-zinc-400">{statusText}</span>
            </>
          ) : null}
          {actions ? <div className="ml-auto">{actions}</div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search multisigs..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full min-w-[220px] border-zinc-800 bg-zinc-950 pl-8 text-zinc-100 placeholder:text-zinc-600 sm:w-[320px]"
              aria-label="Search multisigs"
            />
          </div>
          {publicKey && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadMultisigs}
              disabled={loading}
              className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
              aria-label="Refresh multisigs"
              title="Refresh multisigs"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
          {hasMultisigs && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
            >
              {selectedForDeletion.size === multisigs.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          )}
          {selectedForDeletion.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="rounded-md"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedForDeletion.size})
            </Button>
          )}
          {hasMultisigs && allTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const selected = selectedFilterTags.includes(tag);

                return (
                  <Badge
                    key={tag}
                    variant={selected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer rounded-md text-xs",
                      selected
                        ? "bg-zinc-100 text-zinc-950"
                        : "border-zinc-800 bg-transparent text-zinc-400"
                    )}
                    onClick={() => toggleFilterTag(tag)}
                  >
                    {tag}
                  </Badge>
                );
              })}
            </div>
          ) : null}
          <div className="ml-auto text-sm text-zinc-500">
            {hasMultisigs
              ? `${filteredMultisigs.length} visible / ${multisigs.length} total`
              : "No multisigs loaded"}
          </div>
        </div>
      </div>

      {!hasMultisigs && !loading && (
        <div className="flex items-center gap-3 border border-dashed border-zinc-800 px-4 py-4 text-sm text-zinc-400">
          <Users className="h-4 w-4 shrink-0 text-zinc-500" />
          {publicKey
            ? "No multisigs found. Create or import one from the registry controls."
            : "Connect a wallet or import an existing multisig to start the registry."}
        </div>
      )}

      {filteredMultisigs.length === 0 && multisigs.length > 0 && (
        <div className="border border-dashed border-zinc-800 px-4 py-4 text-sm text-zinc-400">
          No multisigs match the current filters.
        </div>
      )}

      {loading && <MultisigCardSkeletonList />}

      {!loading && hasMultisigs && filteredMultisigs.length > 0 && (
        <div className="overflow-x-auto rounded-[1.15rem] border border-zinc-800 bg-zinc-950/70">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[2.1rem_minmax(11rem,1.5fr)_minmax(8rem,0.8fr)_minmax(7rem,0.7fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(8rem,0.75fr)] gap-3 border-b border-zinc-800 px-4 py-3 text-[0.68rem] font-medium tracking-[0.18em] text-zinc-500 uppercase">
              <span />
              <span>Multisig</span>
              <span>Chain</span>
              <span>Threshold</span>
              <span>Members</span>
              <span>Tags</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredMultisigs.map((multisig) => {
              const isSelected = selectedForDeletion.has(
                multisig.publicKey.toString()
              );
              const isActiveDesk =
                selectedMultisigKey === multisig.publicKey.toString();
              const chainName =
                chains.find((c) => c.id === multisig.chainId)?.name ||
                multisig.chainId;
              const attention =
                attentionByMultisig[multisig.publicKey.toString()];
              const attentionLine = attention
                ? attention.waiting > 0
                  ? `${attention.waiting} waiting on you · ${attention.executable} executable · ${attention.active} active`
                  : attention.executable > 0
                    ? `${attention.executable} executable · ${attention.active} active`
                    : `${attention.active} active`
                : "Attention loading";

              return (
                <div
                  key={multisig.publicKey.toString()}
                  className={cn(
                    "grid grid-cols-[2.1rem_minmax(11rem,1.5fr)_minmax(8rem,0.8fr)_minmax(7rem,0.7fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(8rem,0.75fr)] gap-3 border-b border-zinc-800 px-4 py-4 last:border-b-0",
                    isSelected || isActiveDesk
                      ? "bg-zinc-900/90"
                      : "bg-transparent"
                  )}
                >
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => {
                        event.stopPropagation();
                        toggleSelect(multisig.publicKey.toString());
                      }}
                      className="h-4 w-4 cursor-pointer"
                      aria-label={`Select ${multisig.label || "unnamed multisig"}`}
                    />
                  </div>

                  <div className="min-w-0">
                    {editingLabel === multisig.publicKey.toString() ? (
                      <Input
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveLabel(multisig.publicKey.toString());
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        onBlur={() =>
                          handleSaveLabel(multisig.publicKey.toString())
                        }
                        placeholder="Enter label"
                        className="h-8 border-zinc-800 bg-zinc-950 text-zinc-100"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-zinc-100">
                              {multisig.label || "Unnamed"}
                            </span>
                            {isActiveDesk ? (
                              <Badge
                                variant="outline"
                                className="rounded-md border-lime-500/30 bg-lime-500/10 text-[0.65rem] text-lime-200"
                              >
                                Desk
                              </Badge>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
                              onClick={() =>
                                handleStartEditLabel(
                                  multisig.publicKey.toString(),
                                  multisig.label
                                )
                              }
                              aria-label={`Edit label for ${multisig.label || "unnamed multisig"}`}
                              title={`Edit label for ${multisig.label || "unnamed multisig"}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            <span className="truncate font-mono text-xs text-zinc-500">
                              {multisig.publicKey.toString().slice(0, 8)}...
                              {multisig.publicKey.toString().slice(-8)}
                            </span>
                            <button
                              type="button"
                              className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(
                                  multisig.publicKey.toString()
                                );
                                toast.success("Address copied");
                              }}
                              aria-label={`Copy address for ${multisig.label || "unnamed multisig"}`}
                              title={`Copy address for ${multisig.label || "unnamed multisig"}`}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">
                            {attentionLine}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start">
                    <Badge
                      variant="outline"
                      className="rounded-md border-zinc-800 bg-transparent text-zinc-300"
                    >
                      {chainName}
                    </Badge>
                  </div>

                  <div className="pt-1 text-sm font-medium text-zinc-100">
                    {multisig.threshold}
                  </div>

                  <div className="pt-1 text-sm text-zinc-400">
                    {multisig.members.length}
                  </div>

                  <div className="flex flex-wrap items-start gap-1">
                    {multisig.tags?.length ? (
                      multisig.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="rounded-md border-zinc-800 bg-zinc-900/70 text-xs text-zinc-300"
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="pt-1 text-sm text-zinc-600">
                        No tags
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-end">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
                        onClick={() => handleOpenTagDialog(multisig)}
                      >
                        <Tag className="mr-2 h-3 w-3" />
                        Tags
                      </Button>
                      <Button
                        size="sm"
                        className={cn(
                          "rounded-md text-zinc-950",
                          attention?.waiting
                            ? "bg-lime-300 hover:bg-lime-200"
                            : "bg-zinc-100 hover:bg-zinc-200"
                        )}
                        onClick={() => handleOpenDesk(multisig)}
                      >
                        <ArrowUpRight className="mr-2 h-3 w-3" />
                        Focus
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
