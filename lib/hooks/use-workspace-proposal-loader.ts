import { useCallback, useState } from "react";
import { toast } from "sonner";

import { mapWithConcurrency } from "@/lib/utils/async";
import { getWorkspaceProviderAdapter } from "@/lib/workspace/provider-adapters";
import type { ChainConfig } from "@/types/chain";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

interface UseWorkspaceProposalLoaderOptions {
  chains: ChainConfig[];
  errorMessage: string;
}

const PROPOSAL_LOAD_CONCURRENCY = 4;

interface LoadWorkspaceProposalOptions {
  force?: boolean;
  notifyOnError?: boolean;
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
    async (
      multisigs: WorkspaceMultisig[],
      options: LoadWorkspaceProposalOptions = {}
    ) => {
      const { force = false, notifyOnError = true } = options;
      const loadableMultisigs = multisigs.filter((multisig) => {
        if (multisig.provider === "squads") {
          return false;
        }

        const adapter = getWorkspaceProviderAdapter(multisig.provider);
        return adapter.capabilities.proposalLoading;
      });
      const pendingMultisigs = force
        ? loadableMultisigs
        : loadableMultisigs.filter(
            (multisig) =>
              !loadingKeys.includes(multisig.key) &&
              !loadedKeys.includes(multisig.key) &&
              !errorsByMultisigKey[multisig.key]
          );

      if (loadableMultisigs.length === 0) {
        setProposals([]);
        return [];
      }

      if (pendingMultisigs.length === 0) {
        return proposals;
      }

      setLoading(true);
      setLoadingKeys(pendingMultisigs.map((multisig) => multisig.key));
      setErrorsByMultisigKey((current) => {
        const next = { ...current };
        for (const multisig of pendingMultisigs) {
          next[multisig.key] = undefined;
        }
        return next;
      });

      try {
        const loaded = await mapWithConcurrency(
          pendingMultisigs,
          PROPOSAL_LOAD_CONCURRENCY,
          async (multisig) => {
            const adapter = getWorkspaceProviderAdapter(multisig.provider);

            try {
              const proposals = await adapter.loadProposalsForMultisig({
                chains,
                multisig,
              });

              return {
                status: "fulfilled" as const,
                value: proposals,
              };
            } catch (error) {
              return {
                status: "rejected" as const,
                reason: error,
              };
            }
          }
        );

        const nextErrors: Record<string, string | undefined> = {};
        const nextProposals = loaded
          .flatMap((result, index) => {
            if (result.status === "fulfilled") {
              return result.value;
            }

            const multisigKey = pendingMultisigs[index]?.key;
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
          loaded.forEach((result, index) => {
            if (result.status === "fulfilled") {
              const multisigKey = pendingMultisigs[index]?.key;
              if (multisigKey) {
                next.add(multisigKey);
              }
            }
          });
          if (force) {
            for (const multisig of pendingMultisigs) {
              if (!nextErrors[multisig.key]) {
                next.add(multisig.key);
              }
            }
          }
          return Array.from(next);
        });
        setProposals(nextProposals);

        if (notifyOnError && Object.keys(nextErrors).length > 0) {
          toast.error(errorMessage);
        }

        return nextProposals;
      } catch (error) {
        console.error(errorMessage, error);
        if (notifyOnError) {
          toast.error(errorMessage);
        }
        return [];
      } finally {
        setLoading(false);
        setLoadingKeys((current) =>
          current.filter(
            (key) => !pendingMultisigs.some((multisig) => multisig.key === key)
          )
        );
      }
    },
    [
      chains,
      errorMessage,
      errorsByMultisigKey,
      loadedKeys,
      loadingKeys,
      proposals,
    ]
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
