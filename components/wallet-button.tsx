"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
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
        <Button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
        </Button>
      )}
      <ConnectWalletDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        defaultTab={connectDefaultTab}
      />
    </>
  );
}
