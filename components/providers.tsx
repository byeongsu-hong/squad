"use client";

import { ThemeProvider } from "next-themes";
import { useEffect, useRef } from "react";

import { Toaster } from "@/components/ui/sonner";
import { resolveInitialMultisigs } from "@/lib/initial-config";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";

import { WalletAdapterProvider } from "./wallet-adapter-provider";
import { WalletSync } from "./wallet-sync";

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

      const { chains } = useChainStore.getState();
      const { multisigs, selectedMultisigKey } = useMultisigStore.getState();

      if (multisigs.length > 0) {
        return;
      }

      const seededMultisigs = await resolveInitialMultisigs(chains);
      if (seededMultisigs.length === 0) {
        return;
      }

      setMultisigs(seededMultisigs);

      if (!selectedMultisigKey) {
        selectMultisig(seededMultisigs[0].publicKey.toString());
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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <WalletAdapterProvider>
        <WalletSync />
        {children}
        <Toaster />
      </WalletAdapterProvider>
    </ThemeProvider>
  );
}
