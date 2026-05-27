import type { AccountInfo } from "@solana/web3.js";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";

import { cache } from "@/lib/cache";
import { CACHE_CONFIG, RPC_CONFIG } from "@/lib/config";
import { requestBroker } from "@/lib/rpc/request-broker";
import { useRefreshStore } from "@/stores/refresh-store";
import { getWorkspaceMultisigKey } from "@/types/workspace";
import type {
  WorkspacePayload,
  WorkspaceProposal,
  WorkspaceProposalStatus,
} from "@/types/workspace";

export const SQUADS_V3_PROGRAM_ID = new PublicKey(
  "SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu"
);

const SEED_SQUAD = Buffer.from("squad");
const SEED_MULTISIG = Buffer.from("multisig");
const SEED_TRANSACTION = Buffer.from("transaction");
const SEED_INSTRUCTION = Buffer.from("instruction");
const SEED_AUTHORITY = Buffer.from("authority");
const ANCHOR_DISCRIMINATOR_SIZE = 8;
const V3_MEMBER_PERMISSIONS_MASK = 7;
const V3_TRANSACTION_MULTISIG_MEMCMP_OFFSET = 8 + 32;
const APPROVE_TRANSACTION_DISCRIMINATOR = Buffer.from(
  "e02758b5243b9b7a",
  "hex"
);
const REJECT_TRANSACTION_DISCRIMINATOR = Buffer.from("2f8ddac05061d174", "hex");
const EXECUTE_TRANSACTION_DISCRIMINATOR = Buffer.from(
  "e7ad315beb184413",
  "hex"
);

const squadsV3ConnectionPool = new Map<string, Connection>();

