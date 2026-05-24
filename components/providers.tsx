"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { Toaster } from "@/components/ui/sonner";
import { resolveInitialMultisigs } from "@/lib/initial-config";
import { wagmiConfig } from "@/lib/wagmi-config";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";
import { getMultisigAccountKey } from "@/types/multisig";

import { WalletAdapterProvider } from "./wallet-adapter-provider";
import { WalletSync } from "./wallet-sync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const didInitRef = useRef(false);
  const initializeChains = useChainStore((state) => state.initializeChains);
  const initializeMultisigs = useMultisigStore(
    (state) => state.initializeMultisigs
  );
  const initializeProviderAdapterSettings = useProviderAdapterStore(
    (state) => state.initializeSettings
  );
  const setMultisigs = useMultisigStore((state) => state.setMultisigs);
  const selectMultisig = useMultisigStore((state) => state.selectMultisig);

  useEffect(() => {
    if (didInitRef.current) {
      return;
    }

    didInitRef.current = true;

    const run = async () => {
      initializeChains();
      initializeMultisigs();
      initializeProviderAdapterSettings();

      const { multisigs, selectedMultisigKey } = useMultisigStore.getState();
      const seededMultisigs = await resolveInitialMultisigs();
      if (seededMultisigs.length === 0) {
        return;
      }

      const existingKeys = new Set(
        multisigs.map(
          (multisig) => `${multisig.chainId}:${multisig.publicKey.toString()}`
        )
      );
      const missingSeeds = seededMultisigs.filter(
        (multisig) =>
          !existingKeys.has(
            `${multisig.chainId}:${multisig.publicKey.toString()}`
          )
      );

      if (missingSeeds.length === 0) {
        return;
      }

      setMultisigs([...multisigs, ...missingSeeds]);

      if (!selectedMultisigKey) {
        selectMultisig(getMultisigAccountKey(multisigs[0] ?? missingSeeds[0]));
      }
    };

    void run();
  }, [
    initializeChains,
    initializeMultisigs,
    initializeProviderAdapterSettings,
    selectMultisig,
    setMultisigs,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
            <WalletAdapterProvider>
              <WalletSync />
              {children}
              <Toaster />
            </WalletAdapterProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
