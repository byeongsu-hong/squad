"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Copy, Globe, LogOut, PlugZap, Usb, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWalletDisconnect } from "@/lib/hooks/use-wallet-disconnect";
import { formatAddress } from "@/lib/utils/format-address";
import { useWalletStore } from "@/stores/wallet-store";

import { BrowserWalletDialog } from "./browser-wallet-dialog";
import { OkxWalletDialog } from "./okx-wallet-dialog";
import { WalletConnectDialog } from "./wallet-connect-dialog";

type DialogType = "ledger" | "browser" | "okx" | null;

export function WalletButton() {
  const [dialogOpen, setDialogOpen] = useState<DialogType>(null);
  const { connected, publicKey, walletName } = useWalletStore();
  const { address: evmAddress, isConnected: evmConnected, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useWalletDisconnect();

  const evmWalletName = connector?.name;

  const hasSolanaWallet = connected && publicKey;
  const hasEvmWallet = evmConnected && evmAddress;
  const hasAnyWallet = Boolean(hasSolanaWallet || hasEvmWallet);

  const primaryLabel = hasSolanaWallet
    ? formatAddress(publicKey.toString(), 4, 4)
    : hasEvmWallet
      ? formatAddress(evmAddress, 6, 4)
      : null;

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      toast.success("Address copied to clipboard");
    }
  };

  const handleDisconnectAll = async () => {
    await disconnect();
  };

  const dialogs = (
    <>
      <WalletConnectDialog
        open={dialogOpen === "ledger"}
        onOpenChange={(open) => setDialogOpen(open ? "ledger" : null)}
      />
      <BrowserWalletDialog
        open={dialogOpen === "browser"}
        onOpenChange={(open) => setDialogOpen(open ? "browser" : null)}
      />
      <OkxWalletDialog
        open={dialogOpen === "okx"}
        onOpenChange={(open) => setDialogOpen(open ? "okx" : null)}
      />
    </>
  );

  if (!hasAnyWallet) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Select Wallet Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDialogOpen("browser")}>
              <Globe className="mr-2 h-4 w-4" />
              Solana Browser Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openConnectModal?.()}>
              <PlugZap className="mr-2 h-4 w-4" />
              EVM Browser Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogOpen("okx")}>
              <Wallet className="mr-2 h-4 w-4" />
              OKX Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogOpen("ledger")}>
              <Usb className="mr-2 h-4 w-4" />
              Ledger Device
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[12px] text-muted-foreground shadow-sm transition-colors hover:bg-muted">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
            {primaryLabel}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Connected</DropdownMenuLabel>

          {hasSolanaWallet && (
            <DropdownMenuItem onClick={handleCopyAddress}>
              <Copy className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">
                {walletName ?? "Solana"}{" "}
                <span className="font-mono text-muted-foreground/70">
                  {formatAddress(publicKey.toString(), 4, 4)}
                </span>
              </span>
            </DropdownMenuItem>
          )}

          {hasEvmWallet && (
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(evmAddress);
                toast.success("EVM address copied to clipboard");
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">
                {evmWalletName ?? "EVM"}{" "}
                <span className="font-mono text-muted-foreground/70">
                  {formatAddress(evmAddress, 4, 4)}
                </span>
              </span>
            </DropdownMenuItem>
          )}

          {(!hasSolanaWallet || !hasEvmWallet) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Add wallet</DropdownMenuLabel>
              {!hasSolanaWallet && (
                <>
                  <DropdownMenuItem onClick={() => setDialogOpen("browser")}>
                    <Globe className="mr-2 h-4 w-4" />
                    Solana Browser Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialogOpen("okx")}>
                    <Wallet className="mr-2 h-4 w-4" />
                    OKX Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialogOpen("ledger")}>
                    <Usb className="mr-2 h-4 w-4" />
                    Ledger Device
                  </DropdownMenuItem>
                </>
              )}
              {!hasEvmWallet && (
                <DropdownMenuItem onClick={() => openConnectModal?.()}>
                  <PlugZap className="mr-2 h-4 w-4" />
                  EVM Browser Wallet
                </DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void handleDisconnectAll()}>
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
}
