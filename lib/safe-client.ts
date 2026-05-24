"use client";

import Safe from "@safe-global/protocol-kit";
import { getAccount, switchChain } from "wagmi/actions";

import { wagmiConfig } from "@/lib/wagmi-config";
import type { SafeServiceMultisigTransaction } from "@/lib/safe";
import { getSafeChainNumericId } from "@/lib/safe";
import type { ChainConfig } from "@/types/chain";

async function getSafeSdk(
  chain: ChainConfig,
  safeAddress: string,
  signer: string
) {
  const chainId = getSafeChainNumericId(chain);
  if (!chainId) {
    throw new Error(`Safe actions are not configured for ${chain.name}.`);
  }

  const { connector } = getAccount(wagmiConfig);
  if (!connector) {
    throw new Error("No EVM wallet connected.");
  }

  await switchChain(wagmiConfig, { chainId: Number(chainId) as 1 | 10 | 56 | 8453 | 42161 });

  const provider = await connector.getProvider();

  return Safe.init({
    provider: provider as never,
    signer,
    safeAddress,
  });
}

async function loadSafeTransactionForAction(
  chain: Pick<ChainConfig, "id" | "name">,
  safeAddress: string,
  nonce: bigint
) {
  const params = new URLSearchParams({
    chainId: chain.id,
    chainName: chain.name,
    safeAddress,
    nonce: nonce.toString(),
  });

  const response = await fetch(`/api/safe/transaction?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to load Safe transaction.");
  }

  const payload = (await response.json()) as {
    transaction?: SafeServiceMultisigTransaction;
  };

  if (!payload.transaction) {
    throw new Error("Safe transaction response was empty.");
  }

  return payload.transaction;
}

export async function confirmSafeTransaction(options: {
  chain: ChainConfig;
  safeAddress: string;
  signer: string;
  nonce: bigint;
}) {
  const transaction = await loadSafeTransactionForAction(
    options.chain,
    options.safeAddress,
    options.nonce
  );

  if (!transaction.safeTxHash) {
    throw new Error(
      "This Safe transaction is missing a Safe transaction hash."
    );
  }

  const safeSdk = await getSafeSdk(
    options.chain,
    options.safeAddress,
    options.signer
  );
  const signedTransaction = await safeSdk.signTransaction(transaction as never);
  const signature = signedTransaction.getSignature(options.signer)?.data;

  if (!signature) {
    throw new Error("The connected wallet did not return a Safe signature.");
  }

  const response = await fetch("/api/safe/confirm", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chainId: options.chain.id,
      chainName: options.chain.name,
      safeTxHash: transaction.safeTxHash,
      signature,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to confirm Safe transaction.");
  }

  return transaction.safeTxHash;
}

export async function executeSafeTransaction(options: {
  chain: ChainConfig;
  safeAddress: string;
  signer: string;
  nonce: bigint;
}) {
  const transaction = await loadSafeTransactionForAction(
    options.chain,
    options.safeAddress,
    options.nonce
  );

  const safeSdk = await getSafeSdk(
    options.chain,
    options.safeAddress,
    options.signer
  );

  return safeSdk.executeTransaction(transaction as never);
}
