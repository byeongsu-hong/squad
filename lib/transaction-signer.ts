import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";

import { WalletType } from "@/types/wallet";

import { ledgerService } from "./ledger";
import { okxWalletService } from "./okx-wallet";

export interface SignTransactionOptions {
  walletType: WalletType | null;
  derivationPath?: string;
  walletAdapter?: {
    signTransaction<T extends Transaction | VersionedTransaction>(
      transaction: T
    ): Promise<T>;
  };
}

export class TransactionSignerService {
  async signTransaction(
    transaction: Transaction,
    options: SignTransactionOptions
  ): Promise<Transaction> {
    const { walletType, derivationPath, walletAdapter } = options;

    if (walletType === WalletType.LEDGER) {
      if (!derivationPath) {
        throw new Error("Derivation path is required for Ledger signing");
      }

      const serialized = transaction.serializeMessage();
      const signature = await ledgerService.signTransaction(
        serialized,
        derivationPath
      );

      const publicKey = transaction.feePayer;
      if (!publicKey) {
        throw new Error("Transaction fee payer is not set");
      }

      transaction.addSignature(publicKey, signature);
      return transaction;
    }

    if (walletType === WalletType.BROWSER) {
      if (!walletAdapter) {
        throw new Error(
          "Wallet adapter is required for browser wallet signing"
        );
      }

      return await walletAdapter.signTransaction(transaction);
    }

    if (walletType === WalletType.OKX) {
      return await okxWalletService.signTransaction(transaction);
    }

    throw new Error(`Unsupported wallet type: ${walletType}`);
  }

  async signVersionedTransaction(
    transaction: VersionedTransaction,
    options: SignTransactionOptions
  ): Promise<VersionedTransaction> {
    const { walletType, derivationPath, walletAdapter } = options;

    if (walletType === WalletType.LEDGER) {
      if (!derivationPath) {
        throw new Error("Derivation path is required for Ledger signing");
      }

      const serialized = Buffer.from(transaction.message.serialize());
      const signature = await ledgerService.signTransaction(
        serialized,
        derivationPath
      );

      // Add signature to versioned transaction
      transaction.addSignature(
        new PublicKey(transaction.message.staticAccountKeys[0]),
        signature
      );

      return transaction;
    }

    if (walletType === WalletType.BROWSER) {
      if (!walletAdapter) {
        throw new Error(
          "Wallet adapter is required for browser wallet signing"
        );
      }

      return await walletAdapter.signTransaction(transaction);
    }

    if (walletType === WalletType.OKX) {
      return await okxWalletService.signVersionedTransaction(transaction);
    }

    throw new Error(`Unsupported wallet type: ${walletType}`);
  }
}

export const transactionSignerService = new TransactionSignerService();