function getSquadsV3Connection(rpcUrl: string): Connection {
  let conn = squadsV3ConnectionPool.get(rpcUrl);
  if (!conn) {
    conn = new Connection(rpcUrl, RPC_CONFIG.COMMITMENT);
    squadsV3ConnectionPool.set(rpcUrl, conn);
  }
  return conn;
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

export type SquadsV3TransactionStatus =
  | "Draft"
  | "Active"
  | "ExecuteReady"
  | "Executed"
  | "Rejected"
  | "Cancelled";

export interface SquadsV3MultisigAccount {
  threshold: number;
  authorityIndex: number;
  transactionIndex: number;
  msChangeIndex: number;
  bump: number;
  createKey: PublicKey;
  allowExternalExecute: boolean;
  members: PublicKey[];
}

export interface SquadsV3TransactionAccount {
  creator: PublicKey;
  multisig: PublicKey;
  transactionIndex: number;
  authorityIndex: number;
  authorityBump: number;
  status: SquadsV3TransactionStatus;
  instructionIndex: number;
  bump: number;
  approvals: PublicKey[];
  rejections: PublicKey[];
  cancellations: PublicKey[];
  executedIndex: number;
}

export interface SquadsV3InstructionAccount {
  programId: PublicKey;
  keys: Array<{
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: Buffer;
  instructionIndex: number;
  bump: number;
  executed: boolean;
}

export interface SquadsV3LoadedInstructionAccount {
  publicKey: PublicKey;
  account: SquadsV3InstructionAccount;
}

class BufferReader {
  private offset = ANCHOR_DISCRIMINATOR_SIZE;

  constructor(private readonly data: Buffer) {}

  readU8() {
    this.ensure(1);
    return this.data.readUInt8(this.offset++);
  }

  readBool() {
    const value = this.readU8();
    if (value !== 0 && value !== 1) {
      throw new Error(`Invalid Squads V3 boolean value: ${value}`);
    }
    return value === 1;
  }

  readU16() {
    this.ensure(2);
    const value = this.data.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  readU32() {
    this.ensure(4);
    const value = this.data.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  readPublicKey() {
    this.ensure(32);
    const key = new PublicKey(
      this.data.subarray(this.offset, this.offset + 32)
    );
    this.offset += 32;
    return key;
  }

  readBytes() {
    const length = this.readU32();
    this.ensure(length);
    const value = Buffer.from(
      this.data.subarray(this.offset, this.offset + length)
    );
    this.offset += length;
    return value;
  }

  readPublicKeyVec() {
    const length = this.readU32();
    const keys: PublicKey[] = [];
    for (let index = 0; index < length; index += 1) {
      keys.push(this.readPublicKey());
    }
    return keys;
  }

  readAccountMetaVec() {
    const length = this.readU32();
    const keys: SquadsV3InstructionAccount["keys"] = [];
    for (let index = 0; index < length; index += 1) {
      keys.push({
        pubkey: this.readPublicKey(),
        isSigner: this.readBool(),
        isWritable: this.readBool(),
      });
    }
    return keys;
  }

  private ensure(size: number) {
    if (this.offset + size > this.data.length) {
      throw new Error(
        "Invalid Squads V3 account data: unexpected end of buffer"
      );
    }
  }
}

function u32Bytes(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

function u8Bytes(value: number) {
  return Buffer.from([value]);
}

function encodeAnchorBytes(value: Buffer) {
  return Buffer.concat([u32Bytes(value.length), value]);
}

function toTransactionIndexNumber(transactionIndex: number | bigint) {
  const value =
    typeof transactionIndex === "bigint"
      ? Number(transactionIndex)
      : transactionIndex;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Squads V3 transaction index is out of range.");
  }
  return value;
}

export function deriveSquadsV3MultisigPda(
  createKey: PublicKey,
  programId = SQUADS_V3_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [SEED_SQUAD, createKey.toBuffer(), SEED_MULTISIG],
    programId
  );
}

export function deriveSquadsV3TransactionPda(
  multisigPda: PublicKey,
  transactionIndex: number,
  programId = SQUADS_V3_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [
      SEED_SQUAD,
      multisigPda.toBuffer(),
      u32Bytes(transactionIndex),
      SEED_TRANSACTION,
    ],
    programId
  );
}

export function deriveSquadsV3InstructionPda(
  transactionPda: PublicKey,
  instructionIndex: number,
  programId = SQUADS_V3_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [
      SEED_SQUAD,
      transactionPda.toBuffer(),
      u8Bytes(instructionIndex),
      SEED_INSTRUCTION,
    ],
    programId
  );
}

export function deriveSquadsV3AuthorityPda(
  multisigPda: PublicKey,
  authorityIndex: number,
  programId = SQUADS_V3_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [
      SEED_SQUAD,
      multisigPda.toBuffer(),
      u32Bytes(authorityIndex),
      SEED_AUTHORITY,
    ],
    programId
  );
}

function buildSquadsV3VoteInstruction(params: {
  multisigPda: PublicKey;
  transactionIndex: number | bigint;
  member: PublicKey;
  discriminator: Buffer;
  programId?: PublicKey;
}) {
  const programId = params.programId ?? SQUADS_V3_PROGRAM_ID;
  const [transactionPda] = deriveSquadsV3TransactionPda(
    params.multisigPda,
    toTransactionIndexNumber(params.transactionIndex),
    programId
  );

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.multisigPda, isSigner: false, isWritable: false },
      { pubkey: transactionPda, isSigner: false, isWritable: true },
      { pubkey: params.member, isSigner: true, isWritable: true },
    ],
    data: Buffer.from(params.discriminator),
  });
}

export function buildSquadsV3ApproveInstruction(params: {
  multisigPda: PublicKey;
  transactionIndex: number | bigint;
  member: PublicKey;
  programId?: PublicKey;
}) {
  return buildSquadsV3VoteInstruction({
    ...params,
    discriminator: APPROVE_TRANSACTION_DISCRIMINATOR,
  });
}

