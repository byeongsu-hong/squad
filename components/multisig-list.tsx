"use client";

import { PublicKey } from "@solana/web3.js";
import {
  Copy,
  Filter,
  Loader2,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ManageTagsDialog } from "@/components/manage-tags-dialog";
import { MultisigCardSkeletonList } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { SquadService } from "@/lib/squad";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { MultisigAccount } from "@/types/multisig";
import type { SquadMember } from "@/types/squad";

export function MultisigList() {
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
  const { multisigs, setMultisigs, deleteMultisig, updateMultisigLabel } =
    useMultisigStore();

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

      const loadedMultisigs = accounts.map((acc) => ({
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
      }));

      // Merge with existing stored multisigs
      const existingKeys = new Set(
        loadedMultisigs.map((m) => m.publicKey.toString())
      );

      setMultisigs((currentMultisigs) => {
        const storedMultisigs = currentMultisigs.filter(
          (m) => !existingKeys.has(m.publicKey.toString())
        );
        return [...storedMultisigs, ...loadedMultisigs];
      });
    } catch (error) {
      console.error("Failed to load multisigs:", error);
      toast.error("Failed to load multisigs");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

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

  // Get all unique tags from all multisigs
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    multisigs.forEach((m) => {
      m.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [multisigs]);

  const debouncedFilterText = useDebounce(filterText, 300);

  // Filter multisigs based on search text and selected tags
  const filteredMultisigs = useMemo(() => {
    return multisigs.filter((multisig) => {
      // Filter by text (label or address)
      const matchesText =
        !debouncedFilterText ||
        multisig.label
          ?.toLowerCase()
          .includes(debouncedFilterText.toLowerCase()) ||
        multisig.publicKey
          .toString()
          .toLowerCase()
          .includes(debouncedFilterText.toLowerCase());

      // Filter by tags (if any tags are selected, multisig must have at least one matching tag)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Your Multisigs</h2>
        <div className="flex items-center gap-2">
          {publicKey && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadMultisigs}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Search and filter section */}
      {hasMultisigs && (
        <div className="space-y-2">
          <div className="relative">
            <Filter className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search multisigs..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={
                    selectedFilterTags.includes(tag) ? "default" : "outline"
                  }
                  className="cursor-pointer text-xs"
                  onClick={() => toggleFilterTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="text-muted-foreground text-sm">
          {filteredMultisigs.length !== multisigs.length && (
            <span>
              Showing {filteredMultisigs.length} of {multisigs.length} multisigs
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasMultisigs && (
            <>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedForDeletion.size === multisigs.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              {selectedForDeletion.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedForDeletion.size})
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {!hasMultisigs && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="text-muted-foreground mb-4 h-12 w-12" />
            {publicKey ? (
              <p className="text-muted-foreground">
                No multisigs found. Create or import one!
              </p>
            ) : (
              <div className="text-muted-foreground space-y-2 text-center">
                <p>No multisigs in your list yet.</p>
                <p className="text-sm">
                  Import an existing multisig or connect your wallet to create a
                  new one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filteredMultisigs.length === 0 && multisigs.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No multisigs match your filters
            </p>
          </CardContent>
        </Card>
      )}

      {loading && <MultisigCardSkeletonList />}

      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMultisigs.map((multisig) => {
            const isSelected = selectedForDeletion.has(
              multisig.publicKey.toString()
            );
            return (
              <Card
                key={multisig.publicKey.toString()}
                className={isSelected ? "border-primary" : ""}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          toggleSelect(multisig.publicKey.toString())
                        }
                        className="h-4 w-4 cursor-pointer"
                      />
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
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          <span className="truncate text-sm font-medium">
                            {multisig.label || "Unnamed"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              handleStartEditLabel(
                                multisig.publicKey.toString(),
                                multisig.label
                              )
                            }
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {multisig.threshold}/{multisig.members.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    <div className="flex items-center gap-0.5">
                      <div className="truncate font-mono text-xs">
                        {multisig.publicKey.toString().slice(0, 8)}...
                        {multisig.publicKey.toString().slice(-8)}
                      </div>
                      <Copy
                        className="text-muted-foreground hover:text-foreground h-2.5 w-2.5 shrink-0 cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            multisig.publicKey.toString()
                          );
                          toast.success("Address copied");
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {chains.find((c) => c.id === multisig.chainId)?.name ||
                          multisig.chainId}
                      </Badge>
                      {multisig.tags?.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-sm">
                      <p>TX Index: {multisig.transactionIndex.toString()}</p>
                      <p>Members: {multisig.members.length}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleOpenTagDialog(multisig)}
                    >
                      <Tag className="mr-2 h-3 w-3" />
                      Manage Tags
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
