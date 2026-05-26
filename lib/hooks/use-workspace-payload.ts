import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { decodeSafeCalldataWithCustomAbis } from "@/lib/safe-custom-abi";
import { payloadQueryKey } from "@/lib/state/refresh-policy";
import {
  getUnsupportedProviderMessage,
  getWorkspaceProviderAdapter,
} from "@/lib/workspace/provider-adapters";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";
import type { ChainConfig } from "@/types/chain";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

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
  const safeCustomAbis = useProviderAdapterStore(
    (state) => state.settings.safeCustomAbis
  );
  const {
    data: payload,
    isLoading: loading,
    error: rawError,
  } = useQuery({
    queryKey:
      multisig && proposal
        ? payloadQueryKey({
            provider: multisig.provider,
            chainId: multisig.chainId,
            address: multisig.address,
            nonce: proposal.transactionIndex,
          })
        : ["payload", null],
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
  const decodedPayload = useMemo(() => {
    if (!payload || payload.type !== "safe") {
      return payload ?? null;
    }

    const decoded = decodeSafeCalldataWithCustomAbis(
      payload.data,
      safeCustomAbis
    );

    return decoded
      ? {
          ...payload,
          dataDecoded: decoded,
        }
      : payload;
  }, [payload, safeCustomAbis]);

  return {
    loading,
    payload: decodedPayload,
    error: rawError
      ? rawError instanceof Error
        ? rawError.message
        : "Transaction data not available."
      : null,
  };
}
