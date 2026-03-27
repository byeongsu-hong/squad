"use client";

import { Copy, Globe, LogOut, PlugZap, Usb, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { evmWalletService } from "@/lib/evm-wallet";
import { useWalletDisconnect } from "@/lib/hooks/use-wallet-disconnect";
import { useWalletStore } from "@/stores/wallet-store";

import { BrowserWalletDialog } from "./browser-wallet-dialog";
import { OkxWalletDialog } from "./okx-wallet-dialog";
import { WalletConnectDialog } from "./wallet-connect-dialog";

type DialogType = "ledger" | "browser" | "okx" | null;

export function WalletButton() {
  const [dialogOpen, setDialogOpen] = useState<DialogType>(null);
  const {
    connected,
    publicKey,
    walletName,
    evmConnected,
    evmAddress,
    evmWalletName,
    connectEvm,
  } = useWalletStore();
  const { disconnect } = useWalletDisconnect();
  const hasSolanaWallet = connected && publicKey;
  const hasEvmWallet = evmConnected && evmAddress;
  const hasAnyWallet = Boolean(hasSolanaWallet || hasEvmWallet);
  const primaryLabel = hasSolanaWallet
    ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
    : hasEvmWallet
      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
      : null;

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      toast.success("Address copied to clipboard");
    }
  };

  const handleConnectEvm = async () => {
    try {
      const result = await evmWalletService.connect();
      connectEvm(result.address, result.walletName);
      toast.success(`${result.walletName} connected`);
    } catch (error) {
      console.error("Failed to connect EVM wallet:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to connect EVM wallet"
      );
    }
  };

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
            <DropdownMenuItem onClick={() => void handleConnectEvm()}>
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
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="font-mono tabular-nums">
          <Wallet className="mr-2 h-4 w-4" />
          {primaryLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Connected Wallets</DropdownMenuLabel>
        {hasSolanaWallet ? (
          <>
            <DropdownMenuItem onClick={handleCopyAddress}>
              <Copy className="mr-2 h-4 w-4" />
              {walletName ? `Copy ${walletName}` : "Copy Solana Address"}
            </DropdownMenuItem>
            <DropdownMenuLabel className="font-mono text-xs text-zinc-500">
              {publicKey.toString()}
            </DropdownMenuLabel>
          </>
        ) : null}
        {hasEvmWallet ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(evmAddress);
                toast.success("EVM address copied to clipboard");
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {evmWalletName ? `Copy ${evmWalletName}` : "Copy EVM Address"}
            </DropdownMenuItem>
            <DropdownMenuLabel className="font-mono text-xs text-zinc-500">
              {evmAddress}
            </DropdownMenuLabel>
          </>
        ) : null}
        {!hasEvmWallet ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleConnectEvm()}>
              <PlugZap className="mr-2 h-4 w-4" />
              Connect EVM Wallet
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect All
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
