"use client";

import { useConnectModal, useAccountModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/utils/format-address";
import { ExternalLink, Layers, Wallet, CheckCircle2 } from "lucide-react";

interface EvmConnectPanelProps {
  onClose: () => void;
}

export function EvmConnectPanel({ onClose }: EvmConnectPanelProps) {
  const { address, isConnected, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();

  if (isConnected && address) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="rounded-xl border border-border bg-card p-4 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{connector?.name ?? "EVM Wallet"}</p>
              <p className="font-mono text-xs text-muted-foreground">{formatAddress(address, 6, 4)}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-3"
            size="sm"
            onClick={() => {
              onClose();
              setTimeout(() => openAccountModal?.(), 100);
            }}
          >
            Manage EVM Account
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Connected via {connector?.name ?? "EVM Wallet"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6 sm:py-8">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent border border-primary/20">
        <Layers className="h-8 w-8 text-primary" />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <h3 className="text-lg font-semibold tracking-tight">Connect Ethereum</h3>
        <p className="text-sm text-muted-foreground text-center max-w-[280px]">
          Access DeFi, NFTs, and dApps across Ethereum and EVM chains
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <Button
          className="w-full"
          onClick={() => {
            onClose();
            setTimeout(() => openConnectModal?.(), 100);
          }}
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect Ethereum Wallet
        </Button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground text-center">
            MetaMask, Rainbow, Coinbase, WalletConnect & more
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {["Ethereum", "Base", "Optimism", "BSC", "Arbitrum"].map((chain) => (
              <span
                key={chain}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {chain}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
