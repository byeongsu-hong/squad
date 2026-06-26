import { PublicKey } from "@solana/web3.js";

import { proposalQueryKey } from "@/lib/state/refresh-policy";
import { getWorkspaceProviderAdapter } from "@/lib/workspace/provider-adapters";
import { loadSquadsWorkspaceProposalsForMultisig } from "@/lib/workspace/squads-adapter";
import { useRefreshStore } from "@/stores/refresh-store";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import type {
  WorkspaceMultisig,
  WorkspaceProposal,
  WorkspaceProviderId,
} from "@/types/workspace";

export function proposalsQueryKey(
  provider: WorkspaceProviderId,
  chainId: string,
  multisigAddress: string
) {
  return proposalQueryKey(provider, chainId, multisigAddress);
}

function refreshScopeForMultisig(multisig: WorkspaceMultisig) {
  return {
    provider: multisig.provider,
    chainId: multisig.chainId,
    address: multisig.address,
  };
}

function toSquadsMultisigAccount(multisig: WorkspaceMultisig): MultisigAccount {
  return {
    provider: "squads",
    squadsVersion: multisig.squadsVersion,
    publicKey: new PublicKey(multisig.address),
    chainId: multisig.chainId,
    threshold: multisig.threshold,
    members: multisig.members.map((m) => ({
      key: new PublicKey(m.address),
      permissions: { mask: m.permissionsMask },
    })),
    transactionIndex: 0n,
    msChangeIndex: 0,
    vaultPda: multisig.vaultAddress
      ? new PublicKey(multisig.vaultAddress)
      : undefined,
  };
}

export function proposalsQueryOptions(
  multisig: WorkspaceMultisig,
  chains: ChainConfig[]
) {
  return {
    queryKey: proposalsQueryKey(
      multisig.provider,
      multisig.chainId,
      multisig.address
    ),
    queryFn: async (): Promise<WorkspaceProposal[]> => {
      const refreshStore = useRefreshStore.getState();
      const refreshScope = refreshScopeForMultisig(multisig);
      refreshStore.startRefresh(refreshScope);

      try {
        let proposals: WorkspaceProposal[];
        if (multisig.provider === "safe") {
          const adapter = getWorkspaceProviderAdapter("safe");
          proposals = adapter.capabilities.proposalLoading
            ? await adapter.loadProposalsForMultisig({
                chains,
                multisig,
                force: true,
              })
            : [];
        } else {
          proposals = await loadSquadsWorkspaceProposalsForMultisig(
            toSquadsMultisigAccount(multisig),
            chains
          );
        }
        refreshStore.finishRefresh(refreshScope);
        return proposals;
      } catch (error) {
        refreshStore.markDegraded(
          refreshScope,
          error instanceof Error ? error.message : "Proposal refresh failed."
        );
        refreshStore.markStale(refreshScope);
        throw error;
      }
    },
    staleTime: 120_000,
  };
}
