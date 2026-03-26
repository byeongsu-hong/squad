import { useCallback, useState } from "react";
import { toast } from "sonner";

import { loadSquadsCreatorMultisigs } from "@/lib/workspace/squads-adapter";
import { type ChainConfig, isOperationalSquadsChain } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

interface UseCreatorMultisigsOptions {
  chains: ChainConfig[];
  existingMultisigs: MultisigAccount[];
  onLoaded: (
    multisigs:
      | MultisigAccount[]
      | ((current: MultisigAccount[]) => MultisigAccount[])
  ) => void;
}

export function useCreatorMultisigs({
  chains,
  existingMultisigs,
  onLoaded,
}: UseCreatorMultisigsOptions) {
  const [loading, setLoading] = useState(false);

  const loadForCreator = useCallback(
    async (
      chainId: string | null | undefined,
      creatorAddress: string | null
    ) => {
      if (!chainId || !creatorAddress) {
        return;
      }

      const chain = chains.find((item) => item.id === chainId);
      if (!chain || !isOperationalSquadsChain(chain)) {
        toast.error("Selected chain is not configured for Squads loading");
        return;
      }

      setLoading(true);

      try {
        const loadedMultisigs = await loadSquadsCreatorMultisigs(
          chainId,
          creatorAddress,
          chains,
          existingMultisigs
        );

        onLoaded((currentMultisigs) => {
          const currentByKey = new Map(
            currentMultisigs.map((multisig) => [
              multisig.publicKey.toString(),
              multisig,
            ])
          );
          const loadedKeys = new Set(
            loadedMultisigs.map((multisig) => multisig.publicKey.toString())
          );
          const storedOnly = currentMultisigs.filter(
            (multisig) => !loadedKeys.has(multisig.publicKey.toString())
          );

          const mergedLoaded = loadedMultisigs.map((multisig) => ({
            ...multisig,
            label:
              currentByKey.get(multisig.publicKey.toString())?.label ??
              multisig.label,
            tags:
              currentByKey.get(multisig.publicKey.toString())?.tags ??
              multisig.tags,
            vaultPda:
              currentByKey.get(multisig.publicKey.toString())?.vaultPda ??
              multisig.vaultPda,
          }));

          return [...storedOnly, ...mergedLoaded];
        });
      } catch (error) {
        console.error("Failed to load multisigs:", error);
        toast.error("Failed to load multisigs");
      } finally {
        setLoading(false);
      }
    },
    [chains, existingMultisigs, onLoaded]
  );

  return {
    loading,
    loadForCreator,
  };
}
