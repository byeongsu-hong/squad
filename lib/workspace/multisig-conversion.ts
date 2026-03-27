import { type ChainConfig, normalizeChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import {
  type WorkspaceMultisig,
  getWorkspaceMultisigKey,
} from "@/types/workspace";

function getChainConfig(chains: ChainConfig[], chainId: string) {
  return chains.find((chain) => chain.id === chainId);
}

export function toWorkspaceMultisig(
  multisig: MultisigAccount,
  chains: ChainConfig[]
): WorkspaceMultisig {
  const chain = getChainConfig(chains, multisig.chainId);
  const normalizedChain = chain ? normalizeChainConfig(chain) : null;

  return {
    provider: normalizedChain?.multisigProvider ?? "squads",
    key: getWorkspaceMultisigKey(
      multisig.chainId,
      multisig.publicKey.toString()
    ),
    address: multisig.publicKey.toString(),
    chainId: multisig.chainId,
    chainName: normalizedChain?.name ?? multisig.chainId,
    label: multisig.label,
    tags: multisig.tags ?? [],
    threshold: multisig.threshold,
    members: multisig.members.map((member) => ({
      address: member.key.toString(),
      permissionsMask: member.permissions.mask,
    })),
    vaultAddress: multisig.vaultPda?.toString(),
  };
}

export function toWorkspaceMultisigs(
  multisigs: MultisigAccount[],
  chains: ChainConfig[]
) {
  return multisigs.map((multisig) => toWorkspaceMultisig(multisig, chains));
}
