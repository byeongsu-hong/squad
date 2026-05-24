import { http, createConfig } from "wagmi";
import { mainnet, base, optimism, bsc, arbitrum } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId) {
  console.warn("[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set; WalletConnect will not work.");
}

export const wagmiConfig = createConfig({
  chains: [mainnet, base, optimism, bsc, arbitrum],
  ssr: true,
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http("https://eth.llamarpc.com"),
    [base.id]: http("https://base.llamarpc.com"),
    [optimism.id]: http("https://mainnet.optimism.io"),
    [bsc.id]: http("https://bsc-dataseed.bnbchain.org"),
    [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
  },
});
