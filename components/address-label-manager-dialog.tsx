"use client";

import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
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
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAddressLabels } from "@/lib/hooks/use-address-label";
import type { AddressLabel } from "@/types/address-label";

interface AddressLabelManagerDialogProps {
  children?: React.ReactNode;
  defaultAddress?: string;
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

export function AddressLabelManagerDialog({
  children,
  defaultAddress,
}: AddressLabelManagerDialogProps) {
  const [open, setOpen] = useState(false);
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

        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
          {/* Form Section */}
          <div className="w-[320px] shrink-0 overflow-y-auto border-r p-4">
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

          {/* List Section */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b px-4 py-3">
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2.5">
              {filteredLabels.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-muted-foreground text-center text-sm">
                    {searchQuery
                      ? "No labels found"
                      : "No labels yet. Add your first label!"}
                  </div>
                </div>
              ) : (
                <TooltipProvider>
                  <div className="space-y-1.5">
                    {filteredLabels.map((label) => (
                      <Tooltip key={label.address} delayDuration={300}>
                        <TooltipTrigger asChild>
                          <div className="group hover:bg-accent flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors">
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            <div
                              className="inline-flex max-w-[100px] shrink-0 items-center gap-1 rounded px-1.5 py-0.5"
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
                            <code className="bg-muted ml-auto w-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] leading-tight">
                              {label.address}
                            </code>
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleEdit(label)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDelete(label.address)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </TooltipTrigger>
                        {label.description && (
                          <TooltipContent>
                            <p>{label.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
