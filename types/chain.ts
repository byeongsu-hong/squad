export type ChainVmFamily = "svm" | "evm";
export type ChainMultisigProvider = "squads" | "safe";

export interface ChainConfig {
  id: string;
  name: string;
  rpcUrl: string;
  squadsV4ProgramId?: string;
  explorerUrl?: string;
  vmFamily?: ChainVmFamily;
  multisigProvider?: ChainMultisigProvider;
  isDefault?: boolean;
}

export function normalizeChainConfig(chain: ChainConfig): ChainConfig {
  const normalizedProvider = chain.multisigProvider ?? "squads";

  return {
    ...chain,
    vmFamily: chain.vmFamily ?? "svm",
    multisigProvider: normalizedProvider,
    squadsV4ProgramId:
      normalizedProvider === "squads"
        ? (chain.squadsV4ProgramId ?? "")
        : undefined,
  };
}

export function isOperationalSquadsChain(chain: ChainConfig) {
  const normalizedChain = normalizeChainConfig(chain);

  return (
    normalizedChain.vmFamily === "svm" &&
    normalizedChain.multisigProvider === "squads" &&
    (normalizedChain.squadsV4ProgramId?.length ?? 0) > 0
  );
}

export function getOperationalSquadsChains(chains: ChainConfig[]) {
  return chains.filter(isOperationalSquadsChain);
}

export function getSquadsProgramId(chain: ChainConfig): string {
  const normalizedChain = normalizeChainConfig(chain);

  if (!isOperationalSquadsChain(normalizedChain)) {
    throw new Error(`Chain ${chain.name} is not configured for Squads.`);
  }

  const programId = normalizedChain.squadsV4ProgramId;
  if (!programId) {
    throw new Error(`Chain ${chain.name} is missing a Squads program ID.`);
  }

  return programId;
}

// Note: Public RPC endpoints have strict rate limits and may return 403 errors.
// For production use, consider using custom RPC providers like:
// - Helius (https://helius.xyz)
// - QuickNode (https://quicknode.com)
// - Alchemy (https://alchemy.com)
// You can update RPC URLs in the Chain Management settings.

export const DEFAULT_CHAINS: ChainConfig[] = [
  {
    id: "solana-mainnet",
    name: "Solana",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    squadsV4ProgramId: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
    explorerUrl: "https://explorer.solana.com",
    vmFamily: "svm",
    multisigProvider: "squads",
    isDefault: true,
  },
  {
    id: "soon-mainnet",
    name: "Soon",
    rpcUrl: "https://rpc.mainnet.soo.network/rpc",
    squadsV4ProgramId: "Hz8Zg8JYFshThnKHXSZV9XJFbyYUUKBb5NJUrxDvF8PB",
    explorerUrl: "https://explorer.soo.network",
    vmFamily: "svm",
    multisigProvider: "squads",
  },
  {
    id: "eclipse-mainnet",
    name: "Eclipse",
    rpcUrl: "https://mainnetbeta-rpc.eclipse.xyz",
    squadsV4ProgramId: "eSQDSMLf3qxwHVHeTr9amVAGmZbRLY2rFdSURandt6f",
    explorerUrl: "https://explorer.eclipse.xyz",
    vmFamily: "svm",
    multisigProvider: "squads",
  },
  {
    id: "sonicsvm-mainnet",
    name: "SonicSVM",
    rpcUrl: "https://api.mainnet-alpha.sonic.game",
    squadsV4ProgramId: "sqdsFBUUwbsuoLUhoWdw343Je6mvn7dGVVRYCa4wtqJ",
    explorerUrl: "https://explorer.sonic.game",
    vmFamily: "svm",
    multisigProvider: "squads",
  },
  {
    id: "solaxy-mainnet",
    name: "Solaxy",
    rpcUrl: "https://mainnet.rpc.solaxy.io",
    squadsV4ProgramId: "222DRw2LbM7xztYq1efxcbfBePi6xnv27o7QBGm9bpts",
    explorerUrl: "https://explorer.solaxy.io",
    vmFamily: "svm",
    multisigProvider: "squads",
  },
  {
    id: "svmbnb-mainnet",
    name: "SVM BNB",
    rpcUrl: "https://rpc.svmbnbmainnet.soo.network/rpc",
    squadsV4ProgramId: "Hz8Zg8JYFshThnKHXSZV9XJFbyYUUKBb5NJUrxDvF8PB",
    explorerUrl: "https://explorer.svmbnb.soo.network",
    vmFamily: "svm",
    multisigProvider: "squads",
  },
  {
    id: "ethereum-mainnet",
    name: "Ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    vmFamily: "evm",
    multisigProvider: "safe",
  },
  {
    id: "base-mainnet",
    name: "Base",
    rpcUrl: "https://base.llamarpc.com",
    explorerUrl: "https://basescan.org",
    vmFamily: "evm",
    multisigProvider: "safe",
  },
  {
    id: "optimism-mainnet",
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    vmFamily: "evm",
    multisigProvider: "safe",
  },
  {
    id: "bnb-mainnet",
    name: "BNB Chain",
    rpcUrl: "https://bsc-dataseed.bnbchain.org",
    explorerUrl: "https://bscscan.com",
    vmFamily: "evm",
    multisigProvider: "safe",
  },
  {
    id: "arbitrum-mainnet",
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    vmFamily: "evm",
    multisigProvider: "safe",
  },
];
