import { useMemo } from "react";

import { useSquadsProposalLoader } from "@/lib/hooks/use-squads-proposal-loader";
import { useWorkspaceMultisigs } from "@/lib/hooks/use-workspace-multisigs";
import { useWorkspaceProposalLoader } from "@/lib/hooks/use-workspace-proposal-loader";
import { useMultisigStore } from "@/stores/multisig-store";

/**
 * Unified hook that sets up both Squads and Safe proposal loaders and exposes
 * a single `loadAll` function. Use this instead of wiring both loaders manually
 * in each page component.
 */
export function useAllProposalsLoader({ errorMessage = "Failed to load proposals" } = {}) {
  const { multisigs, setProposals } = useMultisigStore();
  const { chains, proposals, workspaceMultisigs } = useWorkspaceMultisigs();

  const squadsMultisigs = useMemo(
    () => multisigs.filter((m) => m.provider === "squads"),
    [multisigs]
  );

  const safeMultisigs = useMemo(
    () => workspaceMultisigs.filter((m) => m.provider === "safe"),
    [workspaceMultisigs]
  );

  const {
    loading: squadsLoading,
    loadForAllMultisigs: loadSquadsProposals,
    invalidateForMultisig,
  } = useSquadsProposalLoader({
    chains,
    setProposals,
    errorMessage,
  });

  const {
    loading: safeLoading,
    proposals: safeProposals,
    loadForAllMultisigs: loadSafeProposals,
  } = useWorkspaceProposalLoader({
    chains,
    errorMessage,
  });

  const loading = squadsLoading || safeLoading;

  const loadAll = async (opts: { force?: boolean; notifyOnError?: boolean } = {}) => {
    await Promise.all([
      loadSquadsProposals(squadsMultisigs),
      loadSafeProposals(safeMultisigs, { notifyOnError: opts.notifyOnError ?? false, force: opts.force }),
    ]);
  };

  return {
    loading,
    chains,
    proposals,
    safeProposals,
    workspaceMultisigs,
    squadsMultisigs,
    safeMultisigs,
    loadAll,
    invalidateForMultisig,
  };
}
