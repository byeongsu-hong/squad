"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const { updateMultisigTags, multisigs } = useMultisigStore();

  const currentMultisig = multisig
    ? multisigs.find(
        (m) => m.publicKey.toString() === multisig.publicKey.toString()
      )
    : null;

  const multisigKey = currentMultisig?.publicKey.toString();

  const [editingKey, setEditingKey] = useState<string | undefined>();
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const allGlobalTags = Array.from(
    new Set(multisigs.flatMap((m) => m.tags || []))
  ).sort();

  if (open && multisigKey !== editingKey) {
    setEditingKey(multisigKey);
    setTags(currentMultisig?.tags || []);
  }

  if (!open && editingKey) {
    setEditingKey(undefined);
  }

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
    if (!currentMultisig) return;
    updateMultisigTags(currentMultisig.publicKey.toString(), tags);
    toast.success("Tags updated successfully");
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

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
          <div className="space-y-1.5">
            <label htmlFor="new-tag" className="text-foreground/80 text-xs font-medium">
              Add New Tag
            </label>
            <div className="flex gap-2">
              <input
                id="new-tag"
                placeholder="Enter tag name..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 h-9 flex-1 rounded-md border px-3 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                className="border-border bg-muted text-foreground hover:bg-muted/80 inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {allGlobalTags.length > 0 &&
            allGlobalTags.some((tag) => !tags.includes(tag)) && (
              <div className="space-y-1.5">
                <p className="text-foreground/80 text-xs font-medium">Available Tags (click to add)</p>
                <div className="flex flex-wrap gap-1.5">
                  {allGlobalTags
                    .filter((tag) => !tags.includes(tag))
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="border-border hover:bg-muted text-foreground/80 rounded-full border px-3 py-1 text-xs transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>
            )}

          {tags.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-foreground/80 text-xs font-medium">Current Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted text-foreground/80 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive ml-0.5 inline-flex transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
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
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground/80 hover:bg-muted inline-flex h-9 items-center rounded-md border bg-transparent px-4 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors"
          >
            Save Tags
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
