"use client";

import { Pencil, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddressLabels } from "@/lib/hooks/use-address-label";
import { cn } from "@/lib/utils";
import type { AddressLabel } from "@/types/address-label";

interface AddressLabelManagerDialogProps {
  children?: React.ReactNode;
  defaultAddress?: string;
}

interface AddressLabelManagerControllerProps {
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
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            Manage Labels
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex h-[600px] w-[900px] !max-w-[900px] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-3">
          <DialogTitle>Address Label Manager</DialogTitle>
        </DialogHeader>
        <AddressLabelManagerController defaultAddress={defaultAddress} />
      </DialogContent>
    </Dialog>
  );
}

export function AddressLabelManagerController({
  defaultAddress,
  embedded = false,
}: AddressLabelManagerControllerProps) {
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
        toast.success("Label updated");
      } else {
        addLabel({
          address: formData.address,
          label: formData.label,
          description: formData.description || undefined,
          color: formData.color,
        });
        toast.success("Label added");
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
      toast.success("Label deleted");
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
    setIsEditing(false);
    setEditingLabel(null);
    setFormData({
      address: defaultAddress || "",
      label: "",
      description: "",
      color: DEFAULT_COLORS[0],
    });
  }, [defaultAddress, embedded]);

  return (
    <div
      className={
        embedded
          ? "grid gap-5 xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]"
          : "flex min-h-0 w-full flex-1 overflow-hidden"
      }
    >
      <AddressLabelEditor
        embedded={embedded}
        isEditing={isEditing}
        formData={formData}
        onReset={handleReset}
        onSubmit={handleSubmit}
        onFormDataChange={setFormData}
      />

      <div className={embedded ? "min-w-0" : "flex min-h-0 flex-1 flex-col overflow-hidden"}>
        <AddressLabelRegistry
          embedded={embedded}
          filteredLabels={filteredLabels}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

interface AddressLabelEditorProps {
  embedded: boolean;
  isEditing: boolean;
  formData: {
    address: string;
    label: string;
    description: string;
    color: string;
  };
  onReset: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormDataChange: React.Dispatch<
    React.SetStateAction<{
      address: string;
      label: string;
      description: string;
      color: string;
    }>
  >;
}

function AddressLabelEditor({
  embedded,
  isEditing,
  formData,
  onReset,
  onSubmit,
  onFormDataChange,
}: AddressLabelEditorProps) {
  return (
    <div
      className={
        embedded
          ? "border-border bg-card space-y-4 rounded-xl border p-4"
          : "w-[320px] shrink-0 overflow-y-auto border-r p-4"
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground/50 text-[11px] font-medium">
          {isEditing ? "Edit Label" : "Add New Label"}
        </p>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onReset}
            className="text-muted-foreground/40 hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="Enter Solana address"
            value={formData.address}
            onChange={(e) =>
              onFormDataChange({ ...formData, address: e.target.value })
            }
            disabled={isEditing}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Label <span className="text-muted-foreground/50 font-normal">(max 12 chars)</span></Label>
          <Input
            id="label"
            placeholder="Enter label name"
            value={formData.label}
            onChange={(e) =>
              onFormDataChange({ ...formData, label: e.target.value })
            }
            maxLength={12}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description <span className="text-muted-foreground/50 font-normal">(Optional)</span></Label>
          <Input
            id="description"
            placeholder="Add description"
            value={formData.description}
            onChange={(e) =>
              onFormDataChange({ ...formData, description: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_COLORS.map((color) => (
              <Button
                key={color}
                type="button"
                variant="ghost"
                className={cn(
                  "h-8 w-8 rounded-full border-2 p-0 transition-all",
                  formData.color === color
                    ? "scale-110 border-foreground"
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: color }}
                onClick={() => onFormDataChange({ ...formData, color })}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 w-full"
        >
          {isEditing ? "Update Label" : "Add Label"}
        </Button>
      </form>
    </div>
  );
}

interface AddressLabelRegistryProps {
  embedded: boolean;
  filteredLabels: AddressLabel[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onEdit: (label: AddressLabel) => void;
  onDelete: (address: string) => void;
}

function AddressLabelRegistry({
  embedded,
  filteredLabels,
  searchQuery,
  onSearchQueryChange,
  onEdit,
  onDelete,
}: AddressLabelRegistryProps) {
  return (
    <div
      className={
        embedded
          ? "border-border bg-card min-w-0 rounded-xl border"
          : "flex min-h-0 flex-1 flex-col overflow-hidden"
      }
    >
      <div
        className={
          embedded
            ? "border-border border-b px-4 py-3"
            : "shrink-0 border-b px-4 py-3"
        }
      >
        <p className="mb-3 text-muted-foreground/50 text-[11px] font-medium">Saved Labels</p>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search labels or addresses..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {embedded && filteredLabels.length > 0 && (
        <div className="border-border grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1.3fr)_8rem_4.5rem] gap-3 border-b px-4 py-2 text-[11px] font-medium text-muted-foreground/40">
          <span>Label</span>
          <span>Description</span>
          <span>Address</span>
          <span>Updated</span>
          <span className="text-right">Actions</span>
        </div>
      )}

      <div
        className={
          embedded
            ? "max-h-[36rem] overflow-y-auto px-4 pb-2.5"
            : "min-h-0 flex-1 overflow-y-auto px-4 py-2.5"
        }
      >
        {filteredLabels.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 text-center">
            <div className="bg-card border-border flex h-10 w-10 items-center justify-center rounded-2xl border">
              <Tag className="text-muted-foreground/60 h-5 w-5" />
            </div>
            <p className="text-muted-foreground/60 text-sm">
              {searchQuery ? "No labels found" : "No labels yet."}
            </p>
          </div>
        ) : (
          <div
            className={embedded ? "divide-border divide-y" : "space-y-1.5"}
          >
            {filteredLabels.map((label) => (
              <div
                key={label.address}
                className={cn(
                  "group hover:bg-muted flex cursor-pointer items-center gap-2 transition-colors",
                  embedded
                    ? "grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1.3fr)_8rem_4.5rem] gap-3 px-3 py-3"
                    : "rounded-md border px-2.5 py-1.5"
                )}
                onClick={() => onEdit(label)}
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
                        <div className="text-muted-foreground min-w-0 text-sm">
                          <p className="truncate">
                            {label.description || "No description"}
                          </p>
                        </div>
                      ) : null}
                      <code
                        className={cn(
                          embedded
                            ? "text-foreground/80 truncate font-mono text-[0.72rem]"
                            : "bg-muted ml-auto w-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] leading-tight"
                        )}
                      >
                        {label.address}
                      </code>
                      {embedded ? (
                        <div className="text-muted-foreground/70 text-[0.72rem]">
                          {formatUpdatedAt(label.updatedAt)}
                        </div>
                      ) : null}
                      <div
                        className="flex shrink-0 justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground/40 hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(label);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground/40 hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(label.address);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
