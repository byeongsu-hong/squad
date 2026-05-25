"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ImportMultisigDialog } from "@/components/import-multisig-dialog";
import { Button } from "@/components/ui/button";
import { useChainStore } from "@/stores/chain-store";
import { normalizeChainConfig, getOperationalSquadsChains } from "@/types/chain";

export function AddMultisigActions() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { chains } = useChainStore();
  const operationalChains = getOperationalSquadsChains(chains);
  const hasImportableChains = chains.some((chain) => {
    const normalizedChain = normalizeChainConfig(chain);
    return (
      normalizedChain.multisigProvider === "safe" ||
      operationalChains.some((item) => item.id === normalizedChain.id)
    );
  });

  return (
    <>
      <Button
        disabled={!hasImportableChains}
        onClick={() => setImportDialogOpen(true)}
        className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
      >
        <Plus className="h-4 w-4" />
        Add Vault
      </Button>

      <ImportMultisigDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </>
  );
}
