import { useCallback, useState } from "react";
import { toast } from "sonner";

import { getWorkspaceProviderAdapter } from "@/lib/workspace/provider-adapters";
import type { ChainConfig } from "@/types/chain";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

interface UseWorkspaceProposalLoaderOptions {
  chains: ChainConfig[];
  errorMessage: string;
}

export function useWorkspaceProposalLoader({
  chains,
  errorMessage,
}: UseWorkspaceProposalLoaderOptions) {
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<WorkspaceProposal[]>([]);

  const loadForAllMultisigs = useCallback(
    async (multisigs: WorkspaceMultisig[]) => {
      const loadableMultisigs = multisigs.filter((multisig) => {
        if (multisig.provider === "squads") {
          return false;
        }

        const adapter = getWorkspaceProviderAdapter(multisig.provider);
        return adapter.capabilities.proposalLoading;
      });

      if (loadableMultisigs.length === 0) {
        setProposals([]);
        return [];
      }

      setLoading(true);

      try {
        const loaded = await Promise.all(
          loadableMultisigs.map((multisig) => {
            const adapter = getWorkspaceProviderAdapter(multisig.provider);

            return adapter.loadProposalsForMultisig({
              chains,
              multisig,
            });
          })
        );

        const nextProposals = loaded
          .flat()
          .sort((left, right) =>
            Number(right.transactionIndex - left.transactionIndex)
          );

        setProposals(nextProposals);
        return nextProposals;
      } catch (error) {
        console.error(errorMessage, error);
        toast.error(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [chains, errorMessage]
  );

  return {
    loading,
    proposals,
    loadForAllMultisigs,
  };
}
