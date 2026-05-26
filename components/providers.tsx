"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef } from "react";
import { WagmiProvider } from "wagmi";

import { Toaster } from "@/components/ui/sonner";
import { wagmiConfig } from "@/features/wallet";
import { resolveInitialMultisigs } from "@/lib/initial-config";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";

import { ProposalsSync } from "./proposals-sync";
import { RefreshPolicySync } from "./refresh-policy-sync";
import { WalletAdapterProvider } from "./wallet-adapter-provider";
import { WalletSync } from "./wallet-sync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 600_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
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

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const run = async () => {
      initializeChains();
      initializeMultisigs();
      initializeProviderAdapterSettings();

      const { multisigs } = useMultisigStore.getState();
      const seededMultisigs = await resolveInitialMultisigs();
      if (seededMultisigs.length === 0) return;

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

      if (missingSeeds.length === 0) return;

      setMultisigs([...multisigs, ...missingSeeds]);
    };

    void run();
  }, [
    initializeChains,
    initializeMultisigs,
    initializeProviderAdapterSettings,
    setMultisigs,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
        >
          <WalletAdapterProvider>
            <WalletSync />
            <RefreshPolicySync />
            <ProposalsSync />
            {children}
            <Toaster />
          </WalletAdapterProvider>
        </ThemeProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
