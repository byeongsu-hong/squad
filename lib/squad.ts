import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

import { cache } from "./cache";
import {
  CACHE_CONFIG,
  ERROR_MESSAGES,
  RPC_CONFIG,
  TRANSACTION_DISCRIMINATORS,
} from "./config";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SquadService {
  private connection: Connection;
  private programId: PublicKey;

  constructor(rpcUrl: string, programId: string) {
    this.connection = new Connection(rpcUrl, RPC_CONFIG.COMMITMENT);
    this.programId = new PublicKey(programId);
  }

  updateConnection(rpcUrl: string, programId: string) {
    this.connection = new Connection(rpcUrl, RPC_CONFIG.COMMITMENT);
    this.programId = new PublicKey(programId);
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= RPC_CONFIG.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check for rate limit or 403 errors
        if (errorMessage.includes("403") || errorMessage.includes("429")) {
          if (attempt < RPC_CONFIG.MAX_RETRIES) {
            const delay = RPC_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
            console.warn(
              `${operationName} failed (attempt ${attempt}/${RPC_CONFIG.MAX_RETRIES}), retrying in ${delay}ms...`
            );
            await sleep(delay);
            continue;
          }

          throw new Error(ERROR_MESSAGES.RPC_RATE_LIMIT);
        }

        // For other errors, don't retry
        throw error;
      }
    }

    throw (
      lastError ||
      new Error(
        `${operationName} failed after ${RPC_CONFIG.MAX_RETRIES} attempts`
      )
    );
  }

  async createMultisig(params: {
    creator: PublicKey;
    threshold: number;
    members: { key: PublicKey; permissions: { mask: number } }[];
    timeLock?: number;
  }) {
    const createKey = Keypair.generate();

    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey.publicKey,
      programId: this.programId,
    });

    const instruction = multisig.instructions.multisigCreate({
      createKey: createKey.publicKey,
      creator: params.creator,
      multisigPda,
      configAuthority: null,
      timeLock: params.timeLock || 0,
      threshold: params.threshold,
      members: params.members,
      programId: this.programId,
    });

    return {
      multisigPda,
      createKey,
      instruction,
    };
  }

  async getMultisig(multisigPda: PublicKey, useCache = true) {
    const cacheKey = `multisig:${multisigPda.toString()}:${this.programId.toString()}`;

    if (useCache) {
      const cached =
        cache.get<
          Awaited<
            ReturnType<typeof multisig.accounts.Multisig.fromAccountAddress>
          >
        >(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await this.retryWithBackoff(async () => {
      // First check if account exists and owner matches
      const accountInfo = await this.connection.getAccountInfo(multisigPda);

      if (!accountInfo) {
        throw new Error(
          "Account not found. Please verify the address and selected network."
        );
      }

      if (!accountInfo.owner.equals(this.programId)) {
        const owner = accountInfo.owner.toBase58();

        // System Program owner indicates this is likely a Squads V3 multisig
        if (owner === "11111111111111111111111111111111") {
          throw new Error(
            "This is a Squads V3 multisig. This app only supports Squads V4. Please use the legacy Squads interface at v3.squads.so"
          );
        }

        throw new Error(
          `Account is not owned by the Squads V4 program. Owner: ${owner}`
        );
      }

      // Now try to deserialize
      try {
        return await multisig.accounts.Multisig.fromAccountAddress(
          this.connection,
          multisigPda
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes("COption") || errorMsg.includes("deserialize")) {
          throw new Error(
            "Invalid multisig account format. This may be a Squads V3 multisig or corrupted data."
          );
        }
        throw error;
      }
    }, "Get multisig");

    if (useCache) {
      cache.set(cacheKey, result, CACHE_CONFIG.TTL);
    }

    return result;
  }

  async getMultisigsByCreator(creator: PublicKey) {
    const multisigs = await this.retryWithBackoff(
      () =>
        this.connection.getProgramAccounts(this.programId, {
          filters: [
            {
              memcmp: {
                offset: 8,
                bytes: creator.toBase58(),
              },
            },
          ],
        }),
      "Get multisigs by creator"
    );

    return multisigs.map((account) => ({
      publicKey: account.pubkey,
      account: multisig.accounts.Multisig.fromAccountInfo(account.account)[0],
    }));
  }

  async createProposal(params: {
    multisigPda: PublicKey;
    creator: PublicKey;
    transactionIndex: bigint;
  }) {
    const [proposalPda] = multisig.getProposalPda({
      multisigPda: params.multisigPda,
      transactionIndex: params.transactionIndex,
      programId: this.programId,
    });

    const instruction = multisig.instructions.proposalCreate({
      multisigPda: params.multisigPda,
      transactionIndex: params.transactionIndex,
      creator: params.creator,
      programId: this.programId,
    });

    return {
      proposalPda,
      instruction,
    };
  }

  async approveProposal(params: {
    multisigPda: PublicKey;
    transactionIndex: bigint;
    member: PublicKey;
  }) {
    return multisig.instructions.proposalApprove({
      multisigPda: params.multisigPda,
      transactionIndex: params.transactionIndex,
      member: params.member,
      programId: this.programId,
    });
  }

  async rejectProposal(params: {
    multisigPda: PublicKey;
    transactionIndex: bigint;
    member: PublicKey;
  }) {
    return multisig.instructions.proposalReject({
      multisigPda: params.multisigPda,
      transactionIndex: params.transactionIndex,
      member: params.member,
      programId: this.programId,
    });
  }

  async getTransactionType(
    multisigPda: PublicKey,
    transactionIndex: bigint
  ): Promise<"config" | "vault"> {
    const [transactionPda] = multisig.getTransactionPda({
      multisigPda,
      index: transactionIndex,
      programId: this.programId,
    });

    const accountInfo = await this.connection.getAccountInfo(transactionPda);

    if (!accountInfo) {
      throw new Error("Transaction account not found");
    }

    // Check discriminator to determine transaction type
    // Account discriminator is the first 8 bytes of the account data
    const discriminator = accountInfo.data.subarray(0, 8);

    // Compare with config transaction discriminator
    const isConfigTransaction =
      discriminator.length ===
        TRANSACTION_DISCRIMINATORS.CONFIG_TRANSACTION.length &&
      discriminator.every(
        (byte, index) =>
          byte === TRANSACTION_DISCRIMINATORS.CONFIG_TRANSACTION[index]
      );

    return isConfigTransaction ? "config" : "vault";
  }

  async executeProposal(params: {
    multisigPda: PublicKey;
    transactionIndex: bigint;
    member: PublicKey;
  }) {
    return await this.retryWithBackoff(async () => {
      try {
        const txType = await this.getTransactionType(
          params.multisigPda,
          params.transactionIndex
        );

        if (txType === "config") {
          // Execute as ConfigTransaction
          return await multisig.instructions.configTransactionExecute({
            multisigPda: params.multisigPda,
            transactionIndex: params.transactionIndex,
            member: params.member,
            programId: this.programId,
          });
        } else {
          // Execute as VaultTransaction
          return await multisig.instructions.vaultTransactionExecute({
            connection: this.connection,
            multisigPda: params.multisigPda,
            transactionIndex: params.transactionIndex,
            member: params.member,
            programId: this.programId,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (
          errorMsg.includes("buffer") ||
          errorMsg.includes("offset") ||
          errorMsg.includes("beyond")
        ) {
          throw new Error(
            "Failed to execute transaction: Invalid transaction data format. The transaction may be corrupted or use an unsupported format. Please verify the transaction was created correctly."
          );
        }

        if (
          errorMsg.includes("not found") ||
          errorMsg.includes("Account does not exist")
        ) {
          throw new Error(
            "Transaction account not found. Please ensure the proposal was fully created on-chain."
          );
        }

        throw error;
      }
    }, "Execute proposal");
  }

  async getProposal(multisigPda: PublicKey, transactionIndex: bigint) {
    const [proposalPda] = multisig.getProposalPda({
      multisigPda,
      transactionIndex,
      programId: this.programId,
    });

    return await this.retryWithBackoff(
      () =>
        multisig.accounts.Proposal.fromAccountAddress(
          this.connection,
          proposalPda
        ),
      "Get proposal"
    );
  }

  async getProposalsByMultisig(multisigPda: PublicKey, useCache = true) {
    const cacheKey = `proposals:${multisigPda.toString()}:${this.programId.toString()}`;

    if (useCache) {
      const cached = cache.get<
        {
          publicKey: PublicKey;
          account: ReturnType<
            typeof multisig.accounts.Proposal.fromAccountInfo
          >[0];
        }[]
      >(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const proposals = await this.retryWithBackoff(
      () =>
        this.connection.getProgramAccounts(this.programId, {
          filters: [
            {
              memcmp: {
                offset: 8,
                bytes: multisigPda.toBase58(),
              },
            },
          ],
        }),
      "Get proposals by multisig"
    );

    const result = proposals
      .map((account) => {
        try {
          const [proposalAccount] = multisig.accounts.Proposal.fromAccountInfo(
            account.account
          );
          return {
            publicKey: account.pubkey,
            account: proposalAccount,
          };
        } catch {
          return null;
        }
      })
      .filter((p) => p !== null);

    if (useCache) {
      cache.set(cacheKey, result, CACHE_CONFIG.TTL);
    }

    return result;
  }

  async getVaultTransaction(
    multisigPda: PublicKey,
    transactionIndex: bigint,
    useCache = true
  ) {
    const [transactionPda] = multisig.getTransactionPda({
      multisigPda,
      index: transactionIndex,
      programId: this.programId,
    });

    const cacheKey = `vaultTx:${multisigPda.toString()}:${transactionIndex}:${this.programId.toString()}`;

    if (useCache) {
      const cached =
        cache.get<
          Awaited<
            ReturnType<
              typeof multisig.accounts.VaultTransaction.fromAccountAddress
            >
          >
        >(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await this.retryWithBackoff(async () => {
      // First check if account exists
      const accountInfo = await this.connection.getAccountInfo(transactionPda);

      if (!accountInfo) {
        throw new Error(
          "Transaction not found. The transaction may not have been created yet."
        );
      }

      if (!accountInfo.owner.equals(this.programId)) {
        throw new Error("Invalid transaction account owner");
      }

      try {
        return await multisig.accounts.VaultTransaction.fromAccountAddress(
          this.connection,
          transactionPda
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes("buffer") || errorMsg.includes("offset")) {
          throw new Error(
            "Invalid transaction data format. The transaction may be corrupted or incomplete."
          );
        }
        throw error;
      }
    }, "Get vault transaction");

    if (useCache) {
      cache.set(cacheKey, result, CACHE_CONFIG.TTL);
    }

    return result;
  }

  async getConfigTransaction(
    multisigPda: PublicKey,
    transactionIndex: bigint,
    useCache = true
  ) {
    const [transactionPda] = multisig.getTransactionPda({
      multisigPda,
      index: transactionIndex,
      programId: this.programId,
    });

    const cacheKey = `configTx:${multisigPda.toString()}:${transactionIndex}:${this.programId.toString()}`;

    if (useCache) {
      const cached =
        cache.get<
          Awaited<
            ReturnType<
              typeof multisig.accounts.ConfigTransaction.fromAccountAddress
            >
          >
        >(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await this.retryWithBackoff(
      () =>
        multisig.accounts.ConfigTransaction.fromAccountAddress(
          this.connection,
          transactionPda
        ),
      "Get config transaction"
    );

    if (useCache) {
      cache.set(cacheKey, result, CACHE_CONFIG.TTL);
    }

    return result;
  }

  async getVaultTransactionRaw(
    multisigPda: PublicKey,
    transactionIndex: bigint
  ) {
    const [transactionPda] = multisig.getTransactionPda({
      multisigPda,
      index: transactionIndex,
      programId: this.programId,
    });

    return await this.retryWithBackoff(async () => {
      const accountInfo = await this.connection.getAccountInfo(transactionPda);
      if (!accountInfo) {
        throw new Error("Transaction account not found");
      }
      return {
        pda: transactionPda,
        data: accountInfo.data,
      };
    }, "Get vault transaction raw");
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProgramId(): PublicKey {
    return this.programId;
  }

  invalidateCache(multisigPda: PublicKey): void {
    cache.invalidatePattern(multisigPda.toString());
  }

  invalidateProposalCache(multisigPda: PublicKey): void {
    const cacheKey = `proposals:${multisigPda.toString()}:${this.programId.toString()}`;
    cache.invalidate(cacheKey);
  }

  invalidateMultisigCache(multisigPda: PublicKey): void {
    const cacheKey = `multisig:${multisigPda.toString()}:${this.programId.toString()}`;
    cache.invalidate(cacheKey);
  }
}
