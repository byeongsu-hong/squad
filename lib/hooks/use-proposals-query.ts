import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { useWorkspaceMultisigs } from "@/lib/hooks/use-workspace-multisigs";
import { proposalsQueryOptions } from "@/lib/query/proposal-queries";
import type { WorkspaceProposal } from "@/types/workspace";

export function useProposalsQuery() {
  const { chains, workspaceMultisigs } = useWorkspaceMultisigs();

  const results = useQueries({
    queries: workspaceMultisigs.map((m) => proposalsQueryOptions(m, chains)),
  });

  const proposals = useMemo(
    () => results.flatMap((r): WorkspaceProposal[] => r.data ?? []),
    [results]
  );

  // Only show loading during initial load (no data yet).
  // Avoids flashing loading state when adding/importing new vaults into an existing registry.
  const hasAnyData = results.some((r) => r.data !== undefined);
  const loading = !hasAnyData && results.some((r) => r.isLoading);

  return { proposals, loading, workspaceMultisigs };
}
