"use client";

import { useAccount } from "wagmi";

import { useWalletStore } from "@/stores/wallet-store";

type MultisigProvider = "squads" | "safe";

export function useViewerAddressForMultisig() {
  const { publicKey } = useWalletStore();
  const { address: evmAddress } = useAccount();

  return (provider: MultisigProvider): string | null =>
    provider === "safe"
      ? (evmAddress ?? null)
      : (publicKey?.toString() ?? null);
}
