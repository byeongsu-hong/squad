import type { EIP1193Provider } from "viem";
import { createConfig, http } from "wagmi";
import { arbitrum, base, bsc, mainnet, optimism } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

import { OKX_WALLET_ICON } from "./assets/okx-icon";
import { WALLETCONNECT_PROJECT_ID } from "./lib/walletconnect";

if (!WALLETCONNECT_PROJECT_ID) {
  console.warn(
    "[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set; WalletConnect will not work."
  );
}

const chains = [mainnet, base, optimism, bsc, arbitrum] as const;
const isBrowser = typeof window !== "undefined";

const walletConnectMetadata = {
  name: "Squad^2",
  description: "Multisig operations workspace",
  url: !isBrowser
    ? (process.env.NEXT_PUBLIC_APP_URL ?? "https://squad.byeongsu.dev")
    : window.location.origin,
  icons: ["https://squad.byeongsu.dev/icon.png"],
};

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
    target: {
      id: "okxWallet",
      name: "OKX Wallet",
      icon: OKX_WALLET_ICON,
      provider(window) {
        const provider = (
          window as unknown as { okxwallet?: unknown } | undefined
        )?.okxwallet;
        return provider as EIP1193Provider | undefined;
      },
    },
  }),
  ...(WALLETCONNECT_PROJECT_ID && isBrowser
    ? [
        walletConnect({
          metadata: walletConnectMetadata,
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains,
  multiInjectedProviderDiscovery: true,
  ssr: true,
  connectors,
  transports,
});
