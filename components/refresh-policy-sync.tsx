"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { requestBroker } from "@/lib/rpc/request-broker";
import {
  applyRefreshPlan,
  getRefreshPlan,
  vaultRefreshTarget,
} from "@/lib/state/refresh-policy";
import { invalidateSafeProposalCache } from "@/lib/workspace/safe-adapter";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { getChainRpcUrls, normalizeChainConfig } from "@/types/chain";
import { type MultisigAccount, getMultisigAccountKey } from "@/types/multisig";

function chainRefreshSignature(chain: ReturnType<typeof normalizeChainConfig>) {
  return JSON.stringify({
    id: chain.id,
    rpcUrl: chain.rpcUrl,
    rpcUrls: getChainRpcUrls(chain),
    provider: chain.multisigProvider,
    programId: chain.squadsV4ProgramId,
  });
}

function providerForMultisig(multisig: MultisigAccount) {
  return multisig.provider ?? "squads";
}

export function RefreshPolicySync() {
  const queryClient = useQueryClient();
  const chains = useChainStore((state) => state.chains);
  const multisigs = useMultisigStore((state) => state.multisigs);
  const previousChainsRef = useRef<Map<string, string> | null>(null);
  const previousMultisigsRef = useRef<Map<string, MultisigAccount> | null>(
    null
  );

  useEffect(() => {
    const currentChains = new Map(
      chains.map((chain) => {
        const normalized = normalizeChainConfig(chain);
        return [normalized.id, chainRefreshSignature(normalized)] as const;
      })
    );
    const previousChains = previousChainsRef.current;
    previousChainsRef.current = currentChains;

    if (!previousChains) return;

    for (const [chainId, signature] of currentChains) {
      if (!previousChains.has(chainId)) continue;
      if (previousChains.get(chainId) === signature) continue;
      requestBroker.invalidate({ pattern: `${chainId}:` });
      applyRefreshPlan(
        queryClient,
        getRefreshPlan({ type: "chainUpdated", chainId })
      );
    }

    for (const chainId of previousChains.keys()) {
      if (currentChains.has(chainId)) continue;
      requestBroker.invalidate({ pattern: `${chainId}:` });
      applyRefreshPlan(
        queryClient,
        getRefreshPlan({ type: "chainDeleted", chainId })
      );
    }
  }, [chains, queryClient]);

  useEffect(() => {
    const currentMultisigs = new Map(
      multisigs.map((multisig) => [getMultisigAccountKey(multisig), multisig])
    );
    const previousMultisigs = previousMultisigsRef.current;
    previousMultisigsRef.current = currentMultisigs;

    if (!previousMultisigs) return;

    for (const [key, multisig] of previousMultisigs) {
      if (currentMultisigs.has(key)) continue;

      const provider = providerForMultisig(multisig);
      const address = multisig.publicKey.toString();
      if (provider === "safe") {
        invalidateSafeProposalCache(multisig.chainId, address);
      }
      requestBroker.invalidate({ pattern: address });
      applyRefreshPlan(
        queryClient,
        getRefreshPlan({
          type: "vaultDeleted",
          target: vaultRefreshTarget({
            provider,
            chainId: multisig.chainId,
            address,
          }),
        })
      );
    }
  }, [multisigs, queryClient]);

  return null;
}
