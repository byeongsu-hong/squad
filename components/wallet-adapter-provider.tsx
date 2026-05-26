"use client";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";

import { useChainStore } from "@/stores/chain-store";

interface WalletAdapterProviderProps {
  children: React.ReactNode;
}

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export function WalletAdapterProvider({
  children,
}: WalletAdapterProviderProps) {
  const chains = useChainStore((state) => state.chains);

  const endpoint = useMemo(() => {
    const solanaMainnet = chains.find((chain) => chain.id === "solana-mainnet");
    return solanaMainnet?.rpcUrl || "https://api.mainnet-beta.solana.com";
  }, [chains]);

  const wallets = useMemo(() => {
    if (!WC_PROJECT_ID) return [];
    return [
      new WalletConnectWalletAdapter({
        network: WalletAdapterNetwork.Mainnet,
        options: { projectId: WC_PROJECT_ID },
      }),
    ];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
