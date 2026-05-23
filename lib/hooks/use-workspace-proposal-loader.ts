import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { mapWithConcurrency } from "@/lib/utils/async";
import { getWorkspaceProviderAdapter } from "@/lib/workspace/provider-adapters";
import type { ChainConfig } from "@/types/chain";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

interface UseWorkspaceProposalLoaderOptions {
  chains: ChainConfig[];
  errorMessage: string;
}

interface LoadWorkspaceProposalOptions {
  /** Bypass the adapter-level cache and force a fresh fetch. */
  force?: boolean;
  /** Whether to show a toast on error. Default: true. */
  notifyOnError?: boolean;
}

const PROPOSAL_LOAD_CONCURRENCY = 4;

export function useWorkspaceProposalLoader({
  chains,
  errorMessage,
}: UseWorkspaceProposalLoaderOptions) {
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<WorkspaceProposal[]>([]);
  const [errorsByMultisigKey, setErrorsByMultisigKey] = useState<
    Record<string, string | undefined>
  >({});

  const inFlightKeys = useRef(new Set<string>());

  const loadForAllMultisigs = useCallback(
    async (
      multisigs: WorkspaceMultisig[],
      options: LoadWorkspaceProposalOptions = {}
    ): Promise<WorkspaceProposal[]> => {
      const { force = false, notifyOnError = true } = options;

      const loadable = multisigs.filter((m) => {
        if (m.provider === "squads") return false;
        return getWorkspaceProviderAdapter(m.provider).capabilities.proposalLoading;
      });

      if (loadable.length === 0) {
        setProposals([]);
        return [];
      }

      const pending = force
        ? loadable
        : loadable.filter((m) => !inFlightKeys.current.has(m.key));

      if (pending.length === 0) return proposals;

      for (const m of pending) inFlightKeys.current.add(m.key);
      setLoading(true);

      try {
        const results = await mapWithConcurrency(
          pending,
          PROPOSAL_LOAD_CONCURRENCY,
          async (multisig) => {
            const adapter = getWorkspaceProviderAdapter(multisig.provider);
            try {
              const data = await adapter.loadProposalsForMultisig({
                chains,
                multisig,
                force,
              });
              return { status: "ok" as const, data };
            } catch (err) {
              return { status: "err" as const, err };
            }
          }
        );

        const nextErrors: Record<string, string | undefined> = {};
        const nextProposals = results
          .flatMap((result, i) => {
            if (result.status === "ok") return result.data;
            const key = pending[i]?.key;
            if (key) {
              nextErrors[key] =
                result.err instanceof Error ? result.err.message : errorMessage;
            }
            return [];
          })
          .sort((a, b) => Number(b.transactionIndex - a.transactionIndex));

        if (Object.keys(nextErrors).length > 0) {
          setErrorsByMultisigKey((prev) => ({ ...prev, ...nextErrors }));
          if (notifyOnError) toast.error(errorMessage);
        }

        setProposals(nextProposals);
        return nextProposals;
      } catch (err) {
        console.error(errorMessage, err);
        if (notifyOnError) toast.error(errorMessage);
        return [];
      } finally {
        for (const m of pending) inFlightKeys.current.delete(m.key);
        setLoading(false);
      }
    },
    [chains, errorMessage, proposals]
  );

  return {
    loading,
    proposals,
    errorsByMultisigKey,
    loadForAllMultisigs,
  };
}
