import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

import type { ChainConfig } from "@/types/chain";

export interface SignedTransactionData {
  transaction: string;
  signatures: string[];
  timestamp: number;
}

export class CrossChainTransactionService {
  /**
   * Gets the latest blockhash from the target chain
   */
  async getRecentBlockhash(rpcUrl: string): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }> {
    const connection = new Connection(rpcUrl, "confirmed");
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("finalized");

    return { blockhash, lastValidBlockHeight };
  }

  /**
   * Injects a recent blockhash into a transaction for cross-chain signing
   * This allows signing transactions for non-mainnet chains using mainnet wallets
   */
  async injectBlockhash(
    transaction: Transaction | VersionedTransaction,
    targetChain: ChainConfig
  ): Promise<Transaction | VersionedTransaction> {
    const { blockhash } = await this.getRecentBlockhash(targetChain.rpcUrl);

    if (transaction instanceof Transaction) {
      transaction.recentBlockhash = blockhash;
      transaction.feePayer =
        transaction.feePayer || transaction.signatures[0]?.publicKey;
    } else {
      // VersionedTransaction
      const message = transaction.message;
      // Create a new message with updated blockhash
      const newMessage = Object.create(Object.getPrototypeOf(message));
      Object.assign(newMessage, message, {
        recentBlockhash: blockhash,
      });

      return new VersionedTransaction(newMessage);
    }

    return transaction;
  }

  /**
   * Serializes a transaction for wallet signing
   */
  serializeTransaction(
    transaction: Transaction | VersionedTransaction
  ): Buffer {
    if (transaction instanceof Transaction) {
      return transaction.serializeMessage();
    } else {
      return Buffer.from(transaction.message.serialize());
    }
  }

  /**
   * Sends a signed transaction to the target chain's RPC
   */
  async sendSignedTransaction(
    signedTransaction: Buffer | Uint8Array,
    targetChain: ChainConfig,
    options?: {
      skipPreflight?: boolean;
      maxRetries?: number;
    }
  ): Promise<string> {
    const connection = new Connection(targetChain.rpcUrl, "confirmed");

    const signature = await connection.sendRawTransaction(signedTransaction, {
      skipPreflight: options?.skipPreflight ?? false,
      maxRetries: options?.maxRetries ?? 3,
    });

    return signature;
  }

  /**
   * Confirms a transaction on the target chain
   */
  async confirmTransaction(
    signature: string,
    targetChain: ChainConfig,
    commitment: "processed" | "confirmed" | "finalized" = "confirmed"
  ): Promise<boolean> {
    const connection = new Connection(targetChain.rpcUrl, commitment);

    const confirmation = await connection.confirmTransaction(
      signature,
      commitment
    );

    return !confirmation.value.err;
  }

  /**
   * Full flow: inject blockhash, get signature, send to target chain
   */
  async prepareAndSignTransaction(
    transaction: Transaction | VersionedTransaction,
    targetChain: ChainConfig,
    signer: {
      publicKey: PublicKey;
      signTransaction: (
        tx: Transaction | VersionedTransaction
      ) => Promise<Transaction | VersionedTransaction>;
    }
  ): Promise<{
    signedTransaction: Transaction | VersionedTransaction;
    signature: string;
  }> {
    // Inject the recent blockhash from target chain
    const txWithBlockhash = await this.injectBlockhash(
      transaction,
      targetChain
    );

    // Sign the transaction with the wallet
    const signedTx = await signer.signTransaction(txWithBlockhash);

    // Extract signature
    let signature: string;
    if (signedTx instanceof Transaction) {
      signature = signedTx.signatures[0]?.signature
        ? Buffer.from(signedTx.signatures[0].signature).toString("base64")
        : "";
    } else {
      signature = signedTx.signatures[0]
        ? Buffer.from(signedTx.signatures[0]).toString("base64")
        : "";
    }

    return {
      signedTransaction: signedTx,
      signature,
    };
  }

  /**
   * Stores signed transaction data for later submission
   */
  storeSignedTransaction(
    chainId: string,
    transactionId: string,
    data: SignedTransactionData
  ): void {
    const key = `signed-tx-${chainId}-${transactionId}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Retrieves stored signed transaction
   */
  getStoredTransaction(
    chainId: string,
    transactionId: string
  ): SignedTransactionData | null {
    const key = `signed-tx-${chainId}-${transactionId}`;
    const data = localStorage.getItem(key);

    if (!data) return null;

    try {
      return JSON.parse(data) as SignedTransactionData;
    } catch {
      return null;
    }
  }

  /**
   * Complete flow: prepare, sign, and send transaction to target chain
   */
  async executeTransaction(
    transaction: Transaction | VersionedTransaction,
    targetChain: ChainConfig,
    signer: {
      publicKey: PublicKey;
      signTransaction: (
        tx: Transaction | VersionedTransaction
      ) => Promise<Transaction | VersionedTransaction>;
    },
    options?: {
      skipPreflight?: boolean;
      maxRetries?: number;
      storeBeforeSend?: boolean;
      transactionId?: string;
    }
  ): Promise<string> {
    const { signedTransaction } = await this.prepareAndSignTransaction(
      transaction,
      targetChain,
      signer
    );

    // Serialize the signed transaction
    const serialized =
      signedTransaction instanceof Transaction
        ? signedTransaction.serialize()
        : signedTransaction.serialize();

    // Optionally store before sending
    if (options?.storeBeforeSend && options?.transactionId) {
      this.storeSignedTransaction(targetChain.id, options.transactionId, {
        transaction: Buffer.from(serialized).toString("base64"),
        signatures:
          signedTransaction instanceof Transaction
            ? signedTransaction.signatures
                .filter((s) => s.signature)
                .map((s) => Buffer.from(s.signature!).toString("base64"))
            : signedTransaction.signatures.map((s) =>
                Buffer.from(s).toString("base64")
              ),
        timestamp: Date.now(),
      });
    }

    // Send to target chain
    const signature = await this.sendSignedTransaction(
      serialized,
      targetChain,
      options
    );

    return signature;
  }
}

export const crossChainTxService = new CrossChainTransactionService();
