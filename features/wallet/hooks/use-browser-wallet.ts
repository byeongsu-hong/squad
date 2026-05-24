import { useWallet } from "@solana/wallet-adapter-react";
import type { Wallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { browserWalletService } from "@/lib/browser-wallet";
import { formatAddress } from "@/lib/utils/format-address";
import { useWalletStore } from "@/stores/wallet-store";

export function useBrowserWallet() {
  const {
    wallets,
    select,
    connect: walletAdapterConnect,
    disconnect: walletAdapterDisconnect,
  } = useWallet();
  const { connectBrowser } = useWalletStore();

  const installedWallets = useMemo(
    () => browserWalletService.getInstalledWallets(wallets),
    [wallets]
  );

  const availableWallets = useMemo(
    () => browserWalletService.getAvailableWallets(wallets),
    [wallets]
  );

  const connect = useCallback(
    async (wallet: Wallet) => {
      try {
        select(wallet.adapter.name);

        await new Promise((resolve) => setTimeout(resolve, 100));

        await walletAdapterConnect();

        await new Promise((resolve) => setTimeout(resolve, 100));

        const publicKey = wallet.adapter.publicKey;
        if (!publicKey) {
          throw new Error("Failed to get public key from wallet");
        }

        const walletName = wallet.adapter.name;
        connectBrowser(publicKey, walletName);
        return { publicKey, walletName };
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        throw error;
      }
    },
    [connectBrowser, select, walletAdapterConnect]
  );

  const disconnect = useCallback(async () => {
    await walletAdapterDisconnect();
  }, [walletAdapterDisconnect]);

  useEffect(() => {
    const connectedWallet = wallets.find((w) => w.adapter.connected);
    if (!connectedWallet) return;

    const handleAccountChange = (publicKey: unknown) => {
      if (!publicKey) return;
      if (
        typeof publicKey === "object" &&
        publicKey !== null &&
        "toString" in publicKey
      ) {
        const pubkeyStr = (publicKey as { toString: () => string }).toString();
        toast.info(`Account changed: ${formatAddress(pubkeyStr, 4, 4)}`);
      }
    };

    connectedWallet.adapter.on("connect", handleAccountChange);
    return () => {
      connectedWallet.adapter.off("connect", handleAccountChange);
    };
  }, [wallets]);

  return { installedWallets, availableWallets, connect, disconnect };
}
