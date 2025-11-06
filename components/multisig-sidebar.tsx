"use client";

import { Copy, Filter, RefreshCw, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ManageTagsDialog } from "@/components/manage-tags-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import type { MultisigAccount } from "@/types/multisig";

interface MultisigSidebarProps {
  onRefresh?: () => void;
  loading?: boolean;
}

export function MultisigSidebar({ onRefresh, loading }: MultisigSidebarProps) {
  const { multisigs, selectedMultisigKey, selectMultisig } = useMultisigStore();
  const { chains } = useChainStore();
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedMultisigForTags, setSelectedMultisigForTags] =
    useState<MultisigAccount | null>(null);
  const [filterText, setFilterText] = useState("");
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

  // Get all unique tags from all multisigs
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    multisigs.forEach((m) => {
      m.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [multisigs]);

  // Filter multisigs based on search text and selected tags
  const filteredMultisigs = useMemo(() => {
    return multisigs.filter((multisig) => {
      // Filter by text (label or address)
      const matchesText =
        !filterText ||
        multisig.label?.toLowerCase().includes(filterText.toLowerCase()) ||
        multisig.publicKey
          .toString()
          .toLowerCase()
          .includes(filterText.toLowerCase());

      // Filter by tags (if any tags are selected, multisig must have at least one matching tag)
      const matchesTags =
        selectedFilterTags.length === 0 ||
        selectedFilterTags.some((tag) => multisig.tags?.includes(tag));

      return matchesText && matchesTags;
    });
  }, [multisigs, filterText, selectedFilterTags]);

  const handleOpenTagDialog = (
    multisig: MultisigAccount,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSelectedMultisigForTags(multisig);
    setTagDialogOpen(true);
  };

  const toggleFilterTag = (tag: string) => {
    setSelectedFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Multisigs</h2>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        )}
      </div>

      {/* Search and filter section */}
      <div className="mb-3 space-y-2">
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

      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {multisigs.length === 0 && (
            <Card className="p-4">
              <p className="text-muted-foreground text-center text-sm">
                No multisigs available
              </p>
            </Card>
          )}

          {filteredMultisigs.length === 0 && multisigs.length > 0 && (
            <Card className="p-4">
              <p className="text-muted-foreground text-center text-sm">
                No multisigs match your filters
              </p>
            </Card>
          )}

          {filteredMultisigs.map((multisig) => {
            const isSelected =
              selectedMultisigKey === multisig.publicKey.toString();

            return (
              <div
                key={multisig.publicKey.toString()}
                onClick={() => selectMultisig(multisig.publicKey.toString())}
                className={cn(
                  "w-full cursor-pointer rounded-lg border p-3 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "hover:bg-accent/50"
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {multisig.label || "Unnamed"}
                    </p>
                    <div className="flex items-center gap-0.5">
                      <p className="text-muted-foreground truncate font-mono text-xs">
                        {multisig.publicKey.toString().slice(0, 6)}...
                        {multisig.publicKey.toString().slice(-4)}
                      </p>
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
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleOpenTagDialog(multisig, e)}
                          >
                            <Tag className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Manage Tags</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Badge variant="secondary" className="text-xs">
                      {multisig.threshold}/{multisig.members.length}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {chains.find((c) => c.id === multisig.chainId)?.name ||
                      multisig.chainId}
                  </Badge>
                  {multisig.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <ManageTagsDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        multisig={selectedMultisigForTags}
      />
    </div>
  );
}
