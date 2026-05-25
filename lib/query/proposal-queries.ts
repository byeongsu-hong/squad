import { PublicKey } from "@solana/web3.js";

import { getWorkspaceProviderAdapter } from "@/lib/workspace/provider-adapters";
import { loadSquadsWorkspaceProposalsForMultisig } from "@/lib/workspace/squads-adapter";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

export function proposalsQueryKey(
  provider: string,
  chainId: string,
  multisigAddress: string
) {
  return ["proposals", provider, chainId, multisigAddress] as const;
}

function toSquadsMultisigAccount(multisig: WorkspaceMultisig): MultisigAccount {
  return {
    provider: "squads",
    publicKey: new PublicKey(multisig.address),
    chainId: multisig.chainId,
    threshold: multisig.threshold,
    members: multisig.members.map((m) => ({
      key: new PublicKey(m.address),
      permissions: { mask: m.permissionsMask },
    })),
    transactionIndex: 0n,
    msChangeIndex: 0,
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
      if (multisig.provider === "safe") {
        const adapter = getWorkspaceProviderAdapter("safe");
        if (!adapter.capabilities.proposalLoading) return [];
        return adapter.loadProposalsForMultisig({ chains, multisig });
      }
      return loadSquadsWorkspaceProposalsForMultisig(
        toSquadsMultisigAccount(multisig),
        chains
      );
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
  };
}
