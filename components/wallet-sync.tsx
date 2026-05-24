"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

import { useWalletStore } from "@/stores/wallet-store";
import { WalletType } from "@/types/wallet";

export function WalletSync() {
  const { connected: storeConnected, walletName, walletType } = useWalletStore();
  const { connected: adapterConnected, wallets, select, connect } = useWallet();

  useEffect(() => {
    if (
      storeConnected &&
      walletType === WalletType.BROWSER &&
      walletName &&
      !adapterConnected
    ) {
      const walletToReconnect = wallets.find(
        (w) => w.adapter.name === walletName
      );
      if (walletToReconnect) {
        select(walletToReconnect.adapter.name);
        setTimeout(() => {
          connect().catch((error) => {
            console.error("Failed to auto-reconnect wallet:", error);
          });
        }, 100);
      }
    }
  }, [storeConnected, walletType, walletName, adapterConnected, wallets, select, connect]);

  return null;
}
