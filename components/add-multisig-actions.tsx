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
          <Button
            disabled={!hasOperationalSquadsChains && !hasImportableChains}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Multisig
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-zinc-800 bg-zinc-950 text-zinc-100"
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
