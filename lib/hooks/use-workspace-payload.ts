import { useEffect, useState } from "react";

import { loadSquadsWorkspacePayload } from "@/lib/workspace/squads-adapter";
import type { ChainConfig } from "@/types/chain";
import type {
  WorkspaceMultisig,
  WorkspacePayload,
  WorkspaceProposal,
} from "@/types/workspace";

interface UseWorkspacePayloadOptions {
  chains: ChainConfig[];
  multisig: WorkspaceMultisig | null;
  proposal: WorkspaceProposal | null;
}

export function useWorkspacePayload({
  chains,
  multisig,
  proposal,
}: UseWorkspacePayloadOptions) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<WorkspacePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPayload() {
      if (!multisig || !proposal) {
        setPayload(null);
        setError(null);
        return;
      }

      setLoading(true);
      setPayload(null);
      setError(null);

      try {
        const nextPayload = await loadSquadsWorkspacePayload(
          multisig,
          proposal,
          chains
        );

        if (!cancelled) {
          setPayload(nextPayload);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Transaction data not available."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPayload();

    return () => {
      cancelled = true;
    };
  }, [chains, multisig, proposal]);

  return {
    loading,
    payload,
    error,
  };
}
