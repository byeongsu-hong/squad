"use client";

import { LayoutPanelLeft, Settings2 } from "lucide-react";
import { useState } from "react";

import { AddMultisigActions } from "@/components/add-multisig-actions";
import { MultisigList } from "@/components/multisig-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RegistryManagementDialogProps {
  compact?: boolean;
}

export function RegistryManagementDialog({
  compact = false,
}: RegistryManagementDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={compact ? "ghost" : "outline"}
        size={compact ? "sm" : "default"}
        className={
          compact
            ? "h-8 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
            : "rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
        }
        onClick={() => setOpen(true)}
      >
        {compact ? (
          <LayoutPanelLeft className="h-4 w-4" />
        ) : (
          <Settings2 className="h-4 w-4" />
        )}
        {compact ? "Manage" : "Manage Registry"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] !max-w-[1120px] overflow-hidden p-0">
          <DialogHeader className="border-b border-zinc-800 px-6 py-4">
            <DialogTitle>Registry management</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <MultisigList
              embedded
              actions={<AddMultisigActions />}
              statusText="Create, import, relabel, retag, and clean up stored multisigs without leaving the dashboard."
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
