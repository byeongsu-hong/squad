import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, createConfig, type Config } from "wagmi";
import { mainnet, base, optimism, bsc, arbitrum } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId) {
  console.warn(
    "[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set; WalletConnect will not work.",
  );
}

const chains = [mainnet, base, optimism, bsc, arbitrum] as const;

const transports = {
  [mainnet.id]: http("https://eth.llamarpc.com"),
  [base.id]: http("https://base.llamarpc.com"),
  [optimism.id]: http("https://mainnet.optimism.io"),
  [bsc.id]: http("https://bsc-dataseed.bnbchain.org"),
  [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
};

export const wagmiConfig: Config = projectId
  ? getDefaultConfig({ appName: "Squad", projectId, chains, ssr: true, transports })
  : createConfig({ chains, ssr: true, connectors: [injected()], transports });
