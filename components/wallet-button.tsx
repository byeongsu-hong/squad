"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet-store";
import { AccountMenu } from "@/components/wallet/account-menu";
import { ConnectWalletDialog } from "@/components/wallet/connect-wallet-dialog";
import { Wallet } from "lucide-react";

export function WalletButton() {
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDefaultTab, setConnectDefaultTab] = useState<"solana" | "ethereum">("solana");

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
        <Button onClick={() => setConnectOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
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
