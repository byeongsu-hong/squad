"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";

import { AccountMenu, ConnectWalletDialog } from "@/features/wallet";
import { useWalletStore } from "@/stores/wallet-store";

export function WalletButton() {
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDefaultTab, setConnectDefaultTab] = useState<
    "solana" | "ethereum"
  >("solana");

  const { connected, publicKey } = useWalletStore();
  const { address: evmAddress, isConnected: evmConnected } = useAccount();

  const hasSolanaWallet = connected && publicKey;
  const hasEvmWallet = evmConnected && evmAddress;
  const hasAnyWallet = Boolean(hasSolanaWallet || hasEvmWallet);

  const handleAddWallet = (tab?: "solana" | "ethereum") => {
    setConnectDefaultTab(tab ?? "solana");
    setConnectOpen(true);
  };

  return (
    <>
      {hasAnyWallet ? (
        <AccountMenu onAddWallet={handleAddWallet} />
      ) : (
        <button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </button>
      )}
      <ConnectWalletDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        defaultTab={connectDefaultTab}
      />
    </>
  );
}
