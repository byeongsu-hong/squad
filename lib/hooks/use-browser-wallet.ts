import { useWallet } from "@solana/wallet-adapter-react";
import type { Wallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { browserWalletService } from "@/lib/browser-wallet";
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
        // Select the wallet in the wallet adapter context
        select(wallet.adapter.name);

        // Wait a bit longer to ensure the wallet is selected
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Connect using the wallet adapter's connect method
        // This ensures the wallet adapter context is properly updated
        await walletAdapterConnect();

        // Wait for connection to be established
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Get the public key and wallet name
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

  // Listen for wallet adapter account changes
  useEffect(() => {
    const connectedWallet = wallets.find((w) => w.adapter.connected);
    if (!connectedWallet) return;

    const handleAccountChange = (publicKey: unknown) => {
      if (!publicKey) return;

      // Type guard to ensure publicKey has toString method
      if (
        typeof publicKey === "object" &&
        publicKey !== null &&
        "toString" in publicKey
      ) {
        const pubkeyStr = (publicKey as { toString: () => string }).toString();
        toast.info(
          `Account changed: ${pubkeyStr.slice(0, 4)}...${pubkeyStr.slice(-4)}`
        );
      }
    };

    connectedWallet.adapter.on("connect", handleAccountChange);

    return () => {
      connectedWallet.adapter.off("connect", handleAccountChange);
    };
  }, [wallets]);

  return {
    installedWallets,
    availableWallets,
    connect,
    disconnect,
  };
}