export function buildSquadsV3RejectInstruction(params: {
  multisigPda: PublicKey;
  transactionIndex: number | bigint;
  member: PublicKey;
  programId?: PublicKey;
}) {
  return buildSquadsV3VoteInstruction({
    ...params,
    discriminator: REJECT_TRANSACTION_DISCRIMINATOR,
  });
}

export function buildSquadsV3ExecuteInstruction(params: {
  transactionPda: PublicKey;
  transaction: SquadsV3TransactionAccount;
  instructions: SquadsV3LoadedInstructionAccount[];
  member: PublicKey;
  programId?: PublicKey;
}) {
  if (params.transaction.status !== "ExecuteReady") {
    throw new Error("Squads V3 transaction is not ready to execute.");
  }
  if (params.transaction.executedIndex > 0) {
    throw new Error(
      "Squads V3 partially executed transactions are not supported."
    );
  }

  const remainingAccountList = params.instructions.flatMap((instruction) => [
    {
      pubkey: instruction.publicKey,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: instruction.account.programId,
      isSigner: false,
      isWritable: false,
    },
    ...instruction.account.keys.map((key) => ({
      pubkey: key.pubkey,
      isSigner: false,
      isWritable: key.isWritable,
    })),
  ]);
  const uniqueAccounts: typeof remainingAccountList = [];
  const accountIndexes = remainingAccountList.map((account) => {
    const existingIndex = uniqueAccounts.findIndex(
      (uniqueAccount) =>
        uniqueAccount.pubkey.equals(account.pubkey) &&
        uniqueAccount.isWritable === account.isWritable
    );
    if (existingIndex >= 0) {
      return existingIndex;
    }
    uniqueAccounts.push(account);
    return uniqueAccounts.length - 1;
  });

  if (uniqueAccounts.length > 255) {
    throw new Error("Squads V3 execute account list is too large.");
  }

  return new TransactionInstruction({
    programId: params.programId ?? SQUADS_V3_PROGRAM_ID,
    keys: [
      {
        pubkey: params.transaction.multisig,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: params.transactionPda, isSigner: false, isWritable: true },
      { pubkey: params.member, isSigner: true, isWritable: true },
      ...uniqueAccounts,
    ],
    data: Buffer.concat([
      EXECUTE_TRANSACTION_DISCRIMINATOR,
      encodeAnchorBytes(Buffer.from(accountIndexes)),
    ]),
  });
}

export function parseSquadsV3MultisigAccount(
  accountInfo: AccountInfo<Buffer>
): SquadsV3MultisigAccount {
  const reader = new BufferReader(accountInfo.data);
  return {
    threshold: reader.readU16(),
    authorityIndex: reader.readU16(),
    transactionIndex: reader.readU32(),
    msChangeIndex: reader.readU32(),
    bump: reader.readU8(),
    createKey: reader.readPublicKey(),
    allowExternalExecute: reader.readBool(),
    members: reader.readPublicKeyVec(),
  };
}

export function parseSquadsV3TransactionAccount(
  accountInfo: AccountInfo<Buffer>
): SquadsV3TransactionAccount {
  const reader = new BufferReader(accountInfo.data);
  return {
    creator: reader.readPublicKey(),
    multisig: reader.readPublicKey(),
    transactionIndex: reader.readU32(),
    authorityIndex: reader.readU32(),
    authorityBump: reader.readU8(),
    status: parseSquadsV3TransactionStatus(reader.readU8()),
    instructionIndex: reader.readU8(),
    bump: reader.readU8(),
    approvals: reader.readPublicKeyVec(),
    rejections: reader.readPublicKeyVec(),
    cancellations: reader.readPublicKeyVec(),
    executedIndex: reader.readU8(),
  };
}

export function parseSquadsV3InstructionAccount(
  accountInfo: AccountInfo<Buffer>
): SquadsV3InstructionAccount {
  const reader = new BufferReader(accountInfo.data);
  return {
    programId: reader.readPublicKey(),
    keys: reader.readAccountMetaVec(),
    data: reader.readBytes(),
    instructionIndex: reader.readU8(),
    bump: reader.readU8(),
    executed: reader.readBool(),
  };
}

