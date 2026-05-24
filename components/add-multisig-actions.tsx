"use client";

import { ChevronDown, FileDown, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CreateMultisigDialog } from "@/components/create-multisig-dialog";
import { ImportMultisigDialog } from "@/components/import-multisig-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChainStore } from "@/stores/chain-store";
import { useWalletStore } from "@/stores/wallet-store";
import {
  getOperationalSquadsChains,
  normalizeChainConfig,
} from "@/types/chain";

export function AddMultisigActions() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { publicKey } = useWalletStore();
  const { chains } = useChainStore();
  const operationalChains = getOperationalSquadsChains(chains);
  const hasOperationalSquadsChains = operationalChains.length > 0;
  const hasImportableChains = chains.some((chain) => {
    const normalizedChain = normalizeChainConfig(chain);
    return (
      normalizedChain.multisigProvider === "safe" ||
      operationalChains.some((item) => item.id === normalizedChain.id)
    );
  });

  const handleCreateClick = () => {
    if (!hasOperationalSquadsChains) {
      toast.error("Add a live SVM / Squads chain before creating a multisig");
      return;
    }

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
          <button
            type="button"
            disabled={!hasOperationalSquadsChains && !hasImportableChains}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Multisig
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-border bg-card text-foreground"
        >
          <DropdownMenuItem
            onClick={handleCreateClick}
            disabled={!hasOperationalSquadsChains}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Squads Multisig
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setImportDialogOpen(true)}
            disabled={!hasImportableChains}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Import Existing Safe or Squads
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
