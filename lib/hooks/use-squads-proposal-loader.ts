import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  fromWorkspaceProposal,
  invalidateSquadsProposalCache,
  loadSquadsWorkspaceProposals,
  loadSquadsWorkspaceProposalsForMultisig,
} from "@/lib/workspace/squads-adapter";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount, ProposalAccount } from "@/types/multisig";

interface UseSquadsProposalLoaderOptions {
  chains: ChainConfig[];
  setProposals: (proposals: ProposalAccount[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  errorMessage: string;
}

export function useSquadsProposalLoader({
  chains,
  setProposals,
  onLoadingChange,
  errorMessage,
}: UseSquadsProposalLoaderOptions) {
  const [loading, setLoading] = useState(false);

  const loadForAllMultisigs = useCallback(
    async (multisigs: MultisigAccount[]) => {
      if (multisigs.length === 0) {
        setProposals([]);
        return;
      }

      setLoading(true);
      onLoadingChange?.(true);

      try {
        const loadedProposals = await loadSquadsWorkspaceProposals(
          multisigs,
          chains
        );
        setProposals(loadedProposals.map(fromWorkspaceProposal));
      } catch (error) {
        console.error(errorMessage, error);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    },
    [chains, errorMessage, onLoadingChange, setProposals]
  );

  const loadForMultisig = useCallback(
    async (multisig: MultisigAccount | null | undefined) => {
      if (!multisig) {
        return;
      }

      setLoading(true);
      onLoadingChange?.(true);

      try {
        const loadedProposals = await loadSquadsWorkspaceProposalsForMultisig(
          multisig,
          chains
        );
        setProposals(loadedProposals.map(fromWorkspaceProposal));
      } catch (error) {
        console.error(errorMessage, error);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    },
    [chains, errorMessage, onLoadingChange, setProposals]
  );

  const invalidateForMultisig = useCallback(
    (multisig: MultisigAccount | null | undefined) => {
      if (!multisig) {
        return;
      }

      invalidateSquadsProposalCache(
        multisig.chainId,
        multisig.publicKey.toString(),
        chains
      );
    },
    [chains]
  );

  return {
    loading,
    loadForAllMultisigs,
    loadForMultisig,
    invalidateForMultisig,
  };
}
