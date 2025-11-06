"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMultisigStore } from "@/stores/multisig-store";
import type { MultisigAccount } from "@/types/multisig";

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multisig: MultisigAccount | null;
}

export function ManageTagsDialog({
  open,
  onOpenChange,
  multisig,
}: ManageTagsDialogProps) {
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>(multisig?.tags || []);
  const { updateMultisigTags, multisigs } = useMultisigStore();

  // Get all unique tags from all multisigs
  const allGlobalTags = Array.from(
    new Set(multisigs.flatMap((m) => m.tags || []))
  ).sort();

  const handleAddTag = (tagToAdd?: string) => {
    const trimmedTag = (tagToAdd || newTag).trim();
    if (!trimmedTag) {
      toast.error("Tag cannot be empty");
      return;
    }

    if (tags.includes(trimmedTag)) {
      toast.error("Tag already exists");
      return;
    }

    setTags([...tags, trimmedTag]);
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (!multisig) return;

    updateMultisigTags(multisig.publicKey.toString(), tags);
    toast.success("Tags updated successfully");
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Reset tags when dialog opens
  useEffect(() => {
    if (open && multisig) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTags(multisig.tags || []);
    }
  }, [open, multisig]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Add tags to organize and filter your multisigs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-tag">Add New Tag</Label>
            <div className="flex gap-2">
              <Input
                id="new-tag"
                placeholder="Enter tag name..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button onClick={() => handleAddTag()} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {allGlobalTags.length > 0 &&
            allGlobalTags.some((tag) => !tags.includes(tag)) && (
              <div className="space-y-2">
                <Label>Available Tags (click to add)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {allGlobalTags
                    .filter((tag) => !tags.includes(tag))
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="hover:bg-accent cursor-pointer px-3 py-1"
                        onClick={() => handleAddTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Current Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {tag}
                    <X
                      className="hover:text-destructive h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {tags.length === 0 && (
            <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
              No tags yet. Add some tags to organize your multisigs.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Tags</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
