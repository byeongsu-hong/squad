import { createConfig, http } from "wagmi";
import { arbitrum, base, bsc, mainnet, optimism } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId) {
  console.warn(
    "[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set; WalletConnect will not work."
  );
}

const chains = [mainnet, base, optimism, bsc, arbitrum] as const;

const transports = {
  [mainnet.id]: http(
    process.env.NEXT_PUBLIC_ETH_RPC_URL ?? "https://eth.llamarpc.com"
  ),
  [base.id]: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://base.llamarpc.com"
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

const connectors = projectId
  ? [walletConnect({ projectId })]
  : [injected()];

export const wagmiConfig = createConfig({
  chains,
  ssr: true,
  connectors,
  transports,
});