export function parseSquadsV3TransactionStatus(
  value: number
): SquadsV3TransactionStatus {
  const status = [
    "Draft",
    "Active",
    "ExecuteReady",
    "Executed",
    "Rejected",
    "Cancelled",
  ][value];

  if (!status) {
    throw new Error(`Unknown Squads V3 transaction status: ${value}`);
  }

  return status as SquadsV3TransactionStatus;
}

export function toSquadsV3WorkspaceStatus(
  status: SquadsV3TransactionStatus
): WorkspaceProposalStatus {
  switch (status) {
    case "ExecuteReady":
      return "Approved";
    case "Executed":
      return "Executed";
    case "Rejected":
      return "Rejected";
    case "Cancelled":
      return "Cancelled";
    case "Draft":
    case "Active":
      return "Active";
  }
}

export function toSquadsV3WorkspaceProposal(
  transaction: SquadsV3TransactionAccount,
  chainId: string
): WorkspaceProposal {
  const status = toSquadsV3WorkspaceStatus(transaction.status);
  return {
    provider: "squads",
    multisigKey: getWorkspaceMultisigKey(
      chainId,
      transaction.multisig.toString()
    ),
    multisigAddress: transaction.multisig.toString(),
    chainId,
    transactionIndex: BigInt(transaction.transactionIndex),
    creator: transaction.creator.toString(),
    createdAt: undefined,
    status,
    approvals: transaction.approvals.map((item) => item.toString()),
    rejections: transaction.rejections.map((item) => item.toString()),
    executed: status === "Executed",
    cancelled: status === "Cancelled",
  };
}

export function toSquadsV3MultisigAccount(
  publicKey: PublicKey,
  account: SquadsV3MultisigAccount,
  params: {
    chainId: string;
    label?: string;
    tags?: string[];
    programId?: PublicKey;
  }
) {
  const [vaultPda] = deriveSquadsV3AuthorityPda(
    publicKey,
    1,
    params.programId ?? SQUADS_V3_PROGRAM_ID
  );

  return {
    provider: "squads" as const,
    publicKey,
    threshold: account.threshold,
    members: account.members.map((key) => ({
      key,
      permissions: { mask: V3_MEMBER_PERMISSIONS_MASK },
    })),
    transactionIndex: BigInt(account.transactionIndex),
    msChangeIndex: account.msChangeIndex,
    programId: params.programId ?? SQUADS_V3_PROGRAM_ID,
    chainId: params.chainId,
    label: params.label,
    tags: params.tags,
    vaultPda,
    squadsVersion: "v3" as const,
  };
}

export function toSquadsV3WorkspacePayload(
  transaction: SquadsV3TransactionAccount,
  transactionPda: PublicKey,
  instructions: SquadsV3InstructionAccount[],
  programId = SQUADS_V3_PROGRAM_ID
): WorkspacePayload {
  return {
    type: "vault",
    transactionPda: transactionPda.toString(),
    vaultAddress: deriveSquadsV3AuthorityPda(
      transaction.multisig,
      transaction.authorityIndex,
      programId
    )[0].toString(),
    instructions: instructions.map((instruction) => ({
      programAddress: instruction.programId.toString(),
      accountAddresses: instruction.keys.map((key) => key.pubkey.toString()),
      accountIndexes: instruction.keys.map((_, index) => index),
      data: bs58.encode(instruction.data),
    })),
  };
}

export class SquadsV3Service {
  private rpcUrls: string[];
  private connection: Connection;
  private programId: PublicKey;
  private chainId: string;

