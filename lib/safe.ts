import { createPublicClient, getAddress, http, isAddress } from "viem";

import { type ChainConfig, normalizeChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import type {
  WorkspaceProposal,
  WorkspaceProposalStatus,
} from "@/types/workspace";

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

export interface SafeServiceTransactionConfirmation {
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

export interface SafeTransactionsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SafeServiceMultisigTransaction[];
}

export function validateEvmAddress(address: string) {
  return isAddress(address);
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
    `${baseUrl}/safes/${safeAddress}/all-transactions/?limit=${limit}`,
    {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Safe transaction service returned ${response.status}.`);
  }

  return (await response.json()) as SafeTransactionsResponse;
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
  multisigKey: string
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
    multisigKey,
    chainId,
    transactionIndex: BigInt(transaction.nonce),
    creator: transaction.proposer
      ? getAddress(transaction.proposer)
      : undefined,
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
  tags?: string[]
): Promise<MultisigAccount> {
  const normalizedChain = normalizeChainConfig(chain);
  const address = parseSafeAddressInput(addressInput);

  if (!address) {
    throw new Error("Invalid Safe address or Safe URL");
  }

  if (normalizedChain.multisigProvider !== "safe") {
    throw new Error("Selected chain is not configured for Safe imports");
  }

  const client = createPublicClient({
    transport: http(normalizedChain.rpcUrl),
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

  return {
    provider: "safe",
    publicKey: address,
    threshold: Number(threshold),
    members: owners.map((owner) => ({
      key: getAddress(owner),
      permissions: { mask: 0 },
    })),
    transactionIndex: BigInt(0),
    msChangeIndex: 0,
    programId: undefined,
    chainId: normalizedChain.id,
    label,
    tags,
  };
}
