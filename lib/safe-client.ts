"use client";

import Safe from "@safe-global/protocol-kit";

import { evmWalletService } from "@/lib/evm-wallet";
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

  await evmWalletService.switchToChain(chainId);

  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected EVM wallet was found in this browser.");
  }

  return Safe.init({
    provider: window.ethereum,
    signer,
    safeAddress,
  });
}

export async function loadSafeTransactionForAction(
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
