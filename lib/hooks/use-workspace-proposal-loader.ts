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
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<string[]>([]);
  const [errorsByMultisigKey, setErrorsByMultisigKey] = useState<
    Record<string, string | undefined>
  >({});

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
        setLoadingKeys([]);
        setLoadedKeys([]);
        setErrorsByMultisigKey({});
        return [];
      }

      setLoading(true);
      setLoadingKeys(loadableMultisigs.map((multisig) => multisig.key));
      setErrorsByMultisigKey((current) => {
        const next = { ...current };
        for (const multisig of loadableMultisigs) {
          next[multisig.key] = undefined;
        }
        return next;
      });

      try {
        const loaded = await Promise.allSettled(
          loadableMultisigs.map((multisig) => {
            const adapter = getWorkspaceProviderAdapter(multisig.provider);

            return adapter.loadProposalsForMultisig({
              chains,
              multisig,
            });
          })
        );

        const nextErrors: Record<string, string | undefined> = {};
        const nextProposals = loaded
          .flatMap((result, index) => {
            if (result.status === "fulfilled") {
              return result.value;
            }

            const multisigKey = loadableMultisigs[index]?.key;
            if (multisigKey) {
              nextErrors[multisigKey] =
                result.reason instanceof Error
                  ? result.reason.message
                  : errorMessage;
            }
            return [];
          })
          .sort((left, right) =>
            Number(right.transactionIndex - left.transactionIndex)
          );

        setErrorsByMultisigKey((current) => ({
          ...current,
          ...nextErrors,
        }));
        setLoadedKeys((current) => {
          const next = new Set(current);
          for (const multisig of loadableMultisigs) {
            next.add(multisig.key);
          }
          return Array.from(next);
        });
        setProposals(nextProposals);

        if (Object.keys(nextErrors).length > 0) {
          toast.error(errorMessage);
        }

        return nextProposals;
      } catch (error) {
        console.error(errorMessage, error);
        toast.error(errorMessage);
        return [];
      } finally {
        setLoading(false);
        setLoadingKeys([]);
      }
    },
    [chains, errorMessage]
  );

  return {
    loading,
    loadingKeys,
    loadedKeys,
    errorsByMultisigKey,
    proposals,
    loadForAllMultisigs,
  };
}
