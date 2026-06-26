import { createPublicClient, getAddress, http, isAddress } from "viem";

import { isRetryableRpcError, requestBroker } from "@/lib/rpc/request-broker";
import { useRefreshStore } from "@/stores/refresh-store";
import {
  type ChainConfig,
  getChainRpcUrls,
  normalizeChainConfig,
} from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import type {
  WorkspacePayload,
  WorkspaceProposal,
  WorkspaceProposalStatus,
} from "@/types/workspace";
import { getWorkspaceMultisigKey } from "@/types/workspace";

const SAFE_ABI = [
  {
    inputs: [],
    name: "getOwners",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getThreshold",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const SAFE_CHAIN_ALIAS_MAP = {
  eth: ["ethereum", "eth"],
  base: ["base"],
  oeth: ["optimism", "op", "oeth"],
  bnb: ["bnb", "bsc"],
  arb1: ["arbitrum", "arb"],
} as const;

const SAFE_CHAIN_ID_MAP: Record<string, bigint> = {
  eth: BigInt(1),
  base: BigInt(8453),
  oeth: BigInt(10),
  bnb: BigInt(56),
  arb1: BigInt(42161),
} as const;

export const SAFE_API_KEY_ENV_VAR = "SAFE_API_KEY";

interface SafeServiceTransactionConfirmation {
  owner: string;
  signature?: string | null;
  signatureType?: string | null;
  submissionDate?: string | null;
}

export interface SafeServiceMultisigTransaction {
  safe: string;
  to?: string | null;
  value?: string | null;
  data?: string | null;
  operation?: number | null;
  nonce: string;
  executionDate?: string | null;
  submissionDate?: string | null;
  transactionHash?: string | null;
  safeTxHash?: string | null;
  proposer?: string | null;
  executor?: string | null;
  isExecuted?: boolean;
  isSuccessful?: boolean | null;
  dataDecoded?: unknown;
  confirmationsRequired?: number | string | null;
  confirmations?: SafeServiceTransactionConfirmation[] | null;
  trusted?: boolean;
  signatures?: string | null;
  transfers?: unknown[] | null;
  txType?: string | null;
}

interface SafeTransactionsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SafeServiceMultisigTransaction[];
}

export function parseSafeAddressInput(input: string) {
  const trimmed = input.trim();

  if (isAddress(trimmed)) {
    return getAddress(trimmed);
  }

  try {
    const url = new URL(trimmed);
    const safeParam = url.searchParams.get("safe");
    if (!safeParam) {
      return null;
    }

    const [, address] = safeParam.split(":");
    return address && isAddress(address) ? getAddress(address) : null;
  } catch {
    return null;
  }
}

export function parseSafeReference(input: string) {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    const safeParam = url.searchParams.get("safe");
    if (!safeParam) {
      return null;
    }

    const [chainAlias, address] = safeParam.split(":");
    const normalizedAddress =
      address && isAddress(address) ? getAddress(address) : null;

    if (!chainAlias || !normalizedAddress) {
      return null;
    }

    return {
      chainAlias,
      address: normalizedAddress,
    };
  } catch {
    return null;
  }
}

