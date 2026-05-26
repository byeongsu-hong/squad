import { WalletReadyState } from "@solana/wallet-adapter-base";
import type { Wallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";

interface BrowserWalletInfo {
  name: string;
  icon: string;
  readyState: WalletReadyState;
  url?: string;
}

interface ConnectResult {
  publicKey: PublicKey;
  walletName: string;
}

class BrowserWalletService {
  async connect(wallet: Wallet): Promise<ConnectResult> {
    if (!wallet.adapter) {
      throw new Error("Wallet adapter not found");
    }

    if (wallet.readyState !== WalletReadyState.Installed) {
      throw new Error("Wallet is not installed");
    }

    await wallet.adapter.connect();

    const publicKey = wallet.adapter.publicKey;
    if (!publicKey) {
      throw new Error("Failed to get public key from wallet");
    }

    return {
      publicKey,
      walletName: wallet.adapter.name,
    };
  }

  async disconnect(wallet: Wallet): Promise<void> {
    if (wallet.adapter.connected) {
      await wallet.adapter.disconnect();
    }
  }

  getInstalledWallets(wallets: Wallet[]): Wallet[] {
    return wallets.filter(
      (wallet) => wallet.readyState === WalletReadyState.Installed
    );
  }

  getAvailableWallets(wallets: Wallet[]): Wallet[] {
    return wallets.filter(
      (wallet) => wallet.readyState !== WalletReadyState.Installed
    );
  }

  formatWalletInfo(wallet: Wallet): BrowserWalletInfo {
    return {
      name: wallet.adapter.name,
      icon: wallet.adapter.icon,
      readyState: wallet.readyState,
      url: wallet.adapter.url,
    };
  }
}

export const browserWalletService = new BrowserWalletService();
