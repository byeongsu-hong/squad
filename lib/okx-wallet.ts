import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

/**
 * OKX Wallet Solana Provider interface
 * Based on https://web3.okx.com/build/dev-docs/sdks/chains/solana/provider
 */
interface OkxSolanaProvider {
  isOkxWallet?: boolean;
  publicKey?: { toBase58(): string };
  isConnected?: boolean;
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]>;
  signMessage(
    message: Uint8Array,
    encoding?: string
  ): Promise<{ signature: Uint8Array }>;
  signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    options?: { skipPreflight?: boolean }
  ): Promise<{ signature: string }>;
  on(event: string, callback: () => void): void;
  off(event: string, callback: () => void): void;
}

declare global {
  interface Window {
    okxwallet?: {
      solana?: OkxSolanaProvider;
    };
  }
}

export interface OkxConnectResult {
  publicKey: PublicKey;
}

export class OkxWalletService {
  private getProvider(): OkxSolanaProvider {
    const provider = window.okxwallet?.solana;
    if (!provider) {
      throw new Error(
        "OKX Wallet is not installed. Please install the OKX Wallet extension."
      );
    }
    return provider;
  }

  /**
   * Check if OKX wallet extension is installed
   */
  isInstalled(): boolean {
    return typeof window !== "undefined" && !!window.okxwallet?.solana;
  }

  /**
   * Check if currently connected to OKX wallet
   */
  isConnected(): boolean {
    try {
      const provider = this.getProvider();
      return !!provider.isConnected && !!provider.publicKey;
    } catch {
      return false;
    }
  }

  /**
   * Get the current public key if connected
   */
  getPublicKey(): PublicKey | null {
    try {
      const provider = this.getProvider();
      if (provider.publicKey) {
        return new PublicKey(provider.publicKey.toBase58());
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Connect to OKX wallet
   */
  async connect(): Promise<OkxConnectResult> {
    const provider = this.getProvider();

    const response = await provider.connect();
    const publicKey = new PublicKey(response.publicKey.toBase58());

    return { publicKey };
  }

  /**
   * Disconnect from OKX wallet
   */
  async disconnect(): Promise<void> {
    try {
      const provider = this.getProvider();
      await provider.disconnect();
    } catch {
      // Ignore errors during disconnect
    }
  }

  /**
   * Sign a legacy transaction
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    const provider = this.getProvider();
    return await provider.signTransaction(transaction);
  }

  /**
   * Sign a versioned transaction (V0)
   */
  async signVersionedTransaction(
    transaction: VersionedTransaction
  ): Promise<VersionedTransaction> {
    const provider = this.getProvider();
    return await provider.signTransaction(transaction);
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    const provider = this.getProvider();
    return await provider.signAllTransactions(transactions);
  }

  /**
   * Sign a message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = this.getProvider();
    const result = await provider.signMessage(message, "utf8");
    return result.signature;
  }

  /**
   * Register event listener
   */
  on(
    event: "connect" | "disconnect" | "accountChanged",
    callback: () => void
  ): void {
    try {
      const provider = this.getProvider();
      provider.on(event, callback);
    } catch {
      // Ignore if provider not available
    }
  }

  /**
   * Remove event listener
   */
  off(
    event: "connect" | "disconnect" | "accountChanged",
    callback: () => void
  ): void {
    try {
      const provider = this.getProvider();
      provider.off(event, callback);
    } catch {
      // Ignore if provider not available
    }
  }
}

export const okxWalletService = new OkxWalletService();
