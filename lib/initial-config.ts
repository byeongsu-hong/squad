import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

interface InitialMultisigSeed {
  provider?: "squads" | "safe";
  publicKey: string;
  chainId: string;
  label: string;
  tags?: string[];
}

export const INITIAL_MULTISIG_SEEDS: InitialMultisigSeed[] = [];

export async function resolveInitialMultisigs(
  chains: ChainConfig[]
): Promise<MultisigAccount[]> {
  void chains;
  return [];
}
