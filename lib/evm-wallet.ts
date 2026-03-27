import { getAddress, isAddress } from "viem";

interface Eip1193Provider {
  isMetaMask?: boolean;
  request(args: {
    method: string;
    params?: readonly unknown[] | object;
  }): Promise<unknown>;
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

  async switchToChain(chainId: bigint) {
    const provider = this.getProvider();

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to switch the EVM wallet to the required chain."
      );
    }
  }
}

export const evmWalletService = new EvmWalletService();
