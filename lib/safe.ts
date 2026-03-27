import { createPublicClient, getAddress, http, isAddress } from "viem";

import { type ChainConfig, normalizeChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

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