export function matchesSafeChainAlias(
  chainId: string,
  chainName: string,
  alias: string
) {
  const needles =
    SAFE_CHAIN_ALIAS_MAP[alias as keyof typeof SAFE_CHAIN_ALIAS_MAP];
  if (!needles) {
    return false;
  }

  const haystack = `${chainId} ${chainName}`.toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

export function getSafeChainAlias(chainId: string, chainName: string) {
  const haystack = `${chainId} ${chainName}`.toLowerCase();

  const matchedEntry = Object.entries(SAFE_CHAIN_ALIAS_MAP).find(
    ([, needles]) => needles.some((needle) => haystack.includes(needle))
  );

  return matchedEntry?.[0] ?? null;
}

export function getSafeTransactionServiceBaseUrl(
  chain: Pick<ChainConfig, "id" | "name">
) {
  const alias = getSafeChainAlias(chain.id, chain.name);
  if (!alias) {
    return null;
  }

  return `https://api.safe.global/tx-service/${alias}/api/v2`;
}

export function getSafeApiKitTransactionServiceBaseUrl(
  chain: Pick<ChainConfig, "id" | "name">
) {
  const alias = getSafeChainAlias(chain.id, chain.name);
  if (!alias) {
    return null;
  }

  return `https://api.safe.global/tx-service/${alias}/api`;
}

export function getSafeChainNumericId(chain: Pick<ChainConfig, "id" | "name">) {
  const alias = getSafeChainAlias(chain.id, chain.name);
  return alias ? (SAFE_CHAIN_ID_MAP[alias] ?? null) : null;
}

export function getSafeApiKey() {
  const rawValue =
    typeof process === "undefined"
      ? undefined
      : process.env[SAFE_API_KEY_ENV_VAR];
  const apiKey = rawValue?.trim();

  return apiKey ? apiKey : undefined;
}

function getSafeTransactionServiceHeaders() {
  const apiKey = getSafeApiKey();

  return {
    accept: "application/json",
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  };
}

export async function fetchSafeTransactions(
  chain: Pick<ChainConfig, "id" | "name">,
  safeAddress: string,
  limit = 100
) {
  const baseUrl = getSafeTransactionServiceBaseUrl(chain);
  if (!baseUrl) {
    throw new Error(
      `No Safe transaction service is configured for ${chain.name}.`
    );
  }

  const response = await fetch(
    `${baseUrl}/safes/${safeAddress}/multisig-transactions/?limit=${limit}&ordering=-nonce`,
    {
      headers: getSafeTransactionServiceHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Safe transaction service returned ${response.status}.`);
  }

  return (await response.json()) as SafeTransactionsResponse;
}

export async function fetchSafeTransactionByHash(
  chain: Pick<ChainConfig, "id" | "name">,
  safeTxHash: string
) {
  const baseUrl = getSafeTransactionServiceBaseUrl(chain);
  if (!baseUrl) {
    throw new Error(
      `No Safe transaction service is configured for ${chain.name}.`
    );
  }

  const response = await fetch(
    `${baseUrl}/multisig-transactions/${safeTxHash}/`,
    {
      headers: getSafeTransactionServiceHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Safe transaction service returned ${response.status}.`);
  }

  return (await response.json()) as SafeServiceMultisigTransaction;
}

export async function fetchSafeTransactionByNonce(
  chain: Pick<ChainConfig, "id" | "name">,
  safeAddress: string,
  nonce: bigint
) {
  const baseUrl = getSafeTransactionServiceBaseUrl(chain);
  if (!baseUrl) {
    throw new Error(
      `No Safe transaction service is configured for ${chain.name}.`
    );
  }

  const response = await fetch(
    `${baseUrl}/safes/${safeAddress}/multisig-transactions/?nonce=${nonce.toString()}&limit=1`,
    {
      headers: getSafeTransactionServiceHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Safe transaction service returned ${response.status}.`);
  }

  const data = (await response.json()) as SafeTransactionsResponse;
  const transaction = data.results[0];

  if (!transaction) {
    throw new Error(
      `Safe transaction for nonce ${nonce.toString()} is not available.`
    );
  }

  return transaction;
}

export async function loadSafeWorkspacePayload(
  chain: Pick<ChainConfig, "id" | "name">,
  safeAddress: string,
  nonce: bigint
): Promise<WorkspacePayload> {
  const transaction = await fetchSafeTransactionByNonce(
    chain,
    safeAddress,
    nonce
  );

  return {
    type: "safe",
    safeTxHash: transaction.safeTxHash ?? null,
    nonce: transaction.nonce,
    toAddress: transaction.to ? getAddress(transaction.to) : null,
    value: transaction.value ?? null,
    operation: transaction.operation ?? null,
    data: transaction.data ?? null,
    dataDecoded: transaction.dataDecoded ?? null,
  };
}

function toSafeProposalStatus(
  transaction: SafeServiceMultisigTransaction
): WorkspaceProposalStatus {
  if (transaction.isExecuted) {
    return "Executed";
  }

  const confirmations = transaction.confirmations?.length ?? 0;
  const confirmationsRequired = Number(transaction.confirmationsRequired ?? 0);

  if (confirmationsRequired > 0 && confirmations >= confirmationsRequired) {
    return "Approved";
  }

  return "Active";
}

export function toWorkspaceProposalFromSafeTransaction(
  transaction: SafeServiceMultisigTransaction,
  chainId: string,
  safeAddress: string
): WorkspaceProposal | null {
  if (transaction.txType && transaction.txType !== "MULTISIG_TRANSACTION") {
    return null;
  }

  const approvals = (transaction.confirmations ?? [])
    .map((item) => item.owner)
    .filter(Boolean)
    .map((owner) => getAddress(owner));

  const status = toSafeProposalStatus(transaction);

  return {
    provider: "safe",
    multisigKey: getWorkspaceMultisigKey(chainId, safeAddress),
    multisigAddress: safeAddress,
    chainId,
    transactionIndex: BigInt(transaction.nonce),
    creator: transaction.proposer
      ? getAddress(transaction.proposer)
      : undefined,
    createdAt: transaction.submissionDate ?? undefined,
    status,
    approvals,
    rejections: [],
    executed: Boolean(transaction.isExecuted),
    cancelled: false,
  };
}

export async function loadSafeMultisig(
  chain: ChainConfig,
  addressInput: string,
  label?: string,
  tags?: string[],
  options: { allowDegraded?: boolean } = {}
): Promise<MultisigAccount> {
  const normalizedChain = normalizeChainConfig(chain);
  const address = parseSafeAddressInput(addressInput);

  if (!address) {
    throw new Error("Invalid Safe address or Safe URL");
  }

  if (normalizedChain.multisigProvider !== "safe") {
    throw new Error("Selected chain is not configured for Safe imports");
  }

  try {
    const result = await requestBroker.fetch({
      key: `safe-import:${address}`,
      chainId: normalizedChain.id,
      endpoints: getChainRpcUrls(normalizedChain),
      ttlMs: 120_000,
      allowStaleOnError: options.allowDegraded === true,
      request: async (endpoint) => {
        const client = createPublicClient({
          transport: http(endpoint),
        });

        const [owners, threshold] = await Promise.all([
          client.readContract({
            address,
            abi: SAFE_ABI,
            functionName: "getOwners",
          }),
          client.readContract({
            address,
            abi: SAFE_ABI,
            functionName: "getThreshold",
          }),
        ]);

        return { owners, threshold };
      },
    });

    if (result.degradedReason) {
      useRefreshStore
        .getState()
        .markDegraded(
          { chainId: normalizedChain.id },
          result.degradedReason.message
        );
    } else {
      useRefreshStore.getState().clearDegraded({ chainId: normalizedChain.id });
    }

    return buildSafeMultisigAccount({
      address,
      chainId: normalizedChain.id,
      owners: result.data.owners,
      threshold: result.data.threshold,
      label,
      tags,
      importStatus: "complete",
    });
  } catch (error) {
    if (!options.allowDegraded || !isRetryableRpcError(error)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    useRefreshStore
      .getState()
      .markDegraded({ chainId: normalizedChain.id }, message);

    return buildSafeMultisigAccount({
      address,
      chainId: normalizedChain.id,
      owners: [],
      threshold: 0n,
      label,
      tags,
      importStatus: "degraded",
      importError: message,
    });
  }
}

function buildSafeMultisigAccount(params: {
  address: string;
  chainId: string;
  owners: readonly string[];
  threshold: bigint | number;
  label?: string;
  tags?: string[];
  importStatus: "complete" | "degraded";
  importError?: string;
}): MultisigAccount {
  return {
    provider: "safe",
    publicKey: params.address,
    threshold: Number(params.threshold),
    members: params.owners.map((owner) => ({
      key: getAddress(owner),
      permissions: { mask: 0 },
    })),
    transactionIndex: BigInt(0),
    msChangeIndex: 0,
    programId: undefined,
    chainId: params.chainId,
    label: params.label,
    tags: params.tags,
    importStatus: params.importStatus,
    importError: params.importError,
  };
}
