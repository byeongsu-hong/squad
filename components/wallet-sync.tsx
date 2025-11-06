"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

import { useWalletStore } from "@/stores/wallet-store";
import { WalletType } from "@/types/wallet";

/**
 * Component that synchronizes wallet adapter connection with stored wallet state.
 * This ensures the wallet adapter is reconnected when the page reloads.
 */
export function WalletSync() {
  const {
    connected: storeConnected,
    walletName,
    walletType,
  } = useWalletStore();
  const { connected: adapterConnected, wallets, select, connect } = useWallet();

  useEffect(() => {
    // If store says we're connected with a browser wallet, but adapter isn't connected
    if (
      storeConnected &&
      walletType === WalletType.BROWSER &&
      walletName &&
      !adapterConnected
    ) {
      // Find the wallet and reconnect
      const walletToReconnect = wallets.find(
        (w) => w.adapter.name === walletName
      );
      if (walletToReconnect) {
        console.log("Auto-reconnecting wallet adapter:", walletName);
        select(walletToReconnect.adapter.name);
        // Small delay to ensure selection is processed
        setTimeout(() => {
          connect().catch((error) => {
            console.error("Failed to auto-reconnect wallet:", error);
          });
        }, 100);
      }
    }
  }, [
    storeConnected,
    walletType,
    walletName,
    adapterConnected,
    wallets,
    select,
    connect,
  ]);

  return null;
}
