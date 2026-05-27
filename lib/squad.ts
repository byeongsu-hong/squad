import {
  type AccountInfo,
  Connection,
  Keypair,
  type ParsedTransactionWithMeta,
  PublicKey,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

import { useRefreshStore } from "@/stores/refresh-store";

import { cache } from "./cache";
import { CACHE_CONFIG, ERROR_MESSAGES, RPC_CONFIG } from "./config";
import { requestBroker } from "./rpc/request-broker";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const connectionPool = new Map<string, Connection>();

function getConnection(rpcUrl: string): Connection {
  let conn = connectionPool.get(rpcUrl);
  if (!conn) {
    conn = new Connection(rpcUrl, RPC_CONFIG.COMMITMENT);
    connectionPool.set(rpcUrl, conn);
  }
  return conn;
}

export class SquadService {
  private connection: Connection;
  private programId: PublicKey;
  private rpcUrls: string[];
  private chainId: string;

  constructor(
    rpcUrl: string | string[],
    programId: string,
    options: { chainId?: string } = {}
  ) {
    this.rpcUrls = normalizeRpcUrls(rpcUrl);
    this.connection = getConnection(this.rpcUrls[0]!);
    this.programId = new PublicKey(programId);
    this.chainId = options.chainId ?? this.rpcUrls[0]!;
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

  async getAccountInfo(
    publicKey: PublicKey,
    options: {
      operationName?: string;
      cacheKey?: string;
      ttlMs?: number;
      useStaleOnError?: boolean;
    } = {}
  ): Promise<AccountInfo<Buffer> | null> {
    const result = await requestBroker.fetch({
      key:
        options.cacheKey ??
        `accountInfo:${publicKey.toBase58()}:${this.programId.toBase58()}`,
      chainId: this.chainId,
      endpoints: this.rpcUrls,
      ttlMs: options.ttlMs ?? CACHE_CONFIG.TTL,
      allowStaleOnError: options.useStaleOnError,
      request: (endpoint) => getConnection(endpoint).getAccountInfo(publicKey),
    });

    this.recordBrokerResult(result.degradedReason?.message);
    return result.data;
  }

  private recordBrokerResult(message?: string) {
    if (message) {
      useRefreshStore
        .getState()
        .markDegraded({ chainId: this.chainId }, message);
      return;
    }

    useRefreshStore.getState().clearDegraded({ chainId: this.chainId });
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
      const accountInfo = await this.getAccountInfo(multisigPda, {
        operationName: "Get multisig",
        cacheKey: `accountInfo:multisig:${multisigPda.toBase58()}:${this.programId.toBase58()}`,
        useStaleOnError: useCache,
      });

      if (!accountInfo) {
        throw new Error(
          "Account not found. Please verify the address and selected network."
        );
      }

      if (!accountInfo.owner.equals(this.programId)) {
        const owner = accountInfo.owner.toBase58();

        if (owner === "11111111111111111111111111111111") {
          throw new Error(
            "This address is not a Squads V4 multisig account. It may be a Squads vault address or a legacy Squads account."
          );
        }

        throw new Error(
          `Account is not owned by the Squads V4 program. Owner: ${owner}`
        );
      }

      // Now try to deserialize
      try {
        return multisig.accounts.Multisig.fromAccountInfo(accountInfo)[0];
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

  async resolveVaultMultisigPda(
    vaultPda: PublicKey,
    useCache = true
  ): Promise<PublicKey | null> {
    const cacheKey = `vaultMultisig:${vaultPda.toBase58()}:${this.programId.toBase58()}`;

    if (useCache) {
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        return new PublicKey(cached);
      }
    }

    const signaturesResult = await requestBroker.fetch({
      key: `signatures:${cacheKey}`,
      chainId: this.chainId,
      endpoints: this.rpcUrls,
      ttlMs: CACHE_CONFIG.TTL,
      concurrency: 1,
      allowStaleOnError: useCache,
      request: async (endpoint, endpointIndex) => {
        const signatures = await getConnection(
          endpoint
        ).getSignaturesForAddress(vaultPda, {
          limit: 10,
        });
        if (
          signatures.length === 0 &&
          endpointIndex < this.rpcUrls.length - 1
        ) {
          throw new Error(
            `Network RPC endpoint returned no transaction history for ${vaultPda.toBase58()} from ${endpoint}`
          );
        }
        return signatures;
      },
    });
    this.recordBrokerResult(signaturesResult.degradedReason?.message);

    const signatures = signaturesResult.data.map((item) => item.signature);
    if (signatures.length === 0) {
      return null;
    }

    let resolvedTransaction = false;
    let lastTransactionError: unknown = null;
    for (const signature of signatures) {
      let transaction: ParsedTransactionWithMeta | null;
      try {
        const transactionResult = await requestBroker.fetch({
          key: `transaction:${this.chainId}:${signature}`,
          chainId: this.chainId,
          endpoints: this.rpcUrls,
          ttlMs: CACHE_CONFIG.TTL,
          concurrency: 1,
          allowStaleOnError: useCache,
          request: (endpoint) =>
            getConnection(endpoint).getParsedTransaction(signature, {
              commitment: RPC_CONFIG.COMMITMENT,
              maxSupportedTransactionVersion: 0,
            }),
        });
        this.recordBrokerResult(transactionResult.degradedReason?.message);
        transaction = transactionResult.data;
      } catch (error) {
        lastTransactionError = error;
        continue;
      }

      if (!transaction) {
        continue;
      }

      resolvedTransaction = true;
      const candidateKeys = this.getCandidateKeysFromTransactions([
        transaction,
      ]);
      const resolved = await this.resolveVaultFromCandidateAccounts(
        vaultPda,
        candidateKeys,
        useCache
      );
      if (resolved) {
        cache.set(cacheKey, resolved.toBase58(), CACHE_CONFIG.TTL);
        return resolved;
      }
    }

    if (!resolvedTransaction && lastTransactionError) {
      throw lastTransactionError instanceof Error
        ? lastTransactionError
        : new Error("Unable to load transaction history for vault address.");
    }

    return null;
  }

  private getCandidateKeysFromTransactions(
    transactions: (ParsedTransactionWithMeta | null)[]
  ) {
    const keysByAddress = new Map<string, PublicKey>();
    for (const transaction of transactions) {
      for (const accountKey of transaction?.transaction.message.accountKeys ??
        []) {
        const publicKey = new PublicKey(accountKey.pubkey);
        keysByAddress.set(publicKey.toBase58(), publicKey);
      }
    }
    return Array.from(keysByAddress.values());
  }

  private async resolveVaultFromCandidateAccounts(
    vaultPda: PublicKey,
    candidateKeys: PublicKey[],
    useCache: boolean
  ) {
    for (let index = 0; index < candidateKeys.length; index += 100) {
      const batch = candidateKeys.slice(index, index + 100);
      const accountInfoResult = await requestBroker.fetch({
        key: `vaultCandidates:${this.programId.toBase58()}:${batch
          .map((key) => key.toBase58())
          .join(",")}`,
        chainId: this.chainId,
        endpoints: this.rpcUrls,
        ttlMs: CACHE_CONFIG.TTL,
        concurrency: 2,
        allowStaleOnError: useCache,
        request: (endpoint) =>
          getConnection(endpoint).getMultipleAccountsInfo(batch),
      });
      this.recordBrokerResult(accountInfoResult.degradedReason?.message);

      for (let accountIndex = 0; accountIndex < batch.length; accountIndex++) {
        const resolved = this.getVaultMultisigFromAccountInfo(
          vaultPda,
          batch[accountIndex]!,
          accountInfoResult.data[accountIndex]
        );
        if (resolved) {
          return resolved;
        }
      }
    }

    return null;
  }

  private getVaultMultisigFromAccountInfo(
    vaultPda: PublicKey,
    accountPublicKey: PublicKey,
    accountInfo: AccountInfo<Buffer> | null
  ) {
    if (!accountInfo?.owner.equals(this.programId)) {
      return null;
    }

    const discriminator = accountInfo.data.subarray(0, 8);
    if (
      this.matchesDiscriminator(
        discriminator,
        multisig.accounts.multisigDiscriminator
      )
    ) {
      return this.vaultMatchesMultisig(vaultPda, accountPublicKey)
        ? accountPublicKey
        : null;
    }

    const decodedMultisig = this.decodeMultisigReference(accountInfo);
    if (!decodedMultisig) {
      return null;
    }

    return this.vaultMatchesMultisig(vaultPda, decodedMultisig)
      ? decodedMultisig
      : null;
  }

  private decodeMultisigReference(accountInfo: AccountInfo<Buffer>) {
    const discriminator = accountInfo.data.subarray(0, 8);
    try {
      if (
        this.matchesDiscriminator(
          discriminator,
          multisig.accounts.proposalDiscriminator
        )
      ) {
        return multisig.accounts.Proposal.fromAccountInfo(accountInfo)[0]
          .multisig;
      }
      if (
        this.matchesDiscriminator(
          discriminator,
          multisig.accounts.vaultTransactionDiscriminator
        )
      ) {
        return multisig.accounts.VaultTransaction.fromAccountInfo(
          accountInfo
        )[0].multisig;
      }
      if (
        this.matchesDiscriminator(
          discriminator,
          multisig.accounts.configTransactionDiscriminator
        )
      ) {
        return multisig.accounts.ConfigTransaction.fromAccountInfo(
          accountInfo
        )[0].multisig;
      }
    } catch {
      return null;
    }

    return null;
  }

  private vaultMatchesMultisig(vaultPda: PublicKey, multisigPda: PublicKey) {
    for (let vaultIndex = 0; vaultIndex < 10; vaultIndex += 1) {
      const [candidateVault] = multisig.getVaultPda({
        multisigPda,
        index: vaultIndex,
        programId: this.programId,
      });
      if (candidateVault.equals(vaultPda)) {
        return true;
      }
    }

    return false;
  }

  private matchesDiscriminator(discriminator: Buffer, expected: number[]) {
    return expected.every((byte, index) => discriminator[index] === byte);
  }

  async getMultisigsByCreator(creator: PublicKey, useCache = true) {
    const cacheKey = `creatorMultisigs:${creator.toBase58()}:${this.programId.toString()}`;
    const CREATOR_MULTISIGS_TTL = 5 * 60_000;

    if (useCache) {
      const cached = cache.get<
        {
          publicKey: PublicKey;
          account: ReturnType<
            typeof multisig.accounts.Multisig.fromAccountInfo
          >[0];
        }[]
      >(cacheKey);
      if (cached) return cached;
    }

    const accountsResult = await requestBroker.fetch({
      key: `creatorMultisigs:${creator.toBase58()}:${this.programId.toBase58()}`,
      chainId: this.chainId,
      endpoints: this.rpcUrls,
      ttlMs: CREATOR_MULTISIGS_TTL,
      concurrency: 1,
      allowStaleOnError: useCache,
      request: (endpoint) =>
        getConnection(endpoint).getProgramAccounts(this.programId, {
          filters: [
            {
              memcmp: {
                offset: 8,
                bytes: creator.toBase58(),
              },
            },
          ],
        }),
    });
    this.recordBrokerResult(accountsResult.degradedReason?.message);
    const accounts = accountsResult.data;

    const result = accounts.map((account) => ({
      publicKey: account.pubkey,
      account: multisig.accounts.Multisig.fromAccountInfo(account.account)[0],
    }));

    if (useCache) {
      cache.set(cacheKey, result, CREATOR_MULTISIGS_TTL);
    }

    return result;
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

  async getBatchedTransactionCreators(
    multisigPda: PublicKey,
    transactionIndices: bigint[]
  ): Promise<Map<string, PublicKey | undefined>> {
    if (transactionIndices.length === 0) return new Map();

    const pdas = transactionIndices.map((index) => {
      const [pda] = multisig.getTransactionPda({
        multisigPda,
        index,
        programId: this.programId,
      });
      return pda;
    });

    const BATCH_SIZE = 100;
    const creatorMap = new Map<string, PublicKey | undefined>();

    for (let i = 0; i < pdas.length; i += BATCH_SIZE) {
      const batchPdas = pdas.slice(i, i + BATCH_SIZE);
      const batchIndices = transactionIndices.slice(i, i + BATCH_SIZE);

      const accountInfosResult = await requestBroker.fetch({
        key: `batchedTransactions:${this.programId.toBase58()}:${batchPdas
          .map((pda) => pda.toBase58())
          .join(",")}`,
        chainId: this.chainId,
        endpoints: this.rpcUrls,
        ttlMs: CACHE_CONFIG.TTL,
        concurrency: 2,
        request: (endpoint) =>
          getConnection(endpoint).getMultipleAccountsInfo(batchPdas),
      });
      this.recordBrokerResult(accountInfosResult.degradedReason?.message);
      const accountInfos = accountInfosResult.data;

      for (let j = 0; j < batchIndices.length; j++) {
        const index = batchIndices[j]!;
        const accountInfo = accountInfos[j];

        if (!accountInfo) {
          creatorMap.set(index.toString(), undefined);
          continue;
        }

        try {
          const discriminator = accountInfo.data.subarray(0, 8);
          const isConfig = discriminator.every(
            (byte, k) =>
              byte === multisig.accounts.configTransactionDiscriminator[k]
          );

          if (isConfig) {
            const [configTx] =
              multisig.accounts.ConfigTransaction.fromAccountInfo(accountInfo);
            creatorMap.set(index.toString(), configTx.creator);
          } else {
            const [vaultTx] =
              multisig.accounts.VaultTransaction.fromAccountInfo(accountInfo);
            creatorMap.set(index.toString(), vaultTx.creator);
          }
        } catch {
          creatorMap.set(index.toString(), undefined);
        }
      }
    }

    return creatorMap;
  }

  async executeProposal(params: {
    multisigPda: PublicKey;
    transactionIndex: bigint;
    member: PublicKey;
  }) {
    return await this.retryWithBackoff(async () => {
      try {
        const [transactionPda] = multisig.getTransactionPda({
          multisigPda: params.multisigPda,
          index: params.transactionIndex,
          programId: this.programId,
        });
        const accountInfo = await this.getAccountInfo(transactionPda, {
          operationName: "Get executable transaction",
          cacheKey: `accountInfo:transaction:${transactionPda.toBase58()}:${this.programId.toBase58()}`,
          ttlMs: 10_000,
        });
        if (!accountInfo) throw new Error("Transaction account not found");
        const discriminator = accountInfo.data.subarray(0, 8);
        const isConfig = discriminator.every(
          (byte, k) =>
            byte === multisig.accounts.configTransactionDiscriminator[k]
        );

        if (isConfig) {
          return await multisig.instructions.configTransactionExecute({
            multisigPda: params.multisigPda,
            transactionIndex: params.transactionIndex,
            member: params.member,
            programId: this.programId,
          });
        } else {
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

    const proposalsResult = await requestBroker.fetch({
      key: `rpc:${cacheKey}`,
      chainId: this.chainId,
      endpoints: this.rpcUrls,
      ttlMs: CACHE_CONFIG.TTL,
      concurrency: 1,
      allowStaleOnError: useCache,
      request: (endpoint) =>
        getConnection(endpoint).getProgramAccounts(this.programId, {
          filters: [
            {
              memcmp: {
                offset: 8,
                bytes: multisigPda.toBase58(),
              },
            },
          ],
        }),
    });
    this.recordBrokerResult(proposalsResult.degradedReason?.message);
    const proposals = proposalsResult.data;

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
      const accountInfo = await this.getAccountInfo(transactionPda, {
        operationName: "Get vault transaction",
        cacheKey,
        useStaleOnError: useCache,
      });

      if (!accountInfo) {
        throw new Error(
          "Transaction not found. The transaction may not have been created yet."
        );
      }

      if (!accountInfo.owner.equals(this.programId)) {
        throw new Error("Invalid transaction account owner");
      }

      try {
        return multisig.accounts.VaultTransaction.fromAccountInfo(
          accountInfo
        )[0];
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

    const accountInfo = await this.getAccountInfo(transactionPda, {
      operationName: "Get config transaction",
      cacheKey,
      useStaleOnError: useCache,
    });

    if (!accountInfo) {
      throw new Error(
        "Transaction not found. The transaction may not have been created yet."
      );
    }

    const result =
      multisig.accounts.ConfigTransaction.fromAccountInfo(accountInfo)[0];

    if (useCache) {
      cache.set(cacheKey, result, CACHE_CONFIG.TTL);
    }

    return result;
  }

  getConnection(): Connection {
    return this.connection;
  }

  invalidateProposalCache(multisigPda: PublicKey): void {
    const cacheKey = `proposals:${multisigPda.toString()}:${this.programId.toString()}`;
    cache.invalidate(cacheKey);
    requestBroker.invalidate({ chainId: this.chainId, key: `rpc:${cacheKey}` });
  }
}

function normalizeRpcUrls(rpcUrl: string | string[]) {
  const urls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
  const normalized = Array.from(
    new Set(urls.map((url) => url.trim()).filter(Boolean))
  );
  if (normalized.length === 0) {
    throw new Error("At least one RPC URL is required.");
  }
  return normalized;
}
