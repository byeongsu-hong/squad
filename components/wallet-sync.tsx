"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef } from "react";

import { useWalletStore } from "@/stores/wallet-store";
import { WalletType } from "@/types/wallet";

export function WalletSync() {
  const reconnectAttemptRef = useRef<string | null>(null);
  const {
    connected: storeConnected,
    walletName,
    walletType,
  } = useWalletStore();
  const { connected: adapterConnected, wallets, select, connect } = useWallet();

  useEffect(() => {
    if (!storeConnected || walletType !== WalletType.BROWSER || !walletName) {
      reconnectAttemptRef.current = null;
      return;
    }

    if (adapterConnected) {
      reconnectAttemptRef.current = null;
      return;
    }

    if (reconnectAttemptRef.current === walletName) return;

    const walletToReconnect = wallets.find(
      (w) => w.adapter.name === walletName
    );
    if (!walletToReconnect) return;

    reconnectAttemptRef.current = walletName;
    select(walletToReconnect.adapter.name);
    setTimeout(() => {
      connect().catch((error) => {
        console.error("Failed to auto-reconnect wallet:", error);
      });
    }, 100);
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
