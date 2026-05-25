"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
    toast.success("Tags updated");
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
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-tag" className="text-muted-foreground/50 text-[11px] font-medium">
              Add Tag
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-tag"
                placeholder="Enter tag name..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleAddTag()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {allGlobalTags.length > 0 &&
            allGlobalTags.some((tag) => !tags.includes(tag)) && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground/50 text-[11px] font-medium">Available</p>
                <div className="flex flex-wrap gap-1.5">
                  {allGlobalTags
                    .filter((tag) => !tags.includes(tag))
                    .map((tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant="outline"
                        onClick={() => handleAddTag(tag)}
                        className="h-auto rounded-full px-3 py-1 text-xs"
                      >
                        {tag}
                      </Button>
                    ))}
                </div>
              </div>
            )}

          {tags.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground/50 text-[11px] font-medium">Current</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                  >
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-primary/60 hover:text-destructive hover:bg-destructive/10 ml-0.5 h-5 w-5 rounded-full p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {tags.length === 0 && (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No tags yet.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
          >
            Save Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
