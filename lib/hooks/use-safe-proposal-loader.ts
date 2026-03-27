import { useCallback, useState } from "react";

import { getWorkspaceProviderAdapter } from "@/lib/workspace/provider-adapters";
import type { ChainConfig } from "@/types/chain";
import type {
  WorkspaceMultisig,
  WorkspaceProposal,
  WorkspaceProviderId,
} from "@/types/workspace";

interface UseSafeProposalLoaderOptions {
  chains: ChainConfig[];
}

function isProviderMultisig(
  multisig: WorkspaceMultisig,
  provider: WorkspaceProviderId
) {
  return multisig.provider === provider;
}

export function useSafeProposalLoader({
  chains,
}: UseSafeProposalLoaderOptions) {
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<WorkspaceProposal[]>([]);

  const loadForAllMultisigs = useCallback(
    async (multisigs: WorkspaceMultisig[]) => {
      const safeMultisigs = multisigs.filter((multisig) =>
        isProviderMultisig(multisig, "safe")
      );

      if (safeMultisigs.length === 0) {
        setProposals([]);
        return [];
      }

      setLoading(true);

      try {
        const adapter = getWorkspaceProviderAdapter("safe");
        const loaded = await Promise.all(
          safeMultisigs.map((multisig) =>
            adapter.loadProposalsForMultisig({
              chains,
              multisig,
            })
          )
        );

        const nextProposals = loaded
          .flat()
          .sort((left, right) =>
            Number(right.transactionIndex - left.transactionIndex)
          );

        setProposals(nextProposals);
        return nextProposals;
      } finally {
        setLoading(false);
      }
    },
    [chains]
  );

  return {
    loading,
    proposals,
    loadForAllMultisigs,
  };
}
