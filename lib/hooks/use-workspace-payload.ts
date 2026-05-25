import { useQuery } from "@tanstack/react-query";

import {
  getUnsupportedProviderMessage,
  getWorkspaceProviderAdapter,
} from "@/lib/workspace/provider-adapters";
import type { ChainConfig } from "@/types/chain";
import type {
  WorkspaceMultisig,
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
  const { data: payload, isLoading: loading, error: rawError } = useQuery({
    queryKey: [
      "payload",
      multisig?.provider ?? null,
      multisig?.chainId ?? null,
      multisig?.address ?? null,
      proposal?.transactionIndex?.toString() ?? null,
    ],
    queryFn: async () => {
      if (!multisig || !proposal) return null;

      const adapter = getWorkspaceProviderAdapter(multisig.provider);
      if (!adapter.capabilities.payload) {
        throw new Error(
          getUnsupportedProviderMessage(multisig.provider, "payload")
        );
      }
      return adapter.loadPayload({ chains, multisig, proposal });
    },
    enabled: Boolean(multisig && proposal),
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  return {
    loading,
    payload: payload ?? null,
    error: rawError ? (rawError instanceof Error ? rawError.message : "Transaction data not available.") : null,
  };
}
