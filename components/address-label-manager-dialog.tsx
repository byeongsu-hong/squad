"use client";

import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAddressLabels } from "@/lib/hooks/use-address-label";
import { cn } from "@/lib/utils";
import type { AddressLabel } from "@/types/address-label";

interface AddressLabelManagerDialogProps {
  children?: React.ReactNode;
  defaultAddress?: string;
}

interface AddressLabelManagerContentProps {
  defaultAddress?: string;
  embedded?: boolean;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ef4444", // red
];

function formatUpdatedAt(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function AddressLabelManagerDialog({
  children,
  defaultAddress,
}: AddressLabelManagerDialogProps) {
  return <DialogShell defaultAddress={defaultAddress}>{children}</DialogShell>;
}

function DialogShell({
  children,
  defaultAddress,
}: AddressLabelManagerDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Manage Labels
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex h-[600px] w-[900px] !max-w-[900px] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-3">
          <DialogTitle>Address Label Manager</DialogTitle>
          <DialogDescription>
            Add labels to addresses for easier identification
          </DialogDescription>
        </DialogHeader>
        <AddressLabelManagerContent defaultAddress={defaultAddress} />
      </DialogContent>
    </Dialog>
  );
}

export function AddressLabelManagerContent({
  defaultAddress,
  embedded = false,
}: AddressLabelManagerContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingLabel, setEditingLabel] = useState<AddressLabel | null>(null);
  const { labels, addLabel, updateLabel, deleteLabel } = useAddressLabels();

  const [formData, setFormData] = useState({
    address: defaultAddress || "",
    label: "",
    description: "",
    color: DEFAULT_COLORS[0],
  });

  const filteredLabels = useMemo(() => {
    if (!searchQuery) return labels;

    const lowerQuery = searchQuery.toLowerCase();
    return labels.filter(
      (label) =>
        label.label.toLowerCase().includes(lowerQuery) ||
        label.address.toLowerCase().includes(lowerQuery) ||
        label.description?.toLowerCase().includes(lowerQuery)
    );
  }, [labels, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.address.trim() || !formData.label.trim()) {
      toast.error("Address and label are required");
      return;
    }

    if (formData.label.length > 12) {
      toast.error("Label must be 12 characters or less");
      return;
    }

    try {
      if (isEditing && editingLabel) {
        updateLabel(editingLabel.address, {
          label: formData.label,
          description: formData.description || undefined,
          color: formData.color,
        });
        toast.success("Label updated successfully");
      } else {
        addLabel({
          address: formData.address,
          label: formData.label,
          description: formData.description || undefined,
          color: formData.color,
        });
        toast.success("Label added successfully");
      }

      handleReset();
    } catch (error) {
      toast.error("Failed to save label");
      console.error(error);
    }
  };

  const handleEdit = (label: AddressLabel) => {
    setIsEditing(true);
    setEditingLabel(label);
    setFormData({
      address: label.address,
      label: label.label,
      description: label.description || "",
      color: label.color || DEFAULT_COLORS[0],
    });
  };

  const handleDelete = (address: string) => {
    try {
      deleteLabel(address);
      toast.success("Label deleted successfully");
      if (editingLabel?.address === address) {
        handleReset();
      }
    } catch (error) {
      toast.error("Failed to delete label");
      console.error(error);
    }
  };

  const handleReset = () => {
    setIsEditing(false);
    setEditingLabel(null);
    setFormData({
      address: defaultAddress || "",
      label: "",
      description: "",
      color: DEFAULT_COLORS[0],
    });
  };

  useEffect(() => {
    handleReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAddress, embedded]);

  return (
    <div
      className={
        embedded
          ? "grid gap-5 xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]"
          : "flex min-h-0 w-full flex-1 overflow-hidden"
      }
    >
      <div
        className={
          embedded
            ? "space-y-4 border border-zinc-800 bg-zinc-950/55 p-4"
            : "w-[320px] shrink-0 overflow-y-auto border-r p-4"
        }
      >
        {embedded ? (
          <div className="space-y-1 border-b border-zinc-800 pb-4">
            <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
              Label editor
            </p>
            <p className="text-sm leading-6 text-zinc-400">
              Create or revise reusable aliases for addresses that appear across
              explorer rows, signer maps, and proposal metadata.
            </p>
          </div>
        ) : null}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {isEditing ? "Edit Label" : "Add New Label"}
          </h3>
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Enter Solana address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              disabled={isEditing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label (max 12 chars)</Label>
            <Input
              id="label"
              placeholder="Enter label name"
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              maxLength={12}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Add description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" size="sm">
            {isEditing ? "Update Label" : "Add Label"}
          </Button>
        </form>
      </div>

      <div
        className={
          embedded
            ? "min-w-0 border border-zinc-800 bg-zinc-950/35"
            : "flex min-h-0 flex-1 flex-col overflow-hidden"
        }
      >
        <div
          className={
            embedded
              ? "border-b border-zinc-800 px-4 py-3"
              : "shrink-0 border-b px-4 py-3"
          }
        >
          <h3 className="mb-3 text-sm font-semibold">Saved Labels</h3>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search labels or addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {embedded ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="border border-zinc-800 bg-zinc-950/75 px-3 py-2">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  Total labels
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-100">
                  {labels.length}
                </p>
              </div>
              <div className="border border-zinc-800 bg-zinc-950/75 px-3 py-2">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  With notes
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-100">
                  {labels.filter((label) => Boolean(label.description)).length}
                </p>
              </div>
              <div className="border border-zinc-800 bg-zinc-950/75 px-3 py-2">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  Search result
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-100">
                  {filteredLabels.length}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={
            embedded
              ? "max-h-[36rem] overflow-y-auto px-4 py-2.5"
              : "min-h-0 flex-1 overflow-y-auto px-4 py-2.5"
          }
        >
          {filteredLabels.length === 0 ? (
            <div className="flex h-full min-h-[12rem] items-center justify-center">
              <div className="text-muted-foreground text-center text-sm">
                {searchQuery
                  ? "No labels found"
                  : "No labels yet. Add your first label!"}
              </div>
            </div>
          ) : (
            <TooltipProvider>
              <div
                className={
                  embedded ? "divide-y divide-zinc-800" : "space-y-1.5"
                }
              >
                {embedded ? (
                  <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1.3fr)_8rem_4.5rem] gap-3 px-3 py-2 text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                    <span>Label</span>
                    <span>Description</span>
                    <span>Address</span>
                    <span>Updated</span>
                    <span className="text-right">Actions</span>
                  </div>
                ) : null}
                {filteredLabels.map((label) => (
                  <Tooltip key={label.address} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "group hover:bg-accent flex cursor-pointer items-center gap-2 transition-colors",
                          embedded
                            ? "grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1.3fr)_8rem_4.5rem] gap-3 px-3 py-3"
                            : "rounded-md border px-2.5 py-1.5"
                        )}
                        onClick={() => handleEdit(label)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            <div
                              className="inline-flex max-w-full shrink-0 items-center gap-1 rounded px-1.5 py-0.5"
                              style={{
                                backgroundColor: `${label.color}20`,
                                borderLeft: `2px solid ${label.color}`,
                              }}
                            >
                              <span
                                className="truncate text-[11px] font-medium whitespace-nowrap"
                                style={{ color: label.color }}
                                title={label.label}
                              >
                                {label.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        {embedded ? (
                          <div className="min-w-0 text-sm text-zinc-400">
                            <p className="truncate">
                              {label.description || "No description"}
                            </p>
                          </div>
                        ) : null}
                        <code
                          className={cn(
                            embedded
                              ? "truncate font-mono text-[0.72rem] text-zinc-300"
                              : "bg-muted ml-auto w-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] leading-tight"
                          )}
                        >
                          {label.address}
                        </code>
                        {embedded ? (
                          <div className="text-[0.72rem] text-zinc-500">
                            {formatUpdatedAt(label.updatedAt)}
                          </div>
                        ) : null}
                        <div
                          className={cn(
                            "flex shrink-0 gap-0.5",
                            embedded
                              ? "justify-end opacity-100"
                              : "opacity-0 transition-opacity group-hover:opacity-100"
                          )}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEdit(label);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(label.address);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TooltipTrigger>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
