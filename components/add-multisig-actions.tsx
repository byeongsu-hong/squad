"use client";

import { ChevronDown, FileDown, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CreateMultisigDialog } from "@/components/create-multisig-dialog";
import { ImportMultisigDialog } from "@/components/import-multisig-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWalletStore } from "@/stores/wallet-store";

export function AddMultisigActions() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { publicKey } = useWalletStore();

  const handleCreateClick = () => {
    if (!publicKey) {
      toast.error("Please connect your wallet to create a multisig");
      return;
    }
    setCreateDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Multisig
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-zinc-800 bg-zinc-950 text-zinc-100"
        >
          <DropdownMenuItem onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
            <FileDown className="mr-2 h-4 w-4" />
            Import Existing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateMultisigDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <ImportMultisigDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </>
  );
}
