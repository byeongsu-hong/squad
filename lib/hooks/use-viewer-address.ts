"use client";

import { useWalletStore } from "@/stores/wallet-store";
import { useAccount } from "wagmi";

type MultisigProvider = "squads" | "safe";

export function useViewerAddressForMultisig() {
  const { publicKey } = useWalletStore();
  const { address: evmAddress } = useAccount();

  return (provider: MultisigProvider): string | null =>
    provider === "safe"
      ? (evmAddress ?? null)
      : (publicKey?.toString() ?? null);
}