  constructor(
    rpcUrl: string | string[],
    programId: string = SQUADS_V3_PROGRAM_ID.toBase58(),
    options: { chainId?: string } = {}
  ) {
    this.rpcUrls = normalizeRpcUrls(rpcUrl);
    this.connection = getSquadsV3Connection(this.rpcUrls[0]!);
    this.programId = new PublicKey(programId);
    this.chainId = options.chainId ?? this.rpcUrls[0]!;
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
        `squadsV3:accountInfo:${publicKey.toBase58()}:${this.programId.toBase58()}`,
      chainId: this.chainId,
      endpoints: this.rpcUrls,
      ttlMs: options.ttlMs ?? CACHE_CONFIG.TTL,
      allowStaleOnError: options.useStaleOnError,
      request: (endpoint) =>
        getSquadsV3Connection(endpoint).getAccountInfo(publicKey),
    });

    this.recordBrokerResult(result.degradedReason?.message);
    return result.data;
  }

  async getMultisig(multisigPda: PublicKey, useCache = true) {
    const cacheKey = `squadsV3:multisig:${multisigPda.toBase58()}:${this.programId.toBase58()}`;

    if (useCache) {
      const cached = cache.get<SquadsV3MultisigAccount>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const accountInfo = await this.getAccountInfo(multisigPda, {
      operationName: "Get Squads V3 multisig",
      cacheKey: `squadsV3:accountInfo:multisig:${multisigPda.toBase58()}:${this.programId.toBase58()}`,
      useStaleOnError: useCache,
    });

    if (!accountInfo) {
      throw new Error(
        "Account not found. Please verify the address and selected network."
      );
    }

    if (!accountInfo.owner.equals(this.programId)) {
      throw new Error(
        `Account is not owned by the Squads V3 program. Owner: ${accountInfo.owner.toBase58()}`
      );
    }

    const result = parseSquadsV3MultisigAccount(accountInfo);

    if (useCache) {
      cache.set(cacheKey, result, CACHE_CONFIG.TTL);
    }

    return result;
  }

  async getTransactionsByMultisig(multisigPda: PublicKey, useCache = true) {
    const cacheKey = `squadsV3:transactions:${multisigPda.toBase58()}:${this.programId.toBase58()}`;

    if (useCache) {
      const cached = cache.get<
        {
          publicKey: PublicKey;
          account: SquadsV3TransactionAccount;
        }[]
      >(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const transactionsResult = await requestBroker.fetch({
      key: `rpc:${cacheKey}`,
      chainId: this.chainId,
      endpoints: this.rpcUrls,
      ttlMs: CACHE_CONFIG.TTL,
      concurrency: 1,
      allowStaleOnError: useCache,
      request: (endpoint) =>
        getSquadsV3Connection(endpoint).getProgramAccounts(this.programId, {
          filters: [
            {
              memcmp: {
                offset: V3_TRANSACTION_MULTISIG_MEMCMP_OFFSET,
                bytes: multisigPda.toBase58(),
              },
            },
          ],
        }),
    });
    this.recordBrokerResult(transactionsResult.degradedReason?.message);

    const result = transactionsResult.data
      .map((account) => {
        try {
          return {
            publicKey: account.pubkey,
            account: parseSquadsV3TransactionAccount(account.account),
          };
        } catch {
          return null;
        }
      })
      .filter(
        (account): account is NonNullable<typeof account> => account !== null
      )
      .sort(
        (left, right) =>
          right.account.transactionIndex - left.account.transactionIndex
      );

    if (useCache) {
      cache.set(cacheKey, result, CACHE_CONFIG.TTL);
    }

    return result;
  }

  async getTransaction(
    multisigPda: PublicKey,
    transactionIndex: number,
    useCache = true
  ) {
    const [transactionPda] = deriveSquadsV3TransactionPda(
      multisigPda,
      transactionIndex,
      this.programId
    );
    const cacheKey = `squadsV3:transaction:${transactionPda.toBase58()}:${this.programId.toBase58()}`;

    if (useCache) {
      const cached = cache.get<SquadsV3TransactionAccount>(cacheKey);
      if (cached) {
        return { publicKey: transactionPda, account: cached };
      }
    }

    const accountInfo = await this.getAccountInfo(transactionPda, {
      operationName: "Get Squads V3 transaction",
      cacheKey: `squadsV3:accountInfo:transaction:${transactionPda.toBase58()}:${this.programId.toBase58()}`,
      useStaleOnError: useCache,
    });

    if (!accountInfo) {
      throw new Error(
        "Transaction account not found. Please ensure the proposal was fully created on-chain."
      );
    }

    if (!accountInfo.owner.equals(this.programId)) {
      throw new Error("Invalid transaction account owner");
    }

    const account = parseSquadsV3TransactionAccount(accountInfo);

    if (useCache) {
      cache.set(cacheKey, account, CACHE_CONFIG.TTL);
    }

    return { publicKey: transactionPda, account };
  }

  async getInstructions(
    transactionPda: PublicKey,
    instructionCount: number
  ): Promise<SquadsV3LoadedInstructionAccount[]> {
    if (instructionCount === 0) {
      return [];
    }

    const instructionPdas = Array.from(
      { length: instructionCount },
      (_, index) =>
        deriveSquadsV3InstructionPda(
          transactionPda,
          index + 1,
          this.programId
        )[0]
    );

    const result = await requestBroker.fetch({
      key: `squadsV3:instructions:${this.programId.toBase58()}:${instructionPdas
        .map((pda) => pda.toBase58())
        .join(",")}`,
      chainId: this.chainId,
      endpoints: this.rpcUrls,
      ttlMs: CACHE_CONFIG.TTL,
      concurrency: 2,
      request: (endpoint) =>
        getSquadsV3Connection(endpoint).getMultipleAccountsInfo(
          instructionPdas
        ),
    });
    this.recordBrokerResult(result.degradedReason?.message);

    return result.data
      .map((accountInfo, index) =>
        accountInfo
          ? {
              publicKey: instructionPdas[index]!,
              account: parseSquadsV3InstructionAccount(accountInfo),
            }
          : null
      )
      .filter(
        (instruction): instruction is SquadsV3LoadedInstructionAccount =>
          instruction !== null
      );
  }

  async approveProposal(params: {
    multisigPda: PublicKey;
    transactionIndex: bigint;
    member: PublicKey;
  }) {
    return buildSquadsV3ApproveInstruction({
      ...params,
      programId: this.programId,
    });
  }

  async rejectProposal(params: {
    multisigPda: PublicKey;
    transactionIndex: bigint;
    member: PublicKey;
  }) {
    return buildSquadsV3RejectInstruction({
      ...params,
      programId: this.programId,
    });
  }

  async executeProposal(params: {
    multisigPda: PublicKey;
    transactionIndex: bigint;
    member: PublicKey;
  }) {
    const transaction = await this.getTransaction(
      params.multisigPda,
      toTransactionIndexNumber(params.transactionIndex)
    );
    const instructions = await this.getInstructions(
      transaction.publicKey,
      transaction.account.instructionIndex
    );
    if (instructions.length !== transaction.account.instructionIndex) {
      throw new Error(
        "Squads V3 transaction is missing one or more instruction accounts."
      );
    }

    return buildSquadsV3ExecuteInstruction({
      transactionPda: transaction.publicKey,
      transaction: transaction.account,
      instructions,
      member: params.member,
      programId: this.programId,
    });
  }

  getConnection(): Connection {
    return this.connection;
  }

  invalidateTransactionCache(multisigPda: PublicKey): void {
    const cacheKey = `squadsV3:transactions:${multisigPda.toBase58()}:${this.programId.toBase58()}`;
    cache.invalidate(cacheKey);
    requestBroker.invalidate({ chainId: this.chainId, key: `rpc:${cacheKey}` });
  }

  invalidateProposalCache(multisigPda: PublicKey): void {
    this.invalidateTransactionCache(multisigPda);
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
}
