import { getAddress, isAddress } from "viem";

interface Eip1193Provider {
  isMetaMask?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export class EvmWalletService {
  private getProvider() {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No injected EVM wallet was found in this browser.");
    }

    return window.ethereum;
  }

  isInstalled() {
    return typeof window !== "undefined" && Boolean(window.ethereum);
  }

  async connect() {
    const provider = this.getProvider();
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];

    const address = accounts[0];
    if (!address || !isAddress(address)) {
      throw new Error("Failed to read an EVM wallet address.");
    }

    return {
      address: getAddress(address),
      walletName: provider.isMetaMask ? "MetaMask" : "Injected EVM Wallet",
    };
  }

  async getConnectedAddress() {
    const provider = this.getProvider();
    const accounts = (await provider.request({
      method: "eth_accounts",
    })) as string[];

    const address = accounts[0];
    return address && isAddress(address) ? getAddress(address) : null;
  }
}

export const evmWalletService = new EvmWalletService();
