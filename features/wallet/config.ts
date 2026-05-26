import type { EIP1193Provider } from "viem";
import { createConfig, http } from "wagmi";
import { arbitrum, base, bsc, mainnet, optimism } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

import { OKX_WALLET_ICON } from "./assets/okx-icon";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId) {
  console.warn(
    "[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set; WalletConnect will not work."
  );
}

const chains = [mainnet, base, optimism, bsc, arbitrum] as const;

const transports = {
  [mainnet.id]: http(
    process.env.NEXT_PUBLIC_ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com"
  ),
  [base.id]: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://base-rpc.publicnode.com"
  ),
  [optimism.id]: http(
    process.env.NEXT_PUBLIC_OP_RPC_URL ?? "https://mainnet.optimism.io"
  ),
  [bsc.id]: http(
    process.env.NEXT_PUBLIC_BSC_RPC_URL ?? "https://bsc-dataseed.bnbchain.org"
  ),
  [arbitrum.id]: http(
    process.env.NEXT_PUBLIC_ARB_RPC_URL ?? "https://arb1.arbitrum.io/rpc"
  ),
};

const connectors = [
  injected({
    target: () => {
      if (typeof window === "undefined") return undefined;
      const provider = (window as unknown as Record<string, unknown>).okxwallet;
      if (!provider) return undefined;
      return {
        id: "okxWallet",
        name: "OKX Wallet",
        icon: OKX_WALLET_ICON,
        provider: provider as EIP1193Provider,
      };
    },
  }),
  ...(projectId ? [walletConnect({ projectId })] : []),
];

export const wagmiConfig = createConfig({
  chains,
  multiInjectedProviderDiscovery: false,
  ssr: true,
  connectors,
  transports,
});
